"""Custom exceptions raised by service layer."""


class SnowflakeServiceError(RuntimeError):
    """Raised when a Snowflake operation fails."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code



