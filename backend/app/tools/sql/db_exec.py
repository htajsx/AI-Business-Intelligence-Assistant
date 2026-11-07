import sqlite3
import time

from app.db.database import get_db_connection

MAX_VALUE_LENGTH = 5_000_000


def _apply_limits(conn: sqlite3.Connection) -> None:
    constant = getattr(sqlite3, "SQLITE_LIMIT_LENGTH", None)
    setlimit = getattr(conn, "setlimit", None)
    if constant is None or setlimit is None:
        return
    try:
        setlimit(constant, MAX_VALUE_LENGTH)
    except (ValueError, sqlite3.Error):
        pass


def run_query(
    sql: str,
    params=None,
    timeout_s: float = 10.0,
    max_rows: int | None = None,
) -> list[dict]:
    bound = () if params is None else params
    deadline = time.monotonic() + timeout_s

    def handler() -> int:
        return 1 if time.monotonic() > deadline else 0

    with get_db_connection() as conn:
        _apply_limits(conn)
        conn.set_progress_handler(handler, 10000)
        try:
            cursor = conn.cursor()
            cursor.execute(sql, bound)
            if max_rows is None:
                rows = cursor.fetchall()
            else:
                rows = cursor.fetchmany(max_rows)
            return [dict(row) for row in rows]
        finally:
            conn.set_progress_handler(None, 0)