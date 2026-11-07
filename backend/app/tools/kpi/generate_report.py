import calendar
import statistics
from datetime import date, datetime, timedelta

from app.tools.kpi.get_kpi import get_kpi, scalar_value
from app.tools.kpi.kpi_catalog import get_kpi_meta
from app.tools.result import failure
from app.utils.semantic import get_time_anchor

DATE_FORMAT = "%Y-%m-%d"
HEADLINE_KPIS = [
    "total_revenue",
    "order_count",
    "average_order_value",
    "on_time_delivery_rate",
    "average_review_score",
    "cancellation_rate",
]
CATEGORY_LIMIT = 50
TOP_CATEGORY_COUNT = 5
BOTTOM_CATEGORY_COUNT = 3
BOTTOM_MIN_ORDERS = 10
TOP_STATE_COUNT = 5
DROP_THRESHOLD_PCT = -20.0


def _parse_date(value, label: str) -> date:
    if not isinstance(value, str) or len(value) != 10:
        raise ValueError(f"{label} must be a date in YYYY-MM-DD format.")
    try:
        return datetime.strptime(value, DATE_FORMAT).date()
    except ValueError:
        raise ValueError(f"{label} '{value}' is not a valid calendar date in YYYY-MM-DD format.")


def previous_period(start: str, end: str) -> tuple[str, str]:
    start_d = datetime.strptime(start, DATE_FORMAT).date()
    end_d = datetime.strptime(end, DATE_FORMAT).date()
    length = (end_d - start_d).days + 1
    prev_end = start_d - timedelta(days=1)
    prev_start = prev_end - timedelta(days=length - 1)
    return prev_start.isoformat(), prev_end.isoformat()


def pct_change(current, previous) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def mom_changes(rows: list[dict], x: str, y: str) -> list[dict]:
    changes: list[dict] = []
    previous = None
    for row in rows:
        value = row.get(y)
        changes.append(
            {
                "period": row.get(x),
                "value": value,
                "change_pct": pct_change(value, previous),
            }
        )
        previous = value
    return changes


def zscore_outliers(rows: list[dict], x: str, y: str, threshold: float = 2.0) -> list[dict]:
    points = [(row.get(x), row.get(y)) for row in rows if row.get(y) is not None]
    if len(points) < 4:
        return []
    values = [float(value) for _, value in points]
    mean = statistics.fmean(values)
    deviation = statistics.pstdev(values)
    if deviation == 0:
        return []
    outliers: list[dict] = []
    for period, value in points:
        z = (float(value) - mean) / deviation
        if abs(z) >= threshold:
            outliers.append({"period": period, "value": value, "z": round(z, 2)})
    return outliers


def _month_bounds(month: str) -> tuple[date, date] | None:
    try:
        year_text, month_text = str(month).split("-")
        year, number = int(year_text), int(month_text)
        last_day = calendar.monthrange(year, number)[1]
        return date(year, number, 1), date(year, number, last_day)
    except (ValueError, TypeError):
        return None


def _month_index(month: str) -> int | None:
    try:
        year_text, month_text = str(month).split("-")
        return int(year_text) * 12 + int(month_text)
    except (ValueError, TypeError):
        return None


def _fully_covered(month: str, start_d: date, end_d: date, anchor_d: date) -> bool:
    bounds = _month_bounds(month)
    if bounds is None:
        return False
    first, last = bounds
    return start_d <= first and end_d >= last and last <= anchor_d


def _value_of(result: dict | None, name: str, label: str, notes: list[str]) -> float | None:
    if result is None or not result.get("ok"):
        message = result.get("error") if isinstance(result, dict) else "no result"
        notes.append(f"{name} could not be computed for the {label} period: {message}")
        return None
    value = scalar_value(result)
    if value is None:
        notes.append(f"{name} has no data for the {label} period.")
    return value


def _headline_entry(name: str, current, previous) -> dict:
    meta = get_kpi_meta(name) or {}
    delta_abs = None
    if current is not None and previous is not None:
        delta_abs = round(current - previous, 2)
    return {
        "current": current,
        "previous": previous,
        "delta_pct": pct_change(current, previous),
        "delta_abs": delta_abs,
        "unit": meta.get("unit"),
    }


def _category_row(row: dict, previous_map: dict | None) -> dict:
    category = row.get("category")
    revenue = row.get("revenue")
    previous_revenue = previous_map.get(category) if previous_map is not None else None
    return {
        "category": category,
        "revenue": revenue,
        "orders_count": row.get("orders_count"),
        "previous_revenue": previous_revenue,
        "growth_pct": pct_change(revenue, previous_revenue),
    }


def _build_anomalies(monthly_rows: list[dict], start_d: date, end_d: date, anchor_d: date) -> tuple[list[dict], list[str]]:
    covered = [row for row in monthly_rows if _fully_covered(row.get("month"), start_d, end_d, anchor_d)]
    low_volume_months = [
        row.get("month") for row in covered
        if row.get("orders_count") is not None and row.get("orders_count") < 100
    ]
    eligible = [
        row for row in covered
        if not (row.get("orders_count") is not None and row.get("orders_count") < 100)
    ]
    anomalies: list[dict] = []

    for outlier in zscore_outliers(eligible, "month", "revenue"):
        anomalies.append(
            {
                "severity": "warning",
                "type": "revenue_outlier",
                "month": outlier["period"],
                "value": outlier["value"],
                "text": (
                    f"Revenue in {outlier['period']} was R$ {outlier['value']:,.2f}, "
                    f"{outlier['z']:+.2f} standard deviations from the mean of the period."
                ),
            }
        )

    changes = mom_changes(eligible, "month", "revenue")
    for index in range(1, len(changes)):
        current = changes[index]
        previous = current_index = changes[index - 1]
        change = current["change_pct"]
        if change is None or change > DROP_THRESHOLD_PCT:
            continue
        this_month = _month_index(current["period"])
        last_month = _month_index(previous["period"])
        if this_month is None or last_month is None or this_month - last_month != 1:
            continue
        anomalies.append(
            {
                "severity": "warning",
                "type": "revenue_drop",
                "month": current["period"],
                "value": current["value"],
                "text": (
                    f"Revenue fell {abs(change):.1f}% in {current['period']} versus {previous['period']} "
                    f"(R$ {previous['value']:,.2f} to R$ {current['value']:,.2f})."
                ),
            }
        )

    return anomalies, low_volume_months


