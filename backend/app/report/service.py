# app/report/service.py
import datetime
import os
import time
from collections import OrderedDict
from typing import Any, Optional

from fastapi import HTTPException

from app.db.database import execute_query, DB_PATH
from app.schemas.report import (
    AnomalyItem,
    CategoryItem,
    CategorySection,
    CityItem,
    ExecutiveSummaryItem,
    HighlightItem,
    KpiItem,
    OperationItem,
    PeriodComparisonItem,
    PositionItem,
    RecommendationItem,
    RegionItem,
    ReportMeta,
    ReportRequest,
    ReportResponse,
    SampleSize,
    Scope,
    TrendData,
    TrendPoint,
    YearOverviewRow,
)
from app.core.thresholds import (
    ANOMALY_Z_HIGH,
    CANCEL_CONTROLLED_MAX_PCT,
    CANCEL_WATCH_MAX_PCT,
    COMPOUND_DELTA_TOLERANCE_PCT,
    MIN_ORDERS_FOR_RANKING,
    ON_TIME_FLOOR_PCT,
    REPEAT_PURCHASE_REFERENCE_PCT,
    REVIEW_SCORE_MAX,
    SLA_DAYS,
    classify_cancellation,
    classify_on_time,
    methodology_thresholds,
)
from app.dashboard.queries import (
    STATE_NAMES,
    build_filter,
    compute_sla_status,
    detect_partial_period,
    format_category_name,
    format_where,
    get_comparison_windows,
    parse_period_range,
    query_anomalies,
    query_series_data,
    query_top_states,
    query_window_metrics,
    query_scope_metrics,
    query_totals,
)
from app.report.calculations import _compute_comparison_note
from app.report.queries import (
    build_scope,
    get_db_bounds,
    is_all_categories,
    is_all_states,
    query_category_deep_dive,
    query_category_period_breakdown,
    query_category_position,
    query_excluded_periods_revenue,
    query_sample_size,
    query_state_position,
    query_top_cities,
    query_year_over_year,
)

CACHE_TTL_SECONDS = 300
CACHE_MAX_SIZE = 100
_REPORT_CACHE: "OrderedDict[tuple, tuple[ReportResponse, float]]" = OrderedDict()

VALID_GRANULARITIES = {"week", "month", "quarter"}
VALIDATION_TOLERANCE_BRL = 0.01

_KPI_TONE = {"good": "good", "bad": "bad", "warn": "neutral", "neutral": "neutral"}


