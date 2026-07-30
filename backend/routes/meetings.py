from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from auth_middleware import get_current_company_id
from pydantic import BaseModel
from typing import List
from datetime import datetime
from firebase_config import db
import uuid

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


def _ts(dt):
    """Convert datetime/Firestore timestamp to ISO string safely."""
    if dt is None:
        return None
    return dt.isoformat() if hasattr(dt, 'isoformat') else str(dt)


def process_with_crew(meeting_id: str, transcript: str, participants: list):
    import sys
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    from crew.crew import run_meeting_crew
    from firebase_config import db as fdb

    result = run_meeting_crew(meeting_id, transcript, participants)
    fdb.collection('meetings').document(meeting_id).update({
        'status': result.get('status', 'completed'),
        'mom': result.get('mom', result.get('validation_summary', ''))
    })


@router.post("/upload-transcript")
def upload_transcript(
    data: TranscriptUpload,
    background_tasks: BackgroundTasks,
    company_id: str = Depends(get_current_company_id)
):
    meeting_id = uuid.uuid4().hex[:8]
    meeting_ref = db.collection('meetings').document(meeting_id)

    meeting_ref.set({
        'title': data.title,
        'department': data.department,
        'transcript': data.transcript,
        'mom': '',
        'status': 'processing',
        'date': datetime.utcnow(),
        'companyId': company_id,
    })

    participants_list = []
    for p in data.participants:
        meeting_ref.collection('participants').document(uuid.uuid4().hex[:8]).set({
            'name': p.name,
            'role': p.role,
            'department': p.department
        })
        participants_list.append({'name': p.name, 'role': p.role})

    meeting_ref.collection('logs').document(uuid.uuid4().hex[:8]).set({
        'agent': 'System',
        'action': f"Meeting '{data.title}' uploaded. CrewAI processing started.",
        'timestamp': datetime.utcnow()
    })

    background_tasks.add_task(process_with_crew, meeting_id, data.transcript, participants_list)

    return {
        'meeting_id': meeting_id,
        'status': 'processing',
        'message': 'Transcript received. CrewAI agents are now working...',
        'participants': len(data.participants)
    }


