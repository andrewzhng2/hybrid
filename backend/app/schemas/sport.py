"""Pydantic models representing sports and their focuses."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SportFocus(BaseModel):
    """Represents a single focus row belonging to a sport."""

    focus_id: int = Field(..., description="Unique identifier for the focus row.")
    sport_id: int = Field(..., description="Parent sport identifier.")
    name: str = Field(..., description="Human-readable focus label.")


class Sport(BaseModel):
    """Represents a sport and its available focuses."""

    sport_id: int = Field(..., description="Unique identifier for the sport.")
    name: str = Field(..., description="Display name for the sport.")
    default_intensity_scale: Optional[float] = Field(
        default=None,
        description="Optional scaling factor for RPE normalization.",
    )
    focuses: list[SportFocus] = Field(
        default_factory=list,
        description="Child focuses associated with the sport.",
    )

