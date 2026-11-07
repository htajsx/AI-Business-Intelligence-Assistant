import inspect
import math
import time
from datetime import date, datetime
from decimal import Decimal

from google.genai import types

from app.tools.context import ToolContext
from app.tools.analysis.explain_change import explain_change
from app.tools.analysis.find_opportunities import find_opportunities
from app.tools.kpi.generate_report import generate_report
from app.tools.kpi.get_kpi import get_kpi
from app.tools.kpi.kpi_catalog import get_kpi_meta
from app.tools.charts.make_chart import make_chart
from app.tools.analysis.resolve_period import resolve_period
from app.tools.result import failure, success
from app.tools.sql.run_sql import run_sql
from app.utils.semantic import get_kpi_names, get_kpi_spec

TOOL_NAMES = [
    "get_kpi",
    "run_sql",
    "make_chart",
    "generate_report",
    "resolve_period",
    "explain_change",
    "find_opportunities",
]

STORED_ROWS = 100
MODEL_ROWS = 30
META_KEYS = ("kpi", "unit", "x_column", "y_column")

_TOOLS = {
    "get_kpi": (get_kpi, False),
    "run_sql": (run_sql, False),
    "make_chart": (make_chart, True),
    "generate_report": (generate_report, False),
    "resolve_period": (resolve_period, False),
    "explain_change": (explain_change, False),
    "find_opportunities": (find_opportunities, False),
}


def _kpi_lines() -> list[str]:
    lines = []
    for kpi_name in get_kpi_names():
        spec = get_kpi_spec(kpi_name) or {}
        meta = get_kpi_meta(kpi_name) or {}
        description = " ".join(str(spec.get("description", "")).split())
        kind = meta.get("kind", "unknown")
        synonyms = ", ".join(meta.get("synonyms") or [])
        detail = f"{kind}; synonyms: {synonyms}" if synonyms else kind
        lines.append(f"- {kpi_name}: {description} ({detail})")
    return lines


def _get_kpi_description() -> str:
    ranking = [n for n in get_kpi_names() if (get_kpi_meta(n) or {}).get("kind") == "ranking"]
    no_dates = [n for n in get_kpi_names() if get_kpi_meta(n) and not get_kpi_meta(n).get("supports_dates")]
    parts = [
        "Use this FIRST whenever the question matches a governed KPI. "
        "The SQL is fixed by the semantic layer; you only choose the KPI name, the dates and the limit.",
        "Available KPIs:",
        "\n".join(_kpi_lines()),
    ]
    if no_dates:
        parts.append(f"{', '.join(no_dates)} ignore dates, so do not pass a period for them.")
    if ranking:
        parts.append(f"limit only applies to ranking KPIs ({', '.join(ranking)}) and is clamped to 1-50.")
    parts.append("Dates use YYYY-MM-DD. For relative or named periods call resolve_period first.")
    return "\n".join(parts)


def get_tool_declarations() -> list[types.Tool]:
    kpi_names = get_kpi_names()
    string = types.Type.STRING

    get_kpi_declaration = types.FunctionDeclaration(
        name="get_kpi",
        description=_get_kpi_description(),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "name": types.Schema(
                    type=string,
                    enum=kpi_names or None,
                    description="Name of the governed KPI.",
                ),
                "start_date": types.Schema(
                    type=string,
                    description="Inclusive start date in YYYY-MM-DD format.",
                ),
                "end_date": types.Schema(
                    type=string,
                    description="Inclusive end date in YYYY-MM-DD format.",
                ),
                "limit": types.Schema(
                    type=types.Type.INTEGER,
                    description="Number of rows for ranking KPIs only.",
                ),
            },
            required=["name"],
        ),
    )

    run_sql_declaration = types.FunctionDeclaration(
        name="run_sql",
        description=(
            "Use only when no governed KPI fits the question. "
            "Pass exactly one read-only SQLite SELECT statement. "
            "On order_reviews select explicit columns and never read review comments. "
            "Revenue is SUM(order_items.price) over orders with order_status = 'delivered'."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "query": types.Schema(type=string, description="One SQLite SELECT statement."),
            },
            required=["query"],
        ),
    )

    make_chart_declaration = types.FunctionDeclaration(
        name="make_chart",
        description=(
            "Call once after a result with at least 2 rows when a chart helps the answer. "
            "The data is taken from the last result automatically, so only choose the configuration."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "chart_type": types.Schema(type=string, enum=["line", "bar"], description="Chart type."),
                "x": types.Schema(type=string, description="Column name for the x axis."),
                "y": types.Schema(type=string, description="Numeric column name for the y axis."),
                "title": types.Schema(type=string, description="Short chart title."),
                "y_format": types.Schema(
                    type=string,
                    enum=["currency", "number", "percent"],
                    description="Format of the y values.",
                ),
            },
            required=["chart_type", "x", "y"],
        ),
    )

    generate_report_declaration = types.FunctionDeclaration(
        name="generate_report",
        description=(
            "Use when the user asks for a KPI report or a summary of a period. "
            "Returns computed facts only: headline KPIs with previous-period comparison, "
            "monthly revenue, top and bottom categories, top states and anomalies."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "start_date": types.Schema(type=string, description="Start date in YYYY-MM-DD format."),
                "end_date": types.Schema(type=string, description="End date in YYYY-MM-DD format."),
            },
            required=["start_date", "end_date"],
        ),
    )

    resolve_period_declaration = types.FunctionDeclaration(
        name="resolve_period",
        description=(
            "Always use it for relative or named periods such as last month, last quarter, "
            "this year or 2017-Q4 instead of computing dates yourself. "
            "Supported: last_30_days, last_month, last_quarter, this_year, last_year, all_time, "
            "YYYY, YYYY-MM, YYYY-qN."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "expression": types.Schema(type=string, description="Period expression to resolve."),
            },
            required=["expression"],
        ),
    )

    explain_change_declaration = types.FunctionDeclaration(
        name="explain_change",
        description="Decomposes revenue changes between periods, aligns to same-period, evaluates AOV and SLA.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "period_a": types.Schema(type=string, description="First period, e.g. 2017."),
                "period_b": types.Schema(type=string, description="Second period, e.g. 2018."),
            },
        ),
    )

    find_opportunities_declaration = types.FunctionDeclaration(
        name="find_opportunities",
        description="Identifies data-driven business growth opportunities, high AOV niches, and delivery bottlenecks.",
        parameters=types.Schema(type=types.Type.OBJECT, properties={}),
    )

    return [
        types.Tool(
            function_declarations=[
                get_kpi_declaration,
                run_sql_declaration,
                make_chart_declaration,
                generate_report_declaration,
                resolve_period_declaration,
                explain_change_declaration,
                find_opportunities_declaration,
            ]
        )
    ]


