import calendar
import math
import os
import re
from datetime import datetime, timedelta
from typing import Any
from app.db.database import execute_query
from app.core.thresholds import (
    ANOMALY_BASELINE_WINDOW_DAYS,
    ANOMALY_Z_HIGH,
    ANOMALY_Z_THRESHOLD,
    CANCEL_CONTROLLED_MAX_PCT,
    FAST_DISPATCH_WINDOW_HOURS,
    MIN_DAYS_ANOMALY,
    MIN_EVENTS_FOR_RATE_ALERT,
    MIN_ORDERS_BOTTOM_PERFORMER,
    MIN_ORDERS_MONTH,
    MIN_ORDERS_QUARTER,
    MIN_ORDERS_WEEK,
    ON_TIME_ACCEPTABLE_PCT,
    ON_TIME_FLOOR_PCT,
    ON_TIME_OPTIMAL_PCT,
    RECONCILE_TOLERANCE_PCT,
    SEVERE_DELAY_DAYS,
    SLA_DAYS,
    classify_cancellation,
    classify_on_time,
)

SLA_OPTIMAL_THRESHOLD = ON_TIME_OPTIMAL_PCT
SLA_GOOD_THRESHOLD = ON_TIME_FLOOR_PCT
SLA_ACCEPTABLE_THRESHOLD = ON_TIME_ACCEPTABLE_PCT

EXPECTED_TABLES = [
    "orders",
    "order_items",
    "order_payments",
    "order_reviews",
    "customers",
    "products",
    "sellers",
]

LATEST_REVIEW_SUBQUERY = "(SELECT order_id, review_score FROM (SELECT order_id, review_score, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY review_answer_timestamp DESC, review_id DESC) AS rn FROM order_reviews) WHERE rn = 1)"

DELIVERED_VALID = "o.order_delivered_customer_date IS NOT NULL AND o.order_delivered_customer_date >= o.order_purchase_timestamp"

PALETTE = [
    "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#8b5cf6",
    "#ec4899", "#f59e0b", "#14b8a6", "#f97316", "#64748b"
]

STATE_NAMES = {
    "SP": "São Paulo", "RJ": "Rio de Janeiro", "MG": "Minas Gerais",
    "RS": "Rio Grande do Sul", "PR": "Paraná", "SC": "Santa Catarina",
    "BA": "Bahia", "DF": "Distrito Federal", "ES": "Espírito Santo",
    "GO": "Goiás", "PE": "Pernambuco", "CE": "Ceará", "PA": "Pará",
    "MT": "Mato Grosso", "MA": "Maranhão", "MS": "Mato Grosso do Sul",
    "PB": "Paraíba", "PI": "Piauí", "RN": "Rio Grande do Norte",
    "AL": "Alagoas", "SE": "Sergipe", "TO": "Tocantins", "RO": "Rondônia",
    "AM": "Amazonas", "AC": "Acre", "AP": "Amapá", "RR": "Roraima"
}

def normalize_category(cat: str | None) -> str:
    if not cat:
        return ""
    c = str(cat).strip().lower()
    if c in ("all", "all categories", "all category"):
        return ""
    c = c.replace("&", " ")
    return re.sub(r"[^a-z0-9]+", "_", c).strip("_")

def format_category_name(cat: str | None) -> str:
    if not cat:
        return "Unknown"
    return " ".join(word.capitalize() for word in str(cat).replace("_", " ").split())

def compute_sla_status(sla_rate: float) -> str:
    if sla_rate >= SLA_OPTIMAL_THRESHOLD:
        return "Optimal"
    if sla_rate >= SLA_GOOD_THRESHOLD:
        return "Good"
    if sla_rate >= SLA_ACCEPTABLE_THRESHOLD:
        return "Acceptable"
    return "Warning"

def format_where(clauses: list[str]) -> str:
    return f"WHERE {' AND '.join(clauses)}" if clauses else ""

