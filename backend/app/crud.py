"""CRUD layer — all direct database operations live here, separate from routing."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas


def get_tasks(db: Session, session_id: str) -> list[models.Task]:
    stmt = (
        select(models.Task)
        .where(models.Task.session_id == session_id)
        .order_by(models.Task.id.desc())
    )
    return list(db.scalars(stmt).all())


def get_task(db: Session, task_id: int, session_id: str) -> models.Task | None:
    stmt = select(models.Task).where(
        models.Task.id == task_id, models.Task.session_id == session_id
    )
    return db.scalars(stmt).first()


def create_task(db: Session, payload: schemas.TaskCreate, session_id: str) -> models.Task:
    task = models.Task(**payload.model_dump(), session_id=session_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: models.Task, payload: schemas.TaskUpdate) -> models.Task:
    updates = payload.model_dump(exclude_unset=True)

    # Track completion time automatically — the client never sets this
    # directly, it's derived from the done/undone transition.
    if "done" in updates:
        if updates["done"] and not task.done:
            task.completed_at = datetime.now(timezone.utc)
        elif not updates["done"]:
            task.completed_at = None

    for field, value in updates.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: models.Task) -> None:
    db.delete(task)
    db.commit()
