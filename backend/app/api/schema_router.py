import os
import yaml
from fastapi import APIRouter
from app.db.database import execute_query

router = APIRouter()

SEMANTIC_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../semantic/semantic_layer.yaml"))

TABLE_QUESTIONS = {
    "orders": "What is the on-time delivery rate by state?",
    "order_items": "Show me total order items and revenue by product category",
    "order_payments": "What is the distribution of payment types and installment values?",
    "order_reviews": "What are the average customer satisfaction ratings by category?",
    "customers": "Where do most of our customers live geographically?",
    "products": "Which product category generates the highest net revenue?",
    "sellers": "How many active merchants are registered across each state?"
}

TABLE_RELATIONS = {
    "orders": [
        {"column": "customer_id", "target": "customers.customer_id", "cardinality": "many → 1"},
        {"column": "order_id", "target": "order_items.order_id", "cardinality": "1 → many"},
        {"column": "order_id", "target": "order_payments.order_id", "cardinality": "1 → many"},
        {"column": "order_id", "target": "order_reviews.order_id", "cardinality": "1 → many"}
    ],
    "order_items": [
        {"column": "order_id", "target": "orders.order_id", "cardinality": "many → 1"},
        {"column": "product_id", "target": "products.product_id", "cardinality": "many → 1"},
        {"column": "seller_id", "target": "sellers.seller_id", "cardinality": "many → 1"}
    ],
    "order_payments": [
        {"column": "order_id", "target": "orders.order_id", "cardinality": "many → 1"}
    ],
    "order_reviews": [
        {"column": "order_id", "target": "orders.order_id", "cardinality": "many → 1"}
    ],
    "customers": [
        {"column": "customer_id", "target": "orders.customer_id", "cardinality": "1 → many"}
    ],
    "products": [
        {"column": "product_id", "target": "order_items.product_id", "cardinality": "1 → many"}
    ],
    "sellers": [
        {"column": "seller_id", "target": "order_items.seller_id", "cardinality": "1 → many"}
    ]
}

DEFAULT_KPIS = [
    {
        "id": "total_revenue",
        "name": "Total Revenue",
        "category": "Financial",
        "formula": "SUM(order_items.price) for delivered orders",
        "description": "Sum of item prices on delivered orders in Brazilian Real (BRL).",
        "unit": "currency",
        "question": "What is the total revenue?"
    },
    {
        "id": "order_count",
        "name": "Number of Orders",
        "category": "Volume",
        "formula": "COUNT(DISTINCT orders.order_id) for delivered orders",
        "description": "Total count of successfully delivered customer orders.",
        "unit": "integer",
        "question": "How many orders were successfully delivered?"
    },
    {
        "id": "average_order_value",
        "name": "Average Order Value (AOV)",
        "category": "Efficiency",
        "formula": "total_revenue / order_count",
        "description": "Average monetary basket size per fulfilled customer order.",
        "unit": "currency",
        "question": "What is the average order value?"
    },
    {
        "id": "on_time_delivery_rate",
        "name": "On-Time Delivery Rate",
        "category": "Operations",
        "formula": "COUNT(actual <= estimated) / COUNT(delivered) * 100",
        "description": "Percentage of delivered orders completed on or before the estimated arrival deadline.",
        "unit": "percent",
        "question": "What is the on-time delivery rate by state?"
    },
    {
        "id": "average_delivery_time",
        "name": "Average Delivery Time",
        "category": "Operations",
        "formula": "AVG(delivered_customer_date - purchase_timestamp) in days",
        "description": "Mean days elapsed between purchase placement and physical doorstep delivery.",
        "unit": "days",
        "question": "What is the average delivery duration in days?"
    },
    {
        "id": "average_review_score",
        "name": "Average Review Score (CSAT)",
        "category": "Customer",
        "formula": "AVG(order_reviews.review_score)",
        "description": "Mean customer feedback rating on a scale from 1 to 5.",
        "unit": "score",
        "question": "Average review score by payment type"
    },
    {
        "id": "cancellation_rate",
        "name": "Order Cancellation Rate",
        "category": "Operations",
        "formula": "COUNT(order_status = 'canceled') / COUNT(*) * 100",
        "description": "Percentage of total orders terminated prior to customer fulfillment.",
        "unit": "percent",
        "question": "What is the order cancellation percentage?"
    },
    {
        "id": "repeat_purchase_rate",
        "name": "Repeat Customer Rate",
        "category": "Customer",
        "formula": "COUNT(customers with 2+ orders) / COUNT(distinct customers) * 100",
        "description": "Share of consumer base that has placed two or more fulfilled orders.",
        "unit": "percent",
        "question": "What is the repeat customer purchase rate?"
    }
]

