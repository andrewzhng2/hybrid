"""Snowflake service layer containing DB reads/writes."""
from __future__ import annotations

import logging
from collections import OrderedDict
from contextlib import contextmanager
from datetime import date, timedelta
from typing import Callable, Dict, Iterator, List

from snowflake.connector import DictCursor
from snowflake.connector.errors import Error as SnowflakeConnectorError

from app.schemas.activity import Activity, ActivityCreate
from app.schemas.muscle import MuscleLoad, MuscleLoadResponse
from app.schemas.sport import Sport, SportFocus
from app.schemas.week import SportBreakdown, WeekStats, WeekSummary
from app.services.errors import SnowflakeServiceError
from app.services.load_formula import LoadInputs, muscle_load_score


logger = logging.getLogger(__name__)


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
                    category,
                    duration_minutes,
                    intensity_rpe,
                    notes
                )
                values (
                    %(user_id)s,
                    %(week_id)s,
                    %(session_date)s,
                    %(sport_id)s,
                    %(category)s,
                    %(duration_minutes)s,
                    %(intensity_rpe)s,
                    %(notes)s
                )
            """
            activity_params = {
                    "user_id": self._default_user_id,
                    "week_id": week_id,
                    "session_date": payload.date,
                    "sport_id": payload.sport_id,
                    "category": payload.category,
                    "duration_minutes": payload.duration_minutes,
                    "intensity_rpe": payload.intensity_rpe,
                    "notes": payload.notes,
            }
            cursor.execute(insert_sql, activity_params)

            fetch_sql = """
                select
                    activity_id,
                    week_id,
                    session_date,
                    sport_id,
                    category,
                    duration_minutes,
                    intensity_rpe,
                    notes
                from activity_sessions
                where user_id = %(user_id)s
                  and week_id = %(week_id)s
                  and session_date = %(session_date)s
                  and sport_id = %(sport_id)s
                  and duration_minutes = %(duration_minutes)s
                  and intensity_rpe = %(intensity_rpe)s
                  and coalesce(category, '__NULL__') = coalesce(%(category)s, '__NULL__')
                  and coalesce(notes, '__NULL__') = coalesce(%(notes)s, '__NULL__')
                order by activity_id desc
                limit 1
            """
            cursor.execute(fetch_sql, activity_params)
            row = cursor.fetchone()
            if not row:
                raise SnowflakeServiceError("Unable to create activity session.")

            normalized = self._normalize_row(row)
            activity = Activity(
                activity_id=int(normalized["activity_id"]),
                week_id=int(normalized["week_id"]),
                sport_id=int(normalized["sport_id"]),
                date=normalized["session_date"],
                category=normalized.get("category"),
                duration_minutes=int(normalized["duration_minutes"]),
                intensity_rpe=int(normalized["intensity_rpe"]),
                notes=normalized.get("notes"),
            )
            self._update_muscle_loads_for_activity(cursor, activity)
            return activity

    def get_week_summary(self, week_start_date: date) -> WeekSummary:
        """Fetch all activities + aggregates for a week."""
        week_start = self._start_of_week(week_start_date)
        week_end = week_start + timedelta(days=6)

        with self._cursor() as cursor:
            week_id, label = self._get_week(cursor, week_start)  # still keeps weeks table tidy

            activities = self._fetch_activities_by_date(cursor, week_start, week_end)
            stats_dict = self._fetch_week_stats_by_date(cursor, week_start, week_end)
            sport_breakdown = self._fetch_sport_breakdown_by_date(
                cursor, week_start, week_end
            )

        return WeekSummary(
            week_start_date=week_start,
            week_end_date=week_end,
            label=label,
            stats=WeekStats(
                total_duration_minutes=stats_dict["total_duration_minutes"],
                session_count=stats_dict["session_count"],
                average_rpe=stats_dict["average_rpe"],
                sport_breakdown=sport_breakdown,
            ),
            activities=activities,
        )

    def get_sports(self) -> List[Sport]:
        """Return all sports with their associated focuses."""
        with self._cursor() as cursor:
            cursor.execute(
                """
                select
                    s.sport_id,
                    s.name as sport_name,
                    s.default_intensity_scale,
                    f.focus_id,
                    f.name as focus_name
                from sports s
                left join sport_focus f on f.sport_id = s.sport_id
                order by s.sport_id asc, f.focus_id asc
                """
            )
            rows = cursor.fetchall() or []

        sports: "OrderedDict[int, dict[str, object]]" = OrderedDict()
        for row in rows:
            normalized = self._normalize_row(row)
            sport_id = int(normalized["sport_id"])
            sport_entry = sports.get(sport_id)
            if not sport_entry:
                sport_entry = {
                    "sport_id": sport_id,
                    "name": normalized["sport_name"],
                    "default_intensity_scale": normalized.get("default_intensity_scale"),
                    "focuses": [],
                }
                sports[sport_id] = sport_entry

            focus_id = normalized.get("focus_id")
            focus_name = normalized.get("focus_name")
            if focus_id is not None and focus_name:
                sport_entry["focuses"].append(
                    SportFocus(
                        focus_id=int(focus_id),
                        sport_id=sport_id,
                        name=focus_name,
                    )
                )

        result: List[Sport] = []
        for entry in sports.values():
            default_scale = entry.get("default_intensity_scale")
            result.append(
                Sport(
                    sport_id=entry["sport_id"],
                    name=entry["name"],
                    default_intensity_scale=float(default_scale) if default_scale is not None else None,
                    focuses=entry["focuses"],
                )
            )
        return result

    def get_muscle_load(self, week_start_date: date) -> MuscleLoadResponse:
        """Fetch aggregated muscle load data for a week."""
        week_start = self._start_of_week(week_start_date)
        week_end = week_start + timedelta(days=6)

        with self._cursor() as cursor:
            load_sql = """
                SELECT
                    d.muscle_id,
                    m.name AS muscle_name,
                    SUM(d.load_score) AS load_score
                FROM daily_muscle_loads d
                JOIN muscle_groups m ON m.muscle_id = d.muscle_id
                WHERE d.user_id = %(user_id)s
                AND d.date BETWEEN %(week_start)s AND %(week_end)s
                GROUP BY d.muscle_id, m.name
                ORDER BY load_score DESC
            """
            cursor.execute(
                load_sql,
                {
                    "user_id": self._default_user_id,
                    "week_start": week_start,
                    "week_end": week_end,
                },
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

    def rebuild_daily_muscle_loads(self, start_date: date, end_date: date | None = None) -> int:
        """Recompute daily muscle loads for an inclusive date range."""
        if end_date is None:
            end_date = start_date
        if end_date < start_date:
            raise SnowflakeServiceError("end_date must be on or after start_date.")

        with self._cursor() as cursor:
            cursor.execute(
                """
                delete from daily_muscle_loads
                where user_id = %(user_id)s
                  and date between %(start)s and %(end)s
                """,
                {
                    "user_id": self._default_user_id,
                    "start": start_date,
                    "end": end_date,
                },
            )
            activities = self._fetch_activities_by_date(cursor, start_date, end_date)
            for activity in activities:
                self._update_muscle_loads_for_activity(cursor, activity)

        logger.info(
            "Rebuilt daily muscle loads for %s activities between %s and %s",
            len(activities),
            start_date,
            end_date,
        )
        return len(activities)

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    def _update_muscle_loads_for_activity(self, cursor: DictCursor, activity: Activity) -> None:
        """Compute and persist daily muscle loads for the given activity."""
        focus_id = self._resolve_focus_id(cursor, activity.sport_id, activity.category)
        configs = self._fetch_muscle_load_configs(cursor, activity.sport_id, focus_id)
        if not configs:
            logger.debug(
                "Skipping muscle load calc for sport_id=%s focus_id=%s (no configs)",
                activity.sport_id,
                focus_id,
            )
            return

        for config in configs:
            base_load = config.get("base_load_per_minute")
            if base_load is None:
                continue
            load_value = muscle_load_score(
                LoadInputs(
                    duration_minutes=activity.duration_minutes,
                    base_load_per_minute=float(base_load),
                    intensity_rpe=activity.intensity_rpe,
                    is_unilateral=bool(config.get("unilateral")),
                    has_emphasis=bool(config.get("emphasis")),
                )
            )
            self._upsert_daily_muscle_load(
                cursor=cursor,
                week_id=activity.week_id,
                session_date=activity.date,
                muscle_id=int(config["muscle_id"]),
                load_score=load_value,
            )

    def _resolve_focus_id(
        self,
        cursor: DictCursor,
        sport_id: int,
        category: str | None,
    ) -> int | None:
        """Translate an activity category into a focus_id."""
        if not category:
            return None
        trimmed = category.strip()
        if not trimmed:
            return None
        cursor.execute(
            """
            select focus_id
            from sport_focus
            where sport_id = %(sport_id)s
              and lower(name) = lower(%(focus_name)s)
            limit 1
            """,
            {"sport_id": sport_id, "focus_name": trimmed},
        )
        row = cursor.fetchone()
        if not row:
            logger.debug(
                "No focus matched for sport_id=%s category=%s",
                sport_id,
                trimmed,
            )
            return None
        normalized = self._normalize_row(row)
        focus_value = normalized.get("focus_id")
        return int(focus_value) if focus_value is not None else None

    def _fetch_muscle_load_configs(
        self,
        cursor: DictCursor,
        sport_id: int,
        focus_id: int | None,
    ) -> List[Dict[str, object]]:
        """Return the muscle load configuration rows for the sport/focus."""
        base_sql = """
            select muscle_id, base_load_per_minute, emphasis, unilateral, focus_id
            from sport_muscle_loads
            where sport_id = %(sport_id)s
        """
        params: Dict[str, object] = {"sport_id": sport_id}
        if focus_id is None:
            sql = base_sql + " and focus_id is null"
        else:
            sql = base_sql + " and (focus_id = %(focus_id)s or focus_id is null)"
            params["focus_id"] = focus_id

        cursor.execute(sql, params)
        rows = cursor.fetchall() or []
        if not rows:
            return []

        prioritized: Dict[int, Dict[str, object]] = {}
        if focus_id is not None:
            for row in rows:
                normalized = self._normalize_row(row)
                row_focus = normalized.get("focus_id")
                if row_focus is None:
                    continue
                if int(row_focus) == focus_id:
                    muscle_id = int(normalized["muscle_id"])
                    normalized["muscle_id"] = muscle_id
                    normalized["focus_id"] = focus_id
                    prioritized[muscle_id] = normalized

        for row in rows:
            normalized = self._normalize_row(row)
            muscle_id = int(normalized["muscle_id"])
            normalized["muscle_id"] = muscle_id
            row_focus = normalized.get("focus_id")
            normalized["focus_id"] = int(row_focus) if row_focus is not None else None
            if muscle_id in prioritized:
                continue
            if normalized["focus_id"] is None:
                prioritized[muscle_id] = normalized

        return list(prioritized.values())

    def _upsert_daily_muscle_load(
        self,
        cursor: DictCursor,
        week_id: int,
        session_date: date,
        muscle_id: int,
        load_score: float,
    ) -> None:
        """Merge a single muscle load contribution into daily_muscle_loads."""
        if load_score <= 0:
            return

        params = {
            "user_id": self._default_user_id,
            "week_id": week_id,
            "session_date": session_date,
            "muscle_id": muscle_id,
            "load_score": load_score,
        }
        cursor.execute(
            """
            merge into daily_muscle_loads as target
            using (
                select
                    %(user_id)s as user_id,
                    %(week_id)s as week_id,
                    %(session_date)s as session_date,
                    %(muscle_id)s as muscle_id,
                    %(load_score)s as load_score
            ) as source
            on target.user_id = source.user_id
               and target.muscle_id = source.muscle_id
               and target.date = source.session_date
            when matched then update set
                load_score = target.load_score + source.load_score,
                week_id = source.week_id
            when not matched then insert (user_id, week_id, date, muscle_id, load_score)
            values (
                source.user_id,
                source.week_id,
                source.session_date,
                source.muscle_id,
                source.load_score
            )
            """,
            params,
        )

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
        ensured = self._ensure_week_entry(cursor, week_start)
        if ensured:
            return ensured

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
        ensured = self._ensure_week_entry(cursor, week_start)
        if not ensured:
            raise SnowflakeServiceError(
                f"No training week found for {week_start.isoformat()}."
            )
        return ensured

    def _ensure_week_entry(self, cursor: DictCursor, week_start: date) -> tuple[int, str | None] | None:
        """Return an existing week row, re-anchoring legacy entries to Monday when needed."""
        row = self._select_week_row(cursor, week_start)
        if row:
            normalized = self._normalize_row(row)
            return int(normalized["week_id"]), normalized.get("label")

        legacy_row = self._select_week_in_window(cursor, week_start)
        if not legacy_row:
            return None

        normalized = self._normalize_row(legacy_row)
        stored_start: date = normalized["week_start_date"]
        if stored_start != week_start:
            self._reanchor_week(cursor, int(normalized["week_id"]), week_start)
            row = self._select_week_row(cursor, week_start)
            if row:
                normalized = self._normalize_row(row)
        return int(normalized["week_id"]), normalized.get("label")

    def _select_week_row(self, cursor: DictCursor, week_start: date) -> Dict[str, object] | None:
        cursor.execute(
            """
            select week_id, week_start_date, label
            from weeks
            where user_id = %(user_id)s
              and week_start_date = %(week_start_date)s
            """,
            {"user_id": self._default_user_id, "week_start_date": week_start},
        )
        return cursor.fetchone()

    def _select_week_in_window(self, cursor: DictCursor, week_start: date) -> Dict[str, object] | None:
        """Locate a legacy week whose start date falls within the same 7-day window."""
        cursor.execute(
            """
            select week_id, week_start_date, label
            from weeks
            where user_id = %(user_id)s
              and week_start_date between %(window_start)s and %(window_end)s
            order by week_start_date desc
            limit 1
            """,
            {
                "user_id": self._default_user_id,
                "window_start": week_start - timedelta(days=6),
                "window_end": week_start,
            },
        )
        return cursor.fetchone()

    @staticmethod
    def _reanchor_week(cursor: DictCursor, week_id: int, week_start: date) -> None:
        """Update an existing week so that its anchor date is shifted to Monday."""
        cursor.execute(
            """
            update weeks
            set week_start_date = %(week_start_date)s
            where week_id = %(week_id)s
            """,
            {"week_id": week_id, "week_start_date": week_start},
        )

    def _fetch_activities_by_date(self, cursor: DictCursor, week_start: date, week_end: date) -> List[Activity]:
        cursor.execute(
            """
            select
                activity_id,
                week_id,
                session_date,
                sport_id,
                category,
                duration_minutes,
                intensity_rpe,
                notes
            from activity_sessions
            where user_id = %(user_id)s
              and session_date between %(week_start)s and %(week_end)s
            order by session_date asc, activity_id asc
            """,
            {
                "user_id": self._default_user_id,
                "week_start": week_start,
                "week_end": week_end,
            },
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
                    category=normalized.get("category"),
                    duration_minutes=int(normalized["duration_minutes"]),
                    intensity_rpe=int(normalized["intensity_rpe"]),
                    notes=normalized.get("notes"),
                )
            )
        return activities

    def _fetch_week_stats_by_date(self, cursor: DictCursor, week_start: date, week_end: date) -> Dict[str, float]:
        cursor.execute(
            """
            select
                coalesce(sum(duration_minutes), 0) as total_duration_minutes,
                count(*) as session_count,
                coalesce(avg(intensity_rpe), 0) as average_rpe
            from activity_sessions
            where user_id = %(user_id)s
              and session_date between %(week_start)s and %(week_end)s
            """,
            {
                "user_id": self._default_user_id,
                "week_start": week_start,
                "week_end": week_end,
            },
        )
        row = cursor.fetchone() or {}
        normalized = self._normalize_row(row)
        return {
            "total_duration_minutes": int(normalized.get("total_duration_minutes", 0) or 0),
            "session_count": int(normalized.get("session_count", 0) or 0),
            "average_rpe": float(normalized.get("average_rpe", 0) or 0),
        }

    def _fetch_sport_breakdown_by_date(self, cursor: DictCursor, week_start: date, week_end: date) -> List[SportBreakdown]:
        cursor.execute(
            """
            select
                s.sport_id,
                s.name as sport_name,
                coalesce(sum(a.duration_minutes), 0) as total_duration_minutes,
                count(a.activity_id) as session_count
            from activity_sessions a
            join sports s on s.sport_id = a.sport_id
            where a.user_id = %(user_id)s
              and a.session_date between %(week_start)s and %(week_end)s
            group by s.sport_id, s.name
            order by total_duration_minutes desc
            """,
            {
                "user_id": self._default_user_id,
                "week_start": week_start,
                "week_end": week_end,
            },
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
        """Return the Monday of the week that contains the target date."""
        return target - timedelta(days=target.weekday())

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



