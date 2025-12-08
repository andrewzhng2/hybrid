from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.dependencies import get_snowflake_service
from app.main import create_app
from app.schemas.muscle import MuscleLoad, MuscleLoadResponse


class FakeSnowflakeService:
    def get_muscle_load(self, week_start_date: date) -> MuscleLoadResponse:
        return MuscleLoadResponse(
            week_start_date=week_start_date,
            week_end_date=week_start_date + timedelta(days=6),
            muscles=[
                MuscleLoad(
                    muscle_id=1,
                    muscle_name="Quads",
                    load_score=1.1,
                    load_category="green",
                )
            ],
        )


def test_muscle_load_endpoint_returns_payload() -> None:
    app = create_app()
    app.dependency_overrides[get_snowflake_service] = lambda: FakeSnowflakeService()

    client = TestClient(app)
    response = client.get("/api/muscle-load/2024-01-01")

    assert response.status_code == 200
    payload = response.json()
    assert payload["week_start_date"] == "2024-01-01"
    assert payload["week_end_date"] == "2024-01-07"
    assert payload["muscles"][0]["muscle_name"] == "Quads"
    assert payload["muscles"][0]["load_category"] == "green"
