import copy
import hashlib
import json
import logging
import re
import threading
import time
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

from google.genai import errors, types

from app.agent.llm_client import (
    LlmQuotaExceeded,
    LlmUnavailable,
    generate_with_retry,
    get_model_name,
)
from app.agent.prompts import build_system_prompt
from app.tools.context import ToolContext
from app.tools.charts.make_chart import auto_chart
from app.tools.registry import dispatch, get_tool_declarations
from app.utils.semantic import get_business_rules, get_time_anchor

logger = logging.getLogger("chat_agent")

MAX_ROUNDS = 4
MAX_TOOL_ERRORS = 3
CACHE_SIZE = 50
CACHE_TTL_S = 30 * 60
HISTORY_MAX_CONVERSATIONS = 200
HISTORY_TTL_S = 30 * 60
HISTORY_MAX_TURNS = 3
HISTORY_MAX_ANSWER_CHARS = 600
LOG_PATH = Path(__file__).resolve().parents[2] / "logs" / "queries.jsonl"

FAILED_MESSAGE = "I could not build a reliable query for this question. Please rephrase it."
MAX_STEPS_MESSAGE = "I reached the tool call limit before finishing. Please narrow the question and try again."
OFFLINE_MESSAGE = "The AI service is not configured or unavailable right now. Please try again later."
ERROR_MESSAGE = "The AI service returned an error. Please try again in a moment."
QUOTA_MESSAGE = "Đã hết hạn mức gọi AI hôm nay, vui lòng thử lại sau"
EMPTY_MESSAGE = "I'm sorry, I didn't quite catch that. Could you rephrase?"
EMPTY_QUESTION_MESSAGE = "The question is empty."

CHITCHAT_PATTERNS = re.compile(r"^(hi|hello|hey|chào|xin chào|chào bạn|asdf|test|alo|good morning|halo)\b", re.IGNORECASE)
OUT_OF_SCOPE_PATTERNS = re.compile(r"thời tiết|weather|viết code python|write python|công thức nấu|recipe|game|bóng đá|chính trị", re.IGNORECASE)
DEFINITION_PATTERNS = re.compile(r"(tính thế nào|cách tính|how is .* calculated|định nghĩa|what is (on[- ]time|aov|cancellation|repeat))", re.IGNORECASE)
OUT_OF_RANGE_YEAR = re.compile(r"\b(201[0-5]|2019|202[0-9]|203[0-9])\b")
FOLLOW_UP_REWRITE = re.compile(r"^(thế còn|còn|what about|and)\s+(?:năm\s+)?(\d{4}|bang\s+[a-z]{2}|[a-z]{2})\??$", re.IGNORECASE)

_cache: OrderedDict = OrderedDict()
_cache_lock = threading.Lock()

_history: OrderedDict = OrderedDict()
_history_lock = threading.Lock()

_scopes: OrderedDict = OrderedDict()
_scopes_lock = threading.Lock()


class _Usage:
    def __init__(self) -> None:
        self.models: list[str] = []
        self.calls = 0

    def record(self, model: str) -> None:
        self.calls += 1
        if model not in self.models:
            self.models.append(model)


def _history_get(conversation_id) -> list[tuple[str, str]]:
    if not conversation_id:
        return []
    key = str(conversation_id)
    now = time.monotonic()
    with _history_lock:
        entry = _history.get(key)
        if entry is None:
            return []
        stored_at, turns = entry
        if now - stored_at > HISTORY_TTL_S:
            del _history[key]
            return []
        _history.move_to_end(key)
        return list(turns)


def _history_add(conversation_id, question: str, answer: str) -> None:
    if not conversation_id or not question or not answer:
        return
    key = str(conversation_id)
    turn = (question, answer[:HISTORY_MAX_ANSWER_CHARS])
    now = time.monotonic()
    with _history_lock:
        entry = _history.get(key)
        turns = []
        if entry is not None and now - entry[0] <= HISTORY_TTL_S:
            turns = list(entry[1])
        turns.append(turn)
        _history[key] = (now, turns[-HISTORY_MAX_TURNS:])
        _history.move_to_end(key)
        while len(_history) > HISTORY_MAX_CONVERSATIONS:
            _history.popitem(last=False)


def _history_contents(history: list[tuple[str, str]]) -> list[types.Content]:
    contents = []
    for question, answer in history:
        contents.append(types.Content(role="user", parts=[types.Part(text=question)]))
        contents.append(types.Content(role="model", parts=[types.Part(text=answer)]))
    return contents


