from __future__ import annotations

from importlib.resources import files

from jinja2 import Environment, StrictUndefined

from .models import ResearchCard

_TEMPLATE_NAME = "factor.py.j2"


class CodegenError(RuntimeError):
    """Raised when codegen inputs are invalid."""


def render_factor(card: ResearchCard, *, factor_index: int = 0) -> str:
    if factor_index < 0 or factor_index >= len(card.factors):
        raise CodegenError(
            f"factor_index {factor_index} out of range (card has {len(card.factors)} factor(s))"
        )
    factor = card.factors[factor_index]
    template_text = (
        files("paper2alpha.templates").joinpath(_TEMPLATE_NAME).read_text(encoding="utf-8")
    )
    env = Environment(
        undefined=StrictUndefined,
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    tmpl = env.from_string(template_text)
    return tmpl.render(factor=factor, source=card.source)
