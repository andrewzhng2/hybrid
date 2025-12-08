from __future__ import annotations

import argparse
from datetime import datetime, date

from app.dependencies import get_snowflake_service

DATE_FORMAT = "%Y-%m-%d"


def parse_date(value: str) -> date:
    try:
        return datetime.strptime(value, DATE_FORMAT).date()
    except ValueError as exc:  # pragma: no cover - CLI input handling
        raise argparse.ArgumentTypeError(
            f"Date '{value}' is invalid, expected YYYY-MM-DD."
        ) from exc


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rebuild Snowflake daily muscle loads over a date range.",
    )
    parser.add_argument("start_date", type=parse_date, help="Inclusive start date (YYYY-MM-DD).")
    parser.add_argument(
        "--end-date",
        type=parse_date,
        dest="end_date",
        help="Inclusive end date (YYYY-MM-DD). Defaults to start date when omitted.",
    )
    args = parser.parse_args()

    service = get_snowflake_service()
    count = service.rebuild_daily_muscle_loads(args.start_date, args.end_date)
    end_date = args.end_date or args.start_date

    print(
        f"Rebuilt daily muscle loads for {count} activities between "
        f"{args.start_date.isoformat()} and {end_date.isoformat()}."
    )


if __name__ == "__main__":
    main()