def parse_period_range(period: str | None) -> tuple[str | None, str | None, str | None, str | None]:
    if not period:
        return (None, None, None, None)
    p = str(period).strip().lower()
    if p in ("all time", "all", ""):
        return (None, None, None, None)

    match = re.search(r"(\d{4}-\d{2}-\d{2})\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2})", p)
    if match:
        s, e = match.groups()
        dt_s = datetime.strptime(s, "%Y-%m-%d")
        dt_e = datetime.strptime(e, "%Y-%m-%d")
        duration = dt_e - dt_s
        prev_e_dt = dt_s - timedelta(seconds=1)
        prev_s_dt = prev_e_dt - duration
        return (
            f"{s} 00:00:00",
            f"{e} 23:59:59",
            prev_s_dt.strftime("%Y-%m-%d 00:00:00"),
            prev_e_dt.strftime("%Y-%m-%d 23:59:59"),
        )

    q_match = re.search(r"q([1-4])\s*[_ ]?(\d{4})", p)
    if q_match:
        q, yr = int(q_match.group(1)), int(q_match.group(2))
        q_starts = {1: (1, 1), 2: (4, 1), 3: (7, 1), 4: (10, 1)}
        q_ends = {1: (3, 31), 2: (6, 30), 3: (9, 30), 4: (12, 31)}
        sm, sd = q_starts[q]
        em, ed = q_ends[q]
        curr_s = f"{yr:04d}-{sm:02d}-{sd:02d} 00:00:00"
        curr_e = f"{yr:04d}-{em:02d}-{ed:02d} 23:59:59"
        if q == 1:
            prev_yr = yr - 1
            prev_q = 4
        else:
            prev_yr = yr
            prev_q = q - 1
        psm, psd = q_starts[prev_q]
        pem, ped = q_ends[prev_q]
        prev_s = f"{prev_yr:04d}-{psm:02d}-{psd:02d} 00:00:00"
        prev_e = f"{prev_yr:04d}-{pem:02d}-{ped:02d} 23:59:59"
        return (curr_s, curr_e, prev_s, prev_e)

    yr_match = re.search(r"(?:year\s*)?(\d{4})", p)
    if yr_match:
        yr = int(yr_match.group(1))
        curr_s = f"{yr:04d}-01-01 00:00:00"
        curr_e = f"{yr:04d}-12-31 23:59:59"
        prev_yr = yr - 1
        prev_s = f"{prev_yr:04d}-01-01 00:00:00"
        prev_e = f"{prev_yr:04d}-12-31 23:59:59"
        return (curr_s, curr_e, prev_s, prev_e)

    return (None, None, None, None)

def build_filter(
    period: str | None = None,
    category: str | None = None,
    state: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    order_alias: str = "o",
    use_exists: bool = True,
    order_status: str | None = None,
) -> tuple[list[str], list[str], list[Any]]:
    where_clauses: list[str] = []
    joins: list[str] = []
    params: list[Any] = []

    s_date = start_date
    e_date = end_date
    if not (s_date and e_date) and period:
        ps, pe, _, _ = parse_period_range(period)
        if ps and pe:
            s_date, e_date = ps, pe

    if order_status:
        if s_date and e_date:
            where_clauses.append(f"+{order_alias}.order_status = ?")
        else:
            where_clauses.append(f"{order_alias}.order_status = ?")
        params.append(order_status)

    if s_date and e_date:
        where_clauses.append(f"{order_alias}.order_purchase_timestamp >= ? AND {order_alias}.order_purchase_timestamp <= ?")
        params.extend([s_date, e_date])

    clean_state = state.strip().upper() if state and str(state).strip().lower() not in ("all", "all states") else ""
    if clean_state:
        joins.append(f"JOIN customers c ON {order_alias}.customer_id = c.customer_id")
        where_clauses.append("c.customer_state = ?")
        params.append(clean_state)

    clean_cat = normalize_category(category)
    if clean_cat:
        if use_exists:
            where_clauses.append(
                f"EXISTS (SELECT 1 FROM order_items oi_sub JOIN products p_sub ON oi_sub.product_id = p_sub.product_id "
                f"WHERE oi_sub.order_id = {order_alias}.order_id AND p_sub.product_category_name = ?)"
            )
            params.append(clean_cat)
        else:
            joins.append(f"JOIN products p ON oi.product_id = p.product_id")
            where_clauses.append("p.product_category_name = ?")
            params.append(clean_cat)

    return where_clauses, joins, params

def detect_partial_period() -> str | None:
    res = execute_query("SELECT MAX(order_purchase_timestamp) AS max_ts FROM orders")
    if not res or not res[0]["max_ts"]:
        return None
    max_ts = str(res[0]["max_ts"]).strip()
    try:
        dt = datetime.strptime(max_ts[:10], "%Y-%m-%d")
        last_day = calendar.monthrange(dt.year, dt.month)[1]
        if dt.day < last_day:
            return f"{dt.year:04d}-{dt.month:02d}"
    except Exception:
        return None
    return None

def get_comparison_windows(
    period: str,
    category: str = "All categories",
    state: str = "All states",
    partial_period: str | None = None,
) -> tuple[str | None, str | None, str | None, str | None]:
    s_date, e_date, p_start, p_end = parse_period_range(period)
    if s_date and e_date:
        return s_date, e_date, p_start, p_end
    return (None, None, None, None)