@router.get("/")
def get_all_meetings(company_id: str = Depends(get_current_company_id)):
    if not company_id:
        return []
    docs = list(db.collection('meetings').where('companyId', '==', company_id).stream())
    docs.sort(key=lambda d: d.to_dict().get('date') or datetime.min, reverse=True)
    result = []
    for doc in docs:
        m = doc.to_dict()
        task_count = len(list(db.collection('tasks').where('meeting_id', '==', doc.id).stream()))
        result.append({
            'id': doc.id,
            'title': m.get('title', ''),
            'department': m.get('department', ''),
            'date': _ts(m.get('date')),
            'status': m.get('status', ''),
            'task_count': task_count
        })
    return result


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str, company_id: str = Depends(get_current_company_id)):
    doc = db.collection('meetings').document(meeting_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Meeting not found")

    m = doc.to_dict()
    if m.get('companyId') != company_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    meeting_ref = db.collection('meetings').document(meeting_id)

    participants = [p.to_dict() for p in meeting_ref.collection('participants').stream()]
    tasks_raw = db.collection('tasks').where('meeting_id', '==', meeting_id).stream()
    tasks = [{'id': t.id, **t.to_dict()} for t in tasks_raw]
    logs_raw = meeting_ref.collection('logs').order_by('timestamp').stream()
    logs = [{'agent': l.to_dict().get('agent'), 'action': l.to_dict().get('action'), 'timestamp': _ts(l.to_dict().get('timestamp'))} for l in logs_raw]

    return {
        'id': meeting_id,
        'title': m.get('title'),
        'department': m.get('department'),
        'date': _ts(m.get('date')),
        'status': m.get('status'),
        'transcript': m.get('transcript'),
        'mom': m.get('mom'),
        'participants': [{'name': p.get('name'), 'role': p.get('role')} for p in participants],
        'tasks': tasks,
        'logs': logs
    }


@router.get("/{meeting_id}/logs")
def get_meeting_logs(meeting_id: str, company_id: str = Depends(get_current_company_id)):
    doc = db.collection('meetings').document(meeting_id).get()
    if not doc.exists or doc.to_dict().get('companyId') != company_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    logs = db.collection('meetings').document(meeting_id).collection('logs').order_by('timestamp').stream()
    return [
        {'agent': l.to_dict().get('agent'), 'action': l.to_dict().get('action'), 'timestamp': _ts(l.to_dict().get('timestamp'))}
        for l in logs
    ]


def regenerate_summary_task(meeting_id: str):
    import sys
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    from crew.agents import get_summary_agent
    from crewai import Crew, Process, Task
    from firebase_config import db as fdb

    try:
        doc = fdb.collection('meetings').document(meeting_id).get()
        if not doc.exists:
            return

        m = doc.to_dict()
        transcript = m.get('transcript', '')
        meeting_ref = fdb.collection('meetings').document(meeting_id)

        participants = [p.to_dict() for p in meeting_ref.collection('participants').stream()]
        tasks_docs = [t.to_dict() for t in fdb.collection('tasks').where('meeting_id', '==', meeting_id).stream()]

        participant_list = "\n".join([f"- {p.get('name')} ({p.get('role')})" for p in participants])
        tasks_info = "\n".join([
            f"- {t.get('title')} (assigned to: {t.get('assigned_to')}, deadline: {t.get('deadline')}, confidence: {t.get('confidence')})"
            for t in tasks_docs
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

            Create a well-structured MoM with exactly these 5 sections:

            ## Executive Summary
            ## Key Decisions
            ## Action Items
            ## Risks & Concerns
            ## Next Steps

            Return ONLY the MoM text. Do NOT wrap it in JSON.
            """,
            expected_output="A complete Minutes of Meeting document with 5 sections",
            agent=summary_agent
        )

        crew = Crew(agents=[summary_agent], tasks=[summarize], process=Process.sequential, verbose=False)
        mom_text = str(crew.kickoff())

        meeting_ref.update({'mom': mom_text})
        meeting_ref.collection('logs').document(uuid.uuid4().hex[:8]).set({
            'agent': 'Summary Agent',
            'action': 'MoM regenerated for existing meeting.',
            'timestamp': datetime.utcnow()
        })
    except Exception as e:
        try:
            fdb.collection('meetings').document(meeting_id).collection('logs').document(uuid.uuid4().hex[:8]).set({
                'agent': 'System',
                'action': f'MoM regeneration failed: {str(e)}',
                'timestamp': datetime.utcnow()
            })
        except Exception:
            pass


@router.post("/{meeting_id}/regenerate-summary")
def regenerate_summary(meeting_id: str, background_tasks: BackgroundTasks, company_id: str = Depends(get_current_company_id)):
    doc = db.collection('meetings').document(meeting_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if doc.to_dict().get('companyId') != company_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not doc.to_dict().get('transcript'):
        raise HTTPException(status_code=400, detail="No transcript available to summarize")

    db.collection('meetings').document(meeting_id).collection('logs').document(uuid.uuid4().hex[:8]).set({
        'agent': 'System',
        'action': 'MoM regeneration requested by user.',
        'timestamp': datetime.utcnow()
    })

    background_tasks.add_task(regenerate_summary_task, meeting_id)
    return {'meeting_id': meeting_id, 'status': 'regenerating', 'message': 'Summary Agent is regenerating the MoM...'}


@router.post("/{meeting_id}/chat")
def chat_meeting(meeting_id: str, payload: ChatMessage, company_id: str = Depends(get_current_company_id)):
    import os, json, urllib.request, urllib.error

    doc = db.collection('meetings').document(meeting_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if doc.to_dict().get('companyId') != company_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    transcript = doc.to_dict().get('transcript', '')
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available")

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    prompt = f"""You are an AI assistant helping a user understand a meeting transcript.
Answer the user's question based ONLY on the transcript provided below.
If the answer cannot be found in the transcript, say "I cannot find the answer in the transcript."

TRANSCRIPT:
{transcript}
"""

    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps({
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": payload.message}
                ],
                "temperature": 0.3
            }).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "MeetingOS-Backend/1.0"
            }
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
        return {"response": result["choices"][0]["message"]["content"]}
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Groq API Error: {e.read().decode('utf-8')}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
