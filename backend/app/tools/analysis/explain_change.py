import re
from datetime import date
from typing import Any

from app.security.sql_guard import validate_sql
from app.tools.sql.db_exec import run_query
from app.tools.result import failure, success
from app.utils.semantic import get_time_anchor

YEAR_PATTERN = re.compile(r"(\b201[6-8]\b)")


def _query(sql: str, params: tuple = ()) -> list[dict]:
    validated = validate_sql(sql)
    return run_query(validated, params)


def _decompose_revenue(start_a: str, end_a: str, start_b: str, end_b: str) -> dict:
    sql = """
    SELECT
      COUNT(DISTINCT o.order_id) AS orders,
      ROUND(SUM(oi.price), 2) AS revenue,
      ROUND(SUM(oi.price) * 1.0 / NULLIF(COUNT(DISTINCT o.order_id), 0), 2) AS aov
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.order_status = 'delivered'
      AND o.order_purchase_timestamp >= ?
      AND o.order_purchase_timestamp <= ?
    """
    rows_a = _query(sql, (f"{start_a} 00:00:00", f"{end_a} 23:59:59"))
    rows_b = _query(sql, (f"{start_b} 00:00:00", f"{end_b} 23:59:59"))

    data_a = rows_a[0] if rows_a else {"orders": 0, "revenue": 0.0, "aov": 0.0}
    data_b = rows_b[0] if rows_b else {"orders": 0, "revenue": 0.0, "aov": 0.0}

    rev_a = float(data_a.get("revenue") or 0.0)
    rev_b = float(data_b.get("revenue") or 0.0)
    rev_diff = round(rev_b - rev_a, 2)
    rev_pct = round((rev_diff / rev_a) * 100, 1) if rev_a > 0 else None

    orders_a = int(data_a.get("orders") or 0)
    orders_b = int(data_b.get("orders") or 0)
    orders_diff = orders_b - orders_a

    aov_a = float(data_a.get("aov") or 0.0)
    aov_b = float(data_b.get("aov") or 0.0)
    aov_diff = round(aov_b - aov_a, 2)

    return {
        "period_a": {"revenue": rev_a, "orders": orders_a, "aov": aov_a},
        "period_b": {"revenue": rev_b, "orders": orders_b, "aov": aov_b},
        "revenue_change": rev_diff,
        "revenue_change_pct": rev_pct,
        "orders_change": orders_diff,
        "aov_change": aov_diff,
    }


def _category_shifts(start_a: str, end_a: str, start_b: str, end_b: str) -> dict:
    sql = """
    WITH cat_a AS (
      SELECT
        p.product_category_name AS category,
        ROUND(SUM(oi.price), 2) AS rev_a
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      WHERE o.order_status = 'delivered'
        AND o.order_purchase_timestamp >= ? AND o.order_purchase_timestamp <= ?
      GROUP BY p.product_category_name
    ),
    cat_b AS (
      SELECT
        p.product_category_name AS category,
        ROUND(SUM(oi.price), 2) AS rev_b
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      WHERE o.order_status = 'delivered'
        AND o.order_purchase_timestamp >= ? AND o.order_purchase_timestamp <= ?
      GROUP BY p.product_category_name
    )
    SELECT
      COALESCE(cat_b.category, cat_a.category) AS category,
      COALESCE(cat_a.rev_a, 0) AS rev_a,
      COALESCE(cat_b.rev_b, 0) AS rev_b,
      ROUND(COALESCE(cat_b.rev_b, 0) - COALESCE(cat_a.rev_a, 0), 2) AS diff
    FROM cat_b
    LEFT JOIN cat_a ON cat_b.category = cat_a.category
    WHERE COALESCE(cat_b.category, cat_a.category) IS NOT NULL
    ORDER BY diff DESC
    """
    rows = _query(sql, (
        f"{start_a} 00:00:00", f"{end_a} 23:59:59",
        f"{start_b} 00:00:00", f"{end_b} 23:59:59",
    ))
    top_gainers = rows[:3] if rows else []
    top_decliners = sorted(rows, key=lambda r: r.get("diff", 0))[:3] if rows else []
    return {"gainers": top_gainers, "decliners": top_decliners}


