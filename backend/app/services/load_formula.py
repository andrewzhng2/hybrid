"""Utilities for computing muscle load scores from activity sessions."""
from __future__ import annotations

from dataclasses import dataclass

BASELINE_RPE = 6.0
INTENSITY_MIN = 0.5
INTENSITY_MAX = 1.5
UNILATERAL_FACTOR = 0.75
EMPHASIS_FACTOR = 1.2


def clamp(value: float, lower: float, upper: float) -> float:
    """Clamp value into [lower, upper]."""
    return max(lower, min(value, upper))


def intensity_factor(rpe: float, baseline: float = BASELINE_RPE) -> float:
    """Scale RPE relative to the baseline and clamp to allowed range."""
    if baseline <= 0:
        raise ValueError("baseline must be positive")
    scaled = rpe / baseline
    return clamp(scaled, INTENSITY_MIN, INTENSITY_MAX)


@dataclass(frozen=True)
class LoadInputs:
    """Convenience container for per-muscle load computation."""

    duration_minutes: float
    base_load_per_minute: float
    intensity_rpe: float
    is_unilateral: bool = False
    has_emphasis: bool = False


def muscle_load_score(inputs: LoadInputs) -> float:
    """Compute the final load_score contribution for a muscle."""
    unilateral = UNILATERAL_FACTOR if inputs.is_unilateral else 1.0
    emphasis = EMPHASIS_FACTOR if inputs.has_emphasis else 1.0
    intensity = intensity_factor(inputs.intensity_rpe)
    return (
        inputs.duration_minutes
        * inputs.base_load_per_minute
        * intensity
        * unilateral
        * emphasis
    )


__all__ = [
    "LoadInputs",
    "muscle_load_score",
    "intensity_factor",
    "clamp",
    "BASELINE_RPE",
    "INTENSITY_MIN",
    "INTENSITY_MAX",
    "UNILATERAL_FACTOR",
    "EMPHASIS_FACTOR",
]
