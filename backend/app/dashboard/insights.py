from typing import Any
from app.core.thresholds import SLA_DAYS, MIN_ORDERS_BOTTOM_PERFORMER

def format_currency(val: float | None) -> str:
    if val is None:
        return "R$ 0.00"
    return f"R$ {val:,.2f}"

def format_orders(val: int | None) -> str:
    if val is None:
        return "0"
    return f"{val:,}"

def build_period_comparison(
    curr: dict[str, Any],
    prev: dict[str, Any],
) -> list[dict[str, Any]]:
    has_prev = prev and any(prev.get(k) is not None for k in ["revenue", "orders", "avg_delivery"])

    rows: list[dict[str, Any]] = []

    c_rev = curr.get("revenue")
    p_rev = prev.get("revenue") if has_prev else None
    if p_rev is not None and c_rev is not None:
        diff_rev = c_rev - p_rev
        pct_rev = ((c_rev - p_rev) / p_rev * 100.0) if p_rev > 0 else 0.0
        rows.append({
            "metric": "Total Net Sales Revenue",
            "current": f"R$ {c_rev:,.2f}",
            "previous": f"R$ {p_rev:,.2f}",
            "change": f"{'+' if diff_rev >= 0 else ''}R$ {diff_rev:,.2f}",
            "pct": f"{pct_rev:+.1f}%",
            "isPositive": diff_rev >= 0,
        })
    else:
        rows.append({
            "metric": "Total Net Sales Revenue",
            "current": f"R$ {c_rev:,.2f}" if c_rev is not None else None,
            "previous": None,
            "change": None,
            "pct": None,
            "isPositive": True,
        })

    c_ord = curr.get("orders")
    p_ord = prev.get("orders") if has_prev else None
    if p_ord is not None and c_ord is not None:
        diff_ord = c_ord - p_ord
        pct_ord = ((c_ord - p_ord) / p_ord * 100.0) if p_ord > 0 else 0.0
        rows.append({
            "metric": "Completed Customer Orders",
            "current": f"{c_ord:,}",
            "previous": f"{p_ord:,}",
            "change": f"{diff_ord:+d}",
            "pct": f"{pct_ord:+.1f}%",
            "isPositive": diff_ord >= 0,
        })
    else:
        rows.append({
            "metric": "Completed Customer Orders",
            "current": f"{c_ord:,}" if c_ord is not None else None,
            "previous": None,
            "change": None,
            "pct": None,
            "isPositive": True,
        })

    c_aov = curr.get("aov")
    p_aov = prev.get("aov") if has_prev else None
    if p_aov is not None and c_aov is not None:
        diff_aov = c_aov - p_aov
        pct_aov = ((c_aov - p_aov) / p_aov * 100.0) if p_aov > 0 else 0.0
        rows.append({
            "metric": "Average Order Value (AOV)",
            "current": f"R$ {c_aov:,.2f}",
            "previous": f"R$ {p_aov:,.2f}",
            "change": f"{'+' if diff_aov >= 0 else ''}R$ {diff_aov:,.2f}",
            "pct": f"{pct_aov:+.1f}%",
            "isPositive": diff_aov >= 0,
        })
    else:
        rows.append({
            "metric": "Average Order Value (AOV)",
            "current": f"R$ {c_aov:,.2f}" if c_aov is not None else None,
            "previous": None,
            "change": None,
            "pct": None,
            "isPositive": True,
        })

    c_del = curr.get("avg_delivery")
    p_del = prev.get("avg_delivery") if has_prev else None
    if p_del is not None and c_del is not None:
        diff_del = c_del - p_del
        pct_del = ((c_del - p_del) / p_del * 100.0) if p_del > 0 else 0.0
        rows.append({
            "metric": "Average Delivery Duration",
            "current": f"{c_del:.2f} days",
            "previous": f"{p_del:.2f} days",
            "change": f"{diff_del:+.2f} days",
            "pct": f"{pct_del:+.1f}%",
            "isPositive": diff_del <= 0,
        })
    else:
        rows.append({
            "metric": "Average Delivery Duration",
            "current": f"{c_del:.2f} days" if c_del is not None else None,
            "previous": None,
            "change": None,
            "pct": None,
            "isPositive": True,
        })

    c_ontime = curr.get("on_time_rate")
    p_ontime = prev.get("on_time_rate") if has_prev else None
    if p_ontime is not None and c_ontime is not None:
        diff_ontime = c_ontime - p_ontime
        pct_ontime = ((c_ontime - p_ontime) / p_ontime * 100.0) if p_ontime > 0 else 0.0
        rows.append({
            "metric": "On-Time SLA Compliance",
            "current": f"{c_ontime:.2f}%",
            "previous": f"{p_ontime:.2f}%",
            "change": f"{diff_ontime:+.2f}%",
            "pct": f"{pct_ontime:+.1f}%",
            "isPositive": diff_ontime >= 0,
        })
    else:
        rows.append({
            "metric": "On-Time SLA Compliance",
            "current": f"{c_ontime:.2f}%" if c_ontime is not None else None,
            "previous": None,
            "change": None,
            "pct": None,
            "isPositive": True,
        })

    c_revw = curr.get("avg_review")
    p_revw = prev.get("avg_review") if has_prev else None
    if p_revw is not None and c_revw is not None:
        diff_revw = c_revw - p_revw
        pct_revw = ((c_revw - p_revw) / p_revw * 100.0) if p_revw > 0 else 0.0
        rows.append({
            "metric": "Customer Review Rating",
            "current": f"{c_revw:.2f} / 5.0",
            "previous": f"{p_revw:.2f} / 5.0",
            "change": f"{diff_revw:+.2f} pts",
            "pct": f"{pct_revw:+.1f}%",
            "isPositive": diff_revw >= 0,
        })
    else:
        rows.append({
            "metric": "Customer Review Rating",
            "current": f"{c_revw:.2f} / 5.0" if c_revw is not None else None,
            "previous": None,
            "change": None,
            "pct": None,
            "isPositive": True,
        })

    c_canc = curr.get("cancel_rate")
    p_canc = prev.get("cancel_rate") if has_prev else None
    if p_canc is not None and c_canc is not None:
        diff_canc = c_canc - p_canc
        pct_canc = ((c_canc - p_canc) / p_canc * 100.0) if p_canc > 0 else 0.0
        rows.append({
            "metric": "Cancellation Rate",
            "current": f"{c_canc:.2f}%",
            "previous": f"{p_canc:.2f}%",
            "change": f"{diff_canc:+.2f}%",
            "pct": f"{pct_canc:+.1f}%",
            "isPositive": diff_canc <= 0,
        })
    else:
        rows.append({
            "metric": "Cancellation Rate",
            "current": f"{c_canc:.2f}%" if c_canc is not None else None,
            "previous": None,
            "change": None,
            "pct": None,
            "isPositive": True,
        })

    return rows

