"""Pydantic schemas — request/response validation, separate from the DB models."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    note: str = Field(default="", max_length=1000)
    category: str = Field(default="general", max_length=40)


class TaskCreate(TaskBase):
    """Payload for POST /api/tasks — done always starts as False."""
    pass


class TaskUpdate(BaseModel):
    """Payload for PATCH /api/tasks/{id} — every field optional (partial update)."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    note: Optional[str] = Field(default=None, max_length=1000)
    category: Optional[str] = Field(default=None, max_length=40)
    done: Optional[bool] = None


class TaskOut(TaskBase):
    """What the API returns — includes server-generated fields."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    done: bool
    created_at: datetime
