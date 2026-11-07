import pytest
from app.security.sql_guard import validate_sql, validate_sql_with_meta

def test_sql_guard_allows_select_and_adds_limit():
    safe_query = "SELECT customer_id FROM customers"
    result = validate_sql(safe_query)
    assert "SELECT" in result.upper()
    assert "LIMIT 100" in result.upper()

def test_sql_guard_blocks_drop_table():
    dangerous_query = "DROP TABLE customers;"
    with pytest.raises(ValueError, match="Security violation: Only read-only SELECT queries are permitted."):
        validate_sql(dangerous_query)

def test_sql_guard_blocks_delete_data():
    dangerous_query = "DELETE FROM orders WHERE total_price > 100;"
    with pytest.raises(ValueError, match="Security violation: Only read-only SELECT queries are permitted."):
        validate_sql(dangerous_query)

def test_sql_guard_blocks_multi_statement():
    multi_query = "SELECT customer_id FROM customers; DROP TABLE customers;"
    with pytest.raises(ValueError, match="Security violation: Only read-only SELECT queries are permitted."):
        validate_sql(multi_query)

def test_sql_guard_blocks_pragma():
    pragma_query = "PRAGMA table_info(customers);"
    with pytest.raises(ValueError, match="Security violation: Only read-only SELECT queries are permitted."):
        validate_sql(pragma_query)

def test_sql_guard_allows_with_select():
    with_query = "WITH sub AS (SELECT customer_id FROM customers) SELECT * FROM sub;"
    result = validate_sql(with_query)
    assert "WITH" in result.upper()
    assert "LIMIT 100" in result.upper()

def test_sql_guard_auto_limit_flag():
    _, auto_added_true = validate_sql_with_meta("SELECT customer_id FROM customers")
    assert auto_added_true is True
    _, auto_added_false = validate_sql_with_meta("SELECT customer_id FROM customers LIMIT 10")
    assert auto_added_false is False
