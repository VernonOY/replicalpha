from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from .codegen import render_factor
from .extractor import Extractor
from .llm_client import LLMClient
from .models import ResearchCard
from .pdf_parser import parse_pdf
from .qtype_check import CheckReport, check_code


@dataclass(slots=True)
class PipelineResult:
    card: ResearchCard
    code_paths: list[Path]
    check: CheckReport


def run_pipeline(*, pdf: Path, out_dir: Path, llm: LLMClient) -> PipelineResult:
    out_dir.mkdir(parents=True, exist_ok=True)
    parsed = parse_pdf(pdf)
    card = Extractor(llm=llm).extract(parsed)
    (out_dir / "card.json").write_text(card.model_dump_json(indent=2), encoding="utf-8")

    code_paths: list[Path] = []
    combined = CheckReport(passed=True, violations=[])
    for i, factor in enumerate(card.factors):
        code = render_factor(card, factor_index=i)
        code_path = out_dir / f"factor_{factor.name}.py"
        code_path.write_text(code, encoding="utf-8")
        code_paths.append(code_path)
        rep = check_code(code)
        combined.violations.extend(rep.violations)
        combined.passed = combined.passed and rep.passed

    (out_dir / "qtype_report.json").write_text(
        json.dumps(asdict(combined), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return PipelineResult(card=card, code_paths=code_paths, check=combined)
