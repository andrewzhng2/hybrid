# Hybrid

Hybrid is a personal training dashboard that lets multi-sport athletes log weekly sessions, see which muscles each sport is hitting, and spot imbalances through simple visual analytics. The plan resets every Monday, aggregates the history in Snowflake, and powers three focused views:

1. **Week Planner** – Mon–Sun grid for logging sport, duration, and RPE.
2. **Analytics** – Totals, RPE averages, and sport distribution per week.
3. **Body Map** – A heat map that shows how hard each muscle group worked.

## Stack

- **Backend:** FastAPI + Snowflake connector (Snowflake is the primary DB).
- **Frontend:** React + Vite + TypeScript using React Bits-inspired UI primitives ([reactbits.dev](https://reactbits.dev/get-started/index)).
- **Data Source:** Snowflake tables (`users`, `weeks`, `activity_sessions`, `daily_muscle_loads`, etc.).

## Project layout

```
.
├── backend/                # FastAPI application
│   ├── app/                # API, schemas, Snowflake service, settings
│   ├── db/SNOWFLAKE_SCHEMA.md
│   ├── requirements.txt
│   └── scripts/check_snowflake.py
├── frontend/               # React + Vite app using React Bits styling
│   ├── src/pages/          # Weekly grid, analytics, body heat map
│   └── vite.config.ts      # Proxy + path aliases
├── package.json            # Root scripts to run both servers
└── .env.example            # Snowflake + Vite env template
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- A Snowflake account with the tables described in `backend/db/SNOWFLAKE_SCHEMA.md`.

## Setup

1. **Clone and install backend deps**
   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Install frontend deps**
   ```bash
   cd ../frontend
   npm install
   ```
3. **Environment variables**
   ```bash
   cp .env.example .env
   # populate SNOWFLAKE_* and VITE_API_URL
   ```
4. **Verify Snowflake connectivity**
   ```bash
   cd backend
   python -m scripts.check_snowflake
   ```
5. **Run both servers**
   ```bash
   cd ..
   npm run dev
   ```
   This concurrently starts:
   - `uvicorn app.main:app --reload --port 8000`
   - `vite dev` on port 5173 (proxying `/api` → FastAPI)

You can also run each side individually with `npm run dev:backend` or `npm run dev:frontend`.

## Snowflake schema

- Full table descriptions plus the muscle-load formula live in `backend/db/SNOWFLAKE_SCHEMA.md`.
- FastAPI automatically upserts `weeks` rows when a new session is inserted.
- Derived `daily_muscle_loads` rows can be materialized via Snowflake Tasks or an offline job; the API only reads them.

## React Bits UI

React Bits is used as the visual language for the dashboard, so shared components (`Button`, `Card`, `Tabs`, etc.) live in `frontend/src/components/ui`. Colors, typography, and interactions are defined in `frontend/src/styles/react-bits.css`, closely following the guidance from [React Bits](https://reactbits.dev/get-started/index).

## Useful scripts

- `npm run dev` – Run FastAPI + Vite together.
- `npm run dev:backend` – FastAPI only.
- `npm run dev:frontend` – Vite dev server with proxy.
- `python -m scripts.check_snowflake` – Smoke test that Snowflake credentials are valid.

