"""Muscle-tier metadata and ACWR color helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Final, Literal

LoadCategory = Literal["white", "blue", "green", "yellow", "orange", "red"]

TierLabel = Literal["A", "B", "C"]

MUSCLE_TIERS: Final[Dict[str, TierLabel]] = {
    "core": "A",
    "balance": "A",
    "mental": "A",
    "calves": "A",
    "glutes": "A",
    "upper back": "A",
    "lats": "A",
    "quads": "B",
    "hamstrings": "B",
    "hip flexors": "B",
    "adductors": "B",
    "shoulders": "B",
    "lower back": "B",
    "forearms": "B",
    "chest": "C",
    "biceps": "C",
    "triceps": "C",
    "tendons": "C",
}

_DEFAULT_TIER: Final[TierLabel] = "B"
_MIN_ACWR_FOR_COLOR: Final[float] = 0.0


@dataclass(frozen=True)
class TierThreshold:
    cutoff: float
    inclusive: bool
    color: LoadCategory


_TIER_THRESHOLDS: Final[Dict[TierLabel, tuple[TierThreshold, ...]]] = {
    "A": (
        TierThreshold(cutoff=0.7, inclusive=False, color="blue"),
        TierThreshold(cutoff=1.4, inclusive=True, color="green"),
        TierThreshold(cutoff=1.8, inclusive=True, color="yellow"),
        TierThreshold(cutoff=2.3, inclusive=True, color="orange"),
    ),
    "B": (
        TierThreshold(cutoff=0.8, inclusive=False, color="blue"),
        TierThreshold(cutoff=1.3, inclusive=True, color="green"),
        TierThreshold(cutoff=1.5, inclusive=True, color="yellow"),
        TierThreshold(cutoff=1.8, inclusive=True, color="orange"),
    ),
    "C": (
        TierThreshold(cutoff=0.9, inclusive=False, color="blue"),
        TierThreshold(cutoff=1.2, inclusive=True, color="green"),
        TierThreshold(cutoff=1.4, inclusive=True, color="yellow"),
        TierThreshold(cutoff=1.6, inclusive=True, color="orange"),
    ),
}


@dataclass(frozen=True)
class FatigueThreshold:
    cutoff: float
    inclusive: bool
    color: LoadCategory


_FATIGUE_THRESHOLDS: Final[Dict[TierLabel, tuple[FatigueThreshold, ...]]] = {
    "A": (
        FatigueThreshold(cutoff=60.0, inclusive=False, color="blue"),
        FatigueThreshold(cutoff=180.0, inclusive=True, color="green"),
        FatigueThreshold(cutoff=300.0, inclusive=True, color="yellow"),
        FatigueThreshold(cutoff=420.0, inclusive=True, color="orange"),
    ),
    "B": (
        FatigueThreshold(cutoff=45.0, inclusive=False, color="blue"),
        FatigueThreshold(cutoff=135.0, inclusive=True, color="green"),
        FatigueThreshold(cutoff=225.0, inclusive=True, color="yellow"),
        FatigueThreshold(cutoff=315.0, inclusive=True, color="orange"),
    ),
    "C": (
        FatigueThreshold(cutoff=30.0, inclusive=False, color="blue"),
        FatigueThreshold(cutoff=90.0, inclusive=True, color="green"),
        FatigueThreshold(cutoff=150.0, inclusive=True, color="yellow"),
        FatigueThreshold(cutoff=210.0, inclusive=True, color="orange"),
    ),
}


def normalize_muscle_name(name: str) -> str:
    return name.strip().lower()


def color_for_muscle(muscle_name: str, acwr: float) -> LoadCategory:
    """Return the color bucket for the provided muscle + ACWR reading."""

    if acwr <= _MIN_ACWR_FOR_COLOR:
        return "white"

    tier = MUSCLE_TIERS.get(normalize_muscle_name(muscle_name), _DEFAULT_TIER)
    for threshold in _TIER_THRESHOLDS[tier]:
        if threshold.inclusive and acwr <= threshold.cutoff:
            return threshold.color
        if not threshold.inclusive and acwr < threshold.cutoff:
            return threshold.color
    return "red"


def fatigue_color_for_muscle(muscle_name: str, fatigue_score: float) -> LoadCategory:
    """Return fatigue bucket for the provided muscle + raw load reading."""

    if fatigue_score <= 0:
        return "white"

    tier = MUSCLE_TIERS.get(normalize_muscle_name(muscle_name), _DEFAULT_TIER)
    for threshold in _FATIGUE_THRESHOLDS[tier]:
        if threshold.inclusive and fatigue_score <= threshold.cutoff:
            return threshold.color
        if not threshold.inclusive and fatigue_score < threshold.cutoff:
            return threshold.color
    return "red"


__all__ = ["MUSCLE_TIERS", "color_for_muscle", "fatigue_color_for_muscle", "LoadCategory", "TierLabel"]
