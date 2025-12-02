"""Shared FastAPI dependencies."""
from functools import lru_cache

from app.db.session import get_snowflake_connection
from app.services.snowflake import SnowflakeService

DEFAULT_USER_ID = 1


@lru_cache(maxsize=1)
def get_snowflake_service() -> SnowflakeService:
    """Create a cached Snowflake service instance."""
    return SnowflakeService(
        connection_factory=get_snowflake_connection,
        default_user_id=DEFAULT_USER_ID,
    )



