# Snowflake Schema Reference

Hybrid treats Snowflake as the primary source of truth for every entity: user profile, training weeks, logged sessions, and derived muscle loads.

## Core Tables

### `users`
| column | type | notes |
| --- | --- | --- |
| `user_id` | NUMBER | Primary key. Single user seeded for now. |
| `name` | VARCHAR | Display name (optional). |
| `date_of_birth` | DATE | Use this to derive age instead of persisting an `age` column. |
| `height_cm` | NUMBER | Prefer centimeters for consistency. |
| `weight_kg` | NUMBER | Prefer kilograms for consistency. |
| `gender` | VARCHAR | Optional, helps with analytics if desired. |
| `created_at` | TIMESTAMP_LTZ | Defaults to `CURRENT_TIMESTAMP`. |

### `weeks`
| column | type | notes |
| --- | --- | --- |
| `week_id` | NUMBER | Primary key, identity/autoincrement. |
| `user_id` | NUMBER | FK → `users.user_id`. |
| `week_start_date` | DATE | Always the Sunday that anchors the week. |
| `label` | VARCHAR | Optional tags like “Race Week”, “Deload”, etc. |

### `sports`
| column | type | notes |
| `sport_id` | NUMBER | PK |
| `name` | VARCHAR | Human-readable label. |
| `category` | VARCHAR | Cardio / Strength / Mobility / Mixed (optional). |
| `default_intensity_scale` | NUMBER | Helps normalize RPE for each sport (optional). |

### `muscle_groups`
| column | type | notes |
| `muscle_id` | NUMBER | PK |
| `name` | VARCHAR | e.g., Quads, Lats, Core. |
| `body_side` | VARCHAR | front / back / both. |
| `region` | VARCHAR | upper / lower / core / full-body. |

### `sport_muscle_loads`
Mapping table that powers every derived muscle metric.

| column | type | notes |
| `sport_id` | NUMBER | FK → `sports`. |
| `muscle_id` | NUMBER | FK → `muscle_groups`. |
| `base_load_per_minute` | FLOAT | 1.0 for primary movers, 0.3 for stabilizers, etc. |
| `emphasis` | VARCHAR | Optional text descriptor (primary / secondary / stability). |
| `unilateral` | BOOLEAN | Flag single-leg/single-arm drills. |

### `activity_sessions`
| column | type | notes |
| --- | --- | --- |
| `activity_id` | NUMBER | PK |
| `user_id` | NUMBER | FK → `users`. |
| `week_id` | NUMBER | FK → `weeks`. |
| `session_date` | DATE | Exact calendar day. |
| `sport_id` | NUMBER | FK → `sports`. |
| `duration_minutes` | NUMBER | Positive integer. |
| `intensity_rpe` | NUMBER | 1–10 (RPE scale). |
| `notes` | VARCHAR | Optional free text. |
| `created_at` | TIMESTAMP_LTZ | Defaults to `CURRENT_TIMESTAMP`. |

## Derived Tables

### `daily_muscle_loads`
Stores the aggregated muscle activation for a specific user/date. This is populated by either a Snowflake Task or an offline job that runs inside FastAPI.

| column | type | notes |
| --- | --- | --- |
| `user_id` | NUMBER | FK → `users`. |
| `week_id` | NUMBER | FK → `weeks`. |
| `date` | DATE | Calendar day. |
| `muscle_id` | NUMBER | FK → `muscle_groups`. |
| `load_score` | FLOAT | Computed value. |
| `overworked_flag` | BOOLEAN | Optional helper flag. |
| `load_category` | VARCHAR | Optional pre-computed label (white/yellow/orange/red). |

### Load Formula

```
load_score = duration_minutes * base_load_per_minute * intensity_factor
```

Where:
- `duration_minutes` comes from `activity_sessions`.
- `base_load_per_minute` comes from `sport_muscle_loads`.
- `intensity_factor` is derived from RPE (e.g., map 1–10 to 0.6–1.4).

The FastAPI service currently categorizes a muscle as:

| bucket | rule |
| --- | --- |
| `white` | `score <= 0` |
| `yellow` | `score < 20` |
| `orange` | `score < 50` |
| `red` | `score >= 50` |

Feel free to tweak the thresholds in `app/services/snowflake.py`.

## Connectivity Checklist
1. Create a Snowflake role with access to the database, schema, warehouse, and tables above.
2. Grant `INSERT/SELECT/UPDATE` on `weeks` + `activity_sessions` so the API can upsert weeks and log sessions.
3. Grant `SELECT` on `daily_muscle_loads`, `sports`, and `muscle_groups`.
4. Copy `.env.example` → `.env` and populate the Snowflake variables.
5. Run `python -m scripts.check_snowflake` from the `backend` directory to confirm credentials.



