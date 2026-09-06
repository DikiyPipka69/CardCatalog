"""API routes for tasks — thin layer that delegates to crud.py."""

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def get_session_id(x_session_id: str = Header(..., alias="X-Session-Id")) -> str:
    """Every request must carry an anonymous per-browser session id.

    This is NOT real authentication — it's a lightweight way to keep each
    visitor's demo data separate without requiring accounts or passwords.
    """
    return x_session_id


@router.get("", response_model=list[schemas.TaskOut])
def list_tasks(db: Session = Depends(get_db), session_id: str = Depends(get_session_id)):
    return crud.get_tasks(db, session_id)


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    session_id: str = Depends(get_session_id),
):
    return crud.create_task(db, payload, session_id)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    payload: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    session_id: str = Depends(get_session_id),
):
    task = crud.get_task(db, task_id, session_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return crud.update_task(db, task, payload)


@router.delete("/{task_id}", status_code=204, response_model=None)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    session_id: str = Depends(get_session_id),
):
    task = crud.get_task(db, task_id, session_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    crud.delete_task(db, task)
