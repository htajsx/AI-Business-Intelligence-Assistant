import os
from datetime import datetime
from functools import lru_cache
from pathlib import Path

import yaml

SEMANTIC_PATH = Path(
    os.getenv(
        "SEMANTIC_LAYER_PATH",
        str(Path(__file__).resolve().parents[3] / "semantic" / "semantic_layer.yaml"),
    )
)

TIME_ANCHOR_FORMAT = "%Y-%m-%d %H:%M:%S"


@lru_cache(maxsize=1)
def load_semantic() -> dict:
    with open(SEMANTIC_PATH, "r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    return data or {}


def get_kpis() -> dict:
    return load_semantic().get("kpis") or {}


def get_kpi_spec(name: str) -> dict | None:
    return get_kpis().get(name)


def get_kpi_names() -> list[str]:
    return list(get_kpis().keys())


def get_tables() -> dict:
    return load_semantic().get("tables") or {}


def get_business_rules() -> dict:
    return load_semantic().get("business_rules") or {}


def get_few_shots() -> list[dict]:
    return load_semantic().get("few_shot_examples") or []


def get_time_anchor() -> datetime:
    raw = load_semantic()["database"]["time_anchor"]
    return datetime.strptime(str(raw), TIME_ANCHOR_FORMAT)