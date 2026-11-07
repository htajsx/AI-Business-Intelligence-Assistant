import re
from typing import Any

from app.tools.result import failure, rows_to_columns

VALID_TYPES = ("line", "bar")
VALID_FORMATS = ("currency", "number", "percent")
_TIME_NAME = re.compile(r"month|date|day|week|year", re.IGNORECASE)
_TIME_VALUE = re.compile(r"^\d{4}-\d{2}")
_CURRENCY_NAME = re.compile(r"revenue|price|value|amount|aov", re.IGNORECASE)
_PERCENT_NAME = re.compile(r"rate|pct|percent", re.IGNORECASE)

BRAZIL_UFS = {
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
    "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
    "RO", "RR", "RS", "SC", "SE", "SP", "TO"
}


def _first_non_null(rows: list[dict], column: str):
    for row in rows:
        if isinstance(row, dict) and row.get(column) is not None:
            return row[column]
    return None


def _is_numeric(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _is_time_like(column: str, rows: list[dict]) -> bool:
    if _TIME_NAME.search(column):
        return True
    sample = _first_non_null(rows, column)
    return isinstance(sample, str) and bool(_TIME_VALUE.match(sample))


def _label(column: str) -> str:
    return column.replace("_", " ").strip().title()


def _infer_format(y: str, meta: dict | None, requested: str | None) -> str:
    if isinstance(requested, str) and requested.strip().lower() in VALID_FORMATS:
        return requested.strip().lower()
    if isinstance(meta, dict):
        unit = meta.get("unit")
        meta_y = meta.get("y_column")
        if unit and meta_y in (None, y):
            if unit == "currency":
                return "currency"
            if unit == "percent":
                return "percent"
            return "number"
    if _CURRENCY_NAME.search(y):
        return "currency"
    if _PERCENT_NAME.search(y):
        return "percent"
    return "number"


def _table_parts(table) -> tuple[list[str], list[dict]]:
    if not isinstance(table, dict):
        return [], []
    rows = table.get("rows")
    rows = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    columns = table.get("columns")
    if not isinstance(columns, list) or not columns:
        columns = rows_to_columns(rows)
    return [str(column) for column in columns], rows


def _build_spec(
    chart_type: str,
    x: str,
    y: str,
    title: str,
    y_format: str,
    highlight: Any = None,
    subtitle: str | None = None,
) -> dict:
    spec = {"type": chart_type, "x": x, "y": y, "title": title, "yFormat": y_format}
    if highlight is not None:
        spec["highlight"] = highlight
    if subtitle is not None:
        spec["subtitle"] = subtitle
    return spec


def _is_brazil_state_col(x: str, rows: list[dict]) -> bool:
    count = 0
    for r in rows:
        val = r.get(x)
        if isinstance(val, str) and val.strip().upper() in BRAZIL_UFS:
            count += 1
    return count >= 8 or (len(rows) > 0 and count == len(rows))


def auto_chart(table: dict | None, meta: dict | None = None, *, advanced: bool = False) -> dict | None:
    columns, rows = _table_parts(table)
    if len(rows) < 2 or not columns:
        return None

    numeric_columns = [c for c in columns if _is_numeric(_first_non_null(rows, c))]
    categorical_columns = [
        c for c in columns
        if c not in numeric_columns and _first_non_null(rows, c) is not None
    ]
    if not numeric_columns or not categorical_columns:
        return None

    x = next((c for c in categorical_columns if _is_time_like(c, rows)), categorical_columns[0])
    y = numeric_columns[0]
    fmt = _infer_format(y, meta, None)

    if not advanced:
        chart_type = "line" if _is_time_like(x, rows) else "bar"
        title = f"{_label(y)} by {_label(x)}"
        return {"type": chart_type, "x": x, "y": y, "title": title, "yFormat": fmt}

    sub = None
    if fmt == "currency":
        sub = "Values in BRL (R$)"
    elif fmt == "percent":
        sub = "Percentage (%)"

    is_time = _is_time_like(x, rows)
    if is_time:
        peak_idx = 0
        max_val = float("-inf")
        for i, r in enumerate(rows):
            v = r.get(y)
            if isinstance(v, (int, float)) and v > max_val:
                max_val = v
                peak_idx = i
        return _build_spec("area", x, y, f"{_label(y)} Trend", fmt, highlight=peak_idx, subtitle=sub)

    if _is_brazil_state_col(x, rows) and len(rows) >= 8:
        return _build_spec("brazil_map", x, y, f"{_label(y)} by State", fmt, subtitle="Geographic distribution across Brazil")

    y_sum = sum(r.get(y, 0) for r in rows if isinstance(r.get(y), (int, float)))
    is_mix = 2 <= len(rows) <= 6 and (95.0 <= y_sum <= 105.0 or x in ("payment_type", "order_status"))
    if is_mix:
        return _build_spec("donut", x, y, f"{_label(y)} Composition", fmt, subtitle=sub)

    return _build_spec("bar_horizontal", x, y, f"{_label(y)} by {_label(x)}", fmt, highlight=0, subtitle=sub)


def make_chart(
    ctx,
    chart_type: str,
    x: str,
    y: str,
    title: str = "",
    y_format: str | None = None,
) -> dict:
    table = getattr(ctx, "last_table", None)
    if not isinstance(table, dict):
        return failure("No result table yet. Call get_kpi or run_sql first.")

    columns, rows = _table_parts(table)
    if not rows:
        return failure("No result table yet. Call get_kpi or run_sql first.")
    if len(rows) < 2:
        return failure("A single value does not need a chart.")

    meta = getattr(ctx, "last_meta", None)
    meta = meta if isinstance(meta, dict) else {}

    requested_type = chart_type.strip().lower() if isinstance(chart_type, str) else ""
    valid = (
        requested_type in VALID_TYPES
        and isinstance(x, str)
        and isinstance(y, str)
        and x in columns
        and y in columns
        and x != y
        and _is_numeric(_first_non_null(rows, y))
    )

    if not valid:
        spec = auto_chart(table, meta, advanced=False)
        if spec is None:
            return failure("Could not build a chart from the last result table.")
        ctx.chart = spec
        return {"ok": True, "chart": spec, "fallback": True}

    final_type = "line" if _is_time_like(x, rows) else "bar"
    final_title = title.strip() if isinstance(title, str) and title.strip() else f"{_label(y)} by {_label(x)}"
    spec = {"type": final_type, "x": x, "y": y, "title": final_title, "yFormat": _infer_format(y, meta, y_format)}
    ctx.chart = spec
    return {"ok": True, "chart": spec}
