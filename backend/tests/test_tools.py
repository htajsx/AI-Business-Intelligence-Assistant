import os

import pytest

from app.db.database import execute_query, resolve_db_path
from app.tools.kpi import generate_report as gr
from app.tools import registry
from app.tools.context import ToolContext
from app.tools.kpi.generate_report import mom_changes, pct_change, previous_period, zscore_outliers
from app.tools.kpi.get_kpi import get_kpi, scalar_value
from app.tools.kpi.kpi_catalog import check_catalog, get_kpi_meta
from app.tools.charts.make_chart import make_chart
from app.tools.analysis.resolve_period import resolve_period
from app.tools.result import success
from app.tools.sql.run_sql import run_sql
from app.utils.semantic import get_kpi_names

requires_db = pytest.mark.skipif(
    not os.path.exists(resolve_db_path()),
    reason="SQLite database file not found",
)

REVENUE_REFERENCE = (
    "SELECT ROUND(SUM(oi.price), 2) AS value "
    "FROM orders o JOIN order_items oi ON o.order_id = oi.order_id "
    "WHERE o.order_status = 'delivered' "
    "AND o.order_purchase_timestamp >= ? AND o.order_purchase_timestamp < ?"
)


def _reference_revenue(start_inclusive: str, end_exclusive: str) -> float:
    rows = execute_query(REVENUE_REFERENCE, (start_inclusive, end_exclusive))
    return float(rows[0]["value"])


def _fake_sql_tool(row_count: int, columns=("n",), sql="SELECT 1"):
    names = list(columns)

    def tool(query):
        rows = [{name: index for name in names} for index in range(row_count)]
        return success(names, rows, sql=sql, tables_used=["orders"])

    return tool


@requires_db
def test_get_kpi_total_revenue_matches_reference():
    result = get_kpi("total_revenue", "2017-01-01", "2017-12-31")
    assert result["ok"] is True
    expected = _reference_revenue("2017-01-01", "2018-01-01")
    assert scalar_value(result) == pytest.approx(expected)


@requires_db
def test_get_kpi_single_day_includes_whole_day():
    result = get_kpi("total_revenue", "2017-11-24", "2017-11-24")
    assert result["ok"] is True
    expected = _reference_revenue("2017-11-24", "2017-11-25")
    assert expected > 0
    assert scalar_value(result) == pytest.approx(expected)


def test_get_kpi_unknown_name_fails():
    result = get_kpi("not_a_kpi")
    assert result["ok"] is False
    assert "not_a_kpi" in result["error"]
    assert "total_revenue" in result["error"]


def test_get_kpi_invalid_date_fails():
    result = get_kpi("total_revenue", "2017-02-30", "2017-03-01")
    assert result["ok"] is False
    assert "start_date" in result["error"]


def test_get_kpi_start_after_end_fails():
    result = get_kpi("total_revenue", "2018-01-01", "2017-01-01")
    assert result["ok"] is False
    assert "must not be after" in result["error"]


@requires_db
def test_get_kpi_repeat_purchase_rate_applies_dates():
    result = get_kpi("repeat_purchase_rate", "2017-01-01", "2017-12-31")
    assert result["ok"] is True
    assert result["date_filter_applied"] is True
    assert not result.get("note")
    assert "2017-01-01" in result["sql"]


@requires_db
def test_get_kpi_ranking_limit_is_applied():
    result = get_kpi("top_categories_by_revenue", limit=5)
    assert result["ok"] is True
    assert result["row_count"] == 5


@requires_db
def test_get_kpi_ranking_limit_is_clamped_to_50():
    result = get_kpi("top_categories_by_revenue", limit=999)
    assert result["ok"] is True
    assert 5 < result["row_count"] <= 50
    assert "LIMIT 50" in result["sql"]
    assert result["params"]["limit"] == 999


@requires_db
@pytest.mark.parametrize("name", get_kpi_names())
def test_every_kpi_runs_and_has_y_column(name):
    result = get_kpi(name)
    assert result["ok"] is True, result.get("error")
    assert get_kpi_meta(name)["y_column"] in result["columns"]


def test_catalog_matches_yaml():
    report = check_catalog()
    assert report["missing_in_catalog"] == []
    assert report["missing_in_yaml"] == []


def test_run_sql_blocks_drop_table():
    result = run_sql("DROP TABLE orders")
    assert result["ok"] is False
    assert result["stage"] == "guard"


def test_run_sql_blocks_sqlite_master():
    result = run_sql("SELECT name FROM sqlite_master")
    assert result["ok"] is False
    assert result["stage"] == "allowlist"
    assert "sqlite_master" in result["error"]


