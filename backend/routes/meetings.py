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

class ChatMessage(BaseModel):
    message: str


def process_with_crew(meeting_id: str, transcript: str, participants: list):
    """Runs in background — calls CrewAI then updates DB with results"""
    import sys
    # Fix Windows encoding issue — CrewAI verbose output uses Unicode box-drawing chars
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    from crew.crew import run_meeting_crew
    from database import SessionLocal
    from models import Meeting

    result = run_meeting_crew(meeting_id, transcript, participants)

    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = result.get("status", "completed")
            meeting.mom = result.get("mom", result.get("validation_summary", ""))
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


def regenerate_summary_task(meeting_id: str):
    """Runs in background — uses only the Summary Agent to regenerate the MoM"""
    import sys
    # Fix Windows encoding issue — CrewAI verbose output uses Unicode box-drawing chars
    # that crash cp1252 encoding on Windows
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    from crew.agents import get_summary_agent
    from crewai import Crew, Process, Task
    from database import SessionLocal
    from models import Meeting, Log

    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return

        transcript = meeting.transcript
        participants = [
            {"name": p.name, "role": p.role}
            for p in meeting.participants
        ]
        participant_list = "\n".join([f"- {p['name']} ({p['role']})" for p in participants])

        # Get task data from existing tasks
        tasks_info = "\n".join([
            f"- {t.title} (assigned to: {t.assigned_to}, deadline: {t.deadline}, confidence: {t.confidence})"
            for t in meeting.tasks
        ])

        summary_agent = get_summary_agent()

        summarize = Task(
            description=f"""
            Generate a comprehensive Minutes of Meeting (MoM) document.

            ORIGINAL TRANSCRIPT:
            {transcript}

            PARTICIPANTS:
            {participant_list}

            EXTRACTED TASKS:
            {tasks_info}

            Create a well-structured MoM with exactly these 5 sections, using the exact section headers shown:

            ## Executive Summary
            Write 2-3 sentences summarizing what this meeting was about, who attended, and the overall outcome.

            ## Key Decisions
            List each important decision that was made during the meeting as a bullet point.
            If no explicit decisions were made, write "No formal decisions were recorded in this meeting."

            ## Action Items
            Create a table-like list of all tasks. For each task include:
            - Task name
            - Assigned to (person)
            - Deadline
            - Priority (based on context: High/Medium/Low)

            ## Risks & Concerns
            List any risks, blockers, or concerns raised during the meeting.
            If none, write "No risks were identified."

            ## Next Steps
            Write 2-4 bullet points about what happens after this meeting — follow-up meetings,
            review dates, escalation timelines, etc.

            IMPORTANT: Return ONLY the MoM text with the section headers as shown above.
            Do NOT wrap it in JSON. Do NOT add any extra formatting or metadata.
            Write it as clean, readable text that can be displayed directly to users.
            """,
            expected_output="A complete Minutes of Meeting document with Executive Summary, Key Decisions, Action Items, Risks & Concerns, and Next Steps sections",
            agent=summary_agent
        )

        crew = Crew(
            agents=[summary_agent],
            tasks=[summarize],
            process=Process.sequential,
            verbose=False
        )

        result = crew.kickoff()
        mom_text = str(result)

        meeting.mom = mom_text

        log = Log(
            meeting_id=meeting_id,
            agent="Summary Agent",
            action="MoM regenerated for existing meeting."
        )
        db.add(log)
        db.commit()
    except Exception as e:
        try:
            log = Log(
                meeting_id=meeting_id,
                agent="System",
                action=f"MoM regeneration failed: {str(e)}"
            )
            db.add(log)
            db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/{meeting_id}/regenerate-summary")
def regenerate_summary(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not meeting.transcript:
        raise HTTPException(status_code=400, detail="No transcript available to summarize")

    # Log the regeneration request
    log = Log(
        meeting_id=meeting_id,
        agent="System",
        action="MoM regeneration requested by user."
    )
    db.add(log)
    db.commit()

    background_tasks.add_task(regenerate_summary_task, meeting_id)

    return {
        "meeting_id": meeting_id,
        "status": "regenerating",
        "message": "Summary Agent is regenerating the MoM..."
    }


@router.post("/{meeting_id}/chat")
def chat_meeting(meeting_id: str, payload: ChatMessage, db: Session = Depends(get_db)):
    import os
    import json
    import urllib.request
    import urllib.error
    
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not meeting.transcript:
        raise HTTPException(status_code=400, detail="No transcript available to search")

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    prompt = f"""You are an AI assistant helping a user understand a meeting transcript.
Answer the user's question based ONLY on the transcript provided below.
If the answer cannot be found in the transcript, say "I cannot find the answer in the transcript."

TRANSCRIPT:
{meeting.transcript}
"""

    try:
        url = "https://api.groq.com/openai/v1/chat/completions"
        data = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": payload.message}
            ],
            "temperature": 0.3
        }
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"), 
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "MeetingOS-Backend/1.0"
            }
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
        answer = result["choices"][0]["message"]["content"]
        return {"response": answer}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        raise HTTPException(status_code=500, detail=f"Groq API Error: {error_body}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