def _cache_key(question: str, history=()) -> str:
    key = " ".join(question.lower().split())
    if not key or not history:
        return key
    payload = json.dumps([list(turn) for turn in history], ensure_ascii=False)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"{key}|{digest}"


def _cache_get(key: str) -> dict | None:
    now = time.monotonic()
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        stored_at, result = entry
        if now - stored_at > CACHE_TTL_S:
            del _cache[key]
            return None
        _cache.move_to_end(key)
        return copy.deepcopy(result)


def _cache_put(key: str, result: dict) -> None:
    if not key:
        return
    with _cache_lock:
        _cache[key] = (time.monotonic(), copy.deepcopy(result))
        _cache.move_to_end(key)
        while len(_cache) > CACHE_SIZE:
            _cache.popitem(last=False)


def _detect_fast_intent(question: str) -> tuple[str, str, list[str]] | None:
    clean = question.strip().lower()

    if CHITCHAT_PATTERNS.search(clean) and len(clean.split()) <= 4:
        return (
            "chitchat",
            "Xin chào! Tôi là trợ lý phân tích dữ liệu kho thương mại điện tử Olist. "
            "Tôi có thể hỗ trợ bạn tra cứu doanh thu, xếp hạng danh mục, hiệu suất giao hàng hoặc phân tích nguyên nhân thay đổi số liệu.",
            [
                "Doanh thu theo tháng năm 2018?",
                "Top 5 danh mục sản phẩm theo doanh thu?",
                "Tỷ lệ giao đúng hạn theo từng bang?",
            ],
        )

    if OUT_OF_SCOPE_PATTERNS.search(clean):
        return (
            "out_of_scope",
            "Tôi là trợ lý BI chuyên sâu về cơ sở dữ liệu bán lẻ Olist. "
            "Câu hỏi này nằm ngoài phạm vi dữ liệu kho hàng e-commerce của tôi. "
            "Bạn có thể đặt câu hỏi về doanh thu, đơn hàng, khách hàng hoặc chuỗi cung ứng.",
            [
                "Tổng doanh thu năm 2017 là bao nhiêu?",
                "Bang nào có doanh thu cao nhất?",
                "Thời gian giao hàng trung bình của các đơn?",
            ],
        )

    out_year = OUT_OF_RANGE_YEAR.search(clean)
    if out_year:
        return (
            "no_data",
            f"Dữ liệu Olist hiện tại trong hệ thống được ghi nhận từ ngày 04/09/2016 đến ngày 17/10/2018 "
            f"(trong đó năm 2018 ghi nhận đầy đủ đến hết tháng 8/2018). Mốc thời gian {out_year.group(1)} nằm ngoài phạm vi cơ sở dữ liệu.",
            [
                "Doanh thu năm 2017 là bao nhiêu?",
                "Doanh thu năm 2018 là bao nhiêu?",
                "Xu hướng doanh thu các tháng năm 2018?",
            ],
        )

    if DEFINITION_PATTERNS.search(clean):
        rules = get_business_rules()
        if "on" in clean or "giao" in clean or "sla" in clean:
            expl = rules.get("valid_delivery_definition") or rules.get("delivery_time_definition")
            title = "Tỷ lệ giao hàng đúng hạn (On-time Delivery Rate)"
        elif "aov" in clean or "giá trị" in clean:
            expl = "Average Order Value (AOV) = Tổng doanh thu / Tổng số đơn hàng thành công (delivered orders)."
            title = "Giá trị đơn hàng trung bình (AOV)"
        elif "cancel" in clean or "hủy" in clean:
            expl = rules.get("cancellation_rate_definition")
            title = "Tỷ lệ hủy đơn (Cancellation Rate)"
        elif "repeat" in clean or "mua lại" in clean:
            expl = rules.get("repeat_purchase_rate_definition")
            title = "Tỷ lệ mua lại (Repeat Purchase Rate)"
        else:
            expl = rules.get("revenue_definition")
            title = "Quy tắc tính doanh thu (Revenue Definition)"

        return (
            "definition",
            f"**{title}**:\n{expl}",
            [
                "Tỷ lệ giao đúng hạn theo từng bang?",
                "Giá trị đơn hàng trung bình năm 2017?",
                "Tỷ lệ hủy đơn hàng năm 2018?",
            ],
        )

    return None


