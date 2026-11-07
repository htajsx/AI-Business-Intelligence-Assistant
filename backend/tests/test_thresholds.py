import re
from pathlib import Path

import pytest

from app.core import thresholds as T
from app.dashboard import queries as DQ
from app.report.service import generate_report
from app.schemas.report import ReportRequest

REPO_ROOT = Path(__file__).resolve().parents[2]
KPI_HELPERS = REPO_ROOT / "frontend" / "src" / "components" / "dashboard" / "shared" / "kpiHelpers.js"
REPORT_SCOPE = REPO_ROOT / "frontend" / "src" / "utils" / "reportScope.js"

VALID_SOURCE_TYPES = {"industry-benchmark", "team-defined", "statistical-convention"}


@pytest.mark.parametrize(
    "rate,expected",
    [
        (None, ("No data", "neutral")),
        (100.0, ("Optimal", "good")),
        (95.0, ("Optimal", "good")),
        (94.99, ("SLA Met", "good")),
        (90.0, ("SLA Met", "good")),
        (89.99, ("Acceptable", "warn")),
        (85.0, ("Acceptable", "warn")),
        (84.99, ("Breached", "bad")),
        (0.0, ("Breached", "bad")),
    ],
)
def test_classify_on_time_boundaries(rate, expected):
    assert T.classify_on_time(rate) == expected


@pytest.mark.parametrize(
    "rate,expected",
    [
        (None, ("No data", "neutral")),
        (0.0, ("Controlled", "good")),
        (1.0, ("Controlled", "good")),
        (1.01, ("Watch", "warn")),
        (2.0, ("Watch", "warn")),
        (2.01, ("High Risk", "bad")),
        (10.0, ("High Risk", "bad")),
    ],
)
def test_classify_cancellation_boundaries(rate, expected):
    assert T.classify_cancellation(rate) == expected


def test_classify_tier_boundaries():
    assert T.classify_tier(80.0, 80.0, 60.0) == "Optimal"
    assert T.classify_tier(79.99, 80.0, 60.0) == "Good"
    assert T.classify_tier(60.0, 80.0, 60.0) == "Good"
    assert T.classify_tier(59.99, 80.0, 60.0) == "Warning"
    assert T.classify_tier(None, 80.0, 60.0) == "Warning"


def test_registry_entries_have_source_and_valid_type():
    assert T.THRESHOLD_REGISTRY
    for name, entry in T.THRESHOLD_REGISTRY.items():
        assert entry["source"].strip(), name
        assert entry["source_type"] in VALID_SOURCE_TYPES, name
        assert entry["unit"].strip(), name


def test_registry_values_match_module_constants():
    for name, entry in T.THRESHOLD_REGISTRY.items():
        assert hasattr(T, name), name
        assert getattr(T, name) == entry["value"], name


def test_methodology_thresholds_shape():
    items = T.methodology_thresholds()
    assert len(items) == len(T.THRESHOLD_REGISTRY)
    for item in items:
        assert set(item.keys()) == {"name", "value", "unit", "sourceType", "source", "note"}
        assert item["source"].strip()


def test_dashboard_queries_reexports_legacy_names():
    assert DQ.SLA_DAYS == T.SLA_DAYS
    assert DQ.SLA_OPTIMAL_THRESHOLD == T.ON_TIME_OPTIMAL_PCT == 95.0
    assert DQ.SLA_GOOD_THRESHOLD == T.ON_TIME_FLOOR_PCT == 90.0
    assert DQ.SLA_ACCEPTABLE_THRESHOLD == T.ON_TIME_ACCEPTABLE_PCT == 85.0
    assert DQ.MIN_ORDERS_MONTH == T.MIN_ORDERS_MONTH
    assert DQ.MIN_ORDERS_WEEK == T.MIN_ORDERS_WEEK
    assert DQ.MIN_ORDERS_QUARTER == T.MIN_ORDERS_QUARTER
    assert DQ.ANOMALY_Z_THRESHOLD == T.ANOMALY_Z_THRESHOLD
    assert DQ.MIN_DAYS_ANOMALY == T.MIN_DAYS_ANOMALY
    assert DQ.MIN_ORDERS_BOTTOM_PERFORMER == T.MIN_ORDERS_BOTTOM_PERFORMER


def test_frontend_sla_days_matches_backend():
    text = KPI_HELPERS.read_text(encoding="utf-8")
    match = re.search(r"export\s+const\s+SLA_DAYS\s*=\s*(\d+(?:\.\d+)?)", text)
    assert match is not None
    assert float(match.group(1)) == float(T.SLA_DAYS)


def test_frontend_sample_thresholds_match_backend():
    text = REPORT_SCOPE.read_text(encoding="utf-8")
    block = re.search(r"SAMPLE_THRESHOLDS\s*=\s*\{(.*?)\}", text, re.S)
    assert block is not None
    body = block.group(1)
    found = {k: int(v) for k, v in re.findall(r"(EMPTY|VERY_LOW|LOW)\s*:\s*(\d+)", body)}
    assert found["EMPTY"] == T.SAMPLE_EMPTY
    assert found["VERY_LOW"] == T.SAMPLE_VERY_LOW
    assert found["LOW"] == T.SAMPLE_LOW


@pytest.mark.parametrize(
    "period,category,state",
    [
        ("All time", "All categories", "All states"),
        ("Year 2017", "All categories", "All states"),
        ("Year 2017", "All categories", "SP"),
    ],
)
def test_report_cancellation_status_consistent(period, category, state):
    report = generate_report(ReportRequest(period=period, category=category, state=state))
    kpi = next(k for k in report.kpis if k.key == "cancelRate")
    op = next(o for o in report.operations if o.name == "Cancellation Rate")
    expected_status, _ = T.classify_cancellation(kpi.value)
    assert kpi.status == expected_status
    assert op.status == expected_status
    assert op.target == T.CANCEL_CONTROLLED_MAX_PCT


@pytest.mark.parametrize(
    "period,category,state",
    [
        ("All time", "All categories", "All states"),
        ("Year 2017", "All categories", "All states"),
    ],
)
def test_report_on_time_status_consistent(period, category, state):
    report = generate_report(ReportRequest(period=period, category=category, state=state))
    kpi = next(k for k in report.kpis if k.key == "onTimeRate")
    op = next(o for o in report.operations if o.name == "On-Time Delivery Compliance")
    expected_status, _ = T.classify_on_time(kpi.value)
    assert kpi.status == expected_status
    assert op.status == expected_status
    assert op.target == T.ON_TIME_FLOOR_PCT


def test_cancellation_recommendation_only_when_high_risk():
    report = generate_report(ReportRequest(period="All time", category="All categories", state="All states"))
    kpi = next(k for k in report.kpis if k.key == "cancelRate")
    has_gate = any(r.action.startswith("Implement stricter stock confirmation") for r in report.recommendations)
    assert has_gate == (kpi.status == "High Risk")