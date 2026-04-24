"""Red Team Validator v1 — 5 fixed computational checks.

Checks:
  1. overfitting_hint  — non-round params that hint at tuning
  2. small_cap_exposure — held tickers median market cap vs universe median
  3. data_leakage      — qtype failure on generated code
  4. sample_concentration — any single year contributes > 50% of cumulative IC
  5. factor_redundancy — any pair of factor formulas with identical formula strings

All findings are deterministic. LLM-based semantic critique is v0.2+ scope.
"""

from __future__ import annotations

from replicalpha.core.data import DataAdapter
from replicalpha.core.models import BacktestResult, CodegenResult, ValidatorFinding
from replicalpha.vendored.paper2alpha.core.models import FactorSpec, ResearchCard

_ROUND_LOOKBACKS = {5, 10, 20, 30, 60, 120, 200, 240, 250, 252}


def run_red_team(
    *,
    card: ResearchCard,
    backtest: BacktestResult,
    codegen: CodegenResult,
    adapter: DataAdapter,
    held_tickers: list[str],
) -> list[ValidatorFinding]:
    findings: list[ValidatorFinding] = []
    findings.extend(_check_overfitting(card.factors))
    findings.extend(_check_small_cap(held_tickers, adapter))
    findings.extend(_check_data_leakage(codegen))
    findings.extend(_check_sample_concentration(backtest))
    findings.extend(_check_factor_redundancy(card.factors))
    return findings


def _check_overfitting(factors: list[FactorSpec]) -> list[ValidatorFinding]:
    out: list[ValidatorFinding] = []
    for f in factors:
        lb = f.params.get("lookback")
        if isinstance(lb, int) and lb not in _ROUND_LOOKBACKS:
            out.append(
                ValidatorFinding(
                    rule="overfitting_hint",
                    severity="warning",
                    detail=(
                        f"factor {f.name!r} uses lookback={lb}, a non-round value "
                        "that may have been tuned on the sample"
                    ),
                    suggestion=(
                        "run a parameter sensitivity test ±10% around the current "
                        "lookback to confirm stability"
                    ),
                )
            )
    return out


def _check_small_cap(held: list[str], adapter: DataAdapter) -> list[ValidatorFinding]:
    if not held:
        return []
    meta = adapter.get_metadata()
    caps = sorted(v["market_cap"] for v in meta.values())
    if not caps:
        return []
    median = caps[len(caps) // 2]
    held_caps = [meta[t]["market_cap"] for t in held if t in meta]
    if not held_caps:
        return []
    held_median = sorted(held_caps)[len(held_caps) // 2]
    if held_median < median * 0.5:
        return [
            ValidatorFinding(
                rule="small_cap_exposure",
                severity="critical",
                detail=(
                    f"held-leg median market cap {held_median:,.0f} < "
                    f"0.5x universe median {median:,.0f}"
                ),
                suggestion=(
                    "run the backtest again with size-neutralization or a "
                    "market-cap filter; true alpha may be much smaller"
                ),
            )
        ]
    return []


def _check_data_leakage(codegen: CodegenResult) -> list[ValidatorFinding]:
    if codegen.qtype_passed:
        return []
    critical_rules = {"QT001", "QT002"}
    leaks = [v for v in codegen.qtype_violations if v.get("rule") in critical_rules]
    if leaks:
        detail = "; ".join(f"{v['rule']}: {v['message']}" for v in leaks)
        return [
            ValidatorFinding(
                rule="data_leakage",
                severity="critical",
                detail=f"generated code failed qtype — {detail}",
                suggestion="rewrite the factor without negative shifts or future data",
            )
        ]
    return []


def _check_sample_concentration(backtest: BacktestResult) -> list[ValidatorFinding]:
    if backtest.cumulative_return <= 0:
        return []
    by_year: dict[str, float] = {}
    for date_str, ic in backtest.ic_series.items():
        year = date_str[:4]
        by_year[year] = by_year.get(year, 0.0) + ic
    total = sum(abs(v) for v in by_year.values())
    if total == 0:
        return []
    for year, contrib in by_year.items():
        share = abs(contrib) / total
        if share > 0.5:
            return [
                ValidatorFinding(
                    rule="sample_concentration",
                    severity="warning",
                    detail=(
                        f"year {year} accounts for {share:.0%} of cumulative IC — "
                        "performance is highly time-specific"
                    ),
                    suggestion=(
                        "check robustness across market regimes; consider walk-forward "
                        "or regime-conditional evaluation"
                    ),
                )
            ]
    return []


def _check_factor_redundancy(factors: list[FactorSpec]) -> list[ValidatorFinding]:
    if len(factors) < 2:
        return []
    out: list[ValidatorFinding] = []
    for i in range(len(factors)):
        for j in range(i + 1, len(factors)):
            if factors[i].formula.strip() == factors[j].formula.strip():
                out.append(
                    ValidatorFinding(
                        rule="factor_redundancy",
                        severity="warning",
                        detail=(
                            f"factors {factors[i].name!r} and {factors[j].name!r} "
                            "share identical formulas"
                        ),
                        suggestion="drop one or combine via PCA",
                    )
                )
    return out
