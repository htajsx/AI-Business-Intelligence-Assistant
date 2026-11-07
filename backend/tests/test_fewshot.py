import os

import pytest

from app.db.database import resolve_db_path
from app.security.sql_guard import validate_sql
from app.tools.sql.run_sql import run_sql
from app.utils.semantic import get_few_shots

FEW_SHOTS = get_few_shots()
FEW_SHOT_IDS = [f"fs_{i + 1:02d}" for i in range(len(FEW_SHOTS))]

requires_db = pytest.mark.skipif(
    not os.path.exists(resolve_db_path()),
    reason="SQLite database file not found",
)


def test_few_shots_at_least_24():
    assert len(FEW_SHOTS) >= 24, f"Expected at least 24 few-shots, found {len(FEW_SHOTS)}"


def test_few_shots_questions_unique():
    questions = [str(item.get("question", "")).strip().lower() for item in FEW_SHOTS]
    assert len(questions) == len(set(questions)), "Duplicate few-shot questions found"


def test_few_shots_have_question_and_sql():
    for idx, item in enumerate(FEW_SHOTS):
        assert str(item.get("question", "")).strip(), f"Few-shot #{idx + 1} has an empty question"
        assert str(item.get("sql", "")).strip(), f"Few-shot #{idx + 1} has an empty sql"


def test_few_shots_have_at_least_six_vietnamese():
    def is_vietnamese(text: str) -> bool:
        return any(ch in text for ch in "ăâđêôơưàảãáạằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵ")
    vietnamese = [item for item in FEW_SHOTS if is_vietnamese(str(item.get("question", "")))]
    assert len(vietnamese) >= 6, f"Expected at least 6 Vietnamese few-shots, found {len(vietnamese)}"


@pytest.mark.parametrize("item", FEW_SHOTS, ids=FEW_SHOT_IDS)
def test_few_shot_sql_passes_guard(item):
    validate_sql(item["sql"])


@requires_db
@pytest.mark.parametrize("item", FEW_SHOTS, ids=FEW_SHOT_IDS)
def test_few_shot_sql_runs_on_database(item):
    result = run_sql(item["sql"])
    assert result["ok"] is True, f"SQL failed: {result.get('error')}. SQL: {item['sql']}"


@pytest.mark.parametrize("item", FEW_SHOTS, ids=FEW_SHOT_IDS)
def test_few_shot_respects_delivered_when_needed(item):
    sql_lower = str(item.get("sql", "")).lower()
    question_lower = str(item.get("question", "")).lower()
    uses_order_items = "order_items" in sql_lower
    mentions_revenue = "revenue" in sql_lower or "doanh thu" in question_lower
    requires_delivered = uses_order_items or mentions_revenue
    if requires_delivered:
        assert "delivered" in sql_lower, (
            f"Few-shot uses order_items or revenue without a delivered filter. "
            f"Question: {item['question']}"
        )