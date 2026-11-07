import sys
from types import SimpleNamespace

import pytest
from google.genai import errors, types

from app.agent import chat_agent, llm_client
from app.agent.llm_client import LlmQuotaExceeded, LlmResult, LlmUnavailable

PRIMARY = "primary-model"
FALLBACK = "fallback-model"


class FakeApiError(errors.APIError):
    def __init__(self, code, text):
        Exception.__init__(self, text)
        self.code = code
        self.status = "RESOURCE_EXHAUSTED" if code == 429 else "UNAVAILABLE"
        self.message = text
        self.details = text


def minute_error(retry_delay=None):
    text = "Quota exceeded for metric GenerateRequestsPerMinutePerProjectPerModel-FreeTier"
    if retry_delay is not None:
        text += f" 'retryDelay': '{retry_delay}s'"
    return FakeApiError(429, text)


def daily_error():
    return FakeApiError(429, "Quota exceeded for metric GenerateRequestsPerDayPerProjectPerModel-FreeTier")


class FakeModels:
    def __init__(self, script):
        self.script = {model: list(steps) for model, steps in script.items()}
        self.calls = []

    def generate_content(self, **kwargs):
        model = kwargs["model"]
        self.calls.append(model)
        steps = self.script.get(model, [])
        step = steps.pop(0) if len(steps) > 1 else (steps[0] if steps else "ok")
        if isinstance(step, Exception):
            raise step
        return step


class FakeClient:
    def __init__(self, script):
        self.models = FakeModels(script)


