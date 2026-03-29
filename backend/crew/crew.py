from crewai import Crew, Process
from crew.tasks import get_crew_tasks
import json


def run_meeting_crew(meeting_id: str, transcript: str, participants: list) -> dict:
    """
    Main function called by FastAPI.
    Takes a transcript, runs all 6 agents, returns structured result.
    """
    try:
        tasks, agents = get_crew_tasks(meeting_id, transcript, participants)

        crew = Crew(
            agents=agents,
            tasks=tasks,
            process=Process.sequential,  # agents run one after another
            verbose=True
        )

        result = crew.kickoff()

        # Try to parse result as JSON
        try:
            result_str = str(result)
            # Find JSON in the output
            start = result_str.find("{")
            end = result_str.rfind("}") + 1
            if start != -1 and end > start:
                json_str = result_str[start:end]
                return json.loads(json_str)
        except:
            pass

        return {
            "meeting_id": meeting_id,
            "status": "completed",
            "raw_result": str(result),
            "message": "Crew completed but result parsing needs review"
        }

    except Exception as e:
        return {
            "meeting_id": meeting_id,
            "status": "failed",
            "error": str(e)
        }