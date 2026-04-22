# replicalpha

> Research-reproduction Agent: PDF → factor code → backtest → Red Team Validator → reproducibility score.

replicalpha takes a quant research PDF and produces a complete reproduction
bundle in one command: structured `ResearchCard`, executable Python factor
code, backtest results, automated Red Team findings, and a plain-English
reproducibility score.

## Quick start

```bash
uv sync
export OPENAI_API_KEY=sk-...
uv run replicalpha run path/to/paper.pdf --out ./out
```

Outputs:
- `out/research_card.json` — structured paper metadata
- `out/factor_<name>.py` — executable factor code (qtype-clean)
- `out/backtest.json` + `out/backtest.png` — IC time series + cumulative return
- `out/validator.json` — 5-check Red Team findings
- `out/report.md` — aggregated research report

## License

MIT — see [LICENSE](LICENSE). Vendored components (paper2alpha, qtype)
retain upstream licenses; see [LICENSE-VENDORED.md](LICENSE-VENDORED.md).