def _compute_metrics(
    start_date: str | None,
    end_date: str | None,
    category: str,
    state: str,
    compute_repeat: bool = True,
) -> dict[str, Any]:
    where_rev, joins_rev, params_rev = build_filter(
        category=category,
        state=state,
        start_date=start_date,
        end_date=end_date,
        order_status="delivered",
        use_exists=False,
    )
    rev_joins = ["LEFT JOIN order_items oi ON o.order_id = oi.order_id"] + joins_rev
    q_rev = f"""
    SELECT 
        SUM(oi.price) AS rev_raw,
        COUNT(DISTINCT o.order_id) AS ords,
        COUNT(DISTINCT oi.order_id) AS ords_items
    FROM orders o
    {' '.join(rev_joins)}
    {format_where(where_rev)}
    """
    res_rev = execute_query(q_rev, tuple(params_rev))
    rev_raw = float(res_rev[0]["rev_raw"]) if res_rev and res_rev[0]["rev_raw"] is not None else 0.0
    rev = round(rev_raw, 2)
    ords = int(res_rev[0]["ords"]) if res_rev and res_rev[0]["ords"] is not None else 0
    ords_items = int(res_rev[0]["ords_items"]) if res_rev and res_rev[0]["ords_items"] is not None else 0
    aov = round(rev_raw / ords_items, 2) if ords_items > 0 else None

    where_deliv, joins_deliv, params_deliv = build_filter(
        category=category,
        state=state,
        start_date=start_date,
        end_date=end_date,
        order_status="delivered",
        use_exists=True,
    )
    all_joins_deliv = joins_deliv + [f"LEFT JOIN {LATEST_REVIEW_SUBQUERY} r ON o.order_id = r.order_id"]
    q_deliv = f"""
    SELECT 
        ROUND(AVG(CASE WHEN {DELIVERED_VALID} THEN julianday(o.order_delivered_customer_date) - julianday(o.order_purchase_timestamp) END), 2) AS avg_days,
        ROUND(100.0 * AVG(CASE WHEN {DELIVERED_VALID} THEN o.order_delivered_customer_date <= o.order_estimated_delivery_date END), 2) AS on_time,
        ROUND(100.0 * AVG(CASE WHEN o.order_delivered_customer_date IS NOT NULL THEN (julianday(o.order_delivered_customer_date) - julianday(o.order_purchase_timestamp)) <= {SLA_DAYS} END), 1) AS health,
        ROUND(AVG(r.review_score), 2) AS avg_score,
        ROUND(AVG(CASE WHEN {DELIVERED_VALID} AND o.order_delivered_customer_date <= o.order_estimated_delivery_date THEN r.review_score END), 2) AS csat_ontime,
        ROUND(AVG(CASE WHEN {DELIVERED_VALID} AND o.order_delivered_customer_date > o.order_estimated_delivery_date THEN r.review_score END), 2) AS csat_late,
        ROUND(100.0 * AVG(CASE WHEN o.order_delivered_carrier_date IS NOT NULL THEN (julianday(o.order_delivered_carrier_date) - julianday(o.order_purchase_timestamp)) * 24.0 <= {FAST_DISPATCH_WINDOW_HOURS} END), 1) AS fast_dispatch,
        ROUND(100.0 * AVG(r.review_score >= 4), 1) AS rev45,
        ROUND(100.0 * AVG(r.review_score = 5), 1) AS rev5
    FROM orders o
    {' '.join(all_joins_deliv)}
    {format_where(where_deliv)}
    """
    res_deliv = execute_query(q_deliv, tuple(params_deliv))
    d_row = res_deliv[0] if res_deliv else {}
    avg_delivery = float(d_row["avg_days"]) if d_row.get("avg_days") is not None else None
    on_time = float(d_row["on_time"]) if d_row.get("on_time") is not None else None
    fulfillment_health = float(d_row["health"]) if d_row.get("health") is not None else None
    avg_review = float(d_row["avg_score"]) if d_row.get("avg_score") is not None else None
    csat_ontime = float(d_row["csat_ontime"]) if d_row.get("csat_ontime") is not None else None
    csat_late = float(d_row["csat_late"]) if d_row.get("csat_late") is not None else None
    fast_dispatch = float(d_row["fast_dispatch"]) if d_row.get("fast_dispatch") is not None else 0.0
    rev45 = float(d_row["rev45"]) if d_row.get("rev45") is not None else 0.0
    rev5 = float(d_row["rev5"]) if d_row.get("rev5") is not None else 0.0

    where_cancel, joins_cancel, params_cancel = build_filter(
        category=category,
        state=state,
        start_date=start_date,
        end_date=end_date,
        use_exists=True,
    )
    q_cancel = f"""
    SELECT 
        COUNT(CASE WHEN o.order_status = 'canceled' THEN 1 END) AS canceled_cnt,
        COUNT(*) AS total_cnt
    FROM orders o
    {' '.join(joins_cancel)}
    {format_where(where_cancel)}
    """
    res_cancel = execute_query(q_cancel, tuple(params_cancel))
    cancel_rate = None
    if res_cancel and res_cancel[0]["total_cnt"] > 0:
        cancel_rate = round(float(res_cancel[0]["canceled_cnt"]) / float(res_cancel[0]["total_cnt"]) * 100.0, 2)

    repeat_rate = None
    if compute_repeat:
        where_rep, joins_rep, params_rep = build_filter(
            category=category,
            state=state,
            start_date=start_date,
            end_date=end_date,
            order_status="delivered",
            use_exists=True,
        )
        rep_joins = ["JOIN customers c ON o.customer_id = c.customer_id"]
        for j in joins_rep:
            if "JOIN customers c" not in j:
                rep_joins.append(j)

        q_rep = f"""
        SELECT 
            COUNT(*) AS total_cust,
            SUM(CASE WHEN order_cnt >= 2 THEN 1 ELSE 0 END) AS repeat_cust
        FROM (
            SELECT c.customer_unique_id, COUNT(DISTINCT o.order_id) AS order_cnt
            FROM orders o
            {' '.join(rep_joins)}
            {format_where(where_rep)}
            GROUP BY c.customer_unique_id
        )
        """
        res_rep = execute_query(q_rep, tuple(params_rep))
        if res_rep and res_rep[0]["total_cust"] and res_rep[0]["total_cust"] > 0:
            repeat_rate = round(float(res_rep[0]["repeat_cust"]) / float(res_rep[0]["total_cust"]) * 100.0, 2)

    return {
        "revenue": rev,
        "orders": ords,
        "aov": aov,
        "avg_delivery": avg_delivery,
        "on_time_rate": on_time,
        "avg_review": avg_review,
        "csat_ontime": csat_ontime,
        "csat_late": csat_late,
        "cancel_rate": cancel_rate,
        "repeat_rate": repeat_rate,
        "fulfillment_health": fulfillment_health,
        "fast_dispatch": fast_dispatch,
        "rev45": rev45,
        "rev5": rev5,
    }

