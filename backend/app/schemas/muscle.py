"""Schemas powering the muscle heat map."""
from datetime import date
from typing import List

from pydantic import BaseModel, Field


class MuscleLoad(BaseModel):
    """Per-muscle Acute:Chronic Workload Ratio (ACWR) for a given week."""

    muscle_id: int
    muscle_name: str
    load_score: float = Field(0.0, ge=0.0)
    load_category: str = Field(
        ...,
        description="white/blue/green/yellow/orange/red classification.",
    )
    fatigue_score: float = Field(0.0, ge=0.0)
    fatigue_category: str = Field(
        ...,
        description="white/blue/green/yellow/orange/red fatigue bucket.",
    )


class AthleteProfile(BaseModel):
    """Basic athlete vitals derived from the users table."""

    height_cm: float | None = Field(default=None, ge=0.0)
    weight_kg: float | None = Field(default=None, ge=0.0)
    date_of_birth: date | None = None


class MuscleLoadResponse(BaseModel):
    """Response model for GET /muscle-load/{week_start_date}."""

    week_start_date: date
    week_end_date: date
    muscles: List[MuscleLoad] = Field(default_factory=list)
    athlete_profile: AthleteProfile | None = None


