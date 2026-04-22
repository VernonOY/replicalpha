from __future__ import annotations

import json
from dataclasses import dataclass

from pydantic import ValidationError

from .llm_client import LLMClient
from .models import ResearchCard
from .pdf_parser import ParsedPDF

_SYSTEM_PROMPT = """You are a quantitative research analyst.
Read the given Chinese/English research report text and extract every proposed
alpha factor into a structured JSON object matching the ResearchCard schema.

Always return a single valid json object. Do not include commentary outside the JSON.
All factor names MUST be snake_case ASCII identifiers.
If a metric is not reported, omit the field instead of guessing.
"""

_USER_TEMPLATE = """## Report text
{text}

## Schema (Pydantic)
{schema}

Return only the JSON object.
"""


class ExtractorError(RuntimeError):
    """Raised when the LLM response cannot be parsed into a ResearchCard."""


@dataclass(slots=True)
class Extractor:
    llm: LLMClient
    max_text_chars: int = 20_000

    def extract(self, parsed: ParsedPDF) -> ResearchCard:
        text = parsed.full_text[: self.max_text_chars]
        user = _USER_TEMPLATE.format(
            text=text,
            schema=json.dumps(ResearchCard.model_json_schema(), ensure_ascii=False),
        )
        raw = self.llm.complete_json(system=_SYSTEM_PROMPT, user=user)
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ExtractorError(f"invalid JSON from LLM: {exc}") from exc
        try:
            return ResearchCard.model_validate(payload)
        except ValidationError as exc:
            raise ExtractorError(f"LLM output violates schema: {exc}") from exc
