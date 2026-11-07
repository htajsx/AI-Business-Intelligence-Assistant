from app.utils.semantic import get_kpi_names


def _meta(
    kind: str,
    unit: str,
    x_column: str | None,
    y_column: str,
    supports_dates: bool,
    supports_limit: bool,
    default_limit: int | None,
    synonyms: list[str],
) -> dict:
    return {
        "kind": kind,
        "unit": unit,
        "x_column": x_column,
        "y_column": y_column,
        "supports_dates": supports_dates,
        "supports_limit": supports_limit,
        "default_limit": default_limit,
        "synonyms": synonyms,
    }


KPI_META: dict[str, dict] = {
    "total_revenue": _meta(
        "scalar", "currency", None, "total_revenue", True, False, None,
        [
            "sales", "gmv", "turnover", "income",
            "doanh thu", "tổng doanh thu", "doanh số",
        ],
    ),
    "order_count": _meta(
        "scalar", "number", None, "total_orders", True, False, None,
        [
            "number of orders", "order volume",
            "số đơn hàng", "số đơn", "tổng số đơn",
        ],
    ),
    "average_order_value": _meta(
        "scalar", "currency", None, "average_order_value", True, False, None,
        [
            "aov", "basket size", "average basket",
            "giá trị đơn trung bình", "giá trị trung bình mỗi đơn",
        ],
    ),
    "monthly_revenue": _meta(
        "series", "currency", "month", "revenue", True, False, None,
        [
            "revenue trend", "revenue by month", "monthly sales",
            "doanh thu theo tháng", "xu hướng doanh thu",
        ],
    ),
    "top_categories_by_revenue": _meta(
        "ranking", "currency", "category", "revenue", True, True, 10,
        [
            "best categories", "top product categories",
            "danh mục sản phẩm hàng đầu", "danh mục doanh thu cao nhất",
        ],
    ),
    "top_states_by_revenue": _meta(
        "ranking", "currency", "state", "revenue", True, True, 10,
        [
            "best states", "top regions",
            "bang có doanh thu cao nhất", "bang hàng đầu",
        ],
    ),
    "cancellation_rate": _meta(
        "scalar", "percent", None, "cancellation_rate", True, False, None,
        [
            "cancel rate", "canceled share",
            "tỷ lệ hủy đơn", "tỷ lệ hủy",
        ],
    ),
    "average_delivery_time": _meta(
        "scalar", "days", None, "avg_delivery_days", True, False, None,
        [
            "delivery duration", "shipping time",
            "thời gian giao hàng trung bình", "thời gian giao hàng",
        ],
    ),
    "on_time_delivery_rate": _meta(
        "scalar", "percent", None, "on_time_rate", True, False, None,
        [
            "on-time rate", "sla", "delivery performance",
            "giao đúng hạn", "tỷ lệ giao đúng hạn",
        ],
    ),
    "average_review_score": _meta(
        "scalar", "score", None, "avg_review_score", True, False, None,
        [
            "csat", "customer satisfaction", "rating",
            "điểm đánh giá", "đánh giá trung bình", "điểm trung bình",
        ],
    ),
    "repeat_purchase_rate": _meta(
        "scalar", "percent", None, "repeat_purchase_rate", True, False, None,
        [
            "repeat customers", "loyalty rate",
            "khách quay lại mua", "tỷ lệ khách quay lại", "khách hàng trung thành",
        ],
    ),
}


def get_kpi_meta(name: str) -> dict | None:
    return KPI_META.get(name)


def check_catalog() -> dict:
    catalog_names = set(KPI_META.keys())
    yaml_names = get_kpi_names()
    yaml_set = set(yaml_names)
    return {
        "missing_in_catalog": [name for name in yaml_names if name not in catalog_names],
        "missing_in_yaml": [name for name in KPI_META if name not in yaml_set],
    }