def test_run_sql_blocks_unknown_table():
    result = run_sql("SELECT * FROM secrets")
    assert result["ok"] is False
    assert result["stage"] == "allowlist"
    assert result["error"] == "Table 'secrets' is not allowed."


def test_run_sql_blocks_review_comments():
    result = run_sql("SELECT review_comment_message FROM order_reviews")
    assert result["ok"] is False
    assert result["stage"] == "allowlist"


def test_run_sql_blocks_star_on_order_reviews():
    result = run_sql("SELECT * FROM order_reviews")
    assert result["ok"] is False
    assert result["stage"] == "allowlist"


@requires_db
def test_run_sql_allows_count_star_on_order_reviews():
    result = run_sql("SELECT COUNT(*) AS n FROM order_reviews")
    assert result["ok"] is True
    assert result["rows"][0]["n"] > 0


@requires_db
def test_run_sql_unknown_column_fails_at_execute():
    result = run_sql("SELECT no_such_column FROM orders")
    assert result["ok"] is False
    assert result["stage"] == "execute"


@requires_db
def test_run_sql_valid_query_reports_tables():
    result = run_sql(
        "SELECT o.order_id FROM orders o JOIN order_items oi ON o.order_id = oi.order_id LIMIT 3"
    )
    assert result["ok"] is True
    assert sorted(result["tables_used"]) == ["order_items", "orders"]
    assert result["row_count"] == 3


@pytest.mark.parametrize(
    "expression,start,end",
    [
        ("2017-Q4", "2017-10-01", "2017-12-31"),
        ("2017-11", "2017-11-01", "2017-11-30"),
        ("last_month", "2018-09-01", "2018-09-30"),
        ("last_quarter", "2018-07-01", "2018-09-30"),
        ("last_year", "2017-01-01", "2017-12-31"),
    ],
)
def test_resolve_period_known_values(expression, start, end):
    result = resolve_period(expression)
    assert result["ok"] is True
    assert result["start_date"] == start
    assert result["end_date"] == end
    assert result["anchor_date"] == "2018-10-17"


def test_resolve_period_unknown_value_fails():
    result = resolve_period("next decade")
    assert result["ok"] is False
    assert "Supported formats" in result["error"]


def _table(rows, columns=("month", "revenue")):
    return {"columns": list(columns), "rows": rows}


def _monthly_rows():
    return [
        {"month": "2017-01", "revenue": 10.0},
        {"month": "2017-02", "revenue": 12.5},
        {"month": "2017-03", "revenue": 15.0},
    ]


def test_make_chart_without_table_fails():
    result = make_chart(ToolContext(), "bar", "month", "revenue")
    assert result["ok"] is False
    assert result["error"] == "No result table yet. Call get_kpi or run_sql first."


def test_make_chart_single_row_fails():
    ctx = ToolContext(last_table=_table([{"month": "2017-01", "revenue": 10.0}]))
    result = make_chart(ctx, "bar", "month", "revenue")
    assert result["ok"] is False
    assert result["error"] == "A single value does not need a chart."


def test_make_chart_bad_column_falls_back():
    ctx = ToolContext(last_table=_table(_monthly_rows()))
    result = make_chart(ctx, "bar", "missing", "revenue")
    assert result["ok"] is True
    assert result["fallback"] is True
    assert result["chart"]["x"] == "month"
    assert result["chart"]["y"] == "revenue"
    assert ctx.chart == result["chart"]


def test_make_chart_non_numeric_y_falls_back():
    ctx = ToolContext(last_table=_table(_monthly_rows()))
    result = make_chart(ctx, "bar", "revenue", "month")
    assert result["ok"] is True
    assert result["fallback"] is True


def test_make_chart_time_like_x_forces_line():
    ctx = ToolContext(last_table=_table(_monthly_rows()))
    result = make_chart(ctx, "bar", "month", "revenue", title="Trend")
    assert result["ok"] is True
    assert "fallback" not in result
    assert result["chart"] == {
        "type": "line",
        "x": "month",
        "y": "revenue",
        "title": "Trend",
        "yFormat": "currency",
    }


def test_make_chart_line_on_categorical_x_becomes_bar():
    rows = [{"category": "a", "revenue": 5.0}, {"category": "b", "revenue": 3.0}]
    ctx = ToolContext(last_table=_table(rows, ("category", "revenue")))
    result = make_chart(ctx, "line", "category", "revenue")
    assert result["chart"]["type"] == "bar"


