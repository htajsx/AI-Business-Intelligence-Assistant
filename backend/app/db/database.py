import os
import sqlite3
from contextlib import contextmanager
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "data", "processed", "olist.db")

for path in [
    os.path.abspath(os.path.join(BASE_DIR, "backend/.env")),
    os.path.abspath(os.path.join(BASE_DIR, ".env")),
    ".env",
]:
    if os.path.exists(path):
        load_dotenv(dotenv_path=path)

def resolve_db_path() -> str:
    env_db = os.getenv("DATABASE_URL") or os.getenv("DB_URL", "")
    if env_db.startswith("sqlite:///"):
        raw_path = env_db.replace("sqlite:///", "")
        if not os.path.isabs(raw_path):
            candidate = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", raw_path))
            if os.path.exists(candidate):
                return candidate
            candidate_base = os.path.abspath(os.path.join(BASE_DIR, raw_path))
            if os.path.exists(candidate_base):
                return candidate_base
        elif os.path.exists(raw_path):
            return raw_path
    return DEFAULT_DB_PATH

DB_PATH = resolve_db_path()

@contextmanager
def get_db_connection():
    db_file = resolve_db_path()
    conn = sqlite3.connect(f"file:{db_file}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def execute_query(query: str, params: tuple = ()) -> list[dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
