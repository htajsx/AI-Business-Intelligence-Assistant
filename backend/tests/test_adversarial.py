import importlib
import json
import sqlite3
import time
from collections import defaultdict
from pathlib import Path

import pytest

from app.db.database import execute_query, resolve_db_path
from app.security.sql_guard import validate_sql
from app.tools.sql.db_exec import run_query
from app.tools.sql.sql_utils import extract_tables

run_sql_module = importlib.import_module("app.tools.sql.run_sql")

CASES_PATH = Path(__file__).resolve().parents[2] / "evaluation" / "test_set" / "adversarial.jsonl"
PROTECTED_TABLES = ("orders", "order_items", "customers")
VALID_EXPECTED = {"blocked", "safe_error", "allowed", "bounded"}
PRE_EXECUTION_STAGES = {"input", "guard", "allowlist"}
MAX_ELAPSED_S = 25.0
MIN_CASES = 25

requires_db = pytest.mark.skipif(
    not Path(resolve_db_path()).exists(),
    reason="SQLite database file not found",
)

RESULTS: list[tuple[str, str, str, bool]] = []


def load_cases() -> list[dict]:
    cases = []
    with CASES_PATH.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                cases.append(json.loads(line))
    return cases


CASES = load_cases()


def table_counts() -> dict[str, int]:
    counts = {}
    for name in PROTECTED_TABLES:
        counts[name] = execute_query(f"SELECT COUNT(*) AS n FROM {name}")[0]["n"]
    return counts


@pytest.fixture(scope="module")
def baseline_counts():
    return table_counts()


@pytest.fixture
def execution_spy(monkeypatch):
    calls: list[str] = []
    real = run_sql_module.run_query

    def wrapper(*args, **kwargs):
        calls.append(args[0] if args else kwargs.get("sql", ""))
        return real(*args, **kwargs)

    monkeypatch.setattr(run_sql_module, "run_query", wrapper)
    return calls


@pytest.fixture(scope="module", autouse=True)
def print_summary():
    yield
    if not RESULTS:
        return
    total = len(RESULTS)
    passed = sum(1 for item in RESULTS if item[3])
    by_expected: dict[str, list[bool]] = defaultdict(list)
    by_category: dict[str, list[bool]] = defaultdict(list)
    for _, category, expected, ok in RESULTS:
        by_expected[expected].append(ok)
        by_category[category].append(ok)
    print("\n" + "=" * 64)
    print("ADVERSARIAL SQL SECURITY SUMMARY")
    print("=" * 64)
    blocked = by_expected.get("blocked", [])
    print(f"Blocked before execution : {sum(blocked)}/{len(blocked)}")
    for label in ("safe_error", "bounded", "allowed"):
        values = by_expected.get(label, [])
        if values:
            print(f"{label:<25}: {sum(values)}/{len(values)}")
    print("-" * 64)
    for category, values in sorted(by_category.items()):
        print(f"{category:<25}: {sum(values)}/{len(values)}")
    print("-" * 64)
    print(f"TOTAL handled as expected: {passed}/{total}")
    failed = [item[0] for item in RESULTS if not item[3]]
    if failed:
        print("FAILED: " + ", ".join(failed))
    print("=" * 64)


def is_ok(result: dict) -> bool:
    return result.get("ok") is True


def test_case_file_is_well_formed():
    assert len(CASES) >= MIN_CASES
    ids = [case["id"] for case in CASES]
    assert len(ids) == len(set(ids))
    for case in CASES:
        assert set(case) >= {"id", "category", "sql", "expected", "notes"}
        assert case["expected"] in VALID_EXPECTED
        assert case["sql"].strip()
    categories = {case["category"] for case in CASES}
    assert categories >= {
        "write",
        "multi_statement",
        "meta_system",
        "allowlist",
        "data_protection",
        "resources",
    }


@requires_db
@pytest.mark.parametrize("case", CASES, ids=[case["id"] for case in CASES])
def test_adversarial_case(case, execution_spy, baseline_counts):
    started = time.perf_counter()
    result = run_sql_module.run_sql(case["sql"])
    elapsed = time.perf_counter() - started
    expected = case["expected"]
    passed = False
    try:
        if expected == "blocked":
            assert not is_ok(result), result
            assert result.get("stage") in PRE_EXECUTION_STAGES, result
            assert execution_spy == []
        elif expected == "safe_error":
            assert not is_ok(result), result
            assert result.get("error")
        elif expected == "allowed":
            assert is_ok(result), result
        elif expected == "bounded":
            if is_ok(result):
                assert len(result["rows"]) <= run_sql_module.MAX_ROWS
        assert elapsed < MAX_ELAPSED_S
        assert table_counts() == baseline_counts
        passed = True
    finally:
        RESULTS.append((case["id"], case["category"], expected, passed))


