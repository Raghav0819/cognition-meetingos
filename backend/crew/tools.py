import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crewai.tools import BaseTool
from database import SessionLocal
from models import Log, Task
from datetime import datetime
import json


class SaveLogTool(BaseTool):
    name: str = "Save Agent Log"
    description: str = "Saves an agent action to the audit log in the database"

    def _run(self, meeting_id: str, agent_name: str, action: str) -> str:
        db = SessionLocal()
        try:
            log = Log(
                meeting_id=meeting_id,
                agent=agent_name,
                action=action,
                timestamp=datetime.utcnow()
            )
            db.add(log)
            db.commit()
            return f"Logged: {action}"
        except Exception as e:
            return f"Log failed: {str(e)}"
        finally:
            db.close()


class SaveTasksTool(BaseTool):
    name: str = "Save Tasks To Database"
    description: str = "Saves extracted and assigned tasks to the database"

    def _run(self, meeting_id: str, tasks_json: str) -> str:
        db = SessionLocal()
        try:
            tasks = json.loads(tasks_json)
            for t in tasks:
                task = Task(
                    meeting_id=meeting_id,
                    title=t.get("title", "Untitled Task"),
                    description=t.get("description", ""),
                    assigned_to=t.get("assigned_to", "Unassigned"),
                    deadline=t.get("deadline", "TBD"),
                    status="pending",
                    confidence=float(t.get("confidence", 50)),
                    validated="pending"
                )
                db.add(task)
            db.commit()
            return f"Saved {len(tasks)} tasks to database"
        except Exception as e:
            db.rollback()
            return f"Save failed: {str(e)}"
        finally:
            db.close()