def query_window_metrics(
    start_date: str | None,
    end_date: str | None,
    category: str,
    state: str,
    compute_repeat: bool = True,
) -> dict[str, Any]:
    if not (start_date and end_date):
        return {
            "revenue": None,
            "orders": None,
            "aov": None,
            "avg_delivery": None,
            "on_time_rate": None,
            "avg_review": None,
            "cancel_rate": None,
            "repeat_rate": None,
            "fulfillment_health": None,
            "fast_dispatch": None,
            "rev45": None,
            "rev5": None,
        }
    return _compute_metrics(start_date, end_date, category, state, compute_repeat)

def query_scope_metrics(
    period: str,
    category: str,
    state: str,
    compute_repeat: bool = True,
) -> dict[str, Any]:
    s_date, e_date, _, _ = parse_period_range(period)
    return _compute_metrics(s_date, e_date, category, state, compute_repeat)

def query_totals(
    period: str | None = None,
    category: str | None = None,
    state: str | None = None,
) -> dict[str, Any]:
    where_c, joins_c, params_c = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    rev_joins = ["JOIN order_items oi ON o.order_id = oi.order_id"] + joins_c
    q = f"""
    SELECT
        ROUND(SUM(oi.price), 2) AS revenue,
        COUNT(DISTINCT o.order_id) AS orders
    FROM orders o
    {' '.join(rev_joins)}
    {format_where(where_c)}
    """
    rows = execute_query(q, tuple(params_c))
    r = rows[0] if rows else {}
    rev = float(r.get("revenue") or 0.0)
    ords = int(r.get("orders") or 0)
    aov = round(rev / ords, 2) if ords > 0 else 0.0
    return {"revenue": rev, "orders": ords, "aov": aov}

