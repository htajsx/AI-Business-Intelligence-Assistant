from typing import Optional

SLA_DAYS = 12

ON_TIME_OPTIMAL_PCT = 95.0
ON_TIME_FLOOR_PCT = 90.0
ON_TIME_ACCEPTABLE_PCT = 85.0

CANCEL_CONTROLLED_MAX_PCT = 1.0
CANCEL_WATCH_MAX_PCT = 2.0

REPEAT_PURCHASE_REFERENCE_PCT = 28.2
REVIEW_SCORE_MAX = 5.0

FAST_DISPATCH_WINDOW_HOURS = 48.0
FAST_DISPATCH_OPTIMAL_PCT = 70.0
FAST_DISPATCH_GOOD_PCT = 50.0

WITHIN_SLA_OPTIMAL_PCT = 80.0
WITHIN_SLA_GOOD_PCT = 60.0

REVIEW_45_OPTIMAL_PCT = 80.0
REVIEW_45_GOOD_PCT = 70.0

REVIEW_5_OPTIMAL_PCT = 60.0
REVIEW_5_GOOD_PCT = 50.0

SEVERE_DELAY_DAYS = 20.0

RECONCILE_TOLERANCE_PCT = 1.0
COMPOUND_DELTA_TOLERANCE_PCT = 1.0
REVENUE_ROUNDING_TOLERANCE_BRL = 0.05

ANOMALY_Z_THRESHOLD = 2.5
ANOMALY_Z_HIGH = 3.0
MIN_DAYS_ANOMALY = 30
MIN_ANOMALY_POINTS = 6
ANOMALY_BASELINE_WINDOW_DAYS = 28
MIN_EVENTS_FOR_RATE_ALERT = 10

SAMPLE_EMPTY = 0
SAMPLE_VERY_LOW = 30
SAMPLE_LOW = 100
MIN_ORDERS_FOR_RANKING = 100
MIN_ORDERS_BOTTOM_PERFORMER = 100

MIN_ORDERS_WEEK = 25
MIN_ORDERS_MONTH = 100
MIN_ORDERS_QUARTER = 300

INDUSTRY = "industry-benchmark"
TEAM = "team-defined"
STAT = "statistical-convention"

_SRC_ON_TIME = 'GetOneCart, "On-Time Delivery Rate: Formula, Benchmarks & How to Improve 2026" (90% floor, 95% solid, 98%+ excellent; the page does not cite its own origin)'
_SRC_CANCEL = 'Racklify, "What Is Cancellation Rate? Definition, Calculation, and Benchmarks" (strict marketplaces: under 1% pre-fulfillment cancellations; small merchants: under 2-3% per month)'
_SRC_REPEAT = "Opensend, cited by Rivo"
_SRC_TEAM = "Team 13 decision (Emerging Topics in IT, topic 17)"
_SRC_3SIGMA = "3-sigma rule (empirical rule of the normal distribution)"
_SRC_N30 = "Rule of thumb n >= 30 for stable sample statistics"


def _entry(value, unit, source_type, source, note=""):
    return {
        "value": value,
        "unit": unit,
        "source_type": source_type,
        "source": source,
        "note": note,
    }


