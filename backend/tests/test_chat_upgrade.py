import os
import pytest

from app.agent.chat_agent import _detect_fast_intent, _rewrite_question, process_chat
from app.db.database import resolve_db_path
from app.schemas.chat import (
    CaveatBlock,
    ChartBlock,
    ChatResponse,
    HeadlineBlock,
    InsightBlock,
    MetricCardsBlock,
    RecommendationsBlock,
    TableBlock,
    TextBlock,
)
from app.tools.analysis.explain_change import explain_change
from app.tools.analysis.find_opportunities import find_opportunities
from app.tools.charts.make_chart import auto_chart

requires_db = pytest.mark.skipif(
    not os.path.exists(resolve_db_path()),
    reason="SQLite database file not found",
)


def test_schema_blocks_validates_and_ignores_extra():
    headline = HeadlineBlock(text="Doanh thu đạt R$ 1.2M")
    assert headline.type == "headline"
    assert headline.text == "Doanh thu đạt R$ 1.2M"

    cards = MetricCardsBlock(items=[{"label": "Revenue", "value": 1200000, "extra_field": "ignore"}])
    assert len(cards.items) == 1
    assert cards.items[0].label == "Revenue"

    caveat = CaveatBlock(text="Dữ liệu 2018 chỉ đến tháng 8")
    assert caveat.level == "info"

    resp = ChatResponse(
        answer="Sample answer",
        insight="Sample insight",
        blocks=[
            headline.model_dump(),
            cards.model_dump(),
            caveat.model_dump(),
        ],
        intent="data_query",
    )
    assert resp.intent == "data_query"
    assert len(resp.blocks) == 3


def test_fast_intent_chitchat():
    res = _detect_fast_intent("hi")
    assert res is not None
    assert res[0] == "chitchat"
    assert len(res[2]) >= 2

    res2 = _detect_fast_intent("xin chào")
    assert res2 is not None
    assert res2[0] == "chitchat"


def test_fast_intent_out_of_scope():
    res = _detect_fast_intent("Thời tiết hôm nay thế nào?")
    assert res is not None
    assert res[0] == "out_of_scope"

    res2 = _detect_fast_intent("Viết code Python cho game rắn săn mồi")
    assert res2 is not None
    assert res2[0] == "out_of_scope"


def test_fast_intent_no_data_out_of_range():
    res = _detect_fast_intent("Doanh thu năm 2025 là bao nhiêu?")
    assert res is not None
    assert res[0] == "no_data"
    assert "2025" in res[1]

    res2 = _detect_fast_intent("Cho tôi xem số liệu năm 2020")
    assert res2 is not None
    assert res2[0] == "no_data"


def test_fast_intent_definition():
    res = _detect_fast_intent("Tỷ lệ on-time delivery rate tính thế nào?")
    assert res is not None
    assert res[0] == "definition"
    assert "On-time" in res[1] or "giao" in res[1].lower()


def test_process_chat_chitchat_no_sql():
    res = process_chat("hi", use_cache=False)
    assert res["status"] == "ok"
    assert res["intent"] == "chitchat"
    assert res["sql"] is None
    assert res["llm_calls"] == 0
    assert len(res["blocks"]) >= 2


def test_process_chat_out_of_scope_no_sql():
    res = process_chat("thời tiết hôm nay", use_cache=False)
    assert res["status"] == "ok"
    assert res["intent"] == "out_of_scope"
    assert res["sql"] is None
    assert res["llm_calls"] == 0


def test_rewrite_question_follow_up():
    history = [("Doanh thu năm 2018 là bao nhiêu?", "Doanh thu năm 2018 đạt R$ 7.2M")]
    rewritten, scope = _rewrite_question("thế còn 2017?", history)
    assert "2017" in rewritten
    assert scope is not None
    assert scope["period"] == "2017"

    history_state = [("Tỷ lệ giao đúng hạn tại bang SP là bao nhiêu?", "SP đạt 95%")]
    rewritten_state, scope_state = _rewrite_question("còn bang RJ?", history_state)
    assert "RJ" in rewritten_state
    assert scope_state is not None
    assert scope_state["state"] == "RJ"


def test_auto_chart_selection_rules():
    table_hbar = {
        "columns": ["category", "revenue"],
        "rows": [{"category": f"cat_{i}", "revenue": 100 - i * 10} for i in range(5)],
    }
    spec_hbar = auto_chart(table_hbar, advanced=True)
    assert spec_hbar["type"] == "bar_horizontal"
    assert spec_hbar["highlight"] == 0

    table_time = {
        "columns": ["month", "revenue"],
        "rows": [{"month": f"2018-0{i}", "revenue": 100 + i * 20} for i in range(1, 7)],
    }
    spec_time = auto_chart(table_time, advanced=True)
    assert spec_time["type"] == "area"
    assert spec_time["highlight"] is not None

    table_map = {
        "columns": ["state", "on_time_rate"],
        "rows": [{"state": uf, "on_time_rate": 90.0} for uf in ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "DF", "GO"]],
    }
    spec_map = auto_chart(table_map, advanced=True)
    assert spec_map["type"] == "brazil_map"

    table_donut = {
        "columns": ["payment_type", "share"],
        "rows": [
            {"payment_type": "credit_card", "share": 75.0},
            {"payment_type": "boleto", "share": 20.0},
            {"payment_type": "voucher", "share": 5.0},
        ],
    }
    spec_donut = auto_chart(table_donut, advanced=True)
    assert spec_donut["type"] == "donut"


@requires_db
def test_explain_change_aligns_2018_to_same_period():
    res = explain_change(period_a="2017", period_b="2018")
    assert res["ok"] is True
    assert res["caveat"] is not None
    assert "tháng 8" in res["caveat"]
    assert "08-31" in res["scope"]["period_a"]
    assert "08-31" in res["scope"]["period_b"]
    assert len(res["rows"]) >= 3


@requires_db
def test_find_opportunities_returns_recommendations():
    res = find_opportunities()
    assert res["ok"] is True
    assert "recommendations" in res
    assert len(res["recommendations"]) >= 2
    for rec in res["recommendations"]:
        assert "action" in rec
        assert "evidence" in rec
        assert "confidence" in rec

