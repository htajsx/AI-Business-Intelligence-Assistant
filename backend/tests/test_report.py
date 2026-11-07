# tests/test_report.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.dashboard.queries import (
    query_series_data,
    get_comparison_windows,
    query_window_metrics,
    query_scope_metrics,
    detect_partial_period,
)
from app.report.service import generate_report
from app.schemas.report import ReportRequest
from app.db.database import execute_query

client = TestClient(app)


def test_report_and_dashboard_agree_on_headline_metrics():
    dash_scope = query_scope_metrics("All time", "All categories", "All states", compute_repeat=True)

    req = ReportRequest(period="All time", category="All categories", state="All states")
    report = generate_report(req)

    kpis = {k.key: k for k in report.kpis}

    assert kpis["revenue"].value == dash_scope["revenue"]
    assert kpis["orders"].value == float(dash_scope["orders"])
    assert kpis["aov"].value == dash_scope["aov"]
    assert kpis["avgDeliveryDays"].value == dash_scope["avg_delivery"]
    assert kpis["onTimeRate"].value == dash_scope["on_time_rate"]
    assert kpis["cancelRate"].value == dash_scope["cancel_rate"]
    assert kpis["avgReviewScore"].value == dash_scope["avg_review"]
    assert kpis["repeatPurchaseRate"].value == dash_scope["repeat_rate"]


def test_series_sum_equals_headline_revenue():
    req = ReportRequest(period="All time", category="All categories", state="All states")
    report = generate_report(req)
    total_rev = report.meta.totalRevenue
    series_sum = round(sum(p.revenue for p in report.trend.series), 2)
    assert total_rev >= series_sum
    if not report.meta.excludedPeriods:
        assert abs(total_rev - series_sum) < 0.05
    assert len(report.trend.series) >= 20


def test_all_time_disables_comparison_and_has_year_overview():
    req = ReportRequest(period="All time", category="All categories", state="All states")
    report = generate_report(req)
    assert report.scope.comparisonAvailable is False
    assert report.meta.comparisonAvailable is False
    assert report.scope.periodMode == "all_time"
    assert report.yearOverview is not None
    assert len(report.yearOverview) >= 3


def test_scope_case_b_single_category():
    req = ReportRequest(period="Year 2017", category="Health & Beauty", state="All states")
    report = generate_report(req)
    assert report.scope.categoryMode == "single"
    assert report.scope.stateMode == "all"
    assert report.position is not None
    assert report.categoryDeepDive is not None
    assert report.categories is None
    assert report.regions is None


def test_scope_case_c_single_state():
    req = ReportRequest(period="Year 2017", category="All categories", state="SP")
    report = generate_report(req)
    assert report.scope.categoryMode == "all"
    assert report.scope.stateMode == "single"
    assert report.position is not None
    assert report.topCities is not None
    assert report.regions is None
    assert report.categories is not None


def test_scope_case_d_segment():
    req = ReportRequest(period="Year 2017", category="Health & Beauty", state="SP")
    report = generate_report(req)
    assert report.scope.categoryMode == "single"
    assert report.scope.stateMode == "single"
    assert report.position is not None
    assert report.topCities is not None
    assert report.categories is None
    assert report.regions is None


def test_category_ranking_satisfies_minimum_orders():
    req = ReportRequest(period="Year 2017", category="All categories", state="All states")
    report = generate_report(req)
    if report.categories:
        for item in report.categories.topByGrowth:
            assert item.orders >= 100
        for item in report.categories.underperformers:
            assert item.orders >= 100


def test_anomalies_have_complete_evidence():
    req = ReportRequest(period="All time", category="All categories", state="All states")
    report = generate_report(req)
    for ano in report.anomalies:
        assert ano.metric != ""
        assert ano.observed != ""
        assert ano.baseline != ""
        assert ano.severity in ("High", "Medium", "Low")
        assert ano.deviation != 0.0


