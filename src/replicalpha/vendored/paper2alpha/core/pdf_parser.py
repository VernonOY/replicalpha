from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF

_HEADING_PAT = re.compile(r"^[一二三四五六七八九十]+[、.\s]\s*(.+)$")


@dataclass(slots=True)
class Section:
    heading: str
    body: str


@dataclass(slots=True)
class ParsedPDF:
    path: Path
    num_pages: int
    pages: list[str]
    full_text: str
    sections: list[Section] = field(default_factory=list)


def parse_pdf(path: Path) -> ParsedPDF:
    if not path.exists():
        raise FileNotFoundError(path)
    pages: list[str] = []
    with fitz.open(path) as doc:
        for page in doc:
            pages.append(page.get_text("text"))
    full = "\n".join(pages)
    return ParsedPDF(
        path=path,
        num_pages=len(pages),
        pages=pages,
        full_text=full,
        sections=_split_sections(full),
    )


def _split_sections(text: str) -> list[Section]:
    lines = text.splitlines()
    sections: list[Section] = []
    cur_heading: str | None = None
    cur_body: list[str] = []
    for line in lines:
        stripped = line.strip()
        m = _HEADING_PAT.match(stripped)
        if m:
            if cur_heading is not None:
                sections.append(Section(cur_heading, "\n".join(cur_body).strip()))
            cur_heading = stripped
            cur_body = []
        elif cur_heading is not None:
            cur_body.append(line)
    if cur_heading is not None:
        sections.append(Section(cur_heading, "\n".join(cur_body).strip()))
    return sections