@pytest.fixture(autouse=True)
def llm_env(monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL", PRIMARY)
    monkeypatch.setenv("GEMINI_FALLBACK_MODELS", FALLBACK)
    monkeypatch.delenv("GEMINI_DISABLE_FALLBACK", raising=False)


@pytest.fixture
def sleeps(monkeypatch):
    recorded = []
    monkeypatch.setattr(llm_client.time, "sleep", lambda seconds: recorded.append(seconds))
    return recorded


def install_client(monkeypatch, script):
    client = FakeClient(script)
    monkeypatch.setattr(llm_client, "_build_client", lambda: client)
    return client


def test_minute_quota_waits_then_succeeds_on_primary(monkeypatch, sleeps):
    client = install_client(monkeypatch, {PRIMARY: [minute_error(), "answer"]})
    result = llm_client.generate_with_retry(contents="hi")
    assert isinstance(result, LlmResult)
    assert result.model_used == PRIMARY
    assert result.response == "answer"
    assert sleeps == [5]
    assert client.models.calls == [PRIMARY, PRIMARY]


def test_minute_quota_uses_retry_delay_from_details(monkeypatch, sleeps):
    install_client(monkeypatch, {PRIMARY: [minute_error(retry_delay=37), "answer"]})
    result = llm_client.generate_with_retry(contents="hi")
    assert result.model_used == PRIMARY
    assert sleeps == [37.0]


def test_minute_quota_retry_delay_is_capped_at_60s(monkeypatch, sleeps):
    install_client(monkeypatch, {PRIMARY: [minute_error(retry_delay=300), "answer"]})
    llm_client.generate_with_retry(contents="hi")
    assert sleeps == [60.0]


def test_minute_quota_backoff_then_fallback(monkeypatch, sleeps):
    client = install_client(
        monkeypatch,
        {PRIMARY: [minute_error()], FALLBACK: ["fb answer"]},
    )
    result = llm_client.generate_with_retry(contents="hi")
    assert result.model_used == FALLBACK
    assert sleeps == [5, 15, 30]
    assert client.models.calls == [PRIMARY] * 4 + [FALLBACK]


def test_daily_quota_switches_to_fallback_without_sleep(monkeypatch, sleeps):
    client = install_client(
        monkeypatch,
        {PRIMARY: [daily_error()], FALLBACK: ["fb answer"]},
    )
    result = llm_client.generate_with_retry(contents="hi")
    assert result.model_used == FALLBACK
    assert result.response == "fb answer"
    assert sleeps == []
    assert client.models.calls == [PRIMARY, FALLBACK]


def test_server_error_retries_with_backoff(monkeypatch, sleeps):
    server_error = FakeApiError(503, "service unavailable")
    client = install_client(monkeypatch, {PRIMARY: [server_error, server_error, "answer"]})
    result = llm_client.generate_with_retry(contents="hi")
    assert result.model_used == PRIMARY
    assert sleeps == [1, 3]
    assert client.models.calls == [PRIMARY] * 3


def test_all_models_out_of_quota_raises(monkeypatch, sleeps):
    install_client(monkeypatch, {PRIMARY: [daily_error()], FALLBACK: [daily_error()]})
    with pytest.raises(LlmQuotaExceeded):
        llm_client.generate_with_retry(contents="hi")
    assert sleeps == []


def test_quota_exceeded_is_llm_unavailable():
    assert issubclass(LlmQuotaExceeded, LlmUnavailable)


def test_disable_fallback_never_uses_fallback(monkeypatch, sleeps):
    monkeypatch.setenv("GEMINI_DISABLE_FALLBACK", "1")
    client = install_client(
        monkeypatch,
        {PRIMARY: [daily_error()], FALLBACK: ["fb answer"]},
    )
    with pytest.raises(LlmQuotaExceeded):
        llm_client.generate_with_retry(contents="hi")
    assert client.models.calls == [PRIMARY]


def test_fallback_list_excludes_primary_and_duplicates(monkeypatch):
    monkeypatch.setenv("GEMINI_FALLBACK_MODELS", f"{PRIMARY}, a, a ,b,")
    assert llm_client.get_fallback_models(PRIMARY) == ["a", "b"]


def test_fallback_default_is_flash_lite(monkeypatch):
    monkeypatch.delenv("GEMINI_FALLBACK_MODELS", raising=False)
    assert llm_client.get_fallback_models(PRIMARY) == ["gemini-3.5-flash-lite"]


def test_missing_client_raises_unavailable(monkeypatch):
    monkeypatch.setattr(llm_client, "_build_client", lambda: None)
    with pytest.raises(LlmUnavailable):
        llm_client.generate_with_retry(contents="hi")


def _text_response(text="hello"):
    return SimpleNamespace(function_calls=None, text=text, candidates=[])


def _tool_response():
    content = types.Content(role="model", parts=[types.Part(text="calling")])
    call = SimpleNamespace(name="get_kpi", args={"name": "total_revenue"})
    return SimpleNamespace(function_calls=[call], text="", candidates=[SimpleNamespace(content=content)])


@pytest.fixture
def agent(monkeypatch):
    chat_agent._cache.clear()
    monkeypatch.setattr(chat_agent, "_make_config", lambda force_text: object())
    monkeypatch.setattr(chat_agent, "_write_log", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_agent, "dispatch", lambda name, args, ctx: {"ok": True})
    state = SimpleNamespace(calls=[], queue=[])

    def fake_generate(**kwargs):
        state.calls.append(kwargs["model"])
        item = state.queue.pop(0) if state.queue else (_text_response(), kwargs["model"])
        if isinstance(item, Exception):
            raise item
        response, model_used = item
        return LlmResult(response=response, model_used=model_used)

    monkeypatch.setattr(chat_agent, "generate_with_retry", fake_generate)
    yield state
    chat_agent._cache.clear()


def test_use_cache_false_skips_cache_read_and_write(agent):
    chat_agent.process_chat("how much revenue?", use_cache=False)
    chat_agent.process_chat("how much revenue?", use_cache=False)
    assert len(agent.calls) == 2
    assert len(chat_agent._cache) == 0

    first = chat_agent.process_chat("how much revenue?")
    assert first["cached"] is False
    assert len(chat_agent._cache) == 1
    assert len(agent.calls) == 3

    second = chat_agent.process_chat("how much revenue?")
    assert second["cached"] is True
    assert second["llm_calls"] == 0
    assert len(agent.calls) == 3

    bypass = chat_agent.process_chat("how much revenue?", use_cache=False)
    assert bypass["cached"] is False
    assert len(agent.calls) == 4


def test_result_model_is_the_model_that_answered(agent):
    agent.queue = [(_text_response("fallback says hi"), FALLBACK)]
    result = chat_agent.process_chat("hello there", use_cache=False)
    assert result["answer"] == "fallback says hi"
    assert result["model"] == FALLBACK
    assert result["models_used"] == [FALLBACK]
    assert result["llm_calls"] == 1
    assert result["status"] == "ok"


def test_later_rounds_stay_on_the_fallback_model(agent):
    agent.queue = [
        (_tool_response(), FALLBACK),
        (_text_response("done"), FALLBACK),
    ]
    result = chat_agent.process_chat("revenue 2017?", use_cache=False)
    assert agent.calls == [PRIMARY, FALLBACK]
    assert result["model"] == FALLBACK
    assert result["models_used"] == [FALLBACK]
    assert result["llm_calls"] == 2
    assert result["tools_called"] == ["get_kpi"]


def test_models_used_keeps_order_and_unique(agent):
    agent.queue = [
        (_tool_response(), PRIMARY),
        (_tool_response(), PRIMARY),
        (_text_response("done"), PRIMARY),
    ]
    result = chat_agent.process_chat("revenue 2017?", use_cache=False)
    assert result["models_used"] == [PRIMARY]
    assert result["llm_calls"] == 3


def test_model_override_is_used_for_first_call(agent):
    result = chat_agent.process_chat("hello", use_cache=False, model="custom-model")
    assert agent.calls == ["custom-model"]
    assert result["model"] == "custom-model"


def test_quota_status_and_message(agent):
    agent.queue = [LlmQuotaExceeded("all out")]
    result = chat_agent.process_chat("hello", use_cache=False)
    assert result["status"] == "quota"
    assert result["answer"] == chat_agent.QUOTA_MESSAGE
    assert result["model"] is None
    assert result["llm_calls"] == 0
    assert len(chat_agent._cache) == 0


def test_offline_status(agent):
    agent.queue = [LlmUnavailable("no key")]
    result = chat_agent.process_chat("hello", use_cache=False)
    assert result["status"] == "offline"
    assert result["answer"] == chat_agent.OFFLINE_MESSAGE


def test_api_error_status(agent):
    agent.queue = [FakeApiError(400, "bad request")]
    result = chat_agent.process_chat("hello", use_cache=False)
    assert result["status"] == "error"
    assert result["answer"] == chat_agent.ERROR_MESSAGE


def _router_module():
    import app.main  # noqa: F401

    for module in list(sys.modules.values()):
        if module is not None and hasattr(module, "chat_endpoint") and hasattr(module, "process_chat"):
            return module
    raise RuntimeError("chat router module not found")


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app

    return TestClient(app)


@pytest.mark.parametrize("field", ["question", "message"])
def test_question_over_500_chars_returns_422(client, monkeypatch, field):
    def must_not_run(*args, **kwargs):
        raise AssertionError("process_chat must not be called")

    monkeypatch.setattr(_router_module(), "process_chat", must_not_run)
    response = client.post("/api/chat", json={field: "a" * 501})
    assert response.status_code == 422
    assert "500" in response.text


def test_question_of_500_chars_is_accepted(client, monkeypatch):
    monkeypatch.setattr(_router_module(), "process_chat", lambda *args, **kwargs: _fake_result())
    response = client.post("/api/chat", json={"question": "a" * 500})
    assert response.status_code == 200


def test_router_returns_status_model_cached(client, monkeypatch):
    monkeypatch.setattr(
        _router_module(),
        "process_chat",
        lambda *args, **kwargs: _fake_result(status="quota", model=None, cached=False),
    )
    body = client.post("/api/chat", json={"question": "hi"}).json()
    assert body["status"] == "quota"
    assert body["model"] is None
    assert body["cached"] is False

    monkeypatch.setattr(
        _router_module(),
        "process_chat",
        lambda *args, **kwargs: _fake_result(status="ok", model=FALLBACK, cached=True),
    )
    body = client.post("/api/chat", json={"question": "hi"}).json()
    assert body["status"] == "ok"
    assert body["model"] == FALLBACK
    assert body["cached"] is True


def _fake_result(status="ok", model=PRIMARY, cached=False):
    return {
        "answer": "a",
        "insight": "a",
        "sql": None,
        "sql_query": None,
        "results": [],
        "table": None,
        "chart": None,
        "tables_used": [],
        "tools_called": [],
        "latency_ms": 1,
        "status": status,
        "model": model,
        "cached": cached,
    }