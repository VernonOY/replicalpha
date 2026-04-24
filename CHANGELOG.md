# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] — 2026-04-22

### Added
- Three-stage pipeline glued by `core.orchestrator.run_pipeline`:
  - PDF extraction via vendored paper2alpha (PyMuPDF + OpenAI JSON-mode)
  - Factor code generation: DSL interpreter for a 7-operator whitelist, LLM fallback for unsupported formulas, qtype-gated
  - Minimal pandas quintile long-short backtest (IC time series, cumulative return, max drawdown, annualized Sharpe)
- Red Team Validator v1 — 5 fixed computational checks (overfitting hint, small-cap exposure, data leakage, sample concentration, factor redundancy)
- Reproducibility score (sign match + magnitude) with plain-English interpretation
- Markdown research-report aggregator
- CLI `replicalpha run <pdf>` with offline-friendly `--extractor-mock` / `--codegen-llm`
- FastAPI JSON server (`POST /runs`, `GET /runs/{id}`, `GET /runs/{id}/report`)
- Bundled 20-ticker × 500-day synthetic market data for offline tests
- Unit + end-to-end subprocess tests; ≥ 80% coverage gate in CI (3.11 + 3.12 matrix)