def query_series_data(
    period: str,
    category: str,
    state: str,
    granularity: str,
) -> tuple[list[dict], list[dict], list[dict], list[dict], list[str], int]:
    g = str(granularity).strip().lower()
    if g == "quarter":
        time_group = "strftime('%Y', o.order_purchase_timestamp) || '-Q' || ((CAST(strftime('%m', o.order_purchase_timestamp) AS INTEGER) - 1) / 3 + 1)"
        min_orders = MIN_ORDERS_QUARTER
    elif g == "week":
        time_group = "strftime('%Y-W%W', o.order_purchase_timestamp)"
        min_orders = MIN_ORDERS_WEEK
    else:
        time_group = "strftime('%Y-%m', o.order_purchase_timestamp)"
        min_orders = MIN_ORDERS_MONTH

    where_rev, joins_rev, params_rev = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    rev_joins = ["JOIN order_items oi ON o.order_id = oi.order_id"] + joins_rev
    q_rev = f"""
    SELECT 
        {time_group} AS bucket,
        ROUND(SUM(oi.price), 2) AS revenue,
        COUNT(DISTINCT o.order_id) AS orders,
        ROUND(SUM(oi.price) / COUNT(DISTINCT o.order_id), 2) AS aov
    FROM orders o
    {' '.join(rev_joins)}
    {format_where(where_rev)}
    GROUP BY bucket
    ORDER BY bucket ASC
    """
    rows_rev = execute_query(q_rev, tuple(params_rev))
    rev_map = {r["bucket"]: r for r in rows_rev if r["bucket"]}

    where_deliv, joins_deliv, params_deliv = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=True,
    )
    all_joins_deliv = joins_deliv + [f"LEFT JOIN {LATEST_REVIEW_SUBQUERY} r ON o.order_id = r.order_id"]
    q_deliv = f"""
    SELECT 
        {time_group} AS bucket,
        ROUND(AVG(CASE WHEN {DELIVERED_VALID} THEN julianday(o.order_delivered_customer_date) - julianday(o.order_purchase_timestamp) END), 2) AS avg_days,
        ROUND(100.0 * AVG(CASE WHEN {DELIVERED_VALID} THEN o.order_delivered_customer_date <= o.order_estimated_delivery_date END), 2) AS on_time,
        ROUND(AVG(r.review_score), 2) AS score,
        ROUND(100.0 * AVG(r.review_score = 5), 1) AS rating5_pct,
        ROUND(100.0 * AVG(r.review_score = 4), 1) AS rating4_pct,
        ROUND(100.0 * AVG(r.review_score = 3), 1) AS rating3_pct,
        ROUND(100.0 * AVG(r.review_score = 2), 1) AS rating2_pct,
        ROUND(100.0 * AVG(r.review_score = 1), 1) AS rating1_pct
    FROM orders o
    {' '.join(all_joins_deliv)}
    {format_where(where_deliv)}
    GROUP BY bucket
    ORDER BY bucket ASC
    """
    rows_deliv = execute_query(q_deliv, tuple(params_deliv))
    deliv_csat_map = {r["bucket"]: r for r in rows_deliv if r["bucket"]}

    where_cancel, joins_cancel, params_cancel = build_filter(
        period=period,
        category=category,
        state=state,
        use_exists=True,
    )
    q_cancel = f"""
    SELECT 
        {time_group} AS bucket,
        ROUND(100.0 * COUNT(CASE WHEN o.order_status = 'canceled' THEN 1 END) / COUNT(*), 2) AS cancel_rate
    FROM orders o
    {' '.join(joins_cancel)}
    {format_where(where_cancel)}
    GROUP BY bucket
    ORDER BY bucket ASC
    """
    rows_cancel = execute_query(q_cancel, tuple(params_cancel))
    cancel_map = {r["bucket"]: r for r in rows_cancel if r["bucket"]}

    all_buckets_sorted = sorted(rev_map.keys())
    retained_buckets: list[str] = []
    excluded_periods: list[str] = []

    for b in all_buckets_sorted:
        b_orders = int(rev_map[b]["orders"])
        if b_orders >= min_orders:
            retained_buckets.append(b)
        else:
            excluded_periods.append(b)

    revenue_over_time: list[dict] = []
    prev_bucket_rev: float | None = None
    for idx, b in enumerate(retained_buckets):
        r = rev_map[b]
        b_rev = float(r["revenue"]) if r["revenue"] is not None else 0.0
        b_ords = int(r["orders"]) if r["orders"] is not None else 0
        b_aov = float(r["aov"]) if r["aov"] is not None else 0.0

        ma3_val = None
        if idx >= 2:
            prev2 = float(revenue_over_time[idx - 2]["revenue"])
            prev1 = float(revenue_over_time[idx - 1]["revenue"])
            ma3_val = round((prev2 + prev1 + b_rev) / 3.0, 2)

        revenue_over_time.append({
            "month": b,
            "revenue": b_rev,
            "orders": b_ords,
            "aov": b_aov,
            "prevRevenue": prev_bucket_rev,
            "movingAvg3": ma3_val,
        })
        prev_bucket_rev = b_rev

    delivery_performance: list[dict] = []
    for b in retained_buckets:
        d = deliv_csat_map.get(b, {})
        delivery_performance.append({
            "period": b,
            "avgDays": float(d["avg_days"]) if d.get("avg_days") is not None else None,
            "onTimeRate": float(d["on_time"]) if d.get("on_time") is not None else None,
            "targetDays": float(SLA_DAYS),
        })

    satisfaction_trend: list[dict] = []
    for b in retained_buckets:
        c = deliv_csat_map.get(b, {})
        satisfaction_trend.append({
            "period": b,
            "score": float(c["score"]) if c.get("score") is not None else None,
            "rating5Pct": float(c["rating5_pct"]) if c.get("rating5_pct") is not None else None,
            "rating4Pct": float(c["rating4_pct"]) if c.get("rating4_pct") is not None else None,
            "rating3Pct": float(c["rating3_pct"]) if c.get("rating3_pct") is not None else None,
            "rating2Pct": float(c["rating2_pct"]) if c.get("rating2_pct") is not None else None,
            "rating1Pct": float(c["rating1_pct"]) if c.get("rating1_pct") is not None else None,
        })

    cancellation_trend: list[dict] = []
    for b in retained_buckets:
        cn = cancel_map.get(b, {})
        cancellation_trend.append({
            "period": b,
            "cancelRate": float(cn["cancel_rate"]) if cn.get("cancel_rate") is not None else None,
        })

    return (
        revenue_over_time,
        delivery_performance,
        satisfaction_trend,
        cancellation_trend,
        excluded_periods,
        min_orders,
    )

