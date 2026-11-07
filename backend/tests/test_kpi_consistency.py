from functools import lru_cache

import os

import pytest

from app.dashboard.queries import (
    parse_period_range,
    query_scope_metrics,
    query_top_categories,
    query_top_states,
    query_window_metrics,
)
from app.db.database import execute_query, resolve_db_path
from app.tools.kpi.get_kpi import get_kpi, scalar_value

pytestmark = pytest.mark.skipif(
    not os.path.exists(resolve_db_path()),
    reason="SQLite database file not found",
)

EPS = 1e-9

KPI_MAP = [
    ("total_revenue", "revenue", 0.01),
    ("order_count", "orders", 0.01),
    ("average_order_value", "aov", 0.01),
    ("average_delivery_time", "avg_delivery", 0.1),
    ("on_time_delivery_rate", "on_time_rate", 0.1),
    ("cancellation_rate", "cancel_rate", 0.01),
    ("average_review_score", "avg_review", 0.01),
    ("repeat_purchase_rate", "repeat_rate", 0.01),
]

SCOPES = [
    "All time",
    "Year 2017",
    "Year 2018",
    "Q4 2017",
    "2017-03-01 - 2017-05-31",
]

SCOPED_CASES = [
    ("health_beauty", "All states"),
    ("All categories", "SP"),
    ("health_beauty", "SP"),
]

SCOPED_PERIODS = ["All time", "Year 2017"]

REFERENCE_MAP = [
    ("revenue", "revenue", 0.01),
    ("orders", "orders", 0.01),
    ("aov", "aov", 0.01),
    ("avg_delivery", "avg_delivery", 0.1),
    ("on_time_rate", "on_time_rate", 0.1),
    ("cancel_rate", "cancel_rate", 0.01),
]

RANKING_PERIODS = ["All time", "Year 2017"]


def _close(left, right, tol):
    if left is None or right is None:
        return left is None and right is None
    return abs(float(left) - float(right)) <= tol + EPS


def _range(period):
    start, end, _, _ = parse_period_range(period)
    return (start[:10] if start else None, end[:10] if end else None)


@lru_cache(maxsize=None)
def _chat(name, period, limit=None):
    start, end = _range(period)
    return get_kpi(name, start, end, limit)


def _chat_value(name, period):
    result = _chat(name, period)
    assert result["ok"] is True, result.get("error")
    return scalar_value(result)


@lru_cache(maxsize=None)
def _dashboard(period, category="All categories", state="All states"):
    start, end, _, _ = parse_period_range(period)
    if start and end:
        return query_window_metrics(start, end, category, state)
    return query_scope_metrics(period, category, state)


def _order_filters(start, end, category, state, delivered_only):
    clauses = []
    params = []
    if delivered_only:
        clauses.append("o.order_status = 'delivered'")
    clauses.append("(? IS NULL OR o.order_purchase_timestamp >= ?)")
    params += [start, start]
    clauses.append("(? IS NULL OR o.order_purchase_timestamp <= ?)")
    params += [end, end]
    if state:
        clauses.append(
            "o.customer_id IN (SELECT customer_id FROM customers WHERE customer_state = ?)"
        )
        params.append(state)
    if category:
        clauses.append(
            "EXISTS (SELECT 1 FROM order_items x JOIN products q ON x.product_id = q.product_id "
            "WHERE x.order_id = o.order_id AND q.product_category_name = ?)"
        )
        params.append(category)
    return " AND ".join(clauses), params


@lru_cache(maxsize=None)
def _reference(period, category, state):
    start, end, _, _ = parse_period_range(period)
    cat = None if category == "All categories" else category
    st = None if state == "All states" else state

    where, params = _order_filters(start, end, None, st, True)
    joins = "JOIN order_items oi ON o.order_id = oi.order_id"
    if cat:
        joins += " JOIN products p ON oi.product_id = p.product_id"
        where += " AND p.product_category_name = ?"
        params.append(cat)
    row = execute_query(
        "SELECT SUM(oi.price) AS raw, COUNT(DISTINCT o.order_id) AS ords "
        f"FROM orders o {joins} WHERE {where}",
        tuple(params),
    )[0]
    raw = float(row["raw"]) if row["raw"] is not None else 0.0
    ords = int(row["ords"] or 0)

    where, params = _order_filters(start, end, cat, st, True)
    where += (
        " AND o.order_delivered_customer_date IS NOT NULL"
        " AND o.order_delivered_customer_date >= o.order_purchase_timestamp"
    )
    delivery = execute_query(
        "SELECT ROUND(AVG(julianday(o.order_delivered_customer_date) - julianday(o.order_purchase_timestamp)), 2) AS avg_delivery, "
        "ROUND(100.0 * SUM(CASE WHEN o.order_delivered_customer_date <= o.order_estimated_delivery_date THEN 1 ELSE 0 END) / COUNT(*), 2) AS on_time_rate "
        f"FROM orders o WHERE {where}",
        tuple(params),
    )[0]

    where, params = _order_filters(start, end, cat, st, False)
    cancel = execute_query(
        "SELECT ROUND(100.0 * SUM(CASE WHEN o.order_status = 'canceled' THEN 1 ELSE 0 END) / COUNT(*), 2) AS cancel_rate "
        f"FROM orders o WHERE {where}",
        tuple(params),
    )[0]

    return {
        "revenue": round(raw, 2),
        "orders": ords,
        "aov": round(raw / ords, 2) if ords > 0 else None,
        "avg_delivery": delivery["avg_delivery"],
        "on_time_rate": delivery["on_time_rate"],
        "cancel_rate": cancel["cancel_rate"],
    }


