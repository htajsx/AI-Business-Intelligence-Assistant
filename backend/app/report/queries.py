# app/report/queries.py
from typing import Any, Optional
from app.db.database import execute_query
from app.core.thresholds import (
    MIN_ORDERS_FOR_RANKING,
    SAMPLE_EMPTY,
    SAMPLE_LOW,
    SAMPLE_VERY_LOW,
    SLA_DAYS,
)
from app.dashboard.queries import (
    STATE_NAMES,
    build_filter,
    format_category_name,
    format_where,
    compute_sla_status,
    query_totals,
)

def _normalize_sentinel(val: Optional[str], sentinels: tuple[str, ...]) -> bool:
    if not val:
        return True
    return str(val).strip().lower() in sentinels

def is_all_categories(category: Optional[str]) -> bool:
    return _normalize_sentinel(category, ("all categories", "all category", "all", ""))

def is_all_states(state: Optional[str]) -> bool:
    return _normalize_sentinel(state, ("all states", "all state", "all", ""))

def query_sample_size(
    period: Optional[str],
    category: Optional[str],
    state: Optional[str],
) -> dict[str, Any]:
    totals = query_totals(period=period, category=category, state=state)
    orders = int(totals["orders"])
    revenue = float(totals["revenue"])

    if orders == SAMPLE_EMPTY:
        level = "empty"
    elif orders < SAMPLE_VERY_LOW:
        level = "very_low"
    elif orders < SAMPLE_LOW:
        level = "low"
    else:
        level = "adequate"

    return {"orders": orders, "revenue": revenue, "level": level}

def build_scope(
    period: Optional[str],
    category: Optional[str],
    state: Optional[str],
    is_all_time: bool,
    comparison_available: bool,
    curr_start: Optional[str],
    curr_end: Optional[str],
    prev_start: Optional[str],
    prev_end: Optional[str],
    partial_period: Optional[str],
    sample: dict[str, Any],
    comparison_note: Optional[str] = None,
) -> dict[str, Any]:
    cat_mode = "all" if is_all_categories(category) else "single"
    st_mode = "all" if is_all_states(state) else "single"
    period_mode = "all_time" if is_all_time else "bounded"

    label_parts: list[str] = []
    if not is_all_categories(category):
        label_parts.append(format_category_name(category))
    else:
        label_parts.append("All categories")

    if not is_all_states(state):
        clean_st = str(state).strip().upper()
        label_parts.append(f"{STATE_NAMES.get(clean_st, clean_st)} ({clean_st})")
    else:
        label_parts.append("All states")

    if period and not is_all_time:
        label_parts.append(str(period))
    else:
        label_parts.append("All time")

    scope_label = " · ".join(label_parts)

    visible: list[str] = ["summary", "headline"]
    if comparison_available:
        visible.append("comparison")

    if cat_mode == "single" or st_mode == "single":
        visible.append("position")

    visible.append("trends")

    if is_all_time:
        visible.append("year_overview")

    if cat_mode == "all" and st_mode == "all":
        visible.append("categories")
        visible.append("regions")
    elif cat_mode == "single" and st_mode == "all":
        visible.append("category_deep_dive")
    elif cat_mode == "all" and st_mode == "single":
        visible.append("categories")
        visible.append("top_cities")
    elif cat_mode == "single" and st_mode == "single":
        visible.append("top_cities")

    visible.append("operations")
    visible.append("anomalies")
    visible.append("recommendations")
    visible.append("methodology")

    return {
        "categoryMode": cat_mode,
        "stateMode": st_mode,
        "periodMode": period_mode,
        "isPartialPeriod": bool(partial_period and curr_end and partial_period in (curr_end or "")),
        "comparisonAvailable": comparison_available,
        "sampleSize": sample,
        "label": scope_label,
        "visibleSections": visible,
        "comparisonWindows": {
            "currentStart": curr_start,
            "currentEnd": curr_end,
            "previousStart": prev_start,
            "previousEnd": prev_end,
        },
        "comparisonNote": comparison_note,
    }

def query_top_cities(
    period: Optional[str],
    category: Optional[str],
    state: Optional[str],
    limit: int = 5,
) -> list[dict[str, Any]]:
    where_c, joins_c, params_c = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    city_joins = ["JOIN order_items oi ON o.order_id = oi.order_id", "JOIN customers c ON o.customer_id = c.customer_id"]
    for j in joins_c:
        if j not in city_joins:
            city_joins.append(j)

    q = f"""
    SELECT
        c.customer_city AS city,
        c.customer_state AS state_code,
        COUNT(DISTINCT o.order_id) AS orders,
        ROUND(SUM(oi.price), 2) AS revenue,
        ROUND(SUM(oi.price) / COUNT(DISTINCT o.order_id), 2) AS aov
    FROM orders o
    {' '.join(city_joins)}
    {format_where(where_c)}
    GROUP BY c.customer_city, c.customer_state
    ORDER BY revenue DESC
    LIMIT {int(limit)}
    """
    rows = execute_query(q, tuple(params_c))
    result = []
    for idx, r in enumerate(rows):
        city_raw = str(r.get("city") or "")
        result.append({
            "rank": idx + 1,
            "city": city_raw.title(),
            "state": str(r.get("state_code") or "").upper(),
            "orders": int(r.get("orders") or 0),
            "revenue": float(r.get("revenue") or 0.0),
            "aov": float(r.get("aov") or 0.0),
        })
    return result