def _rewrite_question(question: str, history: list[tuple[str, str]]) -> tuple[str, dict | None]:
    match = FOLLOW_UP_REWRITE.match(question.strip())
    if not match or not history:
        return question, None

    entity = match.group(2).strip().upper()
    prev_q = history[-1][0]

    year_match = re.search(r"\b(201[6-8])\b", prev_q)
    if year_match and re.match(r"^\d{4}$", entity):
        rewritten = prev_q.replace(year_match.group(1), entity)
        return rewritten, {"period": entity, "label": f"Scope: Year {entity}"}

    state_match = re.search(r"\b([A-Z]{2})\b", prev_q)
    if state_match and len(entity) == 2:
        rewritten = prev_q.replace(state_match.group(1), entity)
        return rewritten, {"state": entity, "label": f"Scope: State {entity}"}

    return f"{prev_q} for {entity}", {"scope": entity, "label": f"Scope: {entity}"}


def _make_config(force_text: bool) -> types.GenerateContentConfig:
    kwargs = {
        "system_instruction": build_system_prompt(),
        "temperature": 0,
        "tools": get_tool_declarations(),
        "automatic_function_calling": types.AutomaticFunctionCallingConfig(disable=True),
        "thinking_config": types.ThinkingConfig(thinking_level=types.ThinkingLevel.LOW),
    }
    if force_text:
        kwargs["tool_config"] = types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(mode="NONE")
        )
    return types.GenerateContentConfig(**kwargs)


def _clean_text(text) -> str:
    return text.strip() if isinstance(text, str) else ""


def _generate(model: str, contents, config, usage: _Usage):
    result = generate_with_retry(model=model, contents=contents, config=config)
    usage.record(result.model_used)
    return result.response, result.model_used


def _converse(
    message: str,
    ctx: ToolContext,
    tools_called: list[str],
    usage: _Usage,
    model_override: str | None = None,
    history: list[tuple[str, str]] | None = None,
) -> tuple[str, str]:
    model = model_override or get_model_name()
    contents = _history_contents(history or [])
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    config = _make_config(force_text=False)

    for _ in range(MAX_ROUNDS):
        response, model = _generate(model, contents, config, usage)
        calls = response.function_calls

        if not calls:
            text = _clean_text(response.text)
            if not text:
                return EMPTY_MESSAGE, "error"
            return text, "ok"

        contents.append(response.candidates[0].content)
        parts = []
        for call in calls:
            payload = dispatch(call.name, dict(call.args or {}), ctx)
            tools_called.append(str(call.name))
            parts.append(types.Part.from_function_response(name=call.name, response=payload))
        contents.append(types.Content(role="user", parts=parts))

        if ctx.error_count >= MAX_TOOL_ERRORS:
            return FAILED_MESSAGE, "failed"

    try:
        final, model = _generate(model, contents, _make_config(force_text=True), usage)
        text = _clean_text(final.text)
        if text:
            return text, "ok"
    except LlmUnavailable:
        raise
    except Exception:
        logger.exception("Forced final answer call failed")
    return MAX_STEPS_MESSAGE, "max_steps"


