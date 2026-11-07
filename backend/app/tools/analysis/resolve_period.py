import calendar
import re
from datetime import date, timedelta

from app.tools.result import failure
from app.utils.semantic import get_time_anchor

ALL_TIME_START = date(2016, 1, 1)

SUPPORTED_FORMATS = [
    "last_30_days",
    "last_month",
    "last_quarter",
    "this_year",
    "last_year",
    "all_time",
    "YYYY (for example 2017)",
    "YYYY-MM (for example 2017-11)",
    "YYYY-qN (for example 2017-q4)",
]

_YEAR = re.compile(r"^(\d{4})$")
_MONTH = re.compile(r"^(\d{4})-(\d{2})$")
_QUARTER = re.compile(r"^(\d{4})-q([1-4])$")


def _month_range(year: int, month: int) -> tuple[date, date]:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _quarter_range(year: int, quarter: int) -> tuple[date, date]:
    first_month = 3 * (quarter - 1) + 1
    start, _ = _month_range(year, first_month)
    _, end = _month_range(year, first_month + 2)
    return start, end


def _resolve(text: str, anchor: date) -> tuple[date, date, str] | None:
    if text == "last_30_days":
        return anchor - timedelta(days=30), anchor, "The 30 days before the anchor date, through the anchor date."

    if text == "last_month":
        year, month = anchor.year, anchor.month - 1
        if month == 0:
            year, month = year - 1, 12
        start, end = _month_range(year, month)
        return start, end, "The last full calendar month before the anchor month."

    if text == "last_quarter":
        current_quarter = (anchor.month - 1) // 3 + 1
        year, quarter = anchor.year, current_quarter - 1
        if quarter == 0:
            year, quarter = year - 1, 4
        start, end = _quarter_range(year, quarter)
        return start, end, "The last full calendar quarter before the anchor quarter."

    if text == "this_year":
        return date(anchor.year, 1, 1), anchor, "January 1 of the anchor year through the anchor date."

    if text == "last_year":
        year = anchor.year - 1
        return date(year, 1, 1), date(year, 12, 31), "The full calendar year before the anchor year."

    if text == "all_time":
        return ALL_TIME_START, anchor, "From 2016-01-01 through the anchor date."

    match = _YEAR.match(text)
    if match:
        year = int(match.group(1))
        return date(year, 1, 1), date(year, 12, 31), f"The full calendar year {year}."

    match = _MONTH.match(text)
    if match:
        year, month = int(match.group(1)), int(match.group(2))
        if not 1 <= month <= 12:
            return None
        start, end = _month_range(year, month)
        return start, end, f"The full calendar month {year}-{month:02d}."

    match = _QUARTER.match(text)
    if match:
        year, quarter = int(match.group(1)), int(match.group(2))
        start, end = _quarter_range(year, quarter)
        return start, end, f"The full calendar quarter {year} Q{quarter}."

    return None


def resolve_period(expression: str) -> dict:
    unsupported = f"Unsupported period expression. Supported formats: {', '.join(SUPPORTED_FORMATS)}."

    if not isinstance(expression, str) or not expression.strip():
        return failure(unsupported, expression=expression)

    try:
        anchor = get_time_anchor().date()
        resolved = _resolve(expression.strip().lower(), anchor)
    except Exception:
        return failure(unsupported, expression=expression)

    if resolved is None:
        return failure(unsupported, expression=expression)

    start, end, note = resolved
    low_volume_months: list[str] = []
    try:
        from app.db.database import execute_query
        q = """
        SELECT strftime('%Y-%m', order_purchase_timestamp) AS m,
               COUNT(*) AS cnt
        FROM orders
        WHERE order_status = 'delivered'
          AND order_purchase_timestamp >= ?
          AND order_purchase_timestamp <= ?
        GROUP BY m
        HAVING cnt < 100
        ORDER BY m ASC
        """
        rows = execute_query(q, (f"{start.isoformat()} 00:00:00", f"{end.isoformat()} 23:59:59"))
        low_volume_months = [r["m"] for r in rows if r.get("m")]
    except Exception:
        low_volume_months = []

    return {
        "ok": True,
        "expression": expression,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "anchor_date": anchor.isoformat(),
        "low_volume_months": low_volume_months,
        "note": note,
    }