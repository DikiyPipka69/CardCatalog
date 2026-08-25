"""Application entry point."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import router as tasks_router

# Creates tasks.db and the tasks table on first run, if they don't exist yet.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Card Catalog API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes are registered first, so they take priority over static files.
app.include_router(tasks_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve the frontend (index.html, style.css, app.js) from the same server.
# backend/app/main.py -> parent (app) -> parent (backend) -> parent (project root) / frontend
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


# cd backend
# uvicorn app.main:app --reload