def _generate_blocks(
    answer: str,
    table: dict | None,
    chart: dict | None,
    question: str,
    tools_called: list[str],
    caveat_text: str | None = None,
    ctx: ToolContext | None = None,
) -> list[dict]:
    blocks: list[dict] = []

    sentences = [s.strip() for s in answer.replace("\n", ". ").split(". ") if s.strip()]
    first_sentence = sentences[0] if sentences else answer
    first_sentence = first_sentence.replace("**", "").replace("###", "").strip()
    if len(first_sentence) > 140:
        first_sentence = first_sentence[:137] + "..."
    blocks.append({"type": "headline", "text": first_sentence})

    rows = table.get("rows") if isinstance(table, dict) else []
    columns = table.get("columns") if isinstance(table, dict) else []

    if rows:
        cards = []
        if len(rows) == 1:
            first_row = rows[0]
            for col in columns[:3]:
                val = first_row.get(col)
                if val is not None:
                    cards.append({"label": col.replace("_", " ").title(), "value": val})
        else:
            num_cols = [c for c in columns if any(isinstance(r.get(c), (int, float)) for r in rows)]
            if num_cols:
                y = num_cols[0]
                vals = [r.get(y) for r in rows if isinstance(r.get(y), (int, float))]
                if vals:
                    cards.append({"label": f"Top {y.replace('_', ' ').title()}", "value": max(vals), "tone": "good"})
                    cards.append({"label": f"Total {y.replace('_', ' ').title()}", "value": round(sum(vals), 2)})
                    cards.append({"label": "Row Count", "value": len(rows)})

        if cards:
            blocks.append({"type": "metric_cards", "items": cards})

    if chart is not None:
        blocks.append({"type": "chart", "spec": chart})

    remaining_text = "\n\n".join(
        line.strip() for line in answer.split("\n") if line.strip() and not line.strip().startswith("###")
    )
    if remaining_text:
        blocks.append({"type": "insight", "text": remaining_text})

    if ctx and getattr(ctx, "recommendations", None):
        blocks.append({
            "type": "recommendations",
            "items": ctx.recommendations
        })

    if ctx and getattr(ctx, "caveat", None) and not caveat_text:
        caveat_text = ctx.caveat

    if caveat_text:
        blocks.append({"type": "caveat", "text": caveat_text, "level": "warn"})
    elif "2018" in question and ("year" in question.lower() or "năm" in question.lower()):
        blocks.append({
            "type": "caveat",
            "text": "Dữ liệu năm 2018 của Olist được ghi nhận đầy đủ đến hết tháng 8/2018.",
            "level": "info"
        })

    if rows and len(rows) >= 2:
        blocks.append({"type": "table", "columns": columns, "rows": rows, "max_rows": 5})

    q_lower = question.lower()
    if "revenue" in q_lower or "doanh thu" in q_lower:
        follow_ups = [
            "Top 5 danh mục sản phẩm theo doanh thu?",
            "Doanh thu theo tháng trong năm?",
            "Làm sao để tăng doanh thu?",
        ]
    elif "delivery" in q_lower or "giao" in q_lower or "sla" in q_lower:
        follow_ups = [
            "Tỷ lệ giao đúng hạn theo từng bang?",
            "Thời gian giao hàng trung bình là bao lâu?",
            "Tỷ lệ hủy đơn hàng?",
        ]
    elif "state" in q_lower or "bang" in q_lower:
        follow_ups = [
            "Top 5 bang có doanh thu cao nhất?",
            "Tỷ lệ giao hàng đúng hạn tại São Paulo (SP)?",
            "Tỷ lệ khách hàng mua lại tại các bang?",
        ]
    else:
        follow_ups = [
            "Doanh thu theo tháng năm 2018?",
            "Top 5 danh mục sản phẩm doanh thu cao nhất?",
            "Tỷ lệ giao đúng hạn theo bang?",
        ]

    blocks.append({"type": "follow_ups", "items": follow_ups})
    return blocks


def _build_result(
    answer: str,
    status: str,
    ctx: ToolContext,
    tools_called: list[str],
    usage: _Usage,
    latency_ms: int,
    question: str = "",
    scope: dict | None = None,
    caveats: list[str] | None = None,
) -> dict:
    table = None
    rows: list = []
    if isinstance(ctx.last_table, dict):
        rows = list(ctx.last_table.get("rows") or [])
        table = {"columns": list(ctx.last_table.get("columns") or []), "rows": rows}

    chart = ctx.chart
    if chart is None and table is not None and len(rows) >= 2:
        try:
            chart = auto_chart(ctx.last_table, ctx.last_meta, advanced=True)
        except Exception:
            logger.exception("auto_chart failed")
            chart = None

    blocks = None
    try:
        caveat_str = caveats[0] if caveats else None
        blocks = _generate_blocks(answer, table, chart, question, tools_called, caveat_str, ctx)
    except Exception as e:
        logger.exception("Block generation failed, falling back to text: %s", e)
        blocks = [{"type": "text", "markdown": answer}]

    follow_ups = [b["items"] for b in blocks if b.get("type") == "follow_ups"]
    follow_ups_list = follow_ups[0] if follow_ups else []

    intent = "data_query"
    if "explain_change" in tools_called:
        intent = "explanation"
    elif "find_opportunities" in tools_called:
        intent = "recommendation"

    return {
        "answer": answer,
        "insight": answer,
        "sql": ctx.last_sql,
        "sql_query": ctx.last_sql,
        "table": table,
        "results": rows,
        "chart": chart,
        "tables_used": list(ctx.tables_used),
        "tools_called": list(tools_called),
        "latency_ms": latency_ms,
        "tool_trace": list(ctx.trace),
        "status": status,
        "model": usage.models[-1] if usage.models else None,
        "models_used": list(usage.models),
        "llm_calls": usage.calls,
        "cached": False,
        "intent": intent,
        "blocks": blocks,
        "follow_ups": follow_ups_list,
        "scope": scope,
        "caveats": caveats or [],
    }


