import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crewai.tools import BaseTool
from datetime import datetime
import json
import uuid


class SaveLogTool(BaseTool):
    name: str = "Save Agent Log"
    description: str = "Saves an agent action to the audit log in Firestore"

    def _run(self, meeting_id: str, agent_name: str, action: str) -> str:
        try:
            from firebase_config import db
            db.collection('meetings').document(meeting_id).collection('logs').document(uuid.uuid4().hex[:8]).set({
                'agent': agent_name,
                'action': action,
                'timestamp': datetime.utcnow()
            })
            return f"Logged: {action}"
        except Exception as e:
            return f"Log failed: {str(e)}"


class SaveTasksTool(BaseTool):
    name: str = "Save Tasks To Database"
    description: str = "Saves extracted and assigned tasks to Firestore"

    def _run(self, meeting_id: str, tasks_json: str) -> str:
        try:
            from firebase_config import db
            meeting_doc = db.collection('meetings').document(meeting_id).get()
            company_id  = meeting_doc.to_dict().get('companyId', '') if meeting_doc.exists else ''

            tasks = json.loads(tasks_json)
            for t in tasks:
                task_id = uuid.uuid4().hex[:8]
                db.collection('tasks').document(task_id).set({
                    'meeting_id':  meeting_id,
                    'companyId':   company_id,
                    'title':       t.get('title', 'Untitled Task'),
                    'description': t.get('description', ''),
                    'assigned_to': t.get('assigned_to', 'Unassigned').lower(),
                    'deadline':    t.get('deadline', 'TBD'),
                    'status':      'pending',
                    'confidence':  float(t.get('confidence', 50)),
                    'validated':   'pending',
                    'escalated_to': None
                })
            return f"Saved {len(tasks)} tasks to Firestore"
        except Exception as e:
            return f"Save failed: {str(e)}"