def test_make_chart_spec_has_exact_keys():
    ctx = ToolContext(last_table=_table(_monthly_rows()))
    chart = make_chart(ctx, "line", "month", "revenue")["chart"]
    assert set(chart.keys()) == {"type", "x", "y", "title", "yFormat"}


def test_make_chart_y_format_prefers_valid_request():
    rows = [{"group": "a", "value": 1}, {"group": "b", "value": 2}]
    ctx = ToolContext(last_table=_table(rows, ("group", "value")))
    result = make_chart(ctx, "bar", "group", "value", y_format="percent")
    assert result["chart"]["yFormat"] == "percent"


def test_make_chart_y_format_ignores_invalid_request():
    rows = [{"group": "a", "value": 1}, {"group": "b", "value": 2}]
    ctx = ToolContext(last_table=_table(rows, ("group", "value")))
    result = make_chart(ctx, "bar", "group", "value", y_format="euro")
    assert result["chart"]["yFormat"] == "currency"


@pytest.mark.parametrize(
    "unit,expected",
    [("currency", "currency"), ("percent", "percent"), ("days", "number"), ("score", "number")],
)
def test_make_chart_y_format_from_meta_unit(unit, expected):
    rows = [{"group": "a", "metric": 1.0}, {"group": "b", "metric": 2.0}]
    ctx = ToolContext(
        last_table=_table(rows, ("group", "metric")),
        last_meta={"unit": unit, "y_column": "metric"},
    )
    assert make_chart(ctx, "bar", "group", "metric")["chart"]["yFormat"] == expected


@pytest.mark.parametrize(
    "column,expected",
    [("total_amount", "currency"), ("on_time_rate", "percent"), ("orders_count", "number")],
)
def test_make_chart_y_format_inferred_from_column_name(column, expected):
    rows = [{"group": "a", column: 1.0}, {"group": "b", column: 2.0}]
    ctx = ToolContext(last_table=_table(rows, ("group", column)))
    assert make_chart(ctx, "bar", "group", column)["chart"]["yFormat"] == expected


def test_dispatch_unknown_tool_returns_failure():
    ctx = ToolContext()
    payload = registry.dispatch("not_a_tool", {}, ctx)
    assert payload["ok"] is False
    assert "Unknown tool" in payload["error"]
    assert ctx.error_count == 1


def test_dispatch_unexpected_argument_returns_failure():
    ctx = ToolContext()
    payload = registry.dispatch("get_kpi", {"name": "total_revenue", "foo": 1}, ctx)
    assert payload["ok"] is False
    assert payload["error"].startswith("Invalid arguments")
    assert ctx.error_count == 1


def test_dispatch_counts_every_failure_and_traces_calls():
    ctx = ToolContext()
    registry.dispatch("not_a_tool", {}, ctx)
    registry.dispatch("get_kpi", {"name": "unknown_kpi"}, ctx)
    registry.dispatch("get_kpi", {"name": "total_revenue", "start_date": "bad"}, ctx)
    assert ctx.error_count == 3
    assert len(ctx.trace) == 3
    assert all(entry["ok"] is False and entry["error"] for entry in ctx.trace)
    assert [entry["tool"] for entry in ctx.trace][0] == "not_a_tool"


def test_dispatch_drops_none_arguments(monkeypatch):
    seen = {}

    def tool(query, extra=None):
        seen["extra"] = extra
        return success(["n"], [{"n": 1}], sql="SELECT 1", tables_used=["orders"])

    monkeypatch.setitem(registry._TOOLS, "run_sql", (tool, False))
    payload = registry.dispatch("run_sql", {"query": "SELECT 1", "extra": None}, ToolContext())
    assert payload["ok"] is True
    assert seen["extra"] is None


def test_dispatch_caps_model_rows_and_stored_rows(monkeypatch):
    monkeypatch.setitem(registry._TOOLS, "run_sql", (_fake_sql_tool(150), False))
    ctx = ToolContext()
    payload = registry.dispatch("run_sql", {"query": "SELECT 1"}, ctx)
    assert payload["ok"] is True
    assert len(payload["rows"]) == 30
    assert payload["truncated"] is True
    assert payload["untrusted_data"] is True
    assert len(ctx.last_table["rows"]) == 100
    assert ctx.last_table["row_count"] == 150
    assert ctx.last_sql == "SELECT 1"
    assert ctx.tables_used == ["orders"]


def test_dispatch_small_result_is_not_truncated(monkeypatch):
    monkeypatch.setitem(registry._TOOLS, "run_sql", (_fake_sql_tool(5), False))
    ctx = ToolContext()
    payload = registry.dispatch("run_sql", {"query": "SELECT 1"}, ctx)
    assert len(payload["rows"]) == 5
    assert "truncated" not in payload
    assert payload["untrusted_data"] is True


