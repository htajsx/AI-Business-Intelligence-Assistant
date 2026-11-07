# app/report/calculations.py
import datetime
from typing import Optional


def _compute_comparison_note(
    curr_start: Optional[str],
    curr_end: Optional[str],
    prev_start: Optional[str],
    prev_end: Optional[str],
) -> Optional[str]:
    if not (curr_start and curr_end and prev_start and prev_end):
        return None
    try:
        cs = datetime.datetime.strptime(curr_start[:10], "%Y-%m-%d")
        ce = datetime.datetime.strptime(curr_end[:10], "%Y-%m-%d")
        ps = datetime.datetime.strptime(prev_start[:10], "%Y-%m-%d")
        pe = datetime.datetime.strptime(prev_end[:10], "%Y-%m-%d")
    except (ValueError, TypeError):
        return None
    curr_days = (ce - cs).days + 1
    prev_days = (pe - ps).days + 1
    if curr_days == prev_days:
        return None

    def _fmt(days: int) -> str:
        months = days / 30.44
        if abs(months - round(months)) < 0.05:
            return f"{int(round(months))} months"
        return f"{months:.1f} months"

    return f"current period covers {_fmt(curr_days)} vs {_fmt(prev_days)} in previous period"
