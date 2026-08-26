"""CRUD layer — all direct database operations live here, separate from routing."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas


def get_tasks(db: Session) -> list[models.Task]:
    stmt = select(models.Task).order_by(models.Task.id.desc())
    return list(db.scalars(stmt).all())


def get_task(db: Session, task_id: int) -> models.Task | None:
    return db.get(models.Task, task_id)


def create_task(db: Session, payload: schemas.TaskCreate) -> models.Task:
    task = models.Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: models.Task, payload: schemas.TaskUpdate) -> models.Task:
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: models.Task) -> None:
    db.delete(task)
    db.commit()