def _json_safe(value):
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, Decimal):
        number = float(value)
        return number if math.isfinite(number) else None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    return str(value)


def _clean_args(args) -> dict:
    if args is None:
        return {}
    try:
        source = dict(args)
    except (TypeError, ValueError):
        return {}
    cleaned = {}
    for key, value in source.items():
        if value is None:
            continue
        if isinstance(value, float) and math.isfinite(value) and value.is_integer():
            value = int(value)
        cleaned[str(key)] = value
    return cleaned


def _run_tool(name: str, args: dict, ctx: ToolContext) -> dict:
    entry = _TOOLS.get(name) if isinstance(name, str) else None
    if entry is None:
        return failure(f"Unknown tool '{name}'. Available tools: {', '.join(TOOL_NAMES)}.", tool=name)
    func, needs_ctx = entry
    call_args = (ctx,) if needs_ctx else ()
    try:
        inspect.signature(func).bind(*call_args, **args)
    except TypeError as e:
        return failure(f"Invalid arguments: {e}", tool=name)
    result = func(*call_args, **args)
    if not isinstance(result, dict):
        return failure("Tool returned an invalid result.", tool=name)
    return result


def _store_table(ctx: ToolContext, result: dict) -> None:
    rows = list(result.get("rows") or [])
    stored = dict(result)
    stored["rows"] = rows[:STORED_ROWS]
    if len(rows) > STORED_ROWS:
        stored["truncated"] = True
    ctx.last_table = stored
    ctx.last_meta = {key: result[key] for key in META_KEYS if result.get(key) is not None}
    ctx.last_sql = result.get("sql")
    ctx.add_tables(list(result.get("tables_used") or []))
    ctx.chart = None


def _model_payload(result: dict) -> dict:
    rows = result.get("rows") or []
    payload = dict(result)
    payload["rows"] = rows[:MODEL_ROWS]
    if len(rows) > MODEL_ROWS:
        payload["truncated"] = True
    payload["untrusted_data"] = True
    return payload


def _store_report(ctx: ToolContext, result: dict) -> dict:
    facts = result.get("facts")
    if not isinstance(facts, dict):
        return failure("Report facts are missing.", tool="generate_report")
    ctx.report_facts = facts
    monthly = facts.get("monthly_revenue")
    if isinstance(monthly, list):
        rows = [
            {"month": item.get("month"), "revenue": item.get("revenue")}
            for item in monthly
            if isinstance(item, dict)
        ]
        ctx.last_table = success(["month", "revenue"], rows[:STORED_ROWS])
        ctx.last_meta = {"unit": "currency", "x_column": "month", "y_column": "revenue"}
        ctx.last_sql = None
        ctx.chart = None
    ctx.add_tables(["orders", "order_items"])
    return {"ok": True, "facts": facts}


def _apply_state(name: str, result: dict, ctx: ToolContext) -> dict:
    if not result.get("ok"):
        return result
    if name in ("get_kpi", "run_sql", "explain_change", "find_opportunities") and isinstance(result.get("rows"), list):
        _store_table(ctx, result)
        if result.get("recommendations"):
            ctx.recommendations = result.get("recommendations")
        if result.get("caveat"):
            ctx.caveat = result.get("caveat")
        return _model_payload(result)
    if name == "generate_report":
        return _store_report(ctx, result)
    return result


def _record(ctx: ToolContext, name, args: dict, payload: dict, started: float) -> None:
    try:
        ok = payload.get("ok") is True
        ctx.trace.append(
            {
                "tool": name,
                "args": _json_safe(args),
                "ok": ok,
                "elapsed_ms": int((time.perf_counter() - started) * 1000),
                "error": None if ok else payload.get("error"),
            }
        )
        if not ok:
            ctx.error_count += 1
    except Exception:
        pass


def dispatch(name: str, args: dict, ctx: ToolContext) -> dict:
    started = time.perf_counter()
    cleaned: dict = {}
    try:
        cleaned = _clean_args(args)
        result = _json_safe(_run_tool(name, cleaned, ctx))
        payload = _json_safe(_apply_state(name, result, ctx))
    except Exception as e:
        payload = failure(f"Tool '{name}' failed: {e}", tool=str(name))
    _record(ctx, name, cleaned, payload, started)
    return payload