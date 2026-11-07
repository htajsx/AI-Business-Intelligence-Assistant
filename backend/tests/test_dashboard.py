import os
import re
import sqlite3
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.dashboard_router import _DASHBOARD_CACHE, get_dashboard
from app.dashboard.insights import build_executive_insights
from app.dashboard.queries import SLA_DAYS

FORBIDDEN_CONSTANTS = {
    12.4, 92.3, 4.09, 0.84, 3.42, 8.2, -2.1, 1.4, 0.6, 58.0, 9.0, 90.0, 12.0
}

def extract_metric_values(obj):
    values = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("value", "delta", "avgDays", "onTimeRate", "score", "rating5Pct", "rating4Pct", "rating3Pct", "rating2Pct", "rating1Pct", "cancelRate", "slaRate", "growth", "revenue", "orders", "aov"):
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    values.append(float(v))
            else:
                values.extend(extract_metric_values(v))
    elif isinstance(obj, list):
        for item in obj:
            values.extend(extract_metric_values(item))
    return values

@pytest.fixture
def temp_db(tmp_path, monkeypatch):
    db_file = tmp_path / "test_olist.db"
    conn = sqlite3.connect(str(db_file))
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE orders (
        order_id TEXT PRIMARY KEY,
        customer_id TEXT,
        order_status TEXT,
        order_purchase_timestamp TEXT,
        order_approved_at TEXT,
        order_delivered_carrier_date TEXT,
        order_delivered_customer_date TEXT,
        order_estimated_delivery_date TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE order_items (
        order_id TEXT,
        order_item_id INTEGER,
        product_id TEXT,
        seller_id TEXT,
        shipping_limit_date TEXT,
        price REAL,
        freight_value REAL,
        PRIMARY KEY (order_id, order_item_id)
    )
    """)

    cur.execute("""
    CREATE TABLE customers (
        customer_id TEXT PRIMARY KEY,
        customer_unique_id TEXT,
        customer_zip_code_prefix TEXT,
        customer_city TEXT,
        customer_state TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE products (
        product_id TEXT PRIMARY KEY,
        product_category_name TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE sellers (
        seller_id TEXT PRIMARY KEY,
        seller_zip_code_prefix TEXT,
        seller_city TEXT,
        seller_state TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE order_payments (
        order_id TEXT,
        payment_sequential INTEGER,
        payment_type TEXT,
        payment_installments INTEGER,
        payment_value REAL
    )
    """)

    cur.execute("""
    CREATE TABLE order_reviews (
        review_id TEXT,
        order_id TEXT,
        review_score INTEGER,
        review_creation_date TEXT,
        review_answer_timestamp TEXT
    )
    """)

    customers_data = [
        ("c1", "u1", "SP"),
        ("c2", "u1", "SP"),
        ("c3", "u2", "RJ"),
        ("c4", "u3", "MG"),
        ("c5", "u4", "SP"),
    ]
    for cid, uid, st in customers_data:
        cur.execute(
            "INSERT INTO customers VALUES (?, ?, '01000', 'City', ?)",
            (cid, uid, st),
        )

    products_data = [
        ("p1", "health_beauty"),
        ("p2", "toys"),
    ]
    for pid, cat in products_data:
        cur.execute("INSERT INTO products VALUES (?, ?)", (pid, cat))

    orders_data = [
        ("o1", "c1", "delivered", "2018-05-10 10:00:00", "2018-05-11 10:00:00", "2018-05-15 10:00:00", "2018-05-20 10:00:00"),
        ("o2", "c2", "delivered", "2018-05-15 10:00:00", "2018-05-16 10:00:00", "2018-05-19 10:00:00", "2018-05-25 10:00:00"),
        ("o3", "c3", "delivered", "2018-06-10 10:00:00", "2018-06-11 10:00:00", "2018-06-14 10:00:00", "2018-06-25 10:00:00"),
        ("o4", "c4", "canceled",  "2018-06-12 10:00:00", None, None, None),
        ("o5", "c5", "delivered", "2018-07-05 10:00:00", "2018-07-06 10:00:00", "2018-07-08 10:00:00", "2018-07-20 10:00:00"),
        ("o2017", "c1", "delivered", "2017-05-10 10:00:00", "2017-05-11 10:00:00", "2017-05-15 10:00:00", "2017-05-20 10:00:00"),
        ("o2016", "c1", "delivered", "2016-05-10 10:00:00", "2016-05-11 10:00:00", "2016-05-15 10:00:00", "2016-05-20 10:00:00"),
    ]
    for oid, cid, status, purchase, carrier, deliv, est in orders_data:
        cur.execute(
            "INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (oid, cid, status, purchase, purchase, carrier, deliv, est),
        )

    items_data = [
        ("o1", 1, "p1", 50.0, 10.0),
        ("o2", 1, "p1", 70.0, 10.0),
        ("o3", 1, "p2", 100.0, 15.0),
        ("o4", 1, "p2", 200.0, 20.0),
        ("o5", 1, "p1", 300.0, 25.0),
        ("o2017", 1, "p1", 100.0, 10.0),
        ("o2016", 1, "p1", 100.0, 10.0),
    ]
    for oid, iid, pid, pr, fr in items_data:
        cur.execute(
            "INSERT INTO order_items VALUES (?, ?, ?, 's1', '2018-12-31', ?, ?)",
            (oid, iid, pid, pr, fr),
        )

    payments_data = [
        ("o1", 1, "credit_card", 1, 60.0),
        ("o2", 1, "credit_card", 1, 80.0),
        ("o3", 1, "credit_card", 1, 115.0),
        ("o4", 1, "credit_card", 1, 220.0),
        ("o5", 1, "credit_card", 1, 325.0),
        ("o2017", 1, "credit_card", 1, 110.0),
        ("o2016", 1, "credit_card", 1, 110.0),
    ]
    for oid, seq, ptype, inst, val in payments_data:
        cur.execute(
            "INSERT INTO order_payments VALUES (?, ?, ?, ?, ?)",
            (oid, seq, ptype, inst, val),
        )

    reviews_data = [
        ("r1_old", "o1", 1, "2018-08-01", "2018-08-01 10:00:00"),
        ("r1_new", "o1", 5, "2018-08-01", "2018-08-02 10:00:00"),
        ("r2", "o2", 4, "2018-08-01", "2018-08-02 10:00:00"),
        ("r3", "o3", 3, "2018-08-01", "2018-08-02 10:00:00"),
        ("r5", "o5", 5, "2018-08-01", "2018-08-02 10:00:00"),
        ("r2017", "o2017", 5, "2017-06-01", "2017-06-02 10:00:00"),
        ("r2016", "o2016", 5, "2016-06-01", "2016-06-02 10:00:00"),
    ]
    for rid, oid, score, cdate, adate in reviews_data:
        cur.execute(
            "INSERT INTO order_reviews VALUES (?, ?, ?, ?, ?)",
            (rid, oid, score, cdate, adate),
        )

    conn.commit()
    conn.close()

    monkeypatch.setattr("app.api.dashboard_router.resolve_db_path", lambda: str(db_file))
    monkeypatch.setattr("app.db.database.resolve_db_path", lambda: str(db_file))
    _DASHBOARD_CACHE.clear()
    return str(db_file)

def test_no_removed_demo_constants(temp_db):
    res = get_dashboard(period="All time")
    extracted = extract_metric_values(res)
    found_forbidden = [n for n in extracted if n in FORBIDDEN_CONSTANTS]
    assert not found_forbidden

def test_all_four_monthly_series_share_same_periods():
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time", granularity="Month")
    s_rev = [r["month"] for r in res["series"]["revenue_over_time"]]
    s_del = [r["period"] for r in res["series"]["delivery_performance"]]
    s_csat = [r["period"] for r in res["series"]["satisfaction_trend"]]
    s_canc = [r["period"] for r in res["series"]["cancellation_trend"]]

    assert s_rev == s_del
    assert s_del == s_csat
    assert s_csat == s_canc

def test_excluded_periods_respect_threshold():
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time", granularity="Month")
    meta = res["meta"]
    threshold = meta["minOrdersPerPeriod"]
    assert threshold == 100

    retained_periods = {r["month"] for r in res["series"]["revenue_over_time"]}
    for r in res["series"]["revenue_over_time"]:
        assert r["orders"] >= threshold

    for exc in meta["excludedPeriods"]:
        assert exc not in retained_periods

def test_category_filter_changes_metrics():
    _DASHBOARD_CACHE.clear()
    res_all = get_dashboard(period="All time", category="All Categories")
    _DASHBOARD_CACHE.clear()
    res_hb = get_dashboard(period="All time", category="Health & Beauty")

    kpi_all = {k["id"]: k["value"] for k in res_all["kpis"]}
    kpi_hb = {k["id"]: k["value"] for k in res_hb["kpis"]}

    assert kpi_all["revenue"] != kpi_hb["revenue"]
    assert kpi_all["delivery_time"] != kpi_hb["delivery_time"]
    assert kpi_all["review"] != kpi_hb["review"]

def test_previous_period_all_time_skips_partial_month():
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time")
    meta = res["meta"]
    assert meta["partialPeriod"] == "2018-10"
    assert meta["comparisonAvailable"] is False
    comp = meta["comparison"]
    assert comp["currentStart"] is None
    assert comp["currentEnd"] is None
    assert comp["previousStart"] is None
    assert comp["previousEnd"] is None
    for kpi in res["kpis"]:
        assert kpi["delta"] is None
    assert res["tables"]["period_comparison"] == []

def test_insight_sentence_revenue_equals_sum_of_named_categories():
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time")
    top_cats = res["tables"]["top_categories"]
    summary = res["insights"]["summary"]

    first_item = summary[0]
    desc = first_item["desc"]

    match = re.search(r"R\$\s*([\d,]+\.\d{2})", desc)
    assert match is not None
    cited_revenue = float(match.group(1).replace(",", ""))

    if len(top_cats) >= 2:
        expected_rev = round(top_cats[0]["revenue"] + top_cats[1]["revenue"], 2)
    elif len(top_cats) == 1:
        expected_rev = round(top_cats[0]["revenue"], 2)
    else:
        expected_rev = 0.0

    assert abs(cited_revenue - expected_rev) < 0.01

def test_missing_database_returns_503_and_nothing_cached(monkeypatch):
    _DASHBOARD_CACHE.clear()
    monkeypatch.setattr("app.api.dashboard_router.resolve_db_path", lambda: "C:/non_existent_folder/missing_database.db")
    client = TestClient(app)
    response = client.get("/api/dashboard?period=All%20time")
    assert response.status_code == 503
    assert not _DASHBOARD_CACHE


def test_totals_independent_of_granularity(temp_db):
    _DASHBOARD_CACHE.clear()
    res_m = get_dashboard(period="All time", granularity="Month")
    _DASHBOARD_CACHE.clear()
    res_q = get_dashboard(period="All time", granularity="Quarter")
    _DASHBOARD_CACHE.clear()
    res_w = get_dashboard(period="All time", granularity="Week")

    kpis_m = {k["id"]: k["value"] for k in res_m["kpis"]}
    kpis_q = {k["id"]: k["value"] for k in res_q["kpis"]}
    kpis_w = {k["id"]: k["value"] for k in res_w["kpis"]}

    assert kpis_m["revenue"] == kpis_q["revenue"] == kpis_w["revenue"]
    assert kpis_m["orders"] == kpis_q["orders"] == kpis_w["orders"]
    assert kpis_m["aov"] == kpis_q["aov"] == kpis_w["aov"]

def test_all_time_kpi_scope_equal_to_full_range(temp_db):
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time")
    kpis = {k["id"]: k for k in res["kpis"]}
    assert kpis["revenue"]["value"] == 720.0
    assert kpis["orders"]["value"] == 6
    assert kpis["aov"]["value"] == 120.0
    assert all(k["delta"] is None for k in res["kpis"])
    assert res["meta"]["kpiScope"]["mode"] == "all_time"

def test_no_double_counting_with_duplicate_reviews(temp_db):
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time")
    kpis = {k["id"]: k for k in res["kpis"]}
    assert kpis["orders"]["value"] == 6
    assert kpis["review"]["value"] is not None

def test_excluded_revenue_present(temp_db):
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time")
    assert "excludedRevenue" in res["meta"]
    assert isinstance(res["meta"]["excludedRevenue"], (int, float))

def test_bounded_period_returns_non_null_deltas_with_previous_data(temp_db):
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="Year 2017")
    assert res["meta"]["comparisonAvailable"] is True
    kpis = {k["id"]: k for k in res["kpis"]}
    assert kpis["revenue"]["delta"] is not None


def test_revenue_series_uses_moving_avg_key_not_target():
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time", granularity="Month")
    rows = res["series"]["revenue_over_time"]
    assert rows
    for r in rows:
        assert "movingAvg3" in r
        assert "target" not in r


def test_moving_avg_is_trailing_three_period_mean():
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time", granularity="Month")
    rows = res["series"]["revenue_over_time"]
    assert len(rows) >= 3
    assert rows[0]["movingAvg3"] is None
    assert rows[1]["movingAvg3"] is None
    for idx in range(2, len(rows)):
        expected = round(
            (rows[idx - 2]["revenue"] + rows[idx - 1]["revenue"] + rows[idx]["revenue"]) / 3.0,
            2,
        )
        assert abs(rows[idx]["movingAvg3"] - expected) < 0.01


def test_meta_exposes_moving_avg_definition():
    _DASHBOARD_CACHE.clear()
    res = get_dashboard(period="All time")
    assert "3-period moving average" in res["meta"]["movingAvg3Definition"]


def _sample_insight_inputs():
    top_categories = [
        {"category": "toys", "revenue": 1000.0, "orders": 10, "growth": 12.5},
        {"category": "auto", "revenue": 500.0, "orders": 5, "growth": 3.0},
    ]
    top_states = [
        {"name": "Bahia", "state": "BA", "avgDays": SLA_DAYS + 8.0, "slaRate": 60.0, "orders": 500},
        {"name": "Sao Paulo", "state": "SP", "avgDays": SLA_DAYS - 4.0, "slaRate": 95.0, "orders": 5000},
    ]
    metrics = {"revenue": 1500.0, "orders": 15, "avg_delivery": 10.0, "on_time_rate": 90.0, "avg_review": 4.0}
    return metrics, top_categories, top_states


def test_suggested_actions_are_rule_based_with_basis():
    metrics, top_categories, top_states = _sample_insight_inputs()
    out = build_executive_insights(metrics, top_categories, top_states, {})
    actions = out["suggestedActions"]
    assert len(actions) == 3
    for item in actions:
        assert item["action"].startswith("Suggested action (rule-based):")
        assert item["basis"]
    assert out["actionableRecommendations"] == [a["action"] for a in actions]
    assert "expectedImpact" not in str(out)


def test_suggested_actions_avoid_causal_claims():
    metrics, top_categories, top_states = _sample_insight_inputs()
    out = build_executive_insights(metrics, top_categories, top_states, {})
    banned = ("will ", "caused", "due to", "driven by", "expected to")
    for item in out["suggestedActions"]:
        text = item["action"].lower()
        assert not any(b in text for b in banned)