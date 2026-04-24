"""Reproducibility score: claimed IC vs reproduced IC.

final = 0.3 * sign_match + 0.7 * magnitude_score
where magnitude_score = 1 - min(|claimed - reproduced| / max(|claimed|, 0.01), 1.0)
"""

from __future__ import annotations

from replicalpha.core.models import BacktestResult, ReproducibilityScore
from replicalpha.vendored.paper2alpha.core.models import ResearchCard


def score_reproducibility(card: ResearchCard, backtest: BacktestResult) -> ReproducibilityScore:
    """Score reproducibility by comparing claimed IC vs reproduced IC.

    Args:
        card: ResearchCard containing factor specs with reported metrics.
        backtest: BacktestResult from reproducing the factor.

    Returns:
        ReproducibilityScore with sign_match, magnitude, and final score.
    """
    claimed = _extract_claimed_ic(card)
    reproduced = backtest.ic_mean
    if claimed is None:
        return ReproducibilityScore(
            claimed_ic=None,
            reproduced_ic=reproduced,
            sign_match=0.0,
            magnitude_score=0.0,
            final_score=0.0,
            interpretation=(
                f"paper had no claimed IC; reproduced IC = {reproduced:.4f} "
                "(informational only, no claimed IC baseline to compare against)"
            ),
        )
    sign_match = 1.0 if _sign(claimed) == _sign(reproduced) else 0.0
    denom = max(abs(claimed), 0.01)
    magnitude = 1.0 - min(abs(claimed - reproduced) / denom, 1.0)
    final = 0.3 * sign_match + 0.7 * magnitude
    interpretation = _narrate(claimed, reproduced, sign_match, final)
    return ReproducibilityScore(
        claimed_ic=claimed,
        reproduced_ic=reproduced,
        sign_match=sign_match,
        magnitude_score=magnitude,
        final_score=final,
        interpretation=interpretation,
    )


def _extract_claimed_ic(card: ResearchCard) -> float | None:
    """Extract claimed IC from first factor's reported_metrics."""
    for f in card.factors:
        if f.reported_metrics is not None:
            return float(f.reported_metrics.ic_mean)
    return None


def _sign(x: float) -> int:
    """Return sign of x: 1, -1, or 0."""
    if x > 0:
        return 1
    if x < 0:
        return -1
    return 0


def _narrate(claimed: float, reproduced: float, sign_match: float, final: float) -> str:
    """Generate interpretation string based on scores."""
    if sign_match == 0.0:
        return (
            f"sign mismatch: paper claimed IC = {claimed:.4f}, reproduced = {reproduced:.4f}. "
            "this is a red flag — strategy may not work as claimed"
        )
    diff_pct = abs(claimed - reproduced) / max(abs(claimed), 0.01) * 100
    if final >= 0.9:
        return (
            f"strong reproduction: claimed IC = {claimed:.4f}, reproduced = {reproduced:.4f} "
            f"({diff_pct:.1f}% deviation)"
        )
    if final >= 0.7:
        return (
            f"moderate reproduction: claimed IC = {claimed:.4f}, reproduced = {reproduced:.4f} "
            f"({diff_pct:.1f}% deviation). investigate data/period differences"
        )
    return (
        f"weak reproduction: claimed IC = {claimed:.4f}, reproduced = {reproduced:.4f} "
        f"({diff_pct:.1f}% deviation). either paper is wrong or we are missing something"
    )
