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
| `week_start_date` | DATE | Always the Monday that anchors the week. |
| `label` | VARCHAR | Optional tags like “Race Week”, “Deload”, etc. |

### `sports`
| column | type | notes |
| `sport_id` | NUMBER | PK |
| `name` | VARCHAR | Human-readable label. |
| `default_intensity_scale` | NUMBER | Helps normalize RPE for each sport (optional). |

### `sport_focus`
Used to fan out one sport into multiple focuses (e.g., Endurance Swim vs Sprint Swim) without duplicating the parent sport.

| column | type | notes |
| --- | --- | --- |
| `focus_id` | NUMBER | PK, identity. |
| `sport_id` | NUMBER | FK → `sports.sport_id`. |
| `name` | VARCHAR | Label shown in UI and reports. |

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
| `focus_id` | NUMBER | Optional FK → `sport_focus.focus_id` for focus-specific loads. |

### `activity_sessions`
| column | type | notes |
| --- | --- | --- |
| `activity_id` | NUMBER | PK |
| `user_id` | NUMBER | FK → `users`. |
| `week_id` | NUMBER | FK → `weeks`. |
| `session_date` | DATE | Exact calendar day. |
| `sport_id` | NUMBER | FK → `sports`. |
| `category` | VARCHAR | Optional session-level tag (e.g., Endurance, Technique). |
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
| `load_category` | VARCHAR | Optional pre-computed label (white/blue/green/yellow/orange/red). |

### Load Formula & ACWR Buckets

```
load_score = duration_minutes * base_load_per_minute * intensity_factor
```

Where:
- `duration_minutes` comes from `activity_sessions`.
- `base_load_per_minute` comes from `sport_muscle_loads`.
- `intensity_factor` is derived from RPE (e.g., map 1–10 to 0.6–1.4).

FastAPI consumes `daily_muscle_loads` to compute an Acute:Chronic Workload Ratio (ACWR) for every muscle when the `/muscle-load` endpoint is called:

- **Acute**: total load for the requested 7-day window.
- **Chronic**: total load across the prior 4 full weeks, averaged back down to a “per week” number.
- **ACWR**: `acute / chronic_avg` (when chronic is `0`, the service falls back to treating ACWR as `1.0` to avoid infinite spikes).

Each muscle is assigned to a tier that determines its sensitivity to spikes (`core`, `glutes`, `upper back`, etc. → Tier **A**; `quads`, `hamstrings`, etc. → Tier **B**; `chest`, `biceps`, etc. → Tier **C**). The tiers map ACWR into UI buckets:

| tier | blue | green | yellow | orange | red |
| --- | --- | --- | --- | --- | --- |
| **A** | `< 0.7` | `≤ 1.4` | `≤ 1.8` | `≤ 2.3` | `> 2.3` |
| **B** | `< 0.8` | `≤ 1.3` | `≤ 1.5` | `≤ 1.8` | `> 1.8` |
| **C** | `< 0.9` | `≤ 1.2` | `≤ 1.4` | `≤ 1.6` | `> 1.6` |

White is reserved for muscles without any recorded load for the week.

## Connectivity Checklist
1. Create a Snowflake role with access to the database, schema, warehouse, and tables above.
2. Grant `INSERT/SELECT/UPDATE` on `weeks` + `activity_sessions` so the API can upsert weeks and log sessions.
3. Grant `SELECT` on `daily_muscle_loads`, `sports`, and `muscle_groups`.
4. Copy `.env.example` → `.env` and populate the Snowflake variables.
5. Run `python -m scripts.check_snowflake` from the `backend` directory to confirm credentials.


## Daily Muscle Load Maintenance

- Recompute historical `daily_muscle_loads` rows with `python -m scripts.rebuild_daily_loads 2024-01-01 --end-date 2024-01-07`.
- The script deletes existing rows for the inclusive range and replays every `activity_session`, ensuring the Body Heat map (and downstream ACWR windows) reflect the latest sport focus configuration.



