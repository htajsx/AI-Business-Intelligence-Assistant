import re
import sqlite3
import time

import sqlglot
from sqlglot import exp

from app.db.database import execute_query
from app.security.sql_guard import DEFAULT_LIMIT, validate_sql_with_meta
from app.tools.sql.db_exec import run_query
from app.tools.result import failure, rows_to_columns, success
from app.tools.sql.sql_utils import extract_tables
from app.utils.semantic import get_tables

MAX_ROWS = 200
QUERY_TIMEOUT_S = 10.0
_COMMENT_COLUMNS = re.compile(r"review_comment_title|review_comment_message", re.IGNORECASE)
_REVIEWS_MESSAGE = "Select explicit columns from order_reviews and do not read review comments."


def _has_bare_star(sql: str) -> bool:
    try:
        tree = sqlglot.parse_one(sql, dialect="sqlite")
    except Exception:
        return False
    if tree is None:
        return False
    for star in tree.find_all(exp.Star):
        if not isinstance(star.parent, exp.Count):
            return True
    return False


def run_sql(query: str) -> dict:
    if not isinstance(query, str) or not query.strip():
        return failure("Empty query.", stage="input")

    try:
        safe_sql, limit_auto_added = validate_sql_with_meta(query)
    except ValueError as e:
        return failure(str(e), sql=query, stage="guard")
    except Exception as e:
        return failure(str(e), sql=query, stage="guard")

    tables = extract_tables(safe_sql)
    allowed = {name.lower() for name in get_tables().keys()}
    for name in tables:
        if name.lower() not in allowed:
            return failure(f"Table '{name}' is not allowed.", sql=safe_sql, stage="allowlist")

    if _COMMENT_COLUMNS.search(safe_sql):
        return failure(_REVIEWS_MESSAGE, sql=safe_sql, stage="allowlist")

    if any(name.lower() == "order_reviews" for name in tables) and _has_bare_star(safe_sql):
        return failure(_REVIEWS_MESSAGE, sql=safe_sql, stage="allowlist")

    started = time.perf_counter()
    try:
        rows = run_query(safe_sql, timeout_s=QUERY_TIMEOUT_S, max_rows=MAX_ROWS + 1)
    except sqlite3.Error as e:
        return failure(f"SQL execution failed: {e}", sql=safe_sql, stage="execute")
    except Exception as e:
        return failure(f"SQL execution failed: {e}", sql=safe_sql, stage="execute")
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    extra: dict = {
        "sql": safe_sql,
        "tables_used": tables,
        "elapsed_ms": elapsed_ms,
    }

    if len(rows) > MAX_ROWS:
        rows = rows[:MAX_ROWS]
        extra["truncated"] = True
    elif limit_auto_added and len(rows) == DEFAULT_LIMIT:
        extra["truncated"] = True
        extra["note"] = "Result was capped at 100 rows. Add an explicit LIMIT or aggregate the data."

    if not rows:
        extra["note"] = "The query returned no rows."

    return success(rows_to_columns(rows), rows, **extra)