def query_category_position(
    period: Optional[str],
    category: Optional[str],
    state: Optional[str],
) -> Optional[dict[str, Any]]:
    if is_all_categories(category):
        return None

    where_all, joins_all, params_all = build_filter(
        period=period,
        category=None,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    rev_joins = ["JOIN order_items oi ON o.order_id = oi.order_id", "JOIN products p ON oi.product_id = p.product_id"]
    for j in joins_all:
        if j not in rev_joins:
            rev_joins.append(j)

    q_all = f"""
    SELECT
        p.product_category_name AS cat,
        ROUND(SUM(oi.price), 2) AS revenue,
        COUNT(DISTINCT o.order_id) AS orders
    FROM orders o
    {' '.join(rev_joins)}
    {format_where(where_all)}
    GROUP BY cat
    HAVING cat IS NOT NULL AND trim(cat) != '' AND COUNT(DISTINCT o.order_id) >= {MIN_ORDERS_FOR_RANKING}
    ORDER BY revenue DESC
    """
    all_rows = execute_query(q_all, tuple(params_all))

    where_cat, joins_cat, params_cat = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    cat_joins = ["JOIN order_items oi ON o.order_id = oi.order_id"]
    for j in joins_cat:
        if j not in cat_joins:
            cat_joins.append(j)

    q_cat = f"""
    SELECT
        ROUND(SUM(oi.price), 2) AS revenue,
        COUNT(DISTINCT o.order_id) AS orders
    FROM orders o
    {' '.join(cat_joins)}
    {format_where(where_cat)}
    """
    cat_rows = execute_query(q_cat, tuple(params_cat))
    if not cat_rows or not cat_rows[0].get("revenue"):
        return None

    cat_rev = float(cat_rows[0]["revenue"] or 0.0)
    cat_ord = int(cat_rows[0]["orders"] or 0)

    total_rev = sum(float(r.get("revenue") or 0.0) for r in all_rows)
    share_pct = round(cat_rev / total_rev * 100.0, 2) if total_rev > 0 else 0.0

    if cat_ord < MIN_ORDERS_FOR_RANKING:
        rank = None
        subtitle = f"Not ranked (sample too small: {cat_ord} orders, minimum {MIN_ORDERS_FOR_RANKING})"
    else:
        rank = 1
        for r in all_rows:
            if float(r.get("revenue") or 0.0) > cat_rev:
                rank += 1
        subtitle = f"Rank #{rank} of {len(all_rows)} qualified categories"

    return {
        "title": "Category Market Position",
        "name": format_category_name(category),
        "rank": rank,
        "total": len(all_rows),
        "sharePct": share_pct,
        "revenue": cat_rev,
        "orders": cat_ord,
        "subtitle": subtitle,
    }

def query_state_position(
    period: Optional[str],
    category: Optional[str],
    state: Optional[str],
) -> Optional[dict[str, Any]]:
    if is_all_states(state):
        return None

    state_code = str(state).strip().upper()

    where_all, joins_all, params_all = build_filter(
        period=period,
        category=category,
        state=None,
        order_status="delivered",
        use_exists=False,
    )
    all_joins = ["JOIN order_items oi ON o.order_id = oi.order_id", "JOIN customers c ON o.customer_id = c.customer_id"]
    for j in joins_all:
        if j not in all_joins:
            all_joins.append(j)

    q_all = f"""
    SELECT
        c.customer_state AS st,
        ROUND(SUM(oi.price), 2) AS revenue,
        COUNT(DISTINCT o.order_id) AS orders
    FROM orders o
    {' '.join(all_joins)}
    {format_where(where_all)}
    GROUP BY st
    HAVING COUNT(DISTINCT o.order_id) >= {MIN_ORDERS_FOR_RANKING}
    ORDER BY revenue DESC
    """
    all_rows = execute_query(q_all, tuple(params_all))

    where_st, joins_st, params_st = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    st_joins = ["JOIN order_items oi ON o.order_id = oi.order_id"]
    for j in joins_st:
        if j not in st_joins:
            st_joins.append(j)

    q_st = f"""
    SELECT
        ROUND(SUM(oi.price), 2) AS revenue,
        COUNT(DISTINCT o.order_id) AS orders
    FROM orders o
    {' '.join(st_joins)}
    {format_where(where_st)}
    """
    st_rows = execute_query(q_st, tuple(params_st))
    if not st_rows or not st_rows[0].get("revenue"):
        return None

    st_rev = float(st_rows[0]["revenue"] or 0.0)
    st_ord = int(st_rows[0]["orders"] or 0)

    total_rev = sum(float(r.get("revenue") or 0.0) for r in all_rows)
    share_pct = round(st_rev / total_rev * 100.0, 2) if total_rev > 0 else 0.0

    if st_ord < MIN_ORDERS_FOR_RANKING:
        rank = None
        subtitle = f"Not ranked (sample too small: {st_ord} orders, minimum {MIN_ORDERS_FOR_RANKING})"
    else:
        rank = 1
        for r in all_rows:
            if float(r.get("revenue") or 0.0) > st_rev:
                rank += 1
        subtitle = f"Rank #{rank} of {len(all_rows)} qualified destination states"

    return {
        "title": "Regional Market Position",
        "name": f"{STATE_NAMES.get(state_code, state_code)} ({state_code})",
        "rank": rank,
        "total": len(all_rows),
        "sharePct": share_pct,
        "revenue": st_rev,
        "orders": st_ord,
        "subtitle": subtitle,
    }

def query_category_deep_dive(
    period: Optional[str],
    category: Optional[str],
    limit: int = 5,
) -> list[dict[str, Any]]:
    if is_all_categories(category):
        return []

    where_c, joins_c, params_c = build_filter(
        period=period,
        category=category,
        state=None,
        order_status="delivered",
        use_exists=False,
    )
    joins = ["JOIN order_items oi ON o.order_id = oi.order_id", "JOIN customers c ON o.customer_id = c.customer_id"]
    for j in joins_c:
        if j not in joins:
            joins.append(j)

    q = f"""
    WITH order_level AS (
        SELECT
            o.order_id,
            c.customer_state,
            o.order_delivered_customer_date,
            o.order_purchase_timestamp,
            o.order_estimated_delivery_date,
            SUM(oi.price) AS rev
        FROM orders o
        {' '.join(joins)}
        {format_where(where_c)}
        GROUP BY 
            o.order_id, 
            c.customer_state, 
            o.order_delivered_customer_date,
            o.order_purchase_timestamp,
            o.order_estimated_delivery_date
    )
    SELECT
        customer_state AS state,
        COUNT(order_id) AS orders,
        ROUND(SUM(rev), 2) AS revenue,
        ROUND(AVG(CASE WHEN order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date >= order_purchase_timestamp THEN julianday(order_delivered_customer_date) - julianday(order_purchase_timestamp) END), 2) AS avg_days,
        ROUND(100.0 * AVG(CASE WHEN order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date >= order_purchase_timestamp THEN order_delivered_customer_date <= order_estimated_delivery_date END), 2) AS sla_rate
    FROM order_level
    GROUP BY customer_state
    ORDER BY revenue DESC
    LIMIT {int(limit)}
    """
    rows = execute_query(q, tuple(params_c))

    tot_cat_rev = sum(float(r.get("revenue") or 0.0) for r in rows)
    result = []
    for idx, r in enumerate(rows):
        st_code = str(r.get("state") or "").upper()
        rev = float(r.get("revenue") or 0.0)
        sla_val = float(r.get("sla_rate") or 0.0)
        result.append({
            "rank": idx + 1,
            "state": st_code,
            "name": STATE_NAMES.get(st_code, st_code),
            "orders": int(r.get("orders") or 0),
            "revenue": rev,
            "sharePct": round(rev / tot_cat_rev * 100.0, 1) if tot_cat_rev > 0 else 0.0,
            "avgDeliveryDays": float(r.get("avg_days")) if r.get("avg_days") is not None else None,
            "onTimeRate": sla_val,
            "status": compute_sla_status(sla_val),
        })
    return result

def query_year_over_year(
    category: Optional[str],
    state: Optional[str],
) -> list[dict[str, Any]]:
    where_c, joins_c, params_c = build_filter(
        period=None,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    rev_joins = ["JOIN order_items oi ON o.order_id = oi.order_id"]
    for j in joins_c:
        if j not in rev_joins:
            rev_joins.append(j)

    q = f"""
    SELECT
        strftime('%Y', o.order_purchase_timestamp) AS yr,
        ROUND(SUM(oi.price), 2) AS revenue,
        COUNT(DISTINCT o.order_id) AS orders,
        ROUND(SUM(oi.price) / COUNT(DISTINCT o.order_id), 2) AS aov,
        COUNT(DISTINCT strftime('%m', o.order_purchase_timestamp)) AS month_count
    FROM orders o
    {' '.join(rev_joins)}
    {format_where(where_c)}
    GROUP BY yr
    ORDER BY yr ASC
    """
    rows = execute_query(q, tuple(params_c))
    result = []
    
    prev_rev: Optional[float] = None
    prev_is_part: bool = False

    for r in rows:
        yr = str(r.get("yr") or "")
        rev = float(r.get("revenue") or 0.0)
        ords = int(r.get("orders") or 0)
        aov = float(r.get("aov") or 0.0)
        m_cnt = int(r.get("month_count") or 0)
        is_part = m_cnt < 12

        growth = None
        growth_note = None
        
        if prev_rev is not None and prev_rev > 0:
            if is_part or prev_is_part:
                growth = None
                if is_part:
                    growth_note = f"n/a - partial year ({m_cnt} of 12 months)"
                else:
                    growth_note = "n/a - prior year was partial"
            else:
                growth = round((rev - prev_rev) / prev_rev * 100.0, 1)
        elif is_part:
            # First year in dataset is partial: explain why no growth computed
            growth_note = f"n/a - first year is partial ({m_cnt} of 12 months)"

        result.append({
            "year": yr,
            "revenue": rev,
            "orders": ords,
            "aov": aov,
            "growthPct": growth,
            "isPartial": is_part,
            "monthsCovered": m_cnt,
            "growthNote": growth_note,
        })
        
        prev_rev = rev
        prev_is_part = is_part

    return result


def query_excluded_periods_revenue(
    period: str,
    category: str,
    state: str,
    granularity: str,
    buckets: list[str],
) -> float:
    """Sum revenue for the excluded buckets via an independent SQL query."""
    if not buckets:
        return 0.0
    g = str(granularity).strip().lower()
    if g == "quarter":
        time_group = "strftime('%Y', o.order_purchase_timestamp) || '-Q' || ((CAST(strftime('%m', o.order_purchase_timestamp) AS INTEGER) - 1) / 3 + 1)"
    elif g == "week":
        time_group = "strftime('%Y-W%W', o.order_purchase_timestamp)"
    else:
        time_group = "strftime('%Y-%m', o.order_purchase_timestamp)"

    where_c, joins_c, params_c = build_filter(
        period=period,
        category=category,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    rev_joins = ["JOIN order_items oi ON o.order_id = oi.order_id"] + joins_c

    placeholders = ",".join(["?"] * len(buckets))
    where_c.append(f"{time_group} IN ({placeholders})")
    params_c.extend(buckets)

    q = f"""
    SELECT ROUND(SUM(oi.price), 2) AS revenue
    FROM orders o
    {' '.join(rev_joins)}
    {format_where(where_c)}
    """
    rows = execute_query(q, tuple(params_c))
    if rows and rows[0]["revenue"] is not None:
        return float(rows[0]["revenue"])
    return 0.0


def query_category_period_breakdown(
    start_date: Optional[str],
    end_date: Optional[str],
    period: Optional[str],
    state: Optional[str],
) -> dict[str, dict[str, Any]]:
    where_c, joins_c, params_c = build_filter(
        period=period if not (start_date and end_date) else None,
        start_date=start_date,
        end_date=end_date,
        state=state,
        order_status="delivered",
        use_exists=False,
    )
    where_c.append("p.product_category_name IS NOT NULL")
    cat_joins = ["JOIN order_items oi ON o.order_id = oi.order_id", "JOIN products p ON oi.product_id = p.product_id"]
    for j in joins_c:
        if j not in cat_joins:
            cat_joins.append(j)

    q = f"""
    SELECT 
        p.product_category_name AS cat,
        ROUND(SUM(oi.price), 2) AS revenue,
        COUNT(DISTINCT o.order_id) AS orders
    FROM orders o
    {' '.join(cat_joins)}
    {format_where(where_c)}
    GROUP BY cat
    """
    rows = execute_query(q, tuple(params_c))
    return {
        r["cat"]: {
            "cat": r["cat"],
            "name": format_category_name(r["cat"]),
            "revenue": float(r["revenue"] or 0.0),
            "orders": int(r["orders"] or 0),
        }
        for r in rows if r["cat"]
    }


def get_db_bounds() -> tuple[str, str]:
    q = "SELECT MIN(order_purchase_timestamp) AS min_ts, MAX(order_purchase_timestamp) AS max_ts FROM orders WHERE order_status = 'delivered'"
    res = execute_query(q)
    if res and res[0]["min_ts"] and res[0]["max_ts"]:
        return str(res[0]["min_ts"])[:10], str(res[0]["max_ts"])[:10]
    return "2016-09-04", "2018-10-17"
