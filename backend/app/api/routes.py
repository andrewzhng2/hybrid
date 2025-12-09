"""Top-level API router for Hybrid backend."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_snowflake_service
from app.schemas.activity import Activity, ActivityCreate, ActivityUpdate
from app.schemas.muscle import MuscleLoadResponse
from app.schemas.sport import Sport
from app.schemas.week import WeekSummary
from app.services.errors import SnowflakeServiceError
from app.services.snowflake import SnowflakeService

api_router = APIRouter()


@api_router.get("/health")
def health_check() -> dict[str, str]:
    """Simple readiness probe used by dev tooling."""
    return {"status": "ok"}


@api_router.get("/sports", response_model=list[Sport])
def list_sports(
    service: SnowflakeService = Depends(get_snowflake_service),
) -> list[Sport]:
    """Return each sport and its configured focuses."""
    try:
        return service.get_sports()
    except SnowflakeServiceError as exc:  # pragma: no cover - fastapi handles HTTP
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


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
        status_code = exc.status_code or status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc


@api_router.put(
    "/activities/{activity_id}",
    response_model=Activity,
)
def update_activity(
    activity_id: int,
    payload: ActivityUpdate,
    service: SnowflakeService = Depends(get_snowflake_service),
) -> Activity:
    """Update an existing activity session."""
    try:
        return service.update_activity(activity_id, payload)
    except SnowflakeServiceError as exc:  # pragma: no cover - fastapi handles HTTP
        status_code = exc.status_code or status.HTTP_404_NOT_FOUND
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc


@api_router.delete(
    "/activities/{activity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_activity(
    activity_id: int,
    service: SnowflakeService = Depends(get_snowflake_service),
) -> None:
    """Delete an existing activity session."""
    try:
        service.delete_activity(activity_id)
    except SnowflakeServiceError as exc:  # pragma: no cover - fastapi handles HTTP
        status_code = exc.status_code or status.HTTP_404_NOT_FOUND
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc


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



