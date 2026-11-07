def success(columns: list[str], rows: list[dict], **extra) -> dict:
    return {"ok": True, "columns": columns, "rows": rows, "row_count": len(rows), **extra}


def failure(message: str, **extra) -> dict:
    return {"ok": False, "error": message, **extra}


def rows_to_columns(rows: list[dict]) -> list[str]:
    if not rows:
        return []
    return list(rows[0].keys())