def _build_report(start_date: str, end_date: str) -> dict:
    try:
        start_d = _parse_date(start_date, "start_date")
        end_d = _parse_date(end_date, "end_date")
        if start_d > end_d:
            raise ValueError(f"start_date {start_date} must not be after end_date {end_date}.")
    except ValueError as e:
        return failure(str(e), stage="input")

    prev_start, prev_end = previous_period(start_date, end_date)
    anchor_d = get_time_anchor().date()
    notes: list[str] = ["repeat_purchase_rate is not period-based and was excluded."]

    current_revenue = get_kpi("total_revenue", start_date, end_date)
    if not current_revenue.get("ok"):
        return failure(
            f"Could not compute total_revenue for {start_date} to {end_date}: {current_revenue.get('error')}",
            stage="kpi",
        )

    headline: dict = {}
    for name in HEADLINE_KPIS:
        current_result = current_revenue if name == "total_revenue" else get_kpi(name, start_date, end_date)
        previous_result = get_kpi(name, prev_start, prev_end)
        current_value = _value_of(current_result, name, "current", notes)
        previous_value = _value_of(previous_result, name, "previous", notes)
        headline[name] = _headline_entry(name, current_value, previous_value)

    monthly_result = get_kpi("monthly_revenue", start_date, end_date)
    monthly_rows: list[dict] = []
    monthly_facts = None
    if monthly_result.get("ok"):
        monthly_rows = monthly_result.get("rows") or []
        changes = mom_changes(monthly_rows, "month", "revenue")
        monthly_facts = [
            {"month": item["period"], "revenue": item["value"], "mom_change_pct": item["change_pct"]}
            for item in changes
        ]
    else:
        notes.append(f"monthly_revenue could not be computed: {monthly_result.get('error')}")

    categories_result = get_kpi("top_categories_by_revenue", start_date, end_date, limit=CATEGORY_LIMIT)
    previous_categories_result = get_kpi("top_categories_by_revenue", prev_start, prev_end, limit=CATEGORY_LIMIT)

    previous_map = None
    if previous_categories_result.get("ok"):
        previous_map = {
            row.get("category"): row.get("revenue") for row in previous_categories_result.get("rows") or []
        }
    else:
        notes.append(
            f"top_categories_by_revenue could not be computed for the previous period: "
            f"{previous_categories_result.get('error')}"
        )

    top_categories = None
    bottom_categories = None
    if categories_result.get("ok"):
        category_rows = categories_result.get("rows") or []
        top_categories = [_category_row(row, previous_map) for row in category_rows[:TOP_CATEGORY_COUNT]]
        eligible = [
            row for row in category_rows
            if row.get("revenue") is not None and (row.get("orders_count") or 0) >= BOTTOM_MIN_ORDERS
        ]
        eligible.sort(key=lambda row: row["revenue"])
        bottom_categories = [_category_row(row, previous_map) for row in eligible[:BOTTOM_CATEGORY_COUNT]]
        if len(category_rows) >= CATEGORY_LIMIT:
            notes.append(
                f"bottom_categories are chosen among the top {CATEGORY_LIMIT} categories by revenue, "
                f"not among every category."
            )
    else:
        notes.append(f"top_categories_by_revenue could not be computed: {categories_result.get('error')}")

    states_result = get_kpi("top_states_by_revenue", start_date, end_date, limit=TOP_STATE_COUNT)
    top_states = None
    if states_result.get("ok"):
        top_states = [
            {
                "state": row.get("state"),
                "revenue": row.get("revenue"),
                "orders_count": row.get("orders_count"),
            }
            for row in (states_result.get("rows") or [])[:TOP_STATE_COUNT]
        ]
    else:
        notes.append(f"top_states_by_revenue could not be computed: {states_result.get('error')}")

    anomalies, low_volume_months = _build_anomalies(monthly_rows, start_d, end_d, anchor_d)
    if low_volume_months:
        notes.append(f"Low-volume months (< 100 orders) excluded from anomaly detection: {', '.join(low_volume_months)}.")
    notes.append(
        "Months only partly covered by the period, or ending after the anchor date, are excluded from anomaly detection."
    )

    facts = {
        "period": {
            "start": start_date,
            "end": end_date,
            "prev_start": prev_start,
            "prev_end": prev_end,
            "anchor_date": anchor_d.isoformat(),
        },
        "headline": headline,
        "monthly_revenue": monthly_facts,
        "top_categories": top_categories,
        "bottom_categories": bottom_categories,
        "top_states": top_states,
        "anomalies": anomalies,
        "notes": notes,
    }
    return {"ok": True, "facts": facts}


def generate_report(start_date: str, end_date: str) -> dict:
    try:
        return _build_report(start_date, end_date)
    except Exception as e:
        return failure(f"Report generation failed: {e}", stage="report")