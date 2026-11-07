from app.security.sql_guard import validate_sql
from app.tools.sql.db_exec import run_query
from app.tools.result import failure, success


def _query(sql: str, params: tuple = ()) -> list[dict]:
    validated = validate_sql(sql)
    return run_query(validated, params)


def find_opportunities() -> dict:
    try:
        high_aov_low_vol_sql = """
        SELECT
          p.product_category_name AS category,
          COUNT(DISTINCT o.order_id) AS orders,
          ROUND(SUM(oi.price), 2) AS total_revenue,
          ROUND(AVG(oi.price), 2) AS aov
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE o.order_status = 'delivered'
          AND p.product_category_name IS NOT NULL
        GROUP BY p.product_category_name
        HAVING aov > 200 AND orders BETWEEN 50 AND 500
        ORDER BY aov DESC
        LIMIT 3
        """
        high_aov_cats = _query(high_aov_low_vol_sql)

        sla_bottleneck_sql = """
        SELECT
          c.customer_state AS state,
          COUNT(DISTINCT o.order_id) AS total_orders,
          ROUND(AVG(CASE WHEN o.order_delivered_customer_date <= o.order_estimated_delivery_date THEN 1.0 ELSE 0.0 END) * 100, 1) AS on_time_rate,
          ROUND(AVG(julianday(o.order_delivered_customer_date) - julianday(o.order_purchase_timestamp)), 1) AS avg_delivery_days,
          ROUND(AVG(r.review_score), 2) AS avg_review
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN order_reviews r ON o.order_id = r.order_id
        WHERE o.order_status = 'delivered'
          AND o.order_delivered_customer_date IS NOT NULL
        GROUP BY c.customer_state
        HAVING total_orders >= 500 AND on_time_rate < 88.0
        ORDER BY on_time_rate ASC
        LIMIT 3
        """
        sla_bottlenecks = _query(sla_bottleneck_sql)

        recommendations = []

        if high_aov_cats:
            cat_names = ", ".join(r["category"] for r in high_aov_cats)
            top_aov = high_aov_cats[0]["aov"]
            recommendations.append({
                "action": f"Expand marketing and bundle promotions for high-AOV categories ({cat_names})",
                "evidence": f"AOV reaches up to R$ {top_aov} despite low order volume (50-500 orders).",
                "confidence": "high",
                "measure": "Basket size & revenue contribution"
            })

        if sla_bottlenecks:
            states = ", ".join(r["state"] for r in sla_bottlenecks)
            worst_rate = sla_bottlenecks[0]["on_time_rate"]
            recommendations.append({
                "action": f"Optimize regional fulfillment hubs and carrier partnerships in {states}",
                "evidence": f"On-time delivery drops to {worst_rate}% in these states, directly impacting customer review scores.",
                "confidence": "high",
                "measure": "On-time delivery SLA (%) & 5-star review rate"
            })

        recommendations.append({
            "action": "Implement post-purchase loyalty campaigns and re-engagement vouchers within 45 days",
            "evidence": "Olist historical repeat purchase rate is approximately 3.0%, indicating substantial room for repeat customer retention.",
            "confidence": "medium",
            "measure": "Repeat purchase rate (%)"
        })

        table_rows = [
            {"opportunity_area": "High AOV Niches", "target": high_aov_cats[0]["category"] if high_aov_cats else "Computers/Appliances", "metric_value": f"AOV ~ R$ {high_aov_cats[0]['aov']}" if high_aov_cats else "R$ 200+"},
            {"opportunity_area": "Logistics SLA Optimization", "target": sla_bottlenecks[0]["state"] if sla_bottlenecks else "Northern / Mid-west states", "metric_value": f"SLA ~ {sla_bottlenecks[0]['on_time_rate']}%" if sla_bottlenecks else "< 88%"},
            {"opportunity_area": "Customer Retention", "target": "Delivered Buyers", "metric_value": "Repeat rate ~ 3.0%"},
        ]

        return success(
            columns=["opportunity_area", "target", "metric_value"],
            rows=table_rows,
            recommendations=recommendations,
            caveat="Đề xuất dựa trên phân tích dữ liệu lịch sử trong kho Olist, chưa phải mô hình dự báo tác động trực tiếp.",
        )
    except Exception as e:
        return failure(f"Could not compute opportunities: {e}")