def build_executive_insights(
    curr_metrics: dict[str, Any],
    top_categories: list[dict],
    top_states: list[dict],
    system_health: dict[str, Any],
) -> dict[str, Any]:
    summary: list[dict[str, str]] = []

    if len(top_categories) >= 2:
        c1 = top_categories[0]
        c2 = top_categories[1]
        c_rev = c1["revenue"] + c2["revenue"]
        c_ord = c1["orders"] + c2["orders"]
        summary.append({
            "title": f"Strong Momentum in {c1['category']} & {c2['category']}",
            "desc": f"Leading categories generated R$ {c_rev:,.2f} in combined period revenue across {c_ord:,} customer orders.",
            "type": "growth",
        })
    elif len(top_categories) == 1:
        c1 = top_categories[0]
        summary.append({
            "title": f"Strong Performance in {c1['category']}",
            "desc": f"{c1['category']} generated R$ {c1['revenue']:,.2f} in period revenue across {c1['orders']:,} customer orders.",
            "type": "growth",
        })
    else:
        tot_rev = curr_metrics.get("revenue") or 0.0
        tot_ord = curr_metrics.get("orders") or 0
        summary.append({
            "title": "Period Revenue Performance",
            "desc": f"Delivered customer orders generated R$ {tot_rev:,.2f} in total period revenue across {tot_ord:,} orders.",
            "type": "growth",
        })

    qualifying_states = [s for s in top_states if s.get("orders", 0) >= MIN_ORDERS_BOTTOM_PERFORMER and s.get("slaRate") is not None]
    if len(qualifying_states) >= 2:
        best_st = max(qualifying_states, key=lambda s: s["slaRate"])
        worst_st = min(qualifying_states, key=lambda s: s["slaRate"])
        summary.append({
            "title": f"Regional Delivery Disparity in {best_st['name']} vs {worst_st['name']}",
            "desc": f"{best_st['name']} achieved {best_st['slaRate']:.1f}% on-time delivery ({best_st.get('avgDays', 0):.1f}d avg transit), while {worst_st['name']} reached {worst_st['slaRate']:.1f}% ({worst_st.get('avgDays', 0):.1f}d avg transit) across fulfillment corridors.",
            "type": "warning",
        })
    elif len(top_states) >= 2:
        valid_states = [s for s in top_states if s.get("avgDays") is not None]
        if valid_states:
            best_st = min(valid_states, key=lambda s: s["avgDays"])
            worst_st = max(valid_states, key=lambda s: s["avgDays"])
            summary.append({
                "title": f"Regional Delivery Disparity in {best_st['name']} vs {worst_st['name']}",
                "desc": f"{best_st['name']} achieved an optimal {best_st['avgDays']:.2f}d avg transit, while {worst_st['name']} averaged {worst_st['avgDays']:.2f}d across fulfillment corridors.",
                "type": "warning",
            })
        else:
            summary.append({
                "title": "Regional Delivery Performance",
                "desc": "Regional state transit operations are actively monitored across distribution corridors.",
                "type": "warning",
            })
    elif len(top_states) == 1:
        st = top_states[0]
        avg_d = st.get("avgDays") or 0.0
        sla_r = st.get("slaRate") or 0.0
        summary.append({
            "title": f"Regional Delivery in {st['name']}",
            "desc": f"{st['name']} recorded an average transit duration of {avg_d:.2f} days with {sla_r:.2f}% SLA compliance.",
            "type": "positive" if avg_d <= SLA_DAYS else "warning",
        })
    else:
        avg_d = curr_metrics.get("avg_delivery") or 0.0
        on_time = curr_metrics.get("on_time_rate") or 0.0
        summary.append({
            "title": "Operational Delivery Performance",
            "desc": f"Average delivery time stood at {avg_d:.2f} days with an on-time arrival rate of {on_time:.2f}%.",
            "type": "positive" if avg_d <= SLA_DAYS else "warning",
        })

    csat_late = curr_metrics.get("csat_late")
    csat_ontime = curr_metrics.get("csat_ontime")
    if csat_late is not None and csat_ontime is not None:
        summary.append({
            "title": "Review Scores on Punctual vs Late Deliveries",
            "desc": f"Late-delivered orders average {csat_late:.2f} stars vs {csat_ontime:.2f} for on-time orders.",
            "type": "positive",
        })
    elif curr_metrics.get("avg_review") is not None:
        avg_rev = curr_metrics.get("avg_review")
        summary.append({
            "title": "Customer Review Scores",
            "desc": f"Delivered orders average {avg_rev:.2f} stars, with on-time fulfillment correlating with higher review ratings.",
            "type": "positive",
        })
    else:
        summary.append({
            "title": "Customer Satisfaction Index",
            "desc": "Customer review scoring and rating stability tracked across delivered orders.",
            "type": "positive",
        })

    suggested_actions: list[dict[str, str]] = []

    states_above_target = [s for s in top_states if s.get("avgDays") is not None and s["avgDays"] > SLA_DAYS and s.get("orders", 0) >= MIN_ORDERS_BOTTOM_PERFORMER]
    if not states_above_target:
        states_above_target = [s for s in top_states if s.get("avgDays") is not None and s["avgDays"] > SLA_DAYS]
    if states_above_target:
        slowest = max(states_above_target, key=lambda s: s["avgDays"])
        suggested_actions.append({
            "action": (
                f"Suggested action (rule-based): Review regional carrier line-haul capacity in "
                f"{slowest['name']} ({slowest['state']}), where average transit is "
                f"{slowest['avgDays']:.1f} days against the {SLA_DAYS}-day target."
            ),
            "basis": (
                f"{slowest['name']} average transit {slowest['avgDays']:.2f}d > {SLA_DAYS}d target; "
                f"slowest among {len(states_above_target)} state(s) above the target"
            ),
        })

    categories_growing = [c for c in top_categories if c.get("growth") is not None and c["growth"] > 0]
    if categories_growing:
        fastest = max(categories_growing, key=lambda c: c["growth"])
        suggested_actions.append({
            "action": (
                f"Suggested action (rule-based): Check merchant inventory coverage for "
                f"{fastest['category']}, which grew {fastest['growth']:+.1f}% versus the previous period."
            ),
            "basis": (
                f"{fastest['category']} growth {fastest['growth']:+.1f}% > 0; "
                f"fastest among {len(categories_growing)} growing top categor"
                f"{'y' if len(categories_growing) == 1 else 'ies'}"
            ),
        })

    large_states = [s for s in top_states if s.get("orders", 0) >= MIN_ORDERS_BOTTOM_PERFORMER and s.get("slaRate") is not None]
    if not large_states:
        large_states = [s for s in top_states if s.get("slaRate") is not None]
    if large_states:
        overall_late = 100.0 - (curr_metrics.get("on_time_rate") or 90.0)
        def state_impact(s: dict) -> float:
            st_late = 100.0 - s["slaRate"]
            return s.get("orders", 0) * (st_late - overall_late)

        highest = max(large_states, key=state_impact)
        suggested_actions.append({
            "action": (
                f"Suggested action (rule-based): Evaluate fulfillment options in "
                f"{highest['name']} ({highest['state']}), which has an SLA compliance rate of "
                f"{highest['slaRate']:.1f}% across {highest['orders']:,} delivered orders."
            ),
            "basis": (
                f"{highest['name']} SLA compliance {highest['slaRate']:.2f}%; "
                f"highest opportunity among {len(large_states)} state(s) with at least {MIN_ORDERS_BOTTOM_PERFORMER} orders"
            ),
        })

    return {
        "summary": summary,
        "actionableRecommendations": [a["action"] for a in suggested_actions],
        "suggestedActions": suggested_actions,
        "systemHealth": system_health,
    }