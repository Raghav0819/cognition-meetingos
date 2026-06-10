from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from firebase_config import db
import uuid

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskValidation(BaseModel):
    validated: str
    edited_title: Optional[str] = None
    edited_assigned_to: Optional[str] = None
    edited_deadline: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str
    escalated_to: Optional[str] = None


@router.get("/")
def get_all_tasks(x_company_id: str = Header(default="")):
    if not x_company_id:
        return []
    tasks = db.collection('tasks').where('companyId', '==', x_company_id).stream()
    return [{'id': t.id, **t.to_dict()} for t in tasks]


@router.get("/user/{name}")
def get_tasks_for_user(name: str, x_company_id: str = Header(default="")):
    if not x_company_id:
        return []
    tasks = (db.collection('tasks')
               .where('companyId', '==', x_company_id)
               .where('assigned_to', '==', name)
               .stream())
    return [{'id': t.id, **t.to_dict()} for t in tasks]


@router.post("/{task_id}/validate")
def validate_task(task_id: str, data: TaskValidation):
    task_ref = db.collection('tasks').document(task_id)
    task_doc = task_ref.get()
    if not task_doc.exists:
        raise HTTPException(status_code=404, detail="Task not found")

    task = task_doc.to_dict()
    updates = {'validated': data.validated}
    if data.edited_title:
        updates['title'] = data.edited_title
    if data.edited_assigned_to:
        updates['assigned_to'] = data.edited_assigned_to
    if data.edited_deadline:
        updates['deadline'] = data.edited_deadline

    task_ref.update(updates)

    title = updates.get('title', task.get('title', ''))
    db.collection('meetings').document(task.get('meeting_id', '')).collection('logs').document(uuid.uuid4().hex[:8]).set({
        'agent': 'PM (Human)',
        'action': f"Task '{title}' {data.validated} by PM",
        'timestamp': datetime.utcnow()
    })

    return {'task_id': task_id, 'validated': data.validated, 'status': 'updated'}


@router.patch("/{task_id}/status")
def update_task_status(task_id: str, data: TaskStatusUpdate):
    task_ref = db.collection('tasks').document(task_id)
    task_doc = task_ref.get()
    if not task_doc.exists:
        raise HTTPException(status_code=404, detail="Task not found")

    task = task_doc.to_dict()
    updates = {'status': data.status}
    if data.escalated_to:
        updates['escalated_to'] = data.escalated_to

    task_ref.update(updates)

    db.collection('meetings').document(task.get('meeting_id', '')).collection('logs').document(uuid.uuid4().hex[:8]).set({
        'agent': 'System',
        'action': f"Task '{task.get('title', '')}' status changed to '{data.status}'",
        'timestamp': datetime.utcnow()
    })

    return {'task_id': task_id, 'status': data.status}