def test_no_nan_values_in_payload():
    req = ReportRequest(period="All time", category="All categories", state="All states")
    report = generate_report(req)
    payload_dict = report.model_dump()

    def check_nan(obj):
        if isinstance(obj, float):
            import math
            assert not math.isnan(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                check_nan(v)
        elif isinstance(obj, list):
            for item in obj:
                check_nan(item)

    check_nan(payload_dict)


def test_api_endpoint_post_report():
    response = client.post(
        "/api/report",
        json={"period": "Year 2017", "category": "All categories", "state": "All states"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "scope" in data
    assert "kpis" in data
    assert "meta" in data
    assert data["meta"]["requestedPeriod"] == "Year 2017"


def test_category_position_no_null_and_threshold():
    req = ReportRequest(period="All time", category="bed_bath_table", state="All states")
    report = generate_report(req)
    assert report.position is not None
    assert report.position.rank is not None

    q = """
    SELECT COUNT(*) as c
    FROM (
        SELECT p.product_category_name, COUNT(DISTINCT o.order_id) as ords
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE o.order_status = 'delivered'
        GROUP BY p.product_category_name
        HAVING p.product_category_name IS NOT NULL AND trim(p.product_category_name) != '' AND ords >= 100
    )
    """
    res = execute_query(q)
    if res:
        expected_total = res[0]["c"]
        assert report.position.total == expected_total


def test_category_position_not_ranked():
    q = """
    SELECT p.product_category_name, COUNT(DISTINCT o.order_id) as ords
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    WHERE o.order_status = 'delivered'
    GROUP BY p.product_category_name
    HAVING p.product_category_name IS NOT NULL AND trim(p.product_category_name) != '' AND ords > 0 AND ords < 100
    LIMIT 1
    """
    res = execute_query(q)
    if res:
        cat_name = res[0]["product_category_name"]
        req = ReportRequest(period="All time", category=cat_name, state="All states")
        report = generate_report(req)
        assert report.position is not None
        assert report.position.rank is None
        assert "Not ranked" in report.position.subtitle


def test_year_over_year_partial_handling():
    req = ReportRequest(period="All time", category="All categories", state="All states")
    report = generate_report(req)
    yo = report.yearOverview
    assert yo is not None
    for row in yo:
        if row.year in ("2016", "2018"):
            assert row.isPartial is True
            assert row.growthPct is None
            assert row.growthNote is not None
        elif row.year == "2017":
            assert row.growthPct is None
            assert row.growthNote is not None


def test_deep_dive_metrics_calculated_by_order():
    req = ReportRequest(period="All time", category="health_beauty", state="All states")
    report = generate_report(req)
    dd = report.categoryDeepDive
    assert dd is not None

    q = """
    WITH order_level AS (
        SELECT 
            o.order_id,
            c.customer_state,
            o.order_delivered_customer_date,
            o.order_purchase_timestamp,
            o.order_estimated_delivery_date
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        WHERE EXISTS (
            SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = o.order_id AND p.product_category_name = 'health_beauty'
        )
        AND o.order_status = 'delivered'
    )
    SELECT
        customer_state AS state,
        ROUND(100.0 * AVG(CASE WHEN order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date >= order_purchase_timestamp THEN order_delivered_customer_date <= order_estimated_delivery_date END), 1) AS sla_rate
    FROM order_level
    GROUP BY customer_state
    ORDER BY SUM((SELECT SUM(price) FROM order_items WHERE order_id = order_level.order_id)) DESC
    LIMIT 1
    """
    res = execute_query(q)
    if res and len(dd) > 0:
        expected_sla = float(res[0]["sla_rate"] or 0)
        actual_sla = float(dd[0].onTimeRate or 0)
        assert abs(expected_sla - actual_sla) < 0.1


# ---- New tests for C7/C8/C3 ----

def test_invalid_inputs_return_422():
    r1 = client.post(
        "/api/report",
        json={"period": "2017-13-45 - 2017-12-31", "category": "All categories", "state": "All states"},
    )
    assert r1.status_code == 422

    r2 = client.post(
        "/api/report",
        json={"period": "Year 2017", "category": "All categories", "state": "All states", "granularity": "Day"},
    )
    assert r2.status_code == 422

    r3 = client.post(
        "/api/report",
        json={"period": "Year 2017", "category": "All categories", "state": "ZZ"},
    )
    assert r3.status_code == 422


def test_report_cache_lru_limit(monkeypatch):
    from app.report import service as rr
    from app.report import queries as rq

    rr._REPORT_CACHE.clear()
    monkeypatch.setattr(rq, "execute_query", lambda *a, **k: [])

    empty_metrics = {
        "revenue": 0.0, "orders": 0, "aov": 0.0, "avg_delivery": None,
        "on_time_rate": None, "avg_review": None, "cancel_rate": None,
        "repeat_rate": None, "fulfillment_health": None, "fast_dispatch": None,
        "rev45": None, "rev5": None,
    }
    monkeypatch.setattr(rr, "query_series_data", lambda **k: ([], [], [], [], [], 100))
    monkeypatch.setattr(rr, "query_scope_metrics", lambda *a, **k: dict(empty_metrics))
    monkeypatch.setattr(rr, "query_window_metrics", lambda *a, **k: dict(empty_metrics))
    monkeypatch.setattr(rr, "query_totals", lambda **k: {"revenue": 0.0, "orders": 0, "aov": 0.0})
    monkeypatch.setattr(rr, "query_sample_size", lambda *a, **k: {"orders": 0, "revenue": 0.0, "level": "empty"})
    monkeypatch.setattr(rr, "query_anomalies", lambda **k: [])
    monkeypatch.setattr(rr, "query_top_states", lambda **k: ([], []))
    monkeypatch.setattr(rr, "query_year_over_year", lambda **k: [])
    monkeypatch.setattr(rr, "query_category_period_breakdown", lambda **k: {})
    monkeypatch.setattr(rr, "query_category_position", lambda *a, **k: None)
    monkeypatch.setattr(rr, "query_state_position", lambda *a, **k: None)
    monkeypatch.setattr(rr, "query_category_deep_dive", lambda *a, **k: [])
    monkeypatch.setattr(rr, "query_top_cities", lambda *a, **k: [])

    years = list(range(2010, 2020))
    cats = ["All categories", "health_beauty", "bed_bath_table", "sports_leisure", "toys"]
    states = ["All states", "SP", "RJ"]

    combos = []
    for y in years:
        for c in cats:
            for s in states:
                combos.append((f"Year {y}", c, s))

    for period, cat, st in combos[:150]:
        req = rr.ReportRequest(period=period, category=cat, state=st, granularity="Month")
        rr.generate_report(req)

    assert len(rr._REPORT_CACHE) <= 100


def test_empty_sample_kpis_are_neutral(monkeypatch):
    from app.report import service as rr

    rr._REPORT_CACHE.clear()
    monkeypatch.setattr(rr, "query_sample_size", lambda *a, **k: {"orders": 0, "revenue": 0.0, "level": "empty"})

    req = rr.ReportRequest(period="Year 2016", category="bed_bath_table", state="AC")
    report = rr.generate_report(req)

    for kpi in report.kpis:
        assert kpi.tone == "neutral", f"{kpi.key} tone={kpi.tone}"
        assert kpi.status == "No data", f"{kpi.key} status={kpi.status}"
        assert kpi.value is None, f"{kpi.key} value={kpi.value}"


def test_validation_status_reflects_excluded_periods(monkeypatch):
    from app.report import service as rr

    rr._REPORT_CACHE.clear()
    original = rr.query_series_data

    def mocked(period, category, state, granularity):
        revs, dels, sats, cans, excluded, min_orders = original(period, category, state, granularity)
        if not excluded and len(revs) > 1:
            first = revs[0]["month"]
            revs = revs[1:]
            dels = [d for d in dels if d.get("period") != first]
            sats = [s for s in sats if s.get("period") != first]
            cans = [c for c in cans if c.get("period") != first]
            excluded = [first]
        return revs, dels, sats, cans, excluded, min_orders

    monkeypatch.setattr(rr, "query_series_data", mocked)

    req = rr.ReportRequest(period="All time", category="All categories", state="All states")
    report = rr.generate_report(req)

    status = report.meta.validation["status"]
    assert status != "Verified", f"status should not be bare 'Verified', got: {status}"
    assert ("excluded" in status.lower()) or (status == "Discrepancy Detected")


def test_no_forbidden_strings_in_payload():
    req = ReportRequest(period="Year 2017", category="All categories", state="All states")
    report = generate_report(req)
    payload_str = report.model_dump_json().lower()
    assert "carrier delivery" not in payload_str
    assert "expected impact" not in payload_str