def _chat_ranking(name, key, period):
    result = _chat(name, period, 5)
    assert result["ok"] is True, result.get("error")
    return [(row[key], float(row["revenue"])) for row in result["rows"]]


def _dashboard_states(period):
    all_states, _ = query_top_states(period, "All categories", "All states")
    return [(item["state"], float(item["revenue"])) for item in all_states[:5]]


def _dashboard_categories(period):
    top, _, _ = query_top_categories(
        period, "All categories", "All states", None, None, None, None, 0.0
    )
    return [(item["raw_cat"], float(item["revenue"])) for item in top[:5]]


def _rankings_match(left, right):
    if [name for name, _ in left] != [name for name, _ in right]:
        return False
    return all(_close(a[1], b[1], 0.01) for a, b in zip(left, right))


@pytest.mark.parametrize("period", SCOPES)
@pytest.mark.parametrize("kpi,key,tol", KPI_MAP, ids=[item[0] for item in KPI_MAP])
def test_chat_matches_dashboard(period, kpi, key, tol):
    chat_value = _chat_value(kpi, period)
    dashboard_value = _dashboard(period)[key]
    assert _close(chat_value, dashboard_value, tol), (
        f"{kpi} [{period}]: chat={chat_value} dashboard={dashboard_value} tol={tol}"
    )


@pytest.mark.parametrize("period", SCOPED_PERIODS)
@pytest.mark.parametrize("category,state", SCOPED_CASES)
@pytest.mark.parametrize("key,ref_key,tol", REFERENCE_MAP, ids=[item[0] for item in REFERENCE_MAP])
def test_dashboard_scoped_matches_reference(period, category, state, key, ref_key, tol):
    dashboard_value = _dashboard(period, category, state)[key]
    reference_value = _reference(period, category, state)[ref_key]
    assert _close(dashboard_value, reference_value, tol), (
        f"{key} [{period} | {category} | {state}]: "
        f"dashboard={dashboard_value} reference={reference_value} tol={tol}"
    )


@pytest.mark.parametrize("period", RANKING_PERIODS)
def test_top_states_ranking_matches_dashboard(period):
    chat = _chat_ranking("top_states_by_revenue", "state", period)
    dashboard = _dashboard_states(period)
    assert _rankings_match(chat, dashboard), f"chat={chat} dashboard={dashboard}"


@pytest.mark.parametrize("period", RANKING_PERIODS)
def test_top_categories_ranking_matches_dashboard(period):
    chat = _chat_ranking("top_categories_by_revenue", "category", period)
    dashboard = _dashboard_categories(period)
    assert _rankings_match(chat, dashboard), f"chat={chat} dashboard={dashboard}"


def _collect_checks():
    checks = []
    for period in SCOPES:
        for kpi, key, tol in KPI_MAP:
            left = _chat_value(kpi, period)
            right = _dashboard(period)[key]
            checks.append(("chat-vs-dashboard", period, kpi, left, right, _close(left, right, tol)))
    for period in SCOPED_PERIODS:
        for category, state in SCOPED_CASES:
            scope = f"{period} | {category} | {state}"
            for key, ref_key, tol in REFERENCE_MAP:
                left = _dashboard(period, category, state)[key]
                right = _reference(period, category, state)[ref_key]
                checks.append(("dashboard-vs-sql", scope, key, left, right, _close(left, right, tol)))
    for period in RANKING_PERIODS:
        left = _chat_ranking("top_states_by_revenue", "state", period)
        right = _dashboard_states(period)
        checks.append((
            "ranking", period, "top5_states",
            ",".join(name for name, _ in left), ",".join(name for name, _ in right),
            _rankings_match(left, right),
        ))
        left = _chat_ranking("top_categories_by_revenue", "category", period)
        right = _dashboard_categories(period)
        checks.append((
            "ranking", period, "top5_categories",
            ",".join(name for name, _ in left), ",".join(name for name, _ in right),
            _rankings_match(left, right),
        ))
    return checks


def _format_value(value):
    if value is None:
        return "None"
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value)


def test_print_consistency_summary(capsys):
    checks = _collect_checks()
    matched = sum(1 for item in checks if item[5])
    lines = [
        "",
        f"{'Check':<18}{'Scope':<42}{'KPI':<24}{'Left':<22}{'Right':<22}Result",
        "-" * 134,
    ]
    for group, scope, kpi, left, right, ok in checks:
        lines.append(
            f"{group:<18}{scope:<42}{kpi:<24}{_format_value(left):<22}{_format_value(right):<22}{'OK' if ok else 'MISMATCH'}"
        )
    lines.append("-" * 134)
    lines.append(f"Match (khop) {matched}/{len(checks)}")
    with capsys.disabled():
        print("\n".join(lines))
    failures = [item for item in checks if not item[5]]
    assert not failures, f"{len(failures)} mismatches: {failures}"
