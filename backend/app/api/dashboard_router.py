import os
import time
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, status
from app.db.database import resolve_db_path
from app.dashboard.queries import (
    SLA_DAYS,
    detect_partial_period,
    get_comparison_windows,
    query_window_metrics,
    query_scope_metrics,
    query_totals,
    query_series_data,
    query_top_categories,
    query_top_states,
    query_anomalies,
    compute_bottom_performers,
    query_system_health,
    parse_period_range as parse_period,
    format_category_name,
)
from app.dashboard.insights import (
    build_period_comparison,
    build_executive_insights,
)

router = APIRouter()

CACHE_TTL_SECONDS = 300
_DASHBOARD_CACHE: dict[tuple, tuple[dict, float]] = {}

REVENUE_DEFINITION = "Calculated as SUM(price) from order_items for delivered orders only. Do not sum payment_value to avoid multi-installment/voucher duplication."
MOVING_AVG_DEFINITION = "Trailing 3-period moving average of revenue, including the current period"

@router.get("/dashboard")
def get_dashboard(
    period: str = Query(default="All time"),
    category: str = Query(default="All Categories"),
    state: str = Query(default="All States"),
    granularity: str = Query(default="Month"),
):
    category = category.default if hasattr(category, "default") else str(category)
    state = state.default if hasattr(state, "default") else str(state)
    granularity = granularity.default if hasattr(granularity, "default") else str(granularity)

    db_path = resolve_db_path()
    if not os.path.exists(db_path):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database file unavailable",
        )

    try:
        db_mtime = os.path.getmtime(db_path)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(err),
        )

    cache_key = (str(period), str(category), str(state), str(granularity), db_mtime)
    now_ts = time.time()
    if cache_key in _DASHBOARD_CACHE:
        cached_payload, cached_time = _DASHBOARD_CACHE[cache_key]
        if now_ts - cached_time < CACHE_TTL_SECONDS:
            return cached_payload

    try:
        partial_period = detect_partial_period()

        curr_start, curr_end, prev_start, prev_end = get_comparison_windows(
            period=period,
            category=category,
            state=state,
            partial_period=partial_period,
        )

        (
            revenue_over_time,
            delivery_performance,
            satisfaction_trend,
            cancellation_trend,
            excluded_periods,
            min_orders,
        ) = query_series_data(
            period=period,
            category=category,
            state=state,
            granularity=granularity,
        )

        totals = query_totals(period=period, category=category, state=state)
        headline_rev = totals["revenue"]
        headline_orders = totals["orders"]
        headline_aov = totals["aov"]

        series_revenue_sum = round(sum(r["revenue"] for r in revenue_over_time), 2)
        excluded_revenue = round(headline_rev - series_revenue_sum, 2)

        scope_metrics = query_scope_metrics(period, category, state, compute_repeat=True)
        curr_metrics = query_window_metrics(curr_start, curr_end, category, state, compute_repeat=True)
        prev_metrics = query_window_metrics(prev_start, prev_end, category, state, compute_repeat=False)

        is_all_time = (curr_start is None) or str(period).strip().lower() in ("all time", "all", "")
        comparison_available = bool(curr_start and prev_start and prev_metrics.get("orders") and prev_metrics["orders"] > 0)

        c_rev = curr_metrics.get("revenue")
        p_rev = prev_metrics.get("revenue")
        rev_growth = round(((c_rev - p_rev) / p_rev * 100.0), 1) if (p_rev is not None and p_rev > 0 and c_rev is not None) else None

        c_ord = curr_metrics.get("orders")
        p_ord = prev_metrics.get("orders")
        ord_growth = round(((c_ord - p_ord) / p_ord * 100.0), 1) if (p_ord is not None and p_ord > 0 and c_ord is not None) else None

        c_aov = curr_metrics.get("aov")
        p_aov = prev_metrics.get("aov")
        aov_growth = round(((c_aov - p_aov) / p_aov * 100.0), 1) if (p_aov is not None and p_aov > 0 and c_aov is not None) else None

        c_canc = curr_metrics.get("cancel_rate")
        p_canc = prev_metrics.get("cancel_rate")
        canc_delta = round(c_canc - p_canc, 2) if (p_canc is not None and c_canc is not None) else None

        c_del = curr_metrics.get("avg_delivery")
        p_del = prev_metrics.get("avg_delivery")
        del_delta = round(c_del - p_del, 1) if (p_del is not None and c_del is not None) else None

        c_ontime = curr_metrics.get("on_time_rate")
        p_ontime = prev_metrics.get("on_time_rate")
        ontime_delta = round(c_ontime - p_ontime, 1) if (p_ontime is not None and c_ontime is not None) else None

        c_revw = curr_metrics.get("avg_review")
        p_revw = prev_metrics.get("avg_review")
        revw_delta = round(c_revw - p_revw, 2) if (p_revw is not None and c_revw is not None) else None

        c_rep = curr_metrics.get("repeat_rate")
        rep_delta = None

        c_health = curr_metrics.get("fulfillment_health")
        p_health = prev_metrics.get("fulfillment_health")
        health_delta = round(c_health - p_health, 1) if (p_health is not None and c_health is not None) else None

        scope_del = scope_metrics.get("avg_delivery")
        scope_ontime = scope_metrics.get("on_time_rate")
        scope_revw = scope_metrics.get("avg_review")
        scope_canc = scope_metrics.get("cancel_rate")
        scope_rep = scope_metrics.get("repeat_rate")
        scope_health = scope_metrics.get("fulfillment_health")

        period_lower = str(period).strip().lower()
        if "year" in period_lower:
            delta_label = "YoY"
        elif "q" in period_lower:
            delta_label = "QoQ"
        else:
            delta_label = "MoM"

        kpis = [
            {
                "id": "revenue",
                "label": "Total Revenue",
                "value": headline_rev,
                "format": "currency",
                "delta": rev_growth,
                "deltaLabel": delta_label,
                "target": None,
                "targetPct": None,
                "subtitle": "Total item price (SUM(oi.price)) for delivered orders, excluding freight and cancellations",
                "definition": "SUM(oi.price) for delivered orders, excluding freight and cancellations",
            },
            {
                "id": "orders",
                "label": "Number of Orders",
                "value": headline_orders,
                "format": "number",
                "delta": ord_growth,
                "deltaLabel": delta_label,
                "subtitle": f"{headline_orders:,} delivered customer orders",
            },
            {
                "id": "aov",
                "label": "Average Order Value",
                "value": headline_aov,
                "format": "currency",
                "delta": aov_growth,
                "deltaLabel": delta_label,
                "subtitle": "Average basket spend per order",
            },
            {
                "id": "mom_growth",
                "label": "MoM Revenue Growth",
                "value": rev_growth if comparison_available else None,
                "format": "percent",
                "delta": None,
                "deltaLabel": delta_label,
                "subtitle": "Metric tracking period growth pace",
            },
            {
                "id": "cancel",
                "label": "Cancellation Rate",
                "value": scope_canc,
                "format": "percent",
                "delta": canc_delta,
                "deltaLabel": delta_label,
                "subtitle": "Pre-fulfillment cancellations",
            },
            {
                "id": "delivery_time",
                "label": "Average Delivery Time",
                "value": scope_del,
                "format": "days",
                "delta": del_delta,
                "deltaLabel": delta_label,
                "subtitle": f"Target SLA benchmark < {float(SLA_DAYS):.1f} days",
            },
            {
                "id": "on_time",
                "label": "On-time Delivery Rate",
                "value": scope_ontime,
                "format": "percent",
                "delta": ontime_delta,
                "deltaLabel": delta_label,
                "subtitle": "SLA arrival compliance rate",
            },
            {
                "id": "review",
                "label": "Average Review Score",
                "value": scope_revw,
                "format": "score",
                "delta": revw_delta,
                "deltaLabel": delta_label,
                "subtitle": "Customer satisfaction rating out of 5.0",
            },
            {
                "id": "repeat_rate",
                "label": "Repeat Purchase Rate",
                "value": scope_rep,
                "format": "percent",
                "delta": rep_delta,
                "deltaLabel": delta_label,
                "subtitle": "Customers with repeat orders",
            },
            {
                "id": "fulfillment_health",
                "label": "Delivery Performance Score",
                "value": scope_health,
                "format": "percent",
                "delta": health_delta,
                "deltaLabel": delta_label,
                "subtitle": "Composite fulfillment health index",
            },
        ]

        top_categories, category_distribution, all_categories_growth = query_top_categories(
            period=period,
            category=category,
            state=state,
            curr_start=curr_start,
            curr_end=curr_end,
            prev_start=prev_start,
            prev_end=prev_end,
            total_rev=headline_rev,
        )

        all_states, series_states = query_top_states(
            period=period,
            category=category,
            state=state,
        )


        bottom_performers = compute_bottom_performers(
            all_states=all_states,
            all_categories_growth=all_categories_growth,
            period=period,
            category=category,
            state=state,
            overall_avg_delivery=scope_del,
        )

        anomalies = query_anomalies(
            period=period,
            category=category,
            state=state,
        )

        period_comparison = build_period_comparison(curr_metrics, prev_metrics) if comparison_available else []

        system_health = query_system_health(
            period=period,
            category=category,
            state=state,
        )

        executive_insights = build_executive_insights(
            curr_metrics=scope_metrics,
            top_categories=top_categories,
            top_states=all_states,
            system_health=system_health,
        )

        meta = {
            "dataset": "Olist Brazilian E-Commerce DW",
            "period": period,
            "lastUpdated": datetime.now(timezone.utc).isoformat(),
            "mode": "Live Production DW",
            "ordersIndexed": f"{headline_orders:,} orders",
            "filters": {
                "period": period,
                "category": category,
                "state": state,
                "granularity": granularity,
            },
            "categoryFilter": category,
            "stateFilter": state,
            "granularity": granularity,
            "revenueDefinition": REVENUE_DEFINITION,
            "comparisonAvailable": comparison_available,
            "kpiScope": {"mode": "all_time" if is_all_time else "period"},
            "comparison": {
                "currentStart": curr_start,
                "currentEnd": curr_end,
                "previousStart": prev_start,
                "previousEnd": prev_end,
            },
            "partialPeriod": partial_period,
            "excludedPeriods": excluded_periods,
            "excludedRevenue": excluded_revenue,
            "minOrdersPerPeriod": min_orders,
            "targetDefinition": MOVING_AVG_DEFINITION,
            "movingAvg3Definition": MOVING_AVG_DEFINITION,
        }

        payload = {
            "kpis": kpis,
            "series": {
                "revenue_over_time": revenue_over_time,
                "delivery_performance": delivery_performance,
                "satisfaction_trend": satisfaction_trend,
                "cancellation_trend": cancellation_trend,
                "top_categories": top_categories,
                "top_states": series_states,
                "category_distribution": category_distribution,
            },
            "tables": {
                "top_categories": top_categories,
                "top_states": all_states,
                "bottom_performers": bottom_performers,
                "anomalies": anomalies,
                "period_comparison": period_comparison,
            },
            "insights": executive_insights,
            "meta": meta,
        }

        _DASHBOARD_CACHE[cache_key] = (payload, now_ts)
        return payload

    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(err),
        )