def test_dispatch_resets_chart_when_table_changes(monkeypatch):
    fake = _fake_sql_tool(5, columns=("month", "revenue"))
    monkeypatch.setitem(registry._TOOLS, "run_sql", (fake, False))

    def month_tool(query):
        rows = [{"month": f"2017-0{index}", "revenue": float(index)} for index in range(1, 6)]
        return success(["month", "revenue"], rows, sql="SELECT 1", tables_used=["orders"])

    monkeypatch.setitem(registry._TOOLS, "run_sql", (month_tool, False))
    ctx = ToolContext()
    registry.dispatch("run_sql", {"query": "SELECT 1"}, ctx)
    chart_payload = registry.dispatch(
        "make_chart", {"chart_type": "line", "x": "month", "y": "revenue"}, ctx
    )
    assert chart_payload["ok"] is True
    assert ctx.chart is not None
    registry.dispatch("run_sql", {"query": "SELECT 1"}, ctx)
    assert ctx.chart is None


def test_dispatch_failed_tool_keeps_previous_table(monkeypatch):
    monkeypatch.setitem(registry._TOOLS, "run_sql", (_fake_sql_tool(3), False))
    ctx = ToolContext()
    registry.dispatch("run_sql", {"query": "SELECT 1"}, ctx)
    previous = ctx.last_table
    registry.dispatch("get_kpi", {"name": "unknown_kpi"}, ctx)
    assert ctx.last_table is previous
    assert ctx.error_count == 1


def test_dispatch_never_raises_when_tool_raises(monkeypatch):
    def broken(query):
        raise RuntimeError("boom")

    monkeypatch.setitem(registry._TOOLS, "run_sql", (broken, False))
    ctx = ToolContext()
    payload = registry.dispatch("run_sql", {"query": "SELECT 1"}, ctx)
    assert payload["ok"] is False
    assert "boom" in payload["error"]
    assert ctx.error_count == 1


def test_previous_period_has_equal_length():
    assert previous_period("2017-11-01", "2017-11-30") == ("2017-10-02", "2017-10-31")
    assert previous_period("2017-01-01", "2017-12-31") == ("2016-01-02", "2016-12-31")


def test_pct_change_rules():
    assert pct_change(110, 100) == 10.0
    assert pct_change(5, 0) is None
    assert pct_change(5, None) is None
    assert pct_change(None, 5) is None


def test_mom_changes_first_period_has_no_change():
    changes = mom_changes(_monthly_rows(), "month", "revenue")
    assert changes[0]["change_pct"] is None
    assert changes[1]["change_pct"] == 25.0
    assert changes[2]["change_pct"] == 20.0


def test_zscore_outliers_need_four_points_and_variance():
    assert zscore_outliers([{"m": i, "v": 10.0} for i in range(3)], "m", "v") == []
    assert zscore_outliers([{"m": i, "v": 10.0} for i in range(6)], "m", "v") == []
    rows = [{"m": i, "v": 10.0} for i in range(9)] + [{"m": 9, "v": 100.0}]
    outliers = zscore_outliers(rows, "m", "v")
    assert [item["period"] for item in outliers] == [9]
    assert outliers[0]["z"] == 3.0


def _install_fake_kpis(monkeypatch, monthly):
    def fake(name, start_date=None, end_date=None, limit=None):
        meta = get_kpi_meta(name)
        y = meta["y_column"]
        if name == "monthly_revenue":
            return success(["month", "revenue"], monthly, y_column="revenue")
        if name == "top_categories_by_revenue":
            rows = [
                {"category": "a", "revenue": 500.0, "orders_count": 20},
                {"category": "b", "revenue": 100.0, "orders_count": 5},
                {"category": "c", "revenue": 300.0, "orders_count": 15},
                {"category": "d", "revenue": 50.0, "orders_count": 10},
            ]
            return success(["category", "revenue", "orders_count"], rows, y_column="revenue")
        if name == "top_states_by_revenue":
            rows = [{"state": "SP", "revenue": 900.0, "orders_count": 40}]
            return success(["state", "revenue", "orders_count"], rows, y_column="revenue")
        return success([y], [{y: 100.0}], y_column=y)

    monkeypatch.setattr(gr, "get_kpi", fake)


