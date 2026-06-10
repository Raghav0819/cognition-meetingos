from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from firebase_config import db
from dateutil import parser as dparser
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


@router.post("/check-overdue")
def check_overdue(x_company_id: str = Header(default="")):
    if not x_company_id:
        return {"updated": 0}
    today = datetime.now(timezone.utc).date()
    pending = db.collection('tasks').where('companyId', '==', x_company_id).where('status', '==', 'pending').stream()
    updated = 0
    for snap in pending:
        deadline_str = snap.to_dict().get('deadline', '')
        if not deadline_str or deadline_str.upper() in ('TBD', 'N/A', 'NONE', ''):
            continue
        try:
            if dparser.parse(deadline_str, fuzzy=True).date() < today:
                db.collection('tasks').document(snap.id).update({'status': 'overdue'})
                updated += 1
        except Exception:
            pass
    return {"updated": updated}


@router.get("/user/{name}")
def get_tasks_for_user(name: str, x_company_id: str = Header(default="")):
    if not x_company_id:
        return []
    # Case-insensitive match — CrewAI may capitalize names differently than the user's profile
    name_lower = name.lower()
    tasks = db.collection('tasks').where('companyId', '==', x_company_id).stream()
    return [{'id': t.id, **t.to_dict()} for t in tasks
            if (t.to_dict().get('assigned_to') or '').lower() == name_lower]


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
