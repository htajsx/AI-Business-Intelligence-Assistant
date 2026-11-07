import time
from types import SimpleNamespace

import pytest

from app.agent import chat_agent
from app.agent.llm_client import LlmQuotaExceeded, LlmResult, LlmUnavailable


@pytest.fixture
def agent(monkeypatch):
    chat_agent._cache.clear()
    chat_agent._history.clear()
    monkeypatch.setattr(chat_agent, "_make_config", lambda force_text: object())
    monkeypatch.setattr(chat_agent, "_write_log", lambda *args, **kwargs: None)
    state = SimpleNamespace(contents=[], replies=[])

    def fake_generate(**kwargs):
        state.contents.append(list(kwargs["contents"]))
        if state.replies:
            reply = state.replies.pop(0)
        else:
            reply = f"answer {len(state.contents)}"
        if isinstance(reply, Exception):
            raise reply
        response = SimpleNamespace(function_calls=None, text=reply, candidates=[])
        return LlmResult(response=response, model_used="test-model")

    monkeypatch.setattr(chat_agent, "generate_with_retry", fake_generate)
    yield state
    chat_agent._cache.clear()
    chat_agent._history.clear()


def texts(contents):
    return [content.parts[0].text for content in contents]


def roles(contents):
    return [content.role for content in contents]


def test_second_turn_contains_first_and_window_keeps_three_turns(agent):
    for index in range(1, 6):
        chat_agent.process_chat(f"q{index}", "conv-1", use_cache=False)

    assert texts(agent.contents[0]) == ["q1"]
    assert texts(agent.contents[1]) == ["q1", "answer 1", "q2"]
    assert roles(agent.contents[1]) == ["user", "model", "user"]
    assert texts(agent.contents[4]) == [
        "q2",
        "answer 2",
        "q3",
        "answer 3",
        "q4",
        "answer 4",
        "q5",
    ]
    assert roles(agent.contents[4]) == ["user", "model"] * 3 + ["user"]


def test_conversations_do_not_see_each_other(agent):
    chat_agent.process_chat("question a", "conv-a", use_cache=False)
    chat_agent.process_chat("question b", "conv-b", use_cache=False)
    assert texts(agent.contents[1]) == ["question b"]

    chat_agent.process_chat("question a2", "conv-a", use_cache=False)
    assert texts(agent.contents[2]) == ["question a", "answer 1", "question a2"]


def test_missing_conversation_id_uses_no_history(agent):
    chat_agent.process_chat("first", None, use_cache=False)
    chat_agent.process_chat("second", None, use_cache=False)
    assert texts(agent.contents[1]) == ["second"]
    assert len(chat_agent._history) == 0


def test_empty_conversations_share_cache(agent):
    first = chat_agent.process_chat("revenue 2017", "conv-x")
    second = chat_agent.process_chat("revenue 2017", "conv-y")
    assert first["cached"] is False
    assert second["cached"] is True
    assert second["llm_calls"] == 0
    assert len(agent.contents) == 1


def test_follow_up_with_different_history_does_not_share_cache(agent):
    chat_agent.process_chat("revenue 2017", "conv-a")
    chat_agent.process_chat("orders 2017", "conv-b")
    assert len(agent.contents) == 2

    follow_a = chat_agent.process_chat("and 2018?", "conv-a")
    follow_b = chat_agent.process_chat("and 2018?", "conv-b")
    assert follow_a["cached"] is False
    assert follow_b["cached"] is False
    assert len(agent.contents) == 4

    follow_empty = chat_agent.process_chat("and 2018?", "conv-new")
    assert follow_empty["cached"] is False
    assert len(agent.contents) == 5


def test_history_expires_after_ttl(agent, monkeypatch):
    clock = {"now": 1000.0}
    fake_time = SimpleNamespace(
        monotonic=lambda: clock["now"],
        perf_counter=time.perf_counter,
    )
    monkeypatch.setattr(chat_agent, "time", fake_time)

    chat_agent.process_chat("q1", "conv-1", use_cache=False)

    clock["now"] += chat_agent.HISTORY_TTL_S - 1
    chat_agent.process_chat("q2", "conv-1", use_cache=False)
    assert texts(agent.contents[1]) == ["q1", "answer 1", "q2"]

    clock["now"] += chat_agent.HISTORY_TTL_S + 1
    chat_agent.process_chat("q3", "conv-1", use_cache=False)
    assert texts(agent.contents[2]) == ["q3"]


def test_non_ok_turns_are_not_stored(agent):
    agent.replies = ["", LlmQuotaExceeded("quota"), LlmUnavailable("offline")]

    empty = chat_agent.process_chat("q1", "conv-1", use_cache=False)
    quota = chat_agent.process_chat("q2", "conv-1", use_cache=False)
    offline = chat_agent.process_chat("q3", "conv-1", use_cache=False)

    assert empty["status"] == "error"
    assert quota["status"] == "quota"
    assert offline["status"] == "offline"
    assert chat_agent._history_get("conv-1") == []

    ok = chat_agent.process_chat("q4", "conv-1", use_cache=False)
    assert ok["status"] == "ok"
    assert texts(agent.contents[3]) == ["q4"]
    assert chat_agent._history_get("conv-1") == [("q4", "answer 4")]


def test_long_answer_is_truncated_when_stored(agent):
    agent.replies = ["x" * 1000]
    chat_agent.process_chat("q1", "conv-1", use_cache=False)

    stored = chat_agent._history_get("conv-1")
    assert len(stored) == 1
    assert len(stored[0][1]) == chat_agent.HISTORY_MAX_ANSWER_CHARS == 600

    chat_agent.process_chat("q2", "conv-1", use_cache=False)
    assert texts(agent.contents[1])[1] == "x" * 600


def test_cache_hit_still_records_turn(agent):
    chat_agent.process_chat("revenue 2017", "conv-a")
    cached = chat_agent.process_chat("revenue 2017", "conv-b")
    assert cached["cached"] is True
    assert chat_agent._history_get("conv-b") == [("revenue 2017", "answer 1")]


def test_conversation_count_is_capped(agent):
    total = chat_agent.HISTORY_MAX_CONVERSATIONS + 1
    for index in range(total):
        chat_agent._history_add(f"c{index}", "q", "a")
    assert len(chat_agent._history) == chat_agent.HISTORY_MAX_CONVERSATIONS
    assert chat_agent._history_get("c0") == []
    assert chat_agent._history_get(f"c{total - 1}") == [("q", "a")]