def format_count(n: int) -> str:
    if n >= 1000:
        return f"{n / 1000:.1f}k"
    return str(n)

@router.get("/schema")
def get_schema():
    semantic_data = {}
    if os.path.exists(SEMANTIC_PATH):
        try:
            with open(SEMANTIC_PATH, "r", encoding="utf-8") as f:
                semantic_data = yaml.safe_load(f) or {}
        except Exception:
            semantic_data = {}

    semantic_tables = semantic_data.get("tables", {})
    
    table_rows = execute_query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    table_names = [r["name"] for r in table_rows]
    
    preferred_order = ["orders", "order_items", "customers", "products", "order_payments", "order_reviews", "sellers"]
    ordered_tables = [t for t in preferred_order if t in table_names] + [t for t in table_names if t not in preferred_order]
    
    tables_result = []
    for t_name in ordered_tables:
        info_rows = execute_query(f"PRAGMA table_info({t_name})")
        cnt_rows = execute_query(f"SELECT COUNT(*) AS c FROM {t_name}")
        row_count = cnt_rows[0]["c"] if cnt_rows else 0
        
        sem_info = semantic_tables.get(t_name, {})
        sem_cols = sem_info.get("columns", {})
        
        pk_keys: set[str] = set()
        has_pragma_pk = any(bool(col.get("pk")) for col in info_rows)
        if not has_pragma_pk:
            yaml_pk = sem_info.get("primary_key")
            if isinstance(yaml_pk, list):
                pk_keys = set(yaml_pk)
            elif isinstance(yaml_pk, str) and yaml_pk:
                pk_keys = {yaml_pk}

        columns = []
        for col in info_rows:
            col_name = col["name"]
            col_type = col["type"] or "TEXT"
            is_pk = bool(col["pk"]) if has_pragma_pk else (col_name in pk_keys)
            desc = sem_cols.get(col_name, f"Attribute {col_name} in {t_name}.")
            columns.append({
                "name": col_name,
                "type": col_type,
                "description": desc,
                "isKey": is_pk
            })
            
        tables_result.append({
            "name": t_name,
            "rowCount": format_count(row_count),
            "rawRowCount": row_count,
            "description": sem_info.get("description", f"Data table for {t_name}."),
            "defaultOpen": t_name in ["orders", "order_items"],
            "question": TABLE_QUESTIONS.get(t_name, f"Query records from {t_name}"),
            "columns": columns,
            "relations": TABLE_RELATIONS.get(t_name, [])
        })

    kpis_result = list(DEFAULT_KPIS)
    if "kpis" in semantic_data:
        for k_id, k_val in semantic_data["kpis"].items():
            if not any(k["id"] == k_id for k in kpis_result):
                kpis_result.append({
                    "id": k_id,
                    "name": " ".join(word.capitalize() for word in k_id.split("_")),
                    "category": "Governed",
                    "formula": k_val.get("sql_template", "").strip(),
                    "description": k_val.get("description", ""),
                    "unit": "numeric",
                    "question": f"What is the {k_id}?"
                })

    return {
        "tables": tables_result,
        "kpis": kpis_result,
        "meta": {
            "database": "olist.db",
            "dialect": "SQLite 3",
            "tableCount": len(tables_result),
            "kpiCount": len(kpis_result)
        }
    }
