"""Schemas for week summaries."""
from __future__ import annotations

from datetime import date
from typing import List

from pydantic import BaseModel, Field

from app.schemas.activity import Activity


class SportBreakdown(BaseModel):
    """Aggregate minutes + counts per sport."""

    sport_id: int
    sport_name: str
    total_duration_minutes: int = Field(0, ge=0)
    session_count: int = Field(0, ge=0)


class WeekStats(BaseModel):
    """Summary metrics about a training week."""

    total_duration_minutes: int = Field(0, ge=0)
    session_count: int = Field(0, ge=0)
    average_rpe: float = Field(0.0, ge=0.0)
    sport_breakdown: List[SportBreakdown] = Field(default_factory=list)


class WeekSummary(BaseModel):
    """Response model for GET /week/{week_start_date}."""

    week_start_date: date
    week_end_date: date
    label: str | None = None
    stats: WeekStats
    activities: List[Activity] = Field(default_factory=list)