THRESHOLD_REGISTRY = {
    "ON_TIME_OPTIMAL_PCT": _entry(
        ON_TIME_OPTIMAL_PCT, "%", INDUSTRY, _SRC_ON_TIME,
        "On-time delivery at or above this value is classified Optimal.",
    ),
    "ON_TIME_FLOOR_PCT": _entry(
        ON_TIME_FLOOR_PCT, "%", INDUSTRY, _SRC_ON_TIME,
        "Minimum acceptable on-time delivery rate (SLA Met).",
    ),
    "ON_TIME_ACCEPTABLE_PCT": _entry(
        ON_TIME_ACCEPTABLE_PCT, "%", TEAM, _SRC_TEAM,
        "Team-defined band between the 90% floor and a breach.",
    ),
    "CANCEL_CONTROLLED_MAX_PCT": _entry(
        CANCEL_CONTROLLED_MAX_PCT, "%", INDUSTRY, _SRC_CANCEL,
        "Industry benchmark, not specific to Olist.",
    ),
    "CANCEL_WATCH_MAX_PCT": _entry(
        CANCEL_WATCH_MAX_PCT, "%", INDUSTRY, _SRC_CANCEL,
        "Industry benchmark, not specific to Olist. Above this value the status is High Risk.",
    ),
    "REPEAT_PURCHASE_REFERENCE_PCT": _entry(
        REPEAT_PURCHASE_REFERENCE_PCT, "%", INDUSTRY, _SRC_REPEAT,
        "Reference only, no good/bad classification: Olist customers are mostly one-time buyers.",
    ),
    "SLA_DAYS": _entry(
        SLA_DAYS, "days", TEAM, _SRC_TEAM,
        "Cross-check against the real average delivery time in the dataset.",
    ),
    "FAST_DISPATCH_WINDOW_HOURS": _entry(
        FAST_DISPATCH_WINDOW_HOURS, "hours", TEAM, _SRC_TEAM,
        "Window between purchase and handover to the carrier.",
    ),
    "FAST_DISPATCH_OPTIMAL_PCT": _entry(FAST_DISPATCH_OPTIMAL_PCT, "%", TEAM, _SRC_TEAM),
    "FAST_DISPATCH_GOOD_PCT": _entry(FAST_DISPATCH_GOOD_PCT, "%", TEAM, _SRC_TEAM),
    "WITHIN_SLA_OPTIMAL_PCT": _entry(WITHIN_SLA_OPTIMAL_PCT, "%", TEAM, _SRC_TEAM),
    "WITHIN_SLA_GOOD_PCT": _entry(WITHIN_SLA_GOOD_PCT, "%", TEAM, _SRC_TEAM),
    "REVIEW_45_OPTIMAL_PCT": _entry(REVIEW_45_OPTIMAL_PCT, "%", TEAM, _SRC_TEAM),
    "REVIEW_45_GOOD_PCT": _entry(REVIEW_45_GOOD_PCT, "%", TEAM, _SRC_TEAM),
    "REVIEW_5_OPTIMAL_PCT": _entry(REVIEW_5_OPTIMAL_PCT, "%", TEAM, _SRC_TEAM),
    "REVIEW_5_GOOD_PCT": _entry(REVIEW_5_GOOD_PCT, "%", TEAM, _SRC_TEAM),
    "SEVERE_DELAY_DAYS": _entry(SEVERE_DELAY_DAYS, "days", TEAM, _SRC_TEAM),
    "RECONCILE_TOLERANCE_PCT": _entry(
        RECONCILE_TOLERANCE_PCT, "%", TEAM, _SRC_TEAM,
        "Max difference between payments and items+freight before the status becomes review.",
    ),
    "COMPOUND_DELTA_TOLERANCE_PCT": _entry(
        COMPOUND_DELTA_TOLERANCE_PCT, "%", TEAM, _SRC_TEAM,
        "Max gap between revenue delta and compounded orders x AOV deltas.",
    ),
    "REVENUE_ROUNDING_TOLERANCE_BRL": _entry(
        REVENUE_ROUNDING_TOLERANCE_BRL, "BRL", TEAM, _SRC_TEAM,
        "Rounding tolerance when reconciling series revenue with headline revenue.",
    ),
    "ANOMALY_Z_THRESHOLD": _entry(ANOMALY_Z_THRESHOLD, "sigma", STAT, _SRC_3SIGMA),
    "ANOMALY_Z_HIGH": _entry(ANOMALY_Z_HIGH, "sigma", STAT, _SRC_3SIGMA),
    "MIN_DAYS_ANOMALY": _entry(MIN_DAYS_ANOMALY, "days", STAT, _SRC_N30),
    "MIN_ANOMALY_POINTS": _entry(MIN_ANOMALY_POINTS, "points", TEAM, _SRC_TEAM),
    "ANOMALY_BASELINE_WINDOW_DAYS": _entry(
        ANOMALY_BASELINE_WINDOW_DAYS, "days", STAT, _SRC_TEAM,
        "Trailing baseline window for anomaly detection excluding current day.",
    ),
    "MIN_EVENTS_FOR_RATE_ALERT": _entry(
        MIN_EVENTS_FOR_RATE_ALERT, "events", TEAM, _SRC_TEAM,
        "Minimum events required before triggering rate-based alerts.",
    ),
    "SAMPLE_EMPTY": _entry(SAMPLE_EMPTY, "orders", STAT, _SRC_N30),
    "SAMPLE_VERY_LOW": _entry(SAMPLE_VERY_LOW, "orders", STAT, _SRC_N30),
    "SAMPLE_LOW": _entry(SAMPLE_LOW, "orders", STAT, _SRC_N30),
    "MIN_ORDERS_FOR_RANKING": _entry(MIN_ORDERS_FOR_RANKING, "orders", STAT, _SRC_N30),
    "MIN_ORDERS_BOTTOM_PERFORMER": _entry(MIN_ORDERS_BOTTOM_PERFORMER, "orders", STAT, _SRC_N30),
    "MIN_ORDERS_WEEK": _entry(MIN_ORDERS_WEEK, "orders", TEAM, _SRC_TEAM),
    "MIN_ORDERS_MONTH": _entry(MIN_ORDERS_MONTH, "orders", TEAM, _SRC_TEAM),
    "MIN_ORDERS_QUARTER": _entry(MIN_ORDERS_QUARTER, "orders", TEAM, _SRC_TEAM),
}


def classify_on_time(rate: Optional[float]) -> tuple[str, str]:
    if rate is None:
        return "No data", "neutral"
    if rate >= ON_TIME_OPTIMAL_PCT:
        return "Optimal", "good"
    if rate >= ON_TIME_FLOOR_PCT:
        return "SLA Met", "good"
    if rate >= ON_TIME_ACCEPTABLE_PCT:
        return "Acceptable", "warn"
    return "Breached", "bad"


def classify_cancellation(rate: Optional[float]) -> tuple[str, str]:
    if rate is None:
        return "No data", "neutral"
    if rate <= CANCEL_CONTROLLED_MAX_PCT:
        return "Controlled", "good"
    if rate <= CANCEL_WATCH_MAX_PCT:
        return "Watch", "warn"
    return "High Risk", "bad"


def classify_tier(value: Optional[float], optimal: float, good: float) -> str:
    if value is None:
        return "Warning"
    if value >= optimal:
        return "Optimal"
    if value >= good:
        return "Good"
    return "Warning"


def methodology_thresholds() -> list[dict]:
    return [
        {
            "name": name,
            "value": meta["value"],
            "unit": meta["unit"],
            "sourceType": meta["source_type"],
            "source": meta["source"],
            "note": meta["note"],
        }
        for name, meta in THRESHOLD_REGISTRY.items()
    ]
