from __future__ import annotations

from typing import Protocol


class LLMClient(Protocol):
    """Minimal JSON-completion contract.

    Implementations must instruct the model to return a valid JSON object and
    return that object's raw JSON text. Callers parse the string themselves.
    """

    def complete_json(self, *, system: str, user: str) -> str: ...


class MockClient:
    """In-memory lookup client for offline unit tests.

    Keys match the ``user`` prompt either exactly (``match='exact'``, default)
    or by substring (``match='contains'``) against a pre-recorded JSON string.
    """

    def __init__(self, responses: dict[str, str], *, match: str = "exact") -> None:
        self._responses = dict(responses)
        self._match = match
        self.last_call: dict[str, str] | None = None

    def complete_json(self, *, system: str, user: str) -> str:
        self.last_call = {"system": system, "user": user}
        if self._match == "exact":
            if user not in self._responses:
                raise KeyError(f"no mock response registered for user prompt {user!r}")
            return self._responses[user]
        for key, val in self._responses.items():
            if key in user:
                return val
        raise KeyError(f"no mock response matched user prompt {user!r}")


class OpenAIClient:
    """Production OpenAI-backed implementation.

    Uses the Chat Completions API with ``response_format={'type': 'json_object'}``.
    The caller's ``system`` prompt must contain the word ``json`` per OpenAI rules.
    """

    def __init__(self, *, api_key: str, model: str = "gpt-4o-mini") -> None:
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key)
        self._model = model

    def complete_json(self, *, system: str, user: str) -> str:
        resp = self._client.chat.completions.create(
            model=self._model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        content = resp.choices[0].message.content
        if content is None:
            raise RuntimeError("OpenAI returned empty content")
        return content