def query_top_categories(
    period: str,
    category: str,
    state: str,
    curr_start: str | None,
    curr_end: str | None,
    prev_start: str | None,
    prev_end: str | None,
    total_rev: float,
) -> tuple[list[dict], list[dict], list[dict]]:
    where_c, joins_c, params_c = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    where_c.append("p.product_category_name IS NOT NULL")
    cat_joins = ["JOIN order_items oi ON o.order_id = oi.order_id", "JOIN products p ON oi.product_id = p.product_id"]
    for j in joins_c:
        if j not in cat_joins:
            cat_joins.append(j)

    has_comparison = bool(curr_start and curr_end and prev_start and prev_end)
    extra_select = ""
    extra_params: list[Any] = []
    if has_comparison:
        extra_select = """,
        ROUND(SUM(CASE WHEN o.order_purchase_timestamp >= ? AND o.order_purchase_timestamp <= ? THEN oi.price ELSE 0 END), 2) AS curr_rev,
        ROUND(SUM(CASE WHEN o.order_purchase_timestamp >= ? AND o.order_purchase_timestamp <= ? THEN oi.price ELSE 0 END), 2) AS prev_rev
        """
        extra_params = [curr_start, curr_end, prev_start, prev_end]

    q = f"""
    SELECT 
        p.product_category_name AS cat,
        ROUND(SUM(oi.price), 2) AS revenue,
        COUNT(DISTINCT o.order_id) AS orders
        {extra_select}
    FROM orders o
    {' '.join(cat_joins)}
    {format_where(where_c)}
    GROUP BY cat
    ORDER BY revenue DESC, cat ASC
    """
    all_params = tuple(extra_params + params_c) if has_comparison else tuple(params_c)
    rows = execute_query(q, all_params)

    top_categories: list[dict] = []
    category_distribution: list[dict] = []
    all_categories_growth: list[dict] = []
    donut_sum = 0.0

    for idx, r in enumerate(rows):
        raw_cat = r["cat"]
        display_name = format_category_name(raw_cat)
        rev = float(r["revenue"]) if r["revenue"] is not None else 0.0
        ords = int(r["orders"]) if r["orders"] is not None else 0
        share = round((rev / total_rev * 100.0), 1) if total_rev > 0 else 0.0
        color = PALETTE[idx % len(PALETTE)]

        cat_growth = None
        if has_comparison and r.get("prev_rev") is not None and float(r["prev_rev"]) > 0:
            c_r = float(r.get("curr_rev") or 0.0)
            p_r = float(r["prev_rev"])
            cat_growth = round(((c_r - p_r) / p_r * 100.0), 1)

        item = {
            "rank": idx + 1,
            "category": display_name,
            "raw_cat": raw_cat,
            "revenue": rev,
            "orders": ords,
            "share": share,
            "growth": cat_growth,
            "color": color,
            "curr_rev": float(r.get("curr_rev") or 0.0) if has_comparison else rev,
            "prev_rev": float(r.get("prev_rev") or 0.0) if has_comparison else None,
        }
        all_categories_growth.append(item)

        if idx < 10:
            top_categories.append(item)

        category_distribution.append({
            "name": display_name,
            "value": rev,
            "color": color,
        })

    return top_categories, category_distribution, all_categories_growth

