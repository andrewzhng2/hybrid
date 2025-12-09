"""Pydantic models for activity endpoints (placeholder for scaffold)."""
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class ActivityBase(BaseModel):
    """Shared fields for creating/fetching activity sessions."""

    sport_id: int = Field(..., description="Reference to the sport performed.")
    date: date
    category: Optional[str] = None
    duration_minutes: int = Field(..., gt=0)
    intensity_rpe: int = Field(..., ge=1, le=10)
    notes: Optional[str] = None


class ActivityCreate(ActivityBase):
    """Payload accepted by POST /activities."""


class ActivityUpdate(ActivityBase):
    """Payload accepted by PUT /activities/{activity_id}."""


class Activity(ActivityBase):
    """Model returned from activity endpoints."""

    activity_id: int
    week_id: int

    class Config:
        orm_mode = True