def generate_report(req: ReportRequest):
    period_str = (req.period or "All time").strip()
    category_str = (req.category or "All categories").strip()
    state_str = (req.state or "All states").strip()
    granularity_str = (req.granularity or "Month").strip()

    if category_str.lower() in ("all categories", "all category", "all"):
        category_str = "All categories"
    if state_str.lower() in ("all states", "all state", "all"):
        state_str = "All states"

    # ---- Input validation (B) ----
    g_lower = granularity_str.lower()
    if g_lower not in VALID_GRANULARITIES:
        raise HTTPException(
            status_code=422,
            detail=f"granularity must be one of Week, Month, Quarter; got '{granularity_str}'",
        )

    if state_str != "All states":
        upper_state = state_str.upper()
        if upper_state not in STATE_NAMES:
            raise HTTPException(
                status_code=422,
                detail=f"state '{req.state}' is not a valid Brazilian state code",
            )
        state_str = upper_state

    is_all_time = period_str.lower() in ("all time", "all", "")
    if not is_all_time:
        try:
            req_start, req_end, parsed_prev_start, parsed_prev_end = parse_period_range(period_str)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
    else:
        req_start = req_end = parsed_prev_start = parsed_prev_end = None

    # ---- Cache lookup ----
    db_mtime = os.path.getmtime(DB_PATH) if os.path.exists(DB_PATH) else 0
    cache_key = (period_str, category_str, state_str, g_lower, db_mtime)
    now_ts = time.time()
    if cache_key in _REPORT_CACHE:
        cached_val, cached_time = _REPORT_CACHE[cache_key]
        if now_ts - cached_time < CACHE_TTL_SECONDS:
            _REPORT_CACHE.move_to_end(cache_key)
            return cached_val
        else:
            del _REPORT_CACHE[cache_key]

    partial_period = detect_partial_period()

    curr_start, curr_end, prev_start, prev_end = get_comparison_windows(period=period_str)

    (
        revenue_over_time,
        delivery_performance,
        satisfaction_trend,
        cancellation_trend,
        excluded_periods,
        min_orders,
    ) = query_series_data(
        period=period_str,
        category=category_str,
        state=state_str,
        granularity=granularity_str,
    )

    totals = query_totals(period=period_str, category=category_str, state=state_str)
    headline_orders = totals["orders"]
    headline_rev = totals["revenue"]
    headline_aov = totals["aov"]

    prev_metrics = query_window_metrics(prev_start, prev_end, category_str, state_str, compute_repeat=False)

    comparison_available = False
    comparison_reason = None

    if is_all_time:
        comparison_available = False
        comparison_reason = "All-time reports span the entire recorded transaction history (2016–2018); no earlier baseline exists."
    elif req_start and req_end and parsed_prev_start and parsed_prev_end:
        if prev_metrics.get("orders") and prev_metrics["orders"] > 0:
            comparison_available = True
        else:
            comparison_available = False
            comparison_reason = f"Prior period ({parsed_prev_start[:10]} to {parsed_prev_end[:10]}) contains no completed orders in database."
    elif prev_start and prev_end:
        if prev_metrics.get("orders") and prev_metrics["orders"] > 0:
            comparison_available = True
        else:
            comparison_available = False
            comparison_reason = "Insufficient historical order data in the preceding comparison window."

    sample_info = query_sample_size(period_str, category_str, state_str)
    is_empty_sample = sample_info.get("level") == "empty"

    comparison_note = None
    if comparison_available:
        comparison_note = _compute_comparison_note(
            req_start or curr_start,
            req_end or curr_end,
            parsed_prev_start or prev_start,
            parsed_prev_end or prev_end,
        )

    scope_dict = build_scope(
        period=period_str,
        category=category_str,
        state=state_str,
        is_all_time=is_all_time,
        comparison_available=comparison_available,
        curr_start=req_start or curr_start,
        curr_end=req_end or curr_end,
        prev_start=parsed_prev_start or prev_start,
        prev_end=parsed_prev_end or prev_end,
        partial_period=partial_period,
        sample=sample_info,
        comparison_note=comparison_note,
    )

    scope_metrics = query_scope_metrics(period_str, category_str, state_str, compute_repeat=True)
    avg_delivery = scope_metrics.get("avg_delivery")
    on_time = scope_metrics.get("on_time_rate")
    cancel_rate = scope_metrics.get("cancel_rate")
    avg_review = scope_metrics.get("avg_review")
    repeat_rate = scope_metrics.get("repeat_rate")

    on_time_status, on_time_tone = classify_on_time(on_time)
    cancel_status, cancel_tone = classify_cancellation(cancel_rate)

    p_rev = prev_metrics.get("revenue") if comparison_available else None
    p_ord = prev_metrics.get("orders") if comparison_available else None
    p_aov = prev_metrics.get("aov") if comparison_available else None
    p_del = prev_metrics.get("avg_delivery") if comparison_available else None
    p_ontime = prev_metrics.get("on_time_rate") if comparison_available else None
    p_canc = prev_metrics.get("cancel_rate") if comparison_available else None
    p_revw = prev_metrics.get("avg_review") if comparison_available else None
    p_rep = prev_metrics.get("repeat_rate") if comparison_available else None

    def calc_delta(curr: Optional[float], prev: Optional[float]):
        if curr is None or prev is None or not comparison_available:
            return None, None
        diff = round(curr - prev, 2)
        pct = round((diff / prev) * 100.0, 1) if prev != 0 else None
        return diff, pct

    rev_diff, rev_pct = calc_delta(headline_rev, p_rev)
    ord_diff, ord_pct = calc_delta(float(headline_orders), float(p_ord) if p_ord is not None else None)
    aov_diff, aov_pct = calc_delta(headline_aov, p_aov)
    del_diff, del_pct = calc_delta(avg_delivery, p_del)
    ontime_diff, ontime_pct = calc_delta(on_time, p_ontime)
    canc_diff, canc_pct = calc_delta(cancel_rate, p_canc)
    revw_diff, revw_pct = calc_delta(avg_review, p_revw)
    rep_diff, rep_pct = calc_delta(repeat_rate, p_rep)

    benchmark_metrics: dict[str, Any] = {}
    benchmark_label = None
    if not is_all_categories(category_str) and is_all_states(state_str):
        benchmark_metrics = query_scope_metrics(period_str, "All categories", "All states", compute_repeat=True)
        benchmark_label = "Marketplace Avg"
    elif is_all_categories(category_str) and not is_all_states(state_str):
        benchmark_metrics = query_scope_metrics(period_str, "All categories", "All states", compute_repeat=True)
        benchmark_label = "National Benchmark"
    elif not is_all_categories(category_str) and not is_all_states(state_str):
        benchmark_metrics = query_scope_metrics(period_str, category_str, "All states", compute_repeat=True)
        benchmark_label = "Category Nationwide"

    kpis = [
        KpiItem(
            key="revenue",
            label="Total Revenue",
            value=headline_rev,
            previousValue=p_rev,
            delta=rev_diff,
            deltaPct=rev_pct,
            benchmarkValue=benchmark_metrics.get("revenue"),
            benchmarkLabel=benchmark_label,
            unit="BRL",
            direction="higher_is_better",
            tone="good" if (rev_pct is not None and rev_pct >= 0) else ("bad" if rev_pct is not None else "neutral"),
            subtitle="Delivered merchandise net sales",
        ),
        KpiItem(
            key="orders",
            label="Delivered Orders",
            value=float(headline_orders),
            previousValue=float(p_ord) if p_ord is not None else None,
            delta=ord_diff,
            deltaPct=ord_pct,
            benchmarkValue=float(benchmark_metrics["orders"]) if benchmark_metrics.get("orders") else None,
            benchmarkLabel=benchmark_label,
            unit="orders",
            direction="higher_is_better",
            tone="good" if (ord_pct is not None and ord_pct >= 0) else ("bad" if ord_pct is not None else "neutral"),
            subtitle="Completed customer orders",
        ),
        KpiItem(
            key="aov",
            label="Average Order Value",
            value=headline_aov,
            previousValue=p_aov,
            delta=aov_diff,
            deltaPct=aov_pct,
            benchmarkValue=benchmark_metrics.get("aov"),
            benchmarkLabel=benchmark_label,
            unit="BRL",
            direction="higher_is_better",
            tone="good" if (aov_pct is not None and aov_pct >= 0) else ("bad" if aov_pct is not None else "neutral"),
            subtitle="Average basket spend per order",
        ),
        KpiItem(
            key="avgDeliveryDays",
            label="Avg Delivery Time",
            value=avg_delivery,
            previousValue=p_del,
            delta=del_diff,
            deltaPct=del_pct,
            benchmarkValue=benchmark_metrics.get("avg_delivery"),
            benchmarkLabel=benchmark_label,
            unit="days",
            direction="lower_is_better",
            tone="good" if (avg_delivery is not None and avg_delivery <= SLA_DAYS) else ("neutral" if avg_delivery is None else "bad"),
            status="Optimal" if (avg_delivery is not None and avg_delivery <= SLA_DAYS) else ("No data" if avg_delivery is None else "Warning"),
            subtitle=f"Target SLA threshold <= {float(SLA_DAYS):.1f} days",
        ),
        KpiItem(
            key="onTimeRate",
            label="On-Time Delivery Rate",
            value=on_time,
            previousValue=p_ontime,
            delta=ontime_diff,
            deltaPct=ontime_pct,
            benchmarkValue=benchmark_metrics.get("on_time_rate"),
            benchmarkLabel=benchmark_label,
            unit="%",
            direction="higher_is_better",
            tone=_KPI_TONE[on_time_tone],
            status=on_time_status,
            subtitle="Delivered to customer on or before estimated date",
        ),
        KpiItem(
            key="cancelRate",
            label="Cancellation Rate",
            value=cancel_rate,
            previousValue=p_canc,
            delta=canc_diff,
            deltaPct=canc_pct,
            benchmarkValue=benchmark_metrics.get("cancel_rate"),
            benchmarkLabel=benchmark_label,
            unit="%",
            direction="lower_is_better",
            tone=_KPI_TONE[cancel_tone],
            status=cancel_status,
            subtitle="Pre-fulfillment cancellation ratio",
        ),
        KpiItem(
            key="avgReviewScore",
            label="Avg Review Score",
            value=avg_review,
            previousValue=p_revw,
            delta=revw_diff,
            deltaPct=revw_pct,
            benchmarkValue=benchmark_metrics.get("avg_review"),
            benchmarkLabel=benchmark_label,
            unit="score",
            direction="higher_is_better",
            tone="neutral",
            status="No data" if avg_review is None else None,
            subtitle="Latest customer review rating per order (out of 5.0)",
        ),
        KpiItem(
            key="repeatPurchaseRate",
            label="Repeat Purchase Rate",
            value=repeat_rate,
            previousValue=p_rep,
            delta=rep_diff,
            deltaPct=rep_pct,
            benchmarkValue=benchmark_metrics.get("repeat_rate"),
            benchmarkLabel=benchmark_label,
            unit="%",
            direction="higher_is_better",
            tone="neutral",
            status="No data" if repeat_rate is None else None,
            subtitle="Share of buyers with multiple orders",
        ),
    ]

    # D3: sample empty -> neutral / No data / value None on all KPIs
    if is_empty_sample:
        for kpi in kpis:
            kpi.value = None
            kpi.previousValue = None
            kpi.delta = None
            kpi.deltaPct = None
            kpi.benchmarkValue = None
            kpi.tone = "neutral"
            kpi.status = "No data"

    period_comparison_table: list[PeriodComparisonItem] = []
    if comparison_available:
        comparison_configs = [
            ("Total Net Revenue", headline_rev, p_rev, "currency"),
            ("Completed Orders", float(headline_orders), float(p_ord) if p_ord is not None else None, "number"),
            ("Average Order Value (AOV)", headline_aov, p_aov, "currency"),
            ("Average Delivery Time", avg_delivery, p_del, "days"),
            ("On-Time SLA Compliance", on_time, p_ontime, "percent"),
            ("Customer Review Rating", avg_review, p_revw, "score"),
            ("Cancellation Rate", cancel_rate, p_canc, "percent"),
        ]
        for name, c_val, p_val, fmt in comparison_configs:
            if c_val is not None and p_val is not None:
                diff_val = c_val - p_val
                pct_val = ((diff_val) / p_val * 100.0) if p_val != 0 else 0.0
                if fmt == "currency":
                    c_str = f"R$ {c_val:,.2f}"
                    p_str = f"R$ {p_val:,.2f}"
                    d_str = f"{'+' if diff_val >= 0 else ''}R$ {diff_val:,.2f}"
                elif fmt == "number":
                    c_str = f"{int(c_val):,}"
                    p_str = f"{int(p_val):,}"
                    d_str = f"{int(diff_val):+d}"
                elif fmt == "days":
                    c_str = f"{c_val:.1f} days"
                    p_str = f"{p_val:.1f} days"
                    d_str = f"{diff_val:+.1f} days"
                elif fmt == "score":
                    c_str = f"{c_val:.2f} / 5.0"
                    p_str = f"{p_val:.2f} / 5.0"
                    d_str = f"{diff_val:+.2f} pts"
                else:
                    c_str = f"{c_val:.1f}%"
                    p_str = f"{p_val:.1f}%"
                    d_str = f"{diff_val:+.1f}%"
                is_pos = diff_val <= 0 if fmt in ("days", "percent") and name in ("Average Delivery Time", "Cancellation Rate") else diff_val >= 0
                period_comparison_table.append(
                    PeriodComparisonItem(
                        metric=name,
                        current=c_str,
                        previous=p_str,
                        change=d_str,
                        pct=f"{pct_val:+.1f}%",
                        isPositive=is_pos,
                    )
                )

    series_points: list[TrendPoint] = []
    prev_m_rev: Optional[float] = None
    peak_month: Optional[str] = None
    peak_rev: float = 0.0

    for r in revenue_over_time:
        m_str = r["month"]
        m_rev = float(r["revenue"] or 0.0)
        m_ord = int(r["orders"] or 0)
        m_aov = float(r["aov"] or 0.0)
        is_part = (m_str == partial_period)

        mom = None
        if prev_m_rev is not None and prev_m_rev > 0:
            mom = round(((m_rev - prev_m_rev) / prev_m_rev) * 100.0, 1)

        if m_rev > peak_rev:
            peak_rev = m_rev
            peak_month = m_str

        series_points.append(
            TrendPoint(
                month=m_str,
                revenue=m_rev,
                orders=m_ord,
                aov=m_aov,
                prevRevenue=prev_m_rev,
                isPartial=is_part,
                momGrowthPct=mom,
            )
        )
        prev_m_rev = m_rev

    peak_narrative = f"Monthly revenue peaked in {peak_month} at R$ {peak_rev:,.2f}." if peak_month else ""
    trend_narrative = (
        f"Across {len(series_points)} periods under {period_str}, total delivered revenue reached "
        f"R$ {headline_rev:,.2f} across {headline_orders:,} orders with an average basket value of R$ {headline_aov:,.2f}. {peak_narrative}"
    )

    trend_payload = TrendData(
        narrative=trend_narrative,
        series=series_points,
        peakMonth=peak_month,
        peakRevenue=peak_rev if peak_month else None,
    )

    year_overview: Optional[list[YearOverviewRow]] = None
    if is_all_time:
        yo_raw = query_year_over_year(category=category_str, state=state_str)
        year_overview = [
            YearOverviewRow(
                year=r["year"],
                revenue=r["revenue"],
                orders=r["orders"],
                aov=r["aov"],
                growthPct=r["growthPct"],
                isPartial=r["isPartial"],
                monthsCovered=r["monthsCovered"],
                growthNote=r["growthNote"],
            )
            for r in yo_raw
        ]

    position_item: Optional[PositionItem] = None
    if not is_all_categories(category_str) and is_all_states(state_str):
        pos_raw = query_category_position(period_str, category_str, state_str)
        if pos_raw:
            position_item = PositionItem(**pos_raw)
    elif not is_all_states(state_str):
        pos_raw = query_state_position(period_str, category_str, state_str)
        if pos_raw:
            position_item = PositionItem(**pos_raw)

    category_deep_dive: Optional[list[RegionItem]] = None
    if not is_all_categories(category_str) and is_all_states(state_str):
        cdd_raw = query_category_deep_dive(period_str, category_str, limit=5)
        category_deep_dive = [RegionItem(**x) for x in cdd_raw]

    top_cities: Optional[list[CityItem]] = None
    if not is_all_states(state_str):
        tc_raw = query_top_cities(period_str, category_str, state_str, limit=5)
        top_cities = [CityItem(**x) for x in tc_raw]

    active_start = parsed_prev_start if (parsed_prev_start and parsed_prev_end) else prev_start
    active_end = parsed_prev_end if (parsed_prev_start and parsed_prev_end) else prev_end

    category_section: Optional[CategorySection] = None
    if is_all_categories(category_str):
        curr_cat_breakdown = query_category_period_breakdown(
            start_date=req_start if not is_all_time else None,
            end_date=req_end if not is_all_time else None,
            period=period_str if is_all_time else None,
            state=state_str,
        )

        prev_cat_breakdown = {}
        if comparison_available and active_start and active_end:
            prev_cat_breakdown = query_category_period_breakdown(
                start_date=active_start,
                end_date=active_end,
                period=None,
                state=state_str,
            )

        all_cat_items: list[dict[str, Any]] = []
        for cat, data in curr_cat_breakdown.items():
            c_cat_rev = data["revenue"]
            c_cat_ord = data["orders"]
            share = round((c_cat_rev / headline_rev) * 100.0, 1) if headline_rev > 0 else 0.0

            growth = None
            if cat in prev_cat_breakdown:
                p_cat_rev = prev_cat_breakdown[cat]["revenue"]
                if p_cat_rev > 0:
                    growth = round(((c_cat_rev - p_cat_rev) / p_cat_rev) * 100.0, 1)

            all_cat_items.append({
                "category": data["name"],
                "rawCategory": cat,
                "revenue": c_cat_rev,
                "orders": c_cat_ord,
                "sharePct": share,
                "growthPct": growth,
                "prevOrders": prev_cat_breakdown.get(cat, {}).get("orders", 0),
            })

        all_cat_items.sort(key=lambda x: x["revenue"], reverse=True)
        top_by_revenue = [
            CategoryItem(
                rank=idx + 1,
                category=item["category"],
                rawCategory=item["rawCategory"],
                revenue=item["revenue"],
                orders=item["orders"],
                sharePct=item["sharePct"],
                growthPct=item["growthPct"],
            )
            for idx, item in enumerate(all_cat_items[:5])
        ]

        top3_rev_sum = sum(item.revenue for item in top_by_revenue[:3])
        top3_share = round((top3_rev_sum / headline_rev) * 100.0, 1) if headline_rev > 0 else 0.0

        top_by_growth: list[CategoryItem] = []
        underperformers: list[CategoryItem] = []

        if comparison_available:
            growth_eligible = [
                item for item in all_cat_items
                if item["orders"] >= MIN_ORDERS_FOR_RANKING
                and item["prevOrders"] >= MIN_ORDERS_FOR_RANKING
                and item["growthPct"] is not None
            ]
            growth_eligible.sort(key=lambda x: x["growthPct"], reverse=True)
            top_by_growth = [
                CategoryItem(
                    rank=idx + 1,
                    category=item["category"],
                    rawCategory=item["rawCategory"],
                    revenue=item["revenue"],
                    orders=item["orders"],
                    sharePct=item["sharePct"],
                    growthPct=item["growthPct"],
                )
                for idx, item in enumerate(growth_eligible[:5])
            ]
            growth_eligible_bot = sorted(growth_eligible, key=lambda x: x["growthPct"])
            underperformers = [
                CategoryItem(
                    rank=idx + 1,
                    category=item["category"],
                    rawCategory=item["rawCategory"],
                    revenue=item["revenue"],
                    orders=item["orders"],
                    sharePct=item["sharePct"],
                    growthPct=item["growthPct"],
                )
                for idx, item in enumerate(growth_eligible_bot[:5])
            ]
        else:
            revenue_eligible = [
                item for item in all_cat_items
                if item["orders"] >= MIN_ORDERS_FOR_RANKING
            ]
            revenue_eligible.sort(key=lambda x: x["revenue"])
            underperformers = [
                CategoryItem(
                    rank=idx + 1,
                    category=item["category"],
                    rawCategory=item["rawCategory"],
                    revenue=item["revenue"],
                    orders=item["orders"],
                    sharePct=item["sharePct"],
                    growthPct=None,
                )
                for idx, item in enumerate(revenue_eligible[:5])
            ]

        category_section = CategorySection(
            rankingCriteria=f"Revenue rank across all categories; growth ranked strictly among categories with >= {MIN_ORDERS_FOR_RANKING} orders in both evaluation periods",
            minOrdersThreshold=MIN_ORDERS_FOR_RANKING,
            topByRevenue=top_by_revenue,
            topByGrowth=top_by_growth,
            underperformers=underperformers,
            top3RevenueSharePct=top3_share,
        )

    regions_list: Optional[list[RegionItem]] = None
    if is_all_states(state_str) and is_all_categories(category_str):
        all_states, _ = query_top_states(period=period_str, category=category_str, state=state_str)
        all_states.sort(key=lambda s: s["revenue"], reverse=True)
        regions_list = []
        for idx, st in enumerate(all_states[:5]):
            st_rev = float(st["revenue"] or 0.0)
            st_share = round((st_rev / headline_rev) * 100.0, 1) if headline_rev > 0 else 0.0
            regions_list.append(
                RegionItem(
                    rank=idx + 1,
                    state=st["state"],
                    name=st["name"],
                    orders=st["orders"],
                    revenue=st_rev,
                    sharePct=st_share,
                    avgDeliveryDays=st["avgDays"],
                    onTimeRate=st["slaRate"],
                    status=compute_sla_status(st["slaRate"]),
                )
            )

    raw_anomalies = query_anomalies(period=period_str, category=category_str, state=state_str)
    anomalies_list: list[AnomalyItem] = []
    highlights_list: list[HighlightItem] = []

    for idx, ano in enumerate(raw_anomalies):
        z = float(ano.get("zScore") or 0.0)
        sev = "High" if abs(z) >= ANOMALY_Z_HIGH else "Medium"
        direction = "Up" if z > 0 else "Down"
        if z < 0:
            anomalies_list.append(
                AnomalyItem(
                    id=f"ano-{idx + 1}",
                    metric=ano.get("metric", "Daily Volume"),
                    subject=ano.get("date", "Period Date"),
                    observed=ano.get("value", "0 orders"),
                    baseline=ano.get("baseline", "0 orders"),
                    deviation=z,
                    severity=sev,
                    direction=direction,
                    description=f"Negative order volume contraction on {ano.get('date')}: recorded {ano.get('value')} vs statistical baseline of {ano.get('baseline')} ({z:+.2f} sigma).",
                )
            )
        else:
            highlights_list.append(
                HighlightItem(
                    id=f"hl-{idx + 1}",
                    title=f"Demand Surge on {ano.get('date')}",
                    description=f"Observed peak volume of {ano.get('value')} against standard baseline of {ano.get('baseline')} ({z:+.2f} sigma deviation).",
                    metric="Daily Orders",
                    value=ano.get("value", ""),
                )
            )

    if on_time is not None and on_time >= ON_TIME_FLOOR_PCT:
        highlights_list.append(
            HighlightItem(
                id="hl-sla",
                title="Strong On-Time SLA Compliance",
                description=f"Delivery compliance reached {on_time:.2f}%, surpassing the {ON_TIME_FLOOR_PCT:.1f}% operational benchmark.",
                metric="On-Time Rate",
                value=f"{on_time:.2f}%",
            )
        )

    if avg_delivery is not None and avg_delivery <= SLA_DAYS:
        highlights_list.append(
            HighlightItem(
                id="hl-speed",
                title="Transit Speed within SLA Benchmark",
                description=f"Average customer delivery duration concluded at {avg_delivery:.2f} days, satisfying the <= {SLA_DAYS}-day standard.",
                metric="Delivery Duration",
                value=f"{avg_delivery:.2f} days",
            )
        )

    # ---- F: Recommendations (rule-based, no causal claims) ----
    recommendations: list[RecommendationItem] = []

    if category_section and category_section.topByRevenue:
        lead_cat = category_section.topByRevenue[0]
        recommendations.append(
            RecommendationItem(
                priority="High",
                action=f"Suggested action (rule-based): Review inventory allocation and vendor supply coverage for {lead_cat.category}.",
                relatedKpi="Total Revenue",
                evidence=f"{lead_cat.category} contributed R$ {lead_cat.revenue:,.2f} ({lead_cat.sharePct}% of net sales) across {lead_cat.orders:,} orders.",
                expectedImpact=None,
                basis=f"rule: {lead_cat.category} ranked #1 by revenue at {lead_cat.sharePct}% share",
            )
        )
    elif position_item:
        recommendations.append(
            RecommendationItem(
                priority="High",
                action=f"Suggested action (rule-based): Review distribution coverage for {position_item.name}.",
                relatedKpi="Market Position",
                evidence=f"{position_item.name} accounts for {position_item.sharePct}% share (R$ {position_item.revenue:,.2f}) with {position_item.orders:,} orders.",
                expectedImpact=None,
                basis=f"rule: sharePct {position_item.sharePct}% in ranked market position",
            )
        )

    states_breaching = [s for s in (regions_list or []) if (s.avgDeliveryDays or 0) > SLA_DAYS]
    if states_breaching:
        worst_st = max(states_breaching, key=lambda s: s.avgDeliveryDays or 0)
        recommendations.append(
            RecommendationItem(
                priority="High",
                action=f"Suggested action (rule-based): Review logistics routing options and regional delivery hubs for {worst_st.name} ({worst_st.state}).",
                relatedKpi="Avg Delivery Time",
                evidence=f"{worst_st.name} recorded average delivery times of {worst_st.avgDeliveryDays:.2f} days (target < {SLA_DAYS} days) with an SLA compliance of {worst_st.onTimeRate:.2f}%.",
                expectedImpact=None,
                basis=f"rule: avg_delivery {worst_st.avgDeliveryDays:.2f} days > {SLA_DAYS} days SLA threshold",
            )
        )
    elif regions_list:
        lead_st = regions_list[0]
        recommendations.append(
            RecommendationItem(
                priority="Medium",
                action=f"Suggested action (rule-based): Review regional distribution partnership options in {lead_st.name} ({lead_st.state}).",
                relatedKpi="On-Time Delivery Rate",
                evidence=f"{lead_st.name} represents {lead_st.sharePct}% of delivered volume ({lead_st.orders:,} orders) with {lead_st.onTimeRate:.2f}% on-time arrival.",
                expectedImpact=None,
                basis=f"rule: {lead_st.name} is top state by revenue at {lead_st.sharePct}% share",
            )
        )

    if cancel_status == "High Risk":
        recommendations.append(
            RecommendationItem(
                priority="High",
                action="Suggested action (rule-based): Review stock confirmation gates prior to payment capture.",
                relatedKpi="Cancellation Rate",
                evidence=f"Cancellation rate reached {cancel_rate:.2f}%, above the {CANCEL_WATCH_MAX_PCT:.1f}% threshold.",
                expectedImpact=None,
                basis=f"rule: cancellation_rate {cancel_rate:.2f}% > {CANCEL_WATCH_MAX_PCT:.1f}% threshold",
            )
        )
    else:
        recommendations.append(
            RecommendationItem(
                priority="Low",
                action="Suggested action (rule-based): Review multi-item bundle options during checkout.",
                relatedKpi="Average Order Value",
                evidence=f"Current average basket spend is R$ {headline_aov:,.2f} across {headline_orders:,} completed transactions.",
                expectedImpact=None,
                basis=f"rule: cancellation_rate within controlled band (<= {CANCEL_WATCH_MAX_PCT:.1f}%)",
            )
        )

    if category_section and category_section.underperformers and comparison_available:
        worst_growth = category_section.underperformers[0]
        if worst_growth.growthPct is not None and worst_growth.growthPct < 0:
            recommendations.append(
                RecommendationItem(
                    priority="Medium",
                    action=f"Suggested action (rule-based): Review category assortment for {worst_growth.category}.",
                    relatedKpi="Category Growth",
                    evidence=f"{worst_growth.category} contracted {worst_growth.growthPct:+.1f}% period-over-period while still fulfilling {worst_growth.orders:,} orders.",
                    expectedImpact=None,
                    basis=f"rule: {worst_growth.category} growth {worst_growth.growthPct:+.1f}% < 0",
                )
            )

    executive_summary: list[ExecutiveSummaryItem] = []

    rev_comp_note = f" ({rev_pct:+.1f}% vs prior period)" if rev_pct is not None else ""
    executive_summary.append(
        ExecutiveSummaryItem(
            text=f"Total delivered revenue for {scope_dict['label']} reached R$ {headline_rev:,.2f} across {headline_orders:,} completed orders{rev_comp_note}, yielding an Average Order Value of R$ {headline_aov:,.2f}.",
            tone="good" if (rev_pct is not None and rev_pct >= 0) else ("bad" if rev_pct is not None and rev_pct < 0 else "neutral"),
        )
    )

    if category_section and category_section.topByRevenue:
        executive_summary.append(
            ExecutiveSummaryItem(
                text=f"Revenue concentration remains focused with the top 3 categories accounting for {category_section.top3RevenueSharePct}% of sales, led by {category_section.topByRevenue[0].category}.",
                tone="neutral",
            )
        )
    elif position_item:
        rank_text = f", ranking #{position_item.rank} of {position_item.total}" if position_item.rank is not None else ""
        executive_summary.append(
            ExecutiveSummaryItem(
                text=f"This segment accounts for {position_item.sharePct}% of total scope volume ({position_item.orders:,} orders){rank_text}.",
                tone="neutral",
            )
        )

    del_tone = "good" if (avg_delivery is not None and avg_delivery <= SLA_DAYS and on_time_tone == "good") else "bad"
    del_text = f"Delivery logistics posted an average transit duration of {avg_delivery:.2f} days and an on-time arrival compliance rate of {on_time:.2f}% (SLA standard: <= {SLA_DAYS} days and >= {ON_TIME_FLOOR_PCT:.1f}%)." if (avg_delivery is not None and on_time is not None) else "Delivery metrics actively monitored across logistics corridors."
    executive_summary.append(
        ExecutiveSummaryItem(
            text=del_text,
            tone=del_tone,
        )
    )

    if avg_review is not None:
        rep_note = f" with a repeat purchase rate of {repeat_rate:.2f}%." if repeat_rate is not None else "."
        executive_summary.append(
            ExecutiveSummaryItem(
                text=f"Customer satisfaction recorded an average review score of {avg_review:.2f} / 5.0{rep_note}",
                tone="neutral",
            )
        )

    operations: list[OperationItem] = [
        OperationItem(
            name="On-Time Delivery Compliance",
            score=on_time if on_time is not None else 0.0,
            target=ON_TIME_FLOOR_PCT,
            unit="%",
            status=on_time_status if on_time is not None else "No data",
        ),
        OperationItem(
            name="Average Transit Lead Time",
            score=avg_delivery if avg_delivery is not None else 0.0,
            target=float(SLA_DAYS),
            unit="days",
            status=("Optimal" if avg_delivery <= SLA_DAYS else "Warning") if avg_delivery is not None else "No data",
        ),
        OperationItem(
            name="Cancellation Rate",
            score=cancel_rate if cancel_rate is not None else 0.0,
            target=CANCEL_CONTROLLED_MAX_PCT,
            unit="%",
            status=cancel_status if cancel_rate is not None else "No data",
        ),
        OperationItem(
            name="Average Review Score",
            score=avg_review if avg_review is not None else 0.0,
            target=REVIEW_SCORE_MAX,
            unit="pts",
            status="Tracked" if avg_review is not None else "No data",
        ),
        OperationItem(
            name="Repeat Purchase Rate",
            score=repeat_rate if repeat_rate is not None else 0.0,
            target=REPEAT_PURCHASE_REFERENCE_PCT,
            unit="%",
            status="Tracked" if repeat_rate is not None else "No data",
        ),
    ]

    min_date, max_date = get_db_bounds()
    now_str = datetime.datetime.now().strftime("%b %d, %Y · %H:%M")

    kpi_defs = [
        {"name": "Total Revenue", "formula": "SUM(price) from order_items for delivered orders", "unit": "BRL (R$)"},
        {"name": "Delivered Orders", "formula": "COUNT(DISTINCT order_id) where order_status = 'delivered'", "unit": "orders"},
        {"name": "Average Order Value (AOV)", "formula": "Total Revenue / Delivered Orders", "unit": "BRL (R$)"},
        {"name": "Average Delivery Time", "formula": "AVG(julianday(delivered_date) - julianday(purchase_date))", "unit": "days"},
        {"name": "On-Time Delivery Rate", "formula": "100.0 * AVG(delivered_date <= estimated_delivery_date)", "unit": "percentage (%)"},
        {"name": "Cancellation Rate", "formula": "100.0 * (canceled_orders / total_created_orders)", "unit": "percentage (%)"},
        {"name": "Average Review Score", "formula": "AVG(latest review_score per order) using ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY review_answer_timestamp DESC)", "unit": "score (1-5)"},
        {"name": "Repeat Purchase Rate", "formula": "100.0 * (customers with >= 2 orders / total customers)", "unit": "percentage (%)"},
    ]

    limitations = [
        "Dataset scope: Brazilian E-Commerce public dataset spanning transactions from 2016-09 to 2018-10.",
        "Revenue excludes freight and voucher deductions, reflecting pure merchandise sales.",
        "Period-over-period comparisons require equivalent chronological history; 'All time' reports omit delta calculations to prevent fabricated baselines.",
        "Cancellation and on-time thresholds are industry benchmarks, not Olist-specific targets; repeat purchase rate and review score are displayed without a good/bad classification.",
    ]
    if partial_period:
        limitations.append(f"Month {partial_period} represents an incomplete calendar logging window.")

    # ---- A: validation with independent sums ----
    series_sum_revenue = round(sum(p.revenue for p in series_points), 2)
    excluded_revenue_sql = query_excluded_periods_revenue(
        period=period_str,
        category=category_str,
        state=state_str,
        granularity=granularity_str,
        buckets=excluded_periods,
    )
    reconciled_total = round(series_sum_revenue + excluded_revenue_sql, 2)
    revenue_discrepancy = round(abs(reconciled_total - headline_rev), 2)
    series_revenue_matches = revenue_discrepancy <= VALIDATION_TOLERANCE_BRL

    math_delta_error = None
    if comparison_available and ord_pct is not None and aov_pct is not None and rev_pct is not None:
        expected_compound = ((1.0 + ord_pct / 100.0) * (1.0 + aov_pct / 100.0) - 1.0) * 100.0
        math_delta_error = round(abs(expected_compound - rev_pct), 2)

    math_ok = (
        (math_delta_error is not None and math_delta_error <= COMPOUND_DELTA_TOLERANCE_PCT)
        if comparison_available else True
    )

    if series_revenue_matches and math_ok:
        if excluded_periods:
            status_str = f"Verified ({len(excluded_periods)} periods excluded for low volume)"
        else:
            status_str = "Verified"
    else:
        status_str = "Discrepancy Detected"

    validation_note = None
    if excluded_periods:
        validation_note = (
            f"Periods excluded due to low order volume (< min_orders_per_bucket): "
            f"{', '.join(excluded_periods)}. Excluded revenue from independent SQL: R$ {excluded_revenue_sql:,.2f}."
        )

    validation_report = {
        "seriesSumEqualsHeadline": series_revenue_matches,
        "seriesRevenueSum": series_sum_revenue,
        "excludedRevenue": excluded_revenue_sql,
        "reconciledTotal": reconciled_total,
        "headlineRevenue": headline_rev,
        "revenueDiscrepancy": revenue_discrepancy,
        "seriesOrdersSum": sum(p.orders for p in series_points),
        "headlineOrders": headline_orders,
        "mathDeltaConsistencyVerified": math_ok,
        "mathDeltaDiscrepancyPct": math_delta_error,
        "status": status_str,
        "note": validation_note,
    }

    meta = ReportMeta(
        generatedAt=now_str,
        requestedPeriod=period_str,
        effectivePeriod=f"{min_date} to {max_date}",
        filters={"period": period_str, "category": category_str, "state": state_str, "granularity": granularity_str},
        granularity=granularity_str,
        comparisonAvailable=comparison_available,
        comparisonReason=comparison_reason,
        comparisonWindows=scope_dict["comparisonWindows"],
        comparisonNote=comparison_note,
        totalOrders=headline_orders,
        totalRevenue=headline_rev,
        dataSource="Olist Brazilian E-Commerce DW (olist.db)",
        isPartialPeriod=scope_dict["isPartialPeriod"],
        excludedPeriods=excluded_periods,
        kpiDefinitions=kpi_defs,
        limitations=limitations,
        validation=validation_report,
        thresholds=methodology_thresholds(),
    )

    scope_model = Scope(
        categoryMode=scope_dict["categoryMode"],
        stateMode=scope_dict["stateMode"],
        periodMode=scope_dict["periodMode"],
        isPartialPeriod=scope_dict["isPartialPeriod"],
        comparisonAvailable=scope_dict["comparisonAvailable"],
        sampleSize=SampleSize(**scope_dict["sampleSize"]),
        label=scope_dict["label"],
        visibleSections=scope_dict["visibleSections"],
        comparisonWindows=scope_dict["comparisonWindows"],
        comparisonNote=scope_dict.get("comparisonNote"),
    )

    response = ReportResponse(
        title=f"Executive KPI Performance Report — {scope_dict['label']}",
        scope=scope_model,
        meta=meta,
        executiveSummary=executive_summary,
        kpis=kpis,
        periodComparison=period_comparison_table,
        position=position_item,
        yearOverview=year_overview,
        trend=trend_payload,
        categories=category_section,
        categoryDeepDive=category_deep_dive,
        regions=regions_list,
        topCities=top_cities,
        operations=operations,
        anomalies=anomalies_list,
        highlights=highlights_list,
        recommendations=recommendations,
    )

    # ---- C: LRU cache with OrderedDict ----
    if cache_key in _REPORT_CACHE:
        del _REPORT_CACHE[cache_key]
    _REPORT_CACHE[cache_key] = (response, now_ts)
    while len(_REPORT_CACHE) > CACHE_MAX_SIZE:
        _REPORT_CACHE.popitem(last=False)

    return response