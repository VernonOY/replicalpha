from __future__ import annotations

import tomllib
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class Config:
    provider: str
    model: str
    api_key: str


_ENV_KEYS: dict[str, str] = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
}


def load_config(*, path: Path | None, env: Mapping[str, str]) -> Config:
    data: dict[str, object] = {}
    if path is not None and path.exists():
        parsed = tomllib.loads(path.read_text(encoding="utf-8"))
        if isinstance(parsed, dict):
            data = parsed
    llm_raw = data.get("llm", {})
    llm: dict[str, object] = llm_raw if isinstance(llm_raw, dict) else {}
    provider = str(llm.get("provider", "openai"))
    model = str(llm.get("model", "gpt-4o-mini"))
    env_key = _ENV_KEYS.get(provider, "OPENAI_API_KEY")
    api_key = env.get(env_key)
    if not api_key:
        raise ValueError(f"{provider} API key missing — set env {env_key} or edit p2a.toml")
    return Config(provider=provider, model=model, api_key=api_key)
