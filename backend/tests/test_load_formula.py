import pytest

from app.services.load_formula import (
    EMPHASIS_FACTOR,
    INTENSITY_MAX,
    INTENSITY_MIN,
    UNILATERAL_FACTOR,
    LoadInputs,
    intensity_factor,
    muscle_load_score,
)


def test_intensity_factor_clamps_low() -> None:
    assert intensity_factor(2) == INTENSITY_MIN


def test_intensity_factor_clamps_high() -> None:
    assert intensity_factor(12) == INTENSITY_MAX


def test_intensity_factor_requires_positive_baseline() -> None:
    with pytest.raises(ValueError):
        intensity_factor(6, baseline=0)


def test_muscle_load_score_combines_all_multipliers() -> None:
    inputs = LoadInputs(
        duration_minutes=45,
        base_load_per_minute=0.8,
        intensity_rpe=9,
        is_unilateral=True,
        has_emphasis=True,
    )
    expected = (
        45
        * 0.8
        * INTENSITY_MAX  # 9 / 6 = 1.5 (already at cap)
        * UNILATERAL_FACTOR
        * EMPHASIS_FACTOR
    )
    assert muscle_load_score(inputs) == pytest.approx(expected)
