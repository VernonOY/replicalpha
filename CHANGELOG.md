# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] — planned

### Added
- CLI `replicalpha run <pdf> --out <dir>` for end-to-end research-paper reproduction.
- FastAPI server exposing `POST /runs`, `GET /runs/{id}`, `GET /runs/{id}/report`.
- Pipeline stages: PDF extraction (vendored paper2alpha) → LLM-bodied factor code (DSL + LLM fallback, qtype-gated) → minimal pandas IC backtest → 5-check Red Team Validator → reproducibility score → markdown research report.
- Bundled synthetic 20-ticker × 500-day demo dataset, CI runs without network.
