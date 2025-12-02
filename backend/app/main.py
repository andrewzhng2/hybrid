"""FastAPI application entrypoint for Hybrid backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router


def create_app() -> FastAPI:
    """Application factory to enable future customization and testing."""
    app = FastAPI(title="Hybrid API", version="0.1.0")

    # Allow Vite dev server to talk to the API during local development.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()



