from dataclasses import dataclass, field


@dataclass
class ToolContext:
    last_table: dict | None = None
    last_meta: dict = field(default_factory=dict)
    last_sql: str | None = None
    chart: dict | None = None
    tables_used: list[str] = field(default_factory=list)
    report_facts: dict | None = None
    recommendations: list[dict] | None = None
    caveat: str | None = None
    trace: list[dict] = field(default_factory=list)
    error_count: int = 0

    def add_tables(self, names: list[str]) -> None:
        for name in names:
            if name not in self.tables_used:
                self.tables_used.append(name)
