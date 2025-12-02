"""Connection helpers for Snowflake."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from dotenv import load_dotenv
import snowflake.connector

load_dotenv()


@dataclass(frozen=True)
class SnowflakeConfig:
    account: str
    user: str
    password: str
    warehouse: str
    database: str
    schema: str
    role: str | None = None


def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Environment variable {name} is required for Snowflake connectivity.")
    return value


@lru_cache(maxsize=1)
def get_snowflake_config() -> SnowflakeConfig:
    """Read Snowflake credentials from environment once."""
    return SnowflakeConfig(
        account=_require("SNOWFLAKE_ACCOUNT"),
        user=_require("SNOWFLAKE_USER"),
        password=_require("SNOWFLAKE_PASSWORD"),
        warehouse=_require("SNOWFLAKE_WAREHOUSE"),
        database=_require("SNOWFLAKE_DATABASE"),
        schema=_require("SNOWFLAKE_SCHEMA"),
        role=os.getenv("SNOWFLAKE_ROLE"),
    )


def get_snowflake_connection() -> Any:
    """Create a new Snowflake connector connection."""
    config = get_snowflake_config()
    return snowflake.connector.connect(
        account=config.account,
        user=config.user,
        password=config.password,
        warehouse=config.warehouse,
        database=config.database,
        schema=config.schema,
        role=config.role,
    )


