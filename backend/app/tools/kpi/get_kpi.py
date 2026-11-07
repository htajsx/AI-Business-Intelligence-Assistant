import sqlite3
import time
from datetime import datetime

from app.security.sql_guard import validate_sql
from app.tools.sql.db_exec import run_query
from app.tools.kpi.kpi_catalog import get_kpi_meta
from app.tools.result import failure, rows_to_columns, success
from app.tools.sql.sql_utils import extract_tables, render_sql
from app.utils.semantic import get_kpi_names, get_kpi_spec

DATE_FORMAT = "%Y-%m-%d"
MIN_LIMIT = 1
MAX_LIMIT = 50
SYNTAX_PREFIX = "SQL Syntax Error"


def _parse_date(value, label: str) -> datetime:
    if not isinstance(value, str) or len(value) != 10:
        raise ValueError(f"{label} must be a date in YYYY-MM-DD format.")
    try:
        return datetime.strptime(value, DATE_FORMAT)
    except ValueError:
        raise ValueError(f"{label} '{value}' is not a valid calendar date in YYYY-MM-DD format.")


def _resolve_limit(limit, meta: dict) -> int | None:
    if not meta.get("supports_limit"):
        return None
    value = limit if limit is not None else meta.get("default_limit")
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValueError("limit must be an integer.")
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValueError("limit must be an integer.")
    return max(MIN_LIMIT, min(MAX_LIMIT, number))


def _prepare_sql(template_text: str, params: dict) -> str:
    try:
        return validate_sql(template_text)
    except ValueError as e:
        if not str(e).startswith(SYNTAX_PREFIX):
            raise
    rendered = render_sql(template_text, params)
    validated = validate_sql(rendered)
    cleaned = rendered.strip().rstrip(";")
    return template_text + validated[len(cleaned):]


def get_kpi(
    name: str,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int | None = None,
) -> dict:
    valid_names = get_kpi_names()
    spec = get_kpi_spec(name) if isinstance(name, str) else None
    meta = get_kpi_meta(name) if isinstance(name, str) else None
    if not spec or not meta:
        return failure(
            f"Unknown KPI '{name}'. Valid KPIs: {', '.join(valid_names)}.",
            kpi=name,
            stage="input",
        )

    template = spec.get("sql_template") if isinstance(spec, dict) else None
    if not isinstance(template, str) or not template.strip():
        return failure(f"KPI '{name}' has no SQL template.", kpi=name, stage="input")

    try:
        start_parsed = _parse_date(start_date, "start_date") if start_date is not None else None
        end_parsed = _parse_date(end_date, "end_date") if end_date is not None else None
        if start_parsed and end_parsed and start_parsed > end_parsed:
            raise ValueError(f"start_date {start_date} must not be after end_date {end_date}.")
        effective_limit = _resolve_limit(limit, meta)
    except ValueError as e:
        return failure(str(e), kpi=name, stage="input")

    bound = {
        "start_date": f"{start_date} 00:00:00" if start_date is not None else None,
        "end_date": f"{end_date} 23:59:59" if end_date is not None else None,
        "limit": effective_limit,
    }

    template_text = template.strip().rstrip(";").strip()

    try:
        safe_sql = _prepare_sql(template_text, bound)
    except ValueError as e:
        return failure(str(e), kpi=name, stage="guard")
    except Exception as e:
        return failure(str(e), kpi=name, stage="guard")

    started = time.perf_counter()
    try:
        rows = run_query(safe_sql, bound)
    except (sqlite3.Error, ValueError) as e:
        return failure(f"SQL execution failed: {e}", kpi=name, stage="execute")
    except Exception as e:
        return failure(f"SQL execution failed: {e}", kpi=name, stage="execute")
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    notes: list[str] = []
    dates_given = start_date is not None or end_date is not None
    if not meta["supports_dates"] and dates_given:
        date_filter_applied = False
        notes.append("This KPI ignores the period.")
    else:
        date_filter_applied = True

    y_column = meta["y_column"]
    if meta["kind"] == "scalar":
        value = rows[0].get(y_column) if rows else None
        if value is None:
            notes.append("No data for this period.")

    rendered_sql = render_sql(template_text, bound)
    tables = extract_tables(template_text) or extract_tables(rendered_sql)

    extra: dict = {
        "kpi": name,
        "kind": meta["kind"],
        "unit": meta["unit"],
        "x_column": meta["x_column"],
        "y_column": y_column,
        "params": {"start_date": start_date, "end_date": end_date, "limit": limit},
        "date_filter_applied": date_filter_applied,
        "sql": rendered_sql,
        "tables_used": tables,
        "elapsed_ms": elapsed_ms,
    }
    if notes:
        extra["note"] = " ".join(notes)

    return success(rows_to_columns(rows), rows, **extra)


def scalar_value(result: dict) -> float | None:
    if not isinstance(result, dict) or not result.get("ok"):
        return None
    rows = result.get("rows") or []
    if not rows:
        return None
    value = rows[0].get(result.get("y_column"))
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None