def query_top_states(
    period: str,
    category: str,
    state: str,
) -> tuple[list[dict], list[dict]]:
    where_c, joins_c, params_c = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    state_joins = ["JOIN order_items oi ON o.order_id = oi.order_id", "JOIN customers c ON o.customer_id = c.customer_id"]
    for j in joins_c:
        if j not in state_joins:
            state_joins.append(j)

    q = f"""
    SELECT 
        c.customer_state AS st,
        COUNT(DISTINCT o.order_id) AS orders,
        ROUND(SUM(oi.price), 2) AS revenue,
        ROUND(AVG(CASE WHEN {DELIVERED_VALID} THEN julianday(o.order_delivered_customer_date) - julianday(o.order_purchase_timestamp) END), 2) AS avg_days,
        ROUND(100.0 * AVG(CASE WHEN {DELIVERED_VALID} THEN o.order_delivered_customer_date <= o.order_estimated_delivery_date END), 2) AS sla_rate
    FROM orders o
    {' '.join(state_joins)}
    {format_where(where_c)}
    GROUP BY st
    ORDER BY revenue DESC, st ASC
    """
    rows = execute_query(q, tuple(params_c))
    all_states: list[dict] = []
    for idx, r in enumerate(rows[:27]):
        st_code = r["st"]
        sla = float(r["sla_rate"]) if r["sla_rate"] is not None else 0.0
        status_val = compute_sla_status(sla)
        all_states.append({
            "rank": idx + 1,
            "state": st_code,
            "name": STATE_NAMES.get(st_code, st_code),
            "orders": int(r["orders"]) if r["orders"] is not None else 0,
            "revenue": float(r["revenue"]) if r["revenue"] is not None else 0.0,
            "avgDays": float(r["avg_days"]) if r["avg_days"] is not None else None,
            "slaRate": sla,
            "status": status_val,
        })

    series_states = all_states[:8]
    return all_states, series_states

def query_anomalies(
    period: str,
    category: str,
    state: str,
) -> list[dict]:
    where_c, joins_c, params_c = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    daily_joins = ["JOIN order_items oi ON o.order_id = oi.order_id"] + joins_c
    q = f"""
    SELECT 
        substr(o.order_purchase_timestamp, 1, 10) AS day_val,
        COUNT(DISTINCT o.order_id) AS orders_count,
        ROUND(SUM(oi.price), 2) AS revenue
    FROM orders o
    {' '.join(daily_joins)}
    {format_where(where_c)}
    GROUP BY day_val
    ORDER BY day_val ASC
    """
    rows = execute_query(q, tuple(params_c))
    if len(rows) < MIN_DAYS_ANOMALY:
        return []

    order_values = [float(r["orders_count"]) for r in rows]
    candidates: list[dict] = []

    for i in range(ANOMALY_BASELINE_WINDOW_DAYS, len(rows)):
        ords = order_values[i]
        window = order_values[i - ANOMALY_BASELINE_WINDOW_DAYS : i]
        mean_val = sum(window) / len(window)
        variance = sum((x - mean_val) ** 2 for x in window) / len(window)
        std_val = math.sqrt(variance)
        if std_val == 0:
            continue
        z = (ords - mean_val) / std_val
        if abs(z) >= ANOMALY_Z_THRESHOLD:
            d_str = rows[i]["day_val"]
            direction = "spike" if z > 0 else "drop"
            severity_val = "High" if abs(z) >= ANOMALY_Z_HIGH else "Medium"
            title_text = "Daily Orders Volume Spike" if z > 0 else "Daily Orders Volume Contraction"
            impact_text = f"Statistical volume deviation of {z:+.2f} sigma from trailing 28-day baseline of {round(mean_val):,} orders."
            candidates.append({
                "date": d_str,
                "title": title_text,
                "metric": "Daily Orders",
                "value": f"{int(ords):,} orders",
                "baseline": f"{round(mean_val):,} orders",
                "zScore": round(z, 2),
                "severity": severity_val,
                "direction": direction,
                "impact": impact_text,
            })

    candidates.sort(key=lambda x: abs(x["zScore"]), reverse=True)
    results: list[dict] = []
    for idx, item in enumerate(candidates[:5]):
        item_copy = dict(item)
        item_copy["id"] = f"ano-{idx + 1}"
        results.append(item_copy)
    return results