@requires_db
@pytest.mark.parametrize(
    "statement",
    [
        "DROP TABLE orders",
        "DELETE FROM orders",
        "UPDATE customers SET customer_id = 'x'",
        "INSERT INTO customers (customer_id) VALUES ('x')",
        "CREATE TABLE evil (x INTEGER)",
    ],
)
def test_readonly_connection_rejects_writes_even_without_guard(statement, baseline_counts):
    with pytest.raises(sqlite3.Error):
        run_query(statement)
    assert table_counts() == baseline_counts


@requires_db
def test_timeout_interrupts_runaway_query():
    started = time.perf_counter()
    with pytest.raises(sqlite3.Error):
        run_query(
            "WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c) SELECT COUNT(*) FROM c",
            timeout_s=1.0,
        )
    assert time.perf_counter() - started < 5.0


@requires_db
def test_run_query_max_rows_stops_unbounded_result_early():
    started = time.perf_counter()
    rows = run_query(
        "WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c) SELECT x FROM c LIMIT 999999999",
        max_rows=5,
    )
    assert len(rows) == 5
    assert time.perf_counter() - started < 2.0


@requires_db
def test_run_sql_caps_rows_for_huge_limit():
    result = run_sql_module.run_sql("SELECT order_id FROM orders LIMIT 999999999")
    assert result["ok"] is True
    assert len(result["rows"]) == run_sql_module.MAX_ROWS
    assert result.get("truncated") is True


def test_extract_tables_reports_table_valued_function():
    tables = extract_tables("SELECT * FROM pragma_table_info('orders')")
    assert [name.lower() for name in tables] == ["pragma_table_info"]


def test_extract_tables_reports_json_each():
    tables = extract_tables("SELECT value FROM json_each('[1,2]')")
    assert [name.lower() for name in tables] == ["json_each"]


def test_extract_tables_cte_self_reference_is_a_real_table():
    sql = "WITH sqlite_master AS (SELECT name FROM sqlite_master) SELECT * FROM sqlite_master"
    assert "sqlite_master" in [name.lower() for name in extract_tables(sql)]


def test_extract_tables_forward_reference_between_ctes_is_a_real_table():
    sql = "WITH a AS (SELECT * FROM b), b AS (SELECT 1 AS x) SELECT * FROM a"
    assert "b" in [name.lower() for name in extract_tables(sql)]


def test_extract_tables_ignores_plain_cte_name():
    sql = "WITH sub AS (SELECT customer_id FROM customers) SELECT * FROM sub"
    assert extract_tables(sql) == ["customers"]


def test_extract_tables_ignores_chained_cte_names():
    sql = (
        "WITH a AS (SELECT order_id FROM orders), "
        "b AS (SELECT order_id FROM a) "
        "SELECT * FROM b JOIN order_items USING (order_id)"
    )
    assert extract_tables(sql) == ["orders", "order_items"]


def test_extract_tables_ignores_recursive_cte_self_reference():
    sql = "WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c WHERE x < 5) SELECT x FROM c"
    assert extract_tables(sql) == []


def test_extract_tables_cte_in_union_branch():
    sql = "WITH a AS (SELECT order_id FROM orders) SELECT order_id FROM a UNION SELECT customer_id FROM customers"
    assert extract_tables(sql) == ["orders", "customers"]


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT load_extension('x')",
        "SELECT readfile('/etc/passwd')",
        "SELECT writefile('/tmp/x', 'y')",
        "SELECT zeroblob(1000000)",
        "SELECT randomblob(1000000)",
        "SELECT * FROM pragma_table_info('orders')",
        "SELECT LOAD_EXTENSION('x')",
    ],
)
def test_guard_rejects_dangerous_functions(sql):
    with pytest.raises(ValueError, match="Security violation"):
        validate_sql(sql)


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT COUNT(*) FROM orders",
        "SELECT SUM(price) FROM order_items",
        "SELECT strftime('%Y-%m', order_purchase_timestamp) AS m FROM orders",
        "SELECT ROUND(AVG(price), 2) FROM order_items",
        "SELECT COALESCE(order_status, 'x') FROM orders",
        "SELECT date(order_purchase_timestamp) FROM orders",
    ],
)
def test_guard_still_allows_common_functions(sql):
    assert "LIMIT 100" in validate_sql(sql).upper()