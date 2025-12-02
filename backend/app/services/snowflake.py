"""Snowflake service layer containing DB reads/writes."""
from __future__ import annotations

from contextlib import contextmanager
from datetime import date, timedelta
from typing import Callable, Dict, Iterator, List

from snowflake.connector import DictCursor
from snowflake.connector.errors import Error as SnowflakeConnectorError

from app.schemas.activity import Activity, ActivityCreate
from app.schemas.muscle import MuscleLoad, MuscleLoadResponse
from app.schemas.week import SportBreakdown, WeekStats, WeekSummary
from app.services.errors import SnowflakeServiceError


class SnowflakeService:
    """Wrapper that translates API calls into Snowflake SQL statements."""

    def __init__(
        self,
        connection_factory: Callable[[], object],
        default_user_id: int,
    ) -> None:
        self._connection_factory = connection_factory
        self._default_user_id = default_user_id

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #
    def create_activity(self, payload: ActivityCreate) -> Activity:
        """Persist a new activity session for the default user."""
        week_start = self._start_of_week(payload.date)
        with self._cursor() as cursor:
            week_id, _ = self._upsert_week(cursor, week_start)

            insert_sql = """
                insert into activity_sessions (
                    user_id,
                    week_id,
                    session_date,
                    sport_id,
                    duration_minutes,
                    intensity_rpe,
                    notes
                )
                values (
                    %(user_id)s,
                    %(week_id)s,
                    %(session_date)s,
                    %(sport_id)s,
                    %(duration_minutes)s,
                    %(intensity_rpe)s,
                    %(notes)s
                )
                returning activity_id,
                          week_id,
                          session_date,
                          sport_id,
                          duration_minutes,
                          intensity_rpe,
                          notes
            """
            cursor.execute(
                insert_sql,
                {
                    "user_id": self._default_user_id,
                    "week_id": week_id,
                    "session_date": payload.date,
                    "sport_id": payload.sport_id,
                    "duration_minutes": payload.duration_minutes,
                    "intensity_rpe": payload.intensity_rpe,
                    "notes": payload.notes,
                },
            )
            row = cursor.fetchone()
            if not row:
                raise SnowflakeServiceError("Unable to create activity session.")

            normalized = self._normalize_row(row)
            return Activity(
                activity_id=int(normalized["activity_id"]),
                week_id=int(normalized["week_id"]),
                sport_id=int(normalized["sport_id"]),
                date=normalized["session_date"],
                duration_minutes=int(normalized["duration_minutes"]),
                intensity_rpe=int(normalized["intensity_rpe"]),
                notes=normalized.get("notes"),
            )

    def get_week_summary(self, week_start_date: date) -> WeekSummary:
        """Fetch all activities + aggregates for a week."""
        week_start = self._start_of_week(week_start_date)
        week_end = week_start + timedelta(days=6)

        with self._cursor() as cursor:
            week_id, label = self._get_week(cursor, week_start)

            activities = self._fetch_activities(cursor, week_id)
            stats = self._fetch_week_stats(cursor, week_id)
            sport_breakdown = self._fetch_sport_breakdown(cursor, week_id)

        return WeekSummary(
            week_start_date=week_start,
            week_end_date=week_end,
            label=label,
            stats=WeekStats(
                total_duration_minutes=stats["total_duration_minutes"],
                session_count=stats["session_count"],
                average_rpe=stats["average_rpe"],
                sport_breakdown=sport_breakdown,
            ),
            activities=activities,
        )

    def get_muscle_load(self, week_start_date: date) -> MuscleLoadResponse:
        """Fetch aggregated muscle load data for a week."""
        week_start = self._start_of_week(week_start_date)
        week_end = week_start + timedelta(days=6)

        with self._cursor() as cursor:
            week_id, _ = self._get_week(cursor, week_start)

            load_sql = """
                select
                    d.muscle_id,
                    m.name as muscle_name,
                    sum(d.load_score) as load_score
                from daily_muscle_loads d
                join muscle_groups m on m.muscle_id = d.muscle_id
                where d.user_id = %(user_id)s
                  and d.week_id = %(week_id)s
                group by d.muscle_id, m.name
                order by load_score desc
            """
            cursor.execute(
                load_sql,
                {"user_id": self._default_user_id, "week_id": week_id},
            )
            rows = cursor.fetchall() or []

        muscles: List[MuscleLoad] = []
        for row in rows:
            normalized = self._normalize_row(row)
            score = float(normalized["load_score"])
            muscles.append(
                MuscleLoad(
                    muscle_id=int(normalized["muscle_id"]),
                    muscle_name=normalized["muscle_name"],
                    load_score=score,
                    load_category=self._load_category(score),
                )
            )

        return MuscleLoadResponse(
            week_start_date=week_start,
            week_end_date=week_end,
            muscles=muscles,
        )

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    @contextmanager
    def _cursor(self) -> Iterator[DictCursor]:
        """Yield a DictCursor backed by a brand-new connection."""
        try:
            connection = self._connection_factory()
        except Exception as exc:  # pragma: no cover - depends on env
            raise SnowflakeServiceError("Unable to connect to Snowflake.") from exc

        cursor = None
        try:
            cursor = connection.cursor(DictCursor)
            yield cursor
        except SnowflakeConnectorError as exc:  # pragma: no cover
            raise SnowflakeServiceError(str(exc)) from exc
        finally:
            if cursor:
                cursor.close()
            connection.close()

    def _upsert_week(self, cursor: DictCursor, week_start: date) -> tuple[int, str | None]:
        """Ensure week row exists for the given date and return (id, label)."""
        merge_sql = """
            merge into weeks as target
            using (select %(user_id)s as user_id, %(week_start_date)s as week_start_date) as source
            on target.user_id = source.user_id and target.week_start_date = source.week_start_date
            when not matched then insert (user_id, week_start_date)
            values (source.user_id, source.week_start_date)
        """
        cursor.execute(
            merge_sql,
            {"user_id": self._default_user_id, "week_start_date": week_start},
        )
        return self._get_week(cursor, week_start)

    def _get_week(self, cursor: DictCursor, week_start: date) -> tuple[int, str | None]:
        """Return (week_id, label) if the week exists."""
        cursor.execute(
            """
            select week_id, label
            from weeks
            where user_id = %(user_id)s
              and week_start_date = %(week_start_date)s
            """,
            {"user_id": self._default_user_id, "week_start_date": week_start},
        )
        row = cursor.fetchone()
        if not row:
            raise SnowflakeServiceError(
                f"No training week found for {week_start.isoformat()}."
            )
        normalized = self._normalize_row(row)
        return int(normalized["week_id"]), normalized.get("label")

    def _fetch_activities(self, cursor: DictCursor, week_id: int) -> List[Activity]:
        cursor.execute(
            """
            select
                activity_id,
                week_id,
                session_date,
                sport_id,
                duration_minutes,
                intensity_rpe,
                notes
            from activity_sessions
            where week_id = %(week_id)s
            order by session_date asc, activity_id asc
            """,
            {"week_id": week_id},
        )
        rows = cursor.fetchall() or []
        activities: List[Activity] = []
        for row in rows:
            normalized = self._normalize_row(row)
            activities.append(
                Activity(
                    activity_id=int(normalized["activity_id"]),
                    week_id=int(normalized["week_id"]),
                    sport_id=int(normalized["sport_id"]),
                    date=normalized["session_date"],
                    duration_minutes=int(normalized["duration_minutes"]),
                    intensity_rpe=int(normalized["intensity_rpe"]),
                    notes=normalized.get("notes"),
                )
            )
        return activities

    def _fetch_week_stats(self, cursor: DictCursor, week_id: int) -> Dict[str, float]:
        cursor.execute(
            """
            select
                coalesce(sum(duration_minutes), 0) as total_duration_minutes,
                count(*) as session_count,
                coalesce(avg(intensity_rpe), 0) as average_rpe
            from activity_sessions
            where week_id = %(week_id)s
            """,
            {"week_id": week_id},
        )
        row = cursor.fetchone() or {}
        normalized = self._normalize_row(row)
        return {
            "total_duration_minutes": int(normalized.get("total_duration_minutes", 0) or 0),
            "session_count": int(normalized.get("session_count", 0) or 0),
            "average_rpe": float(normalized.get("average_rpe", 0) or 0),
        }

    def _fetch_sport_breakdown(self, cursor: DictCursor, week_id: int) -> List[SportBreakdown]:
        cursor.execute(
            """
            select
                s.sport_id,
                s.name as sport_name,
                coalesce(sum(a.duration_minutes), 0) as total_duration_minutes,
                count(a.activity_id) as session_count
            from activity_sessions a
            join sports s on s.sport_id = a.sport_id
            where week_id = %(week_id)s
            group by s.sport_id, s.name
            order by total_duration_minutes desc
            """,
            {"week_id": week_id},
        )
        rows = cursor.fetchall() or []
        breakdown: List[SportBreakdown] = []
        for row in rows:
            normalized = self._normalize_row(row)
            breakdown.append(
                SportBreakdown(
                    sport_id=int(normalized["sport_id"]),
                    sport_name=normalized["sport_name"],
                    total_duration_minutes=int(normalized["total_duration_minutes"]),
                    session_count=int(normalized["session_count"]),
                )
            )
        return breakdown

    @staticmethod
    def _start_of_week(target: date) -> date:
        """Return the Sunday of the week that contains the target date."""
        days_since_sunday = (target.weekday() + 1) % 7
        return target - timedelta(days=days_since_sunday)

    @staticmethod
    def _normalize_row(row: Dict[str, object] | None) -> Dict[str, object]:
        """Lowercase dict keys returned by Snowflake."""
        if not row:
            return {}
        return {key.lower(): value for key, value in row.items()}

    @staticmethod
    def _load_category(score: float) -> str:
        """Map numeric load to UI bucket."""
        if score <= 0:
            return "white"
        if score < 20:
            return "yellow"
        if score < 50:
            return "orange"
        return "red"



