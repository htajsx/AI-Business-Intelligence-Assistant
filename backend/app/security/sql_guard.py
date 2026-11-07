import sqlglot
from sqlglot import exp

DEFAULT_LIMIT = 100
SECURITY_ERROR_MESSAGE = "Security violation: Only read-only SELECT queries are permitted."
SYNTAX_PREFIX = "SQL Syntax Error"

FORBIDDEN_NODES = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Alter,
    exp.Create,
    exp.Command,
    exp.Pragma,
    exp.Attach,
    exp.Detach,
)

FORBIDDEN_FUNCTIONS = frozenset(
    {
        "load_extension",
        "readfile",
        "writefile",
        "edit",
        "fts3_tokenizer",
        "zeroblob",
        "randomblob",
    }
)
FORBIDDEN_FUNCTION_PREFIXES = ("pragma_",)


def _function_name(node: exp.Expression) -> str:
    name = node.name or node.sql_name() or ""
    return name.lower()


def _uses_forbidden_function(parsed: exp.Expression) -> bool:
    for node in parsed.find_all(exp.Func):
        name = _function_name(node)
        if name in FORBIDDEN_FUNCTIONS or name.startswith(FORBIDDEN_FUNCTION_PREFIXES):
            return True
    return False


def validate_sql_with_meta(sql_query: str) -> tuple[str, bool]:
    cleaned = sql_query.strip().rstrip(";")
    try:
        statements = sqlglot.parse(cleaned, dialect="sqlite")
    except sqlglot.errors.ParseError as e:
        raise ValueError(f"{SYNTAX_PREFIX}: {str(e)}")

    if not statements or len(statements) != 1 or statements[0] is None:
        raise ValueError(SECURITY_ERROR_MESSAGE)

    parsed = statements[0]
    if not isinstance(parsed, (exp.Select, exp.Union)):
        raise ValueError(SECURITY_ERROR_MESSAGE)

    if parsed.find(FORBIDDEN_NODES):
        raise ValueError(SECURITY_ERROR_MESSAGE)

    if _uses_forbidden_function(parsed):
        raise ValueError(SECURITY_ERROR_MESSAGE)

    limit_added = False
    if not parsed.args.get("limit"):
        cleaned += f"\nLIMIT {DEFAULT_LIMIT}"
        limit_added = True

    return cleaned, limit_added


def validate_sql(sql_query: str) -> str:
    sql, _ = validate_sql_with_meta(sql_query)
    return sql