def _operational_metrics(start_a: str, end_a: str, start_b: str, end_b: str) -> dict:
    sql = """
    SELECT
      ROUND(AVG(CASE WHEN o.order_delivered_customer_date <= o.order_estimated_delivery_date THEN 1.0 ELSE 0.0 END) * 100, 2) AS on_time_rate,
      ROUND(AVG(r.review_score), 2) AS avg_review,
      ROUND(AVG(CASE WHEN o.order_status = 'canceled' THEN 1.0 ELSE 0.0 END) * 100, 2) AS cancel_rate
    FROM orders o
    LEFT JOIN order_reviews r ON o.order_id = r.order_id
    WHERE o.order_purchase_timestamp >= ? AND o.order_purchase_timestamp <= ?
    """
    op_a = _query(sql, (f"{start_a} 00:00:00", f"{end_a} 23:59:59"))
    op_b = _query(sql, (f"{start_b} 00:00:00", f"{end_b} 23:59:59"))
    return {
        "period_a": op_a[0] if op_a else {},
        "period_b": op_b[0] if op_b else {},
    }


def explain_change(period_a: str = "2017", period_b: str = "2018") -> dict:
    try:
        anchor = get_time_anchor().date()
    except Exception:
        anchor = date(2018, 10, 17)

    start_a, end_a = "2017-01-01", "2017-12-31"
    start_b, end_b = "2018-01-01", "2018-12-31"
    caveat = None

    if "2018" in str(period_b) and "2017" in str(period_a):
        end_month_str = "08-31"
        start_a, end_a = f"2017-01-01", f"2017-{end_month_str}"
        start_b, end_b = f"2018-01-01", f"2018-{end_month_str}"
        caveat = (
            "Dữ liệu năm 2018 của Olist chỉ ghi nhận đầy đủ đến hết tháng 8/2018. "
            "Hệ thống đã tự động điều chỉnh đối chiếu cùng kỳ 8 tháng đầu năm (01/01 đến 31/08) giữa hai năm."
        )

    try:
        decomp = _decompose_revenue(start_a, end_a, start_b, end_b)
        shifts = _category_shifts(start_a, end_a, start_b, end_b)
        ops = _operational_metrics(start_a, end_a, start_b, end_b)

        result_rows = [
            {"metric": "Revenue (BRL)", "period_a": decomp["period_a"]["revenue"], "period_b": decomp["period_b"]["revenue"], "change": decomp["revenue_change"]},
            {"metric": "Delivered Orders", "period_a": decomp["period_a"]["orders"], "period_b": decomp["period_b"]["orders"], "change": decomp["orders_change"]},
            {"metric": "AOV (BRL)", "period_a": decomp["period_a"]["aov"], "period_b": decomp["period_b"]["aov"], "change": decomp["aov_change"]},
            {"metric": "On-Time Rate (%)", "period_a": ops["period_a"].get("on_time_rate"), "period_b": ops["period_b"].get("on_time_rate"), "change": None},
            {"metric": "Review Score", "period_a": ops["period_a"].get("avg_review"), "period_b": ops["period_b"].get("avg_review"), "change": None},
        ]

        return success(
            columns=["metric", "period_a", "period_b", "change"],
            rows=result_rows,
            decomposition=decomp,
            category_shifts=shifts,
            operational=ops,
            scope={"period_a": f"{start_a} to {end_a}", "period_b": f"{start_b} to {end_b}"},
            caveat=caveat,
            note="Analysis strictly reflects internal SQLite transactional records. External factors like macroeconomics or marketing spend are outside database boundaries.",
        )
    except Exception as e:
        return failure(f"Could not compute change explanation: {e}")

