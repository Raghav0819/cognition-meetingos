from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Meeting, Participant, Task, Log
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter(prefix="/meetings", tags=["meetings"])

class ParticipantInput(BaseModel):
    name: str
    role: str = "employee"
    department: str = "General"

class TranscriptUpload(BaseModel):
    title: str = "Untitled Meeting"
    department: str = "General"
    participants: List[ParticipantInput]
    transcript: str


def process_with_crew(meeting_id: str, transcript: str, participants: list):
    """Runs in background — calls CrewAI then updates DB with results"""
    from crew.crew import run_meeting_crew
    from database import SessionLocal
    from models import Meeting

    result = run_meeting_crew(meeting_id, transcript, participants)

    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = result.get("status", "completed")
            meeting.mom = result.get("validation_summary", "")
            db.commit()
    finally:
        db.close()


@router.post("/upload-transcript")
def upload_transcript(
    data: TranscriptUpload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # 1. Save meeting
    meeting = Meeting(
        title=data.title,
        department=data.department,
        transcript=data.transcript,
        status="processing"
    )
    db.add(meeting)
    db.flush()

    # 2. Save participants
    participants_list = []
    for p in data.participants:
        participant = Participant(
            meeting_id=meeting.id,
            name=p.name,
            role=p.role,
            department=p.department
        )
        db.add(participant)
        participants_list.append({"name": p.name, "role": p.role})

    # 3. Log upload
    log = Log(
        meeting_id=meeting.id,
        agent="System",
        action=f"Meeting '{data.title}' uploaded. CrewAI processing started."
    )
    db.add(log)
    db.commit()
    db.refresh(meeting)

    # 4. Run CrewAI in background (so API returns immediately)
    background_tasks.add_task(
        process_with_crew,
        meeting.id,
        data.transcript,
        participants_list
    )

    return {
        "meeting_id": meeting.id,
        "status": "processing",
        "message": "Transcript received. CrewAI agents are now working...",
        "participants": len(data.participants)
    }


@router.get("/")
def get_all_meetings(db: Session = Depends(get_db)):
    meetings = db.query(Meeting).order_by(Meeting.date.desc()).all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "department": m.department,
            "date": m.date,
            "status": m.status,
            "task_count": len(m.tasks)
        }
        for m in meetings
    ]


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    return {
        "id": meeting.id,
        "title": meeting.title,
        "department": meeting.department,
        "date": meeting.date,
        "status": meeting.status,
        "transcript": meeting.transcript,
        "mom": meeting.mom,
        "participants": [
            {"name": p.name, "role": p.role}
            for p in meeting.participants
        ],
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "assigned_to": t.assigned_to,
                "deadline": t.deadline,
                "status": t.status,
                "confidence": t.confidence,
                "validated": t.validated
            }
            for t in meeting.tasks
        ],
        "logs": [
            {"agent": l.agent, "action": l.action, "timestamp": l.timestamp}
            for l in meeting.logs
        ]
    }


@router.get("/{meeting_id}/logs")
def get_meeting_logs(meeting_id: str, db: Session = Depends(get_db)):
    logs = db.query(Log).filter(
        Log.meeting_id == meeting_id
    ).order_by(Log.timestamp).all()
    return [
        {"agent": l.agent, "action": l.action, "timestamp": l.timestamp}
        for l in logs
    ]