"""Schemas powering the muscle heat map."""
from datetime import date
from typing import List

from pydantic import BaseModel, Field


class MuscleLoad(BaseModel):
    """Load value for a single muscle."""

    muscle_id: int
    muscle_name: str
    load_score: float = Field(0.0, ge=0.0)
    load_category: str = Field(..., description="white/yellow/orange/red classification.")


class MuscleLoadResponse(BaseModel):
    """Response model for GET /muscle-load/{week_start_date}."""

    week_start_date: date
    week_end_date: date
    muscles: List[MuscleLoad] = Field(default_factory=list)