def compute_bottom_performers(
    all_states: list[dict],
    all_categories_growth: list[dict],
    period: str,
    category: str,
    state: str,
    overall_avg_delivery: float | None,
) -> list[dict]:
    items: list[dict] = []

    qualifying_states = [s for s in all_states if s.get("orders", 0) >= MIN_ORDERS_BOTTOM_PERFORMER and s.get("slaRate") is not None]
    qualifying_states.sort(key=lambda s: s["slaRate"])

    for st in qualifying_states[:2]:
        full_name = f"{st['name']} ({st['state']})"
        ords = st["orders"]
        sla_r = st["slaRate"]
        late_pct = round(100.0 - sla_r, 2)
        status, _ = classify_on_time(sla_r)
        items.append({
            "type": "State",
            "name": full_name,
            "metric": "SLA Compliance",
            "value": f"{sla_r:.1f}%",
            "benchmark": f"{ON_TIME_FLOOR_PCT:.1f}%",
            "alert": status,
            "note": f"{ords:,} orders, {late_pct:.1f}% delivered late (avg {st.get('avgDays', 0):.1f}d)",
        })

    qualifying_cats = [c for c in all_categories_growth if c.get("orders", 0) >= MIN_ORDERS_BOTTOM_PERFORMER and c.get("growth") is not None]
    if qualifying_cats:
        qualifying_cats.sort(key=lambda c: c["growth"])
        worst_cat = qualifying_cats[0]
        items.append({
            "type": "Category",
            "name": worst_cat["category"],
            "metric": "Revenue Growth",
            "value": f"{worst_cat['growth']:+.1f}%",
            "benchmark": "0.0%",
            "alert": "Declining" if worst_cat["growth"] < 0 else "Low Growth",
            "note": f"{worst_cat['orders']:,} orders, R$ {worst_cat['revenue']:,.2f} revenue (prev R$ {worst_cat['prev_rev']:,.2f})",
        })

    where_canc, joins_canc, params_canc = build_filter(
        period=period,
        category=category,
        state=state,
        use_exists=False,
    )
    where_canc.append("p.product_category_name IS NOT NULL")
    canc_joins = ["JOIN order_items oi ON o.order_id = oi.order_id", "JOIN products p ON oi.product_id = p.product_id"] + [j for j in joins_canc if "order_items" not in j and "products" not in j]
    q_canc = f"""
    SELECT 
        p.product_category_name AS cat,
        COUNT(DISTINCT o.order_id) AS total_orders,
        COUNT(DISTINCT CASE WHEN o.order_status = 'canceled' THEN o.order_id END) AS canceled_orders,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN o.order_status = 'canceled' THEN o.order_id END) / COUNT(DISTINCT o.order_id), 2) AS cancel_rate
    FROM orders o
    {' '.join(canc_joins)}
    {format_where(where_canc)}
    GROUP BY cat
    HAVING total_orders >= {MIN_ORDERS_BOTTOM_PERFORMER}
       AND canceled_orders >= {MIN_EVENTS_FOR_RATE_ALERT}
    ORDER BY cancel_rate DESC
    LIMIT 1
    """
    canc_rows = execute_query(q_canc, tuple(params_canc))
    if canc_rows and float(canc_rows[0]["cancel_rate"] or 0) > 0 and int(canc_rows[0]["canceled_orders"] or 0) >= MIN_EVENTS_FOR_RATE_ALERT:
        cr = canc_rows[0]
        cancel_pct = float(cr["cancel_rate"])
        cancel_status, _ = classify_cancellation(cancel_pct)
        items.append({
            "type": "Category",
            "name": format_category_name(cr["cat"]),
            "metric": "Cancellation Rate",
            "value": f"{cancel_pct:.1f}%",
            "benchmark": f"{CANCEL_CONTROLLED_MAX_PCT:.1f}%",
            "alert": cancel_status,
            "note": f"{int(cr['canceled_orders']):,} canceled of {int(cr['total_orders']):,} total orders",
        })

    return items[:4]

def query_system_health(
    period: str,
    category: str,
    state: str,
) -> dict[str, Any]:
    q_synced = f"""
    SELECT COUNT(*) AS synced_cnt
    FROM sqlite_master
    WHERE type = 'table' AND name IN ({','.join(f"'{t}'" for t in EXPECTED_TABLES)})
    """
    res_synced = execute_query(q_synced)
    synced_cnt = int(res_synced[0]["synced_cnt"]) if res_synced else 0

    res_total = execute_query("SELECT COUNT(DISTINCT order_id) AS total_delivered FROM orders WHERE order_status = 'delivered'")
    total_orders = int(res_total[0]["total_delivered"]) if res_total else 96478

    where_d, joins_d, params_d = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=True,
    )
    where_str = format_where(where_d)
    join_str = " ".join(joins_d)

    q_reconcile = f"""
    SELECT 
        (
            SELECT SUM(op.payment_value)
            FROM order_payments op
            WHERE op.order_id IN (
                SELECT o.order_id FROM orders o {join_str} {where_str}
            )
        ) AS total_payment,
        (
            SELECT SUM(oi.price + oi.freight_value)
            FROM order_items oi
            WHERE oi.order_id IN (
                SELECT o.order_id FROM orders o {join_str} {where_str}
            )
        ) AS total_items
    """
    res_rec = execute_query(q_reconcile, tuple(params_d + params_d))
    pay_val = float(res_rec[0]["total_payment"]) if res_rec and res_rec[0]["total_payment"] is not None else 0.0
    item_val = float(res_rec[0]["total_items"]) if res_rec and res_rec[0]["total_items"] is not None else 0.0

    diff_pct = 0.0
    if item_val > 0:
        diff_pct = round(abs(pay_val - item_val) / item_val * 100.0, 2)

    health_status = "verified" if diff_pct < RECONCILE_TOLERANCE_PCT else "review"

    return {
        "status": health_status,
        "consistencyCheck": health_status,
        "dbEngine": "SQLite High-Performance Read-Only Engine",
        "totalRecords": f"{total_orders:,} Orders",
        "tablesSynced": f"{synced_cnt} of {len(EXPECTED_TABLES)} tables",
        "reconciliationDiffPct": diff_pct,
    }