from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Task, Log
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/tasks", tags=["tasks"])

# --- Request schemas ---

class TaskValidation(BaseModel):
    validated: str          # "approved" or "rejected"
    edited_title: Optional[str] = None
    edited_assigned_to: Optional[str] = None
    edited_deadline: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str             # "pending", "done", "overdue", "escalated"
    escalated_to: Optional[str] = None

# --- Endpoints ---

@router.get("/")
def get_all_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    return [
        {
            "id": t.id,
            "meeting_id": t.meeting_id,
            "title": t.title,
            "assigned_to": t.assigned_to,
            "deadline": t.deadline,
            "status": t.status,
            "confidence": t.confidence,
            "validated": t.validated,
            "escalated_to": t.escalated_to
        }
        for t in tasks
    ]


@router.get("/user/{name}")
def get_tasks_for_user(name: str, db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.assigned_to == name).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "meeting_id": t.meeting_id,
            "deadline": t.deadline,
            "status": t.status,
            "confidence": t.confidence,
            "validated": t.validated
        }
        for t in tasks
    ]


@router.post("/{task_id}/validate")
def validate_task(task_id: str, data: TaskValidation, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.validated = data.validated
    if data.edited_title:
        task.title = data.edited_title
    if data.edited_assigned_to:
        task.assigned_to = data.edited_assigned_to
    if data.edited_deadline:
        task.deadline = data.edited_deadline

    # Log the PM's action
    log = Log(
        meeting_id=task.meeting_id,
        agent="PM (Human)",
        action=f"Task '{task.title}' {data.validated} by PM"
    )
    db.add(log)
    db.commit()

    return {"task_id": task_id, "validated": data.validated, "status": "updated"}


@router.patch("/{task_id}/status")
def update_task_status(task_id: str, data: TaskStatusUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = data.status
    if data.escalated_to:
        task.escalated_to = data.escalated_to

    log = Log(
        meeting_id=task.meeting_id,
        agent="System",
        action=f"Task '{task.title}' status changed to '{data.status}'"
    )
    db.add(log)
    db.commit()

    return {"task_id": task_id, "status": data.status}