def test_generate_report_anomalies_come_from_computed_values(monkeypatch):
    monthly = [{"month": f"2017-{index:02d}", "revenue": 100.0} for index in range(1, 10)]
    monthly.append({"month": "2017-10", "revenue": 40.0})
    monthly.append({"month": "2017-11", "revenue": 1.0})
    _install_fake_kpis(monkeypatch, monthly)

    result = gr.generate_report("2017-01-01", "2017-10-31")
    assert result["ok"] is True
    facts = result["facts"]

    anomalies = facts["anomalies"]
    assert {item["type"] for item in anomalies} == {"revenue_outlier", "revenue_drop"}
    assert {item["month"] for item in anomalies} == {"2017-10"}
    assert all(item["severity"] == "warning" for item in anomalies)
    assert all(item["value"] == 40.0 for item in anomalies)
    drop = next(item for item in anomalies if item["type"] == "revenue_drop")
    assert "60.0%" in drop["text"]

    by_month = {row["month"]: row for row in facts["monthly_revenue"]}
    assert by_month["2017-10"]["mom_change_pct"] == -60.0
    assert by_month["2017-11"]["mom_change_pct"] == -97.5


def test_generate_report_without_anomalies_returns_empty_list(monkeypatch):
    monthly = [{"month": f"2017-{index:02d}", "revenue": 100.0 + index} for index in range(1, 7)]
    _install_fake_kpis(monkeypatch, monthly)
    result = gr.generate_report("2017-01-01", "2017-06-30")
    assert result["facts"]["anomalies"] == []


def test_generate_report_bottom_categories_need_ten_orders(monkeypatch):
    _install_fake_kpis(monkeypatch, [{"month": "2017-01", "revenue": 1.0}])
    facts = gr.generate_report("2017-01-01", "2017-01-31")["facts"]
    assert [row["category"] for row in facts["bottom_categories"]] == ["d", "c", "a"]
    assert [row["category"] for row in facts["top_categories"]] == ["a", "b", "c", "d"]
    assert facts["period"]["prev_start"] == "2016-12-01"
    assert facts["period"]["prev_end"] == "2016-12-31"


def test_generate_report_fails_when_revenue_fails(monkeypatch):
    def fake(name, start_date=None, end_date=None, limit=None):
        from app.tools.result import failure

        return failure("db down")

    monkeypatch.setattr(gr, "get_kpi", fake)
    result = gr.generate_report("2017-01-01", "2017-01-31")
    assert result["ok"] is False
    assert "db down" in result["error"]


def test_generate_report_rejects_bad_dates():
    assert gr.generate_report("2017-13-01", "2017-12-31")["ok"] is False
    assert gr.generate_report("2018-01-01", "2017-01-01")["ok"] is False


@requires_db
def test_generate_report_headline_revenue_matches_get_kpi():
    report = gr.generate_report("2017-01-01", "2017-06-30")
    assert report["ok"] is True
    expected = scalar_value(get_kpi("total_revenue", "2017-01-01", "2017-06-30"))
    assert report["facts"]["headline"]["total_revenue"]["current"] == pytest.approx(expected)


@requires_db
def test_generate_report_delta_is_none_without_previous_data():
    report = gr.generate_report("2016-01-01", "2016-06-30")
    assert report["ok"] is True
    headline = report["facts"]["headline"]
    assert headline["total_revenue"]["previous"] is None
    assert headline["total_revenue"]["delta_pct"] is None
    assert headline["total_revenue"]["delta_abs"] is None
    assert headline["order_count"]["delta_pct"] is None

@requires_db
def test_run_sql_truncation_flag():
    result = run_sql("SELECT customer_id FROM customers")
    assert result["ok"] is True
    assert result.get("truncated") is True
    assert "capped at 100 rows" in result.get("note", "")


@requires_db
def test_resolve_period_low_volume_months_key():
    result = resolve_period("last_month")
    assert result["ok"] is True
    assert "low_volume_months" in result
    assert isinstance(result["low_volume_months"], list)


def test_generate_report_excluding_low_volume_months(monkeypatch):
    monthly = [
        {"month": f"2017-{i:02d}", "revenue": 100.0, "orders_count": 150}
        for i in range(1, 10)
    ]
    monthly.append({"month": "2017-10", "revenue": 10.0, "orders_count": 50})
    monthly.append({"month": "2017-11", "revenue": 100.0, "orders_count": 120})
    _install_fake_kpis(monkeypatch, monthly)

    result = gr.generate_report("2017-01-01", "2017-11-30")
    assert result["ok"] is True
    anomalies = result["facts"]["anomalies"]
    anomaly_months = {item["month"] for item in anomalies}
    assert "2017-10" not in anomaly_months
    notes = " ".join(result["facts"]["notes"])
    assert "2017-10" in notes