def _write_log(conversation_id, question: str, result: dict, error) -> None:
    try:
        entry = {
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "conversation_id": conversation_id,
            "question": question,
            "status": result.get("status"),
            "tool_trace": result.get("tool_trace"),
            "sql": result.get("sql"),
            "latency_ms": result.get("latency_ms"),
            "model": result.get("model"),
            "models_used": result.get("models_used"),
            "llm_calls": result.get("llm_calls"),
            "cached": result.get("cached"),
            "error": error,
        }
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_PATH, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")
    except Exception:
        logger.exception("Could not write query log")


def process_chat(
    user_message: str,
    conversation_id: str | None = None,
    *,
    use_cache: bool = True,
    model: str | None = None,
) -> dict:
    started = time.perf_counter()
    question = (user_message or "").strip()
    ctx = ToolContext()
    usage = _Usage()
    tools_called: list[str] = []
    error = None
    cached_result = None
    history: list[tuple[str, str]] = []
    detected_scope = None
    caveats = []

    if not question:
        answer, status = EMPTY_QUESTION_MESSAGE, "error"
        error = "empty question"
        result = _build_result(answer, status, ctx, tools_called, usage, 0, question)
        result["latency_ms"] = int((time.perf_counter() - started) * 1000)
        return result

    fast_intent = _detect_fast_intent(question)
    if fast_intent is not None:
        intent_type, answer_text, suggestions = fast_intent
        blocks = [
            {"type": "headline", "text": answer_text[:140]},
            {"type": "text", "markdown": answer_text},
            {"type": "follow_ups", "items": suggestions},
        ]
        result = {
            "answer": answer_text,
            "insight": answer_text,
            "sql": None,
            "sql_query": None,
            "table": None,
            "results": [],
            "chart": None,
            "tables_used": [],
            "tools_called": [],
            "latency_ms": int((time.perf_counter() - started) * 1000),
            "tool_trace": [],
            "status": "ok",
            "model": None,
            "models_used": [],
            "llm_calls": 0,
            "cached": False,
            "intent": intent_type,
            "blocks": blocks,
            "follow_ups": suggestions,
            "scope": None,
            "caveats": [],
        }
        _write_log(conversation_id, question, result, None)
        return result

    history = _history_get(conversation_id)
    rewritten_q, detected_scope = _rewrite_question(question, history)
    effective_question = rewritten_q or question

    if use_cache:
        cached_result = _cache_get(_cache_key(effective_question, history))

    try:
        if cached_result is not None:
            answer, status = cached_result["answer"], "ok"
        else:
            answer, status = _converse(effective_question, ctx, tools_called, usage, model, history)
    except LlmQuotaExceeded as e:
        error = str(e)
        logger.warning("LLM quota exhausted: %s", e)
        answer, status = QUOTA_MESSAGE, "quota"
    except LlmUnavailable as e:
        error = str(e)
        logger.warning("LLM unavailable: %s", e)
        answer, status = OFFLINE_MESSAGE, "offline"
    except errors.APIError as e:
        error = str(e)
        logger.warning("LLM call failed: %s", e)
        answer, status = ERROR_MESSAGE, "error"
    except Exception as e:
        error = str(e)
        logger.exception("Unexpected failure while processing chat")
        answer, status = ERROR_MESSAGE, "error"

    if cached_result is not None:
        result = cached_result
        result["cached"] = True
        result["llm_calls"] = 0
        result["latency_ms"] = int((time.perf_counter() - started) * 1000)
    else:
        result = _build_result(answer, status, ctx, tools_called, usage, 0, effective_question, detected_scope, caveats)
        result["latency_ms"] = int((time.perf_counter() - started) * 1000)
        if status != "ok" and error is None:
            error = answer
        if status == "ok" and use_cache:
            _cache_put(_cache_key(effective_question, history), result)

    if status == "ok" and question:
        _history_add(conversation_id, question, answer)

    _write_log(conversation_id, question, result, error)
    return result
