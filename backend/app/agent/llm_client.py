import os
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from dotenv import load_dotenv
from google.genai import errors, types

for path in [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend/.env")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env")),
    ".env",
]:
    if os.path.exists(path):
        load_dotenv(dotenv_path=path)

DEFAULT_MODEL = "gemini-3.6-flash"
DEFAULT_FALLBACK_MODELS = "gemini-3.5-flash-lite"
MINUTE_BACKOFF = (5, 15, 30)
SERVER_BACKOFF = (1, 3)
MAX_RETRY_DELAY_S = 60
REQUEST_TIMEOUT_MS = 30000

_RETRY_DELAY_PATTERNS = (
    re.compile(r"retryDelay['\"]?\s*[:=]\s*['\"]?(\d+(?:\.\d+)?)\s*s", re.IGNORECASE),
    re.compile(r"retry in\s+(\d+(?:\.\d+)?)\s*s", re.IGNORECASE),
)


class LlmUnavailable(Exception):
    pass


class LlmQuotaExceeded(LlmUnavailable):
    pass


@dataclass(frozen=True)
class LlmResult:
    response: Any
    model_used: str


class _ModelQuotaExhausted(Exception):
    pass


@lru_cache(maxsize=1)
def _build_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("AQ.dummy"):
        return None
    try:
        from google import genai

        return genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS),
        )
    except Exception:
        return None


def get_client():
    return _build_client()


def get_model_name() -> str:
    return os.getenv("GEMINI_MODEL", DEFAULT_MODEL)


def fallback_disabled() -> bool:
    return os.getenv("GEMINI_DISABLE_FALLBACK", "").strip().lower() in ("1", "true", "yes", "on")


def get_fallback_models(primary: str) -> list[str]:
    if fallback_disabled():
        return []
    raw = os.getenv("GEMINI_FALLBACK_MODELS", DEFAULT_FALLBACK_MODELS)
    models: list[str] = []
    for item in raw.split(","):
        name = item.strip()
        if name and name != primary and name not in models:
            models.append(name)
    return models


def _error_text(error: Exception) -> str:
    parts = [str(error)]
    for attr in ("message", "status", "details"):
        value = getattr(error, attr, None)
        if value:
            parts.append(str(value))
    return " ".join(parts)


def _is_daily_quota(text: str) -> bool:
    lowered = text.lower()
    return "perday" in lowered or "per day" in lowered or "per_day" in lowered


def _parse_retry_delay(text: str) -> float | None:
    for pattern in _RETRY_DELAY_PATTERNS:
        match = pattern.search(text)
        if match:
            return min(float(match.group(1)), MAX_RETRY_DELAY_S)
    return None


def _call_model(client, model: str, kwargs: dict):
    minute_retries = 0
    server_retries = 0
    while True:
        try:
            return client.models.generate_content(**kwargs, model=model)
        except errors.APIError as error:
            code = getattr(error, "code", None)
            if code == 429:
                text = _error_text(error)
                if _is_daily_quota(text):
                    raise _ModelQuotaExhausted(text) from error
                if minute_retries >= len(MINUTE_BACKOFF):
                    raise _ModelQuotaExhausted(text) from error
                delay = _parse_retry_delay(text)
                if delay is None:
                    delay = MINUTE_BACKOFF[minute_retries]
                minute_retries += 1
                time.sleep(delay)
            elif code in (500, 503):
                if server_retries >= len(SERVER_BACKOFF):
                    raise
                time.sleep(SERVER_BACKOFF[server_retries])
                server_retries += 1
            else:
                raise


def generate_with_retry(**kwargs) -> LlmResult:
    client = get_client()
    if client is None:
        raise LlmUnavailable("Gemini client is not configured.")

    call_kwargs = dict(kwargs)
    requested = call_kwargs.pop("model", None) or get_model_name()
    candidates = [requested] + get_fallback_models(requested)

    last_server_error = None
    quota_failures = 0
    for model in candidates:
        try:
            response = _call_model(client, model, call_kwargs)
            return LlmResult(response=response, model_used=model)
        except _ModelQuotaExhausted:
            quota_failures += 1
        except errors.APIError as error:
            if getattr(error, "code", None) in (500, 503):
                last_server_error = error
            else:
                raise

    if last_server_error is not None:
        raise last_server_error
    if quota_failures:
        raise LlmQuotaExceeded("All candidate models are out of quota.")
    raise LlmUnavailable("All candidate models failed to respond.")