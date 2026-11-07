import re

import sqlglot
from sqlglot import exp

_PLACEHOLDER = re.compile(r":([A-Za-z_][A-Za-z0-9_]*)")


def _table_name(table: exp.Table) -> str:
    this = table.this
    if isinstance(this, exp.Func):
        return this.name or this.sql_name() or table.sql()
    return table.name or table.sql()


def _cte_names(with_node: exp.With) -> list[str]:
    return [cte.alias_or_name.lower() for cte in with_node.expressions]


def _is_cte_reference(table: exp.Table, lowered_name: str) -> bool:
    node: exp.Expression = table
    while node.parent is not None:
        parent = node.parent
        if isinstance(parent, exp.With):
            names = _cte_names(parent)
            if parent.args.get("recursive"):
                visible = names
            else:
                position = next(
                    (i for i, cte in enumerate(parent.expressions) if cte is node), 0
                )
                visible = names[:position]
            if lowered_name in visible:
                return True
        else:
            for value in parent.args.values():
                if isinstance(value, exp.With) and value is not node:
                    if lowered_name in _cte_names(value):
                        return True
        node = parent
    return False


def extract_tables(sql: str) -> list[str]:
    try:
        tree = sqlglot.parse_one(sql, dialect="sqlite")
    except Exception:
        return []
    if tree is None:
        return []
    tables: list[exp.Table] = []
    with_node = tree.args.get("with_")
    if with_node:
        tables.extend(with_node.find_all(exp.Table, bfs=False))
        for node in tree.find_all(exp.Table, bfs=False):
            if not node.find_ancestor(exp.With):
                tables.append(node)
    else:
        tables = list(tree.find_all(exp.Table, bfs=False))
    seen: list[str] = []
    for table in tables:
        name = _table_name(table)
        if not name or name in seen:
            continue
        if _is_cte_reference(table, name.lower()):
            continue
        seen.append(name)
    return seen


def _literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def render_sql(template: str, params: dict) -> str:
    def replace(match: re.Match) -> str:
        name = match.group(1)
        if name not in params:
            return match.group(0)
        return _literal(params[name])

    return _PLACEHOLDER.sub(replace, template)
