"""Top-level API router for Hybrid backend."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_snowflake_service
from app.schemas.activity import Activity, ActivityCreate
from app.schemas.muscle import MuscleLoadResponse
from app.schemas.week import WeekSummary
from app.services.errors import SnowflakeServiceError
from app.services.snowflake import SnowflakeService

api_router = APIRouter()


@api_router.get("/health")
def health_check() -> dict[str, str]:
    """Simple readiness probe used by dev tooling."""
    return {"status": "ok"}


@api_router.post(
    "/activities",
    response_model=Activity,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    payload: ActivityCreate,
    service: SnowflakeService = Depends(get_snowflake_service),
) -> Activity:
    """Persist a single activity session."""
    try:
        return service.create_activity(payload)
    except SnowflakeServiceError as exc:  # pragma: no cover - fastapi handles HTTP
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@api_router.get("/week/{week_start_date}", response_model=WeekSummary)
def read_week(
    week_start_date: date,
    service: SnowflakeService = Depends(get_snowflake_service),
) -> WeekSummary:
    """Return all activities plus stats for a week (Monday-start)."""
    try:
        return service.get_week_summary(week_start_date)
    except SnowflakeServiceError as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@api_router.get("/muscle-load/{week_start_date}", response_model=MuscleLoadResponse)
def read_muscle_load(
    week_start_date: date,
    service: SnowflakeService = Depends(get_snowflake_service),
) -> MuscleLoadResponse:
    """Return load values for each muscle for the requested week."""
    try:
        return service.get_muscle_load(week_start_date)
    except SnowflakeServiceError as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc



