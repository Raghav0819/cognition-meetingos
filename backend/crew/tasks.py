from crewai import Task
from crew.agents import (
    get_extraction_agent,
    get_assignment_agent,
    get_confidence_agent,
    get_validation_agent,
    get_followup_agent,
    get_audit_agent
)


def get_crew_tasks(meeting_id: str, transcript: str, participants: list):
    participant_names = ", ".join([p["name"] for p in participants])
    participant_list = "\n".join([f"- {p['name']} ({p['role']})" for p in participants])

    extraction_agent  = get_extraction_agent()
    assignment_agent  = get_assignment_agent()
    confidence_agent  = get_confidence_agent()
    validation_agent  = get_validation_agent()
    followup_agent    = get_followup_agent()
    audit_agent       = get_audit_agent()

    extract = Task(
        description=f"""
        Analyze this meeting transcript and extract ALL tasks, decisions, and risks.

        TRANSCRIPT:
        {transcript}

        PARTICIPANTS:
        {participant_list}

        Return a JSON array of tasks. Each task must have:
        - title: short clear task name
        - description: what needs to be done
        - mentioned_owner: person mentioned (or "unknown")
        - deadline_hint: any deadline mentioned (or "not specified")
        - type: "task", "decision", or "risk"

        Return ONLY the JSON array, nothing else.
        """,
        expected_output="A JSON array of extracted tasks with title, description, mentioned_owner, deadline_hint, type",
        agent=extraction_agent
    )

    assign = Task(
        description=f"""
        Take the extracted tasks from the previous step and assign each one to a participant.

        PARTICIPANTS:
        {participant_list}

        Rules:
        1. If a name from the participant list is mentioned near the task, assign to them
        2. If role is "pm", assign coordination/review tasks to them
        3. If role is "employee", assign technical/execution tasks to them
        4. Never leave assigned_to empty

        Add "assigned_to" field to each task.
        Return the complete updated JSON array.
        """,
        expected_output="JSON array with assigned_to field added to every task",
        agent=assignment_agent,
        context=[extract]
    )

    score = Task(
        description="""
        Score each task from 0 to 100 based on these rules:
        - Clear specific title: +25 points
        - Named owner (not "unknown"): +25 points  
        - Specific deadline (not "not specified"): +25 points
        - Clear description: +25 points

        Add "confidence" field (0-100 number) to each task.
        Return the complete updated JSON array.
        """,
        expected_output="JSON array with confidence score (0-100) added to every task",
        agent=confidence_agent,
        context=[assign]
    )

    validate = Task(
        description="""
        Review all scored tasks. Flag tasks with confidence below 50 as needing PM review.
        Add "needs_review": true/false to each task.
        
        Also write a short validation_summary string listing which tasks need attention and why.
        
        Return a JSON object with:
        - tasks: the full updated array
        - validation_summary: short text for the PM
        - flagged_count: number of tasks needing review
        """,
        expected_output="JSON object with tasks array, validation_summary, and flagged_count",
        agent=validation_agent,
        context=[score]
    )

    followup = Task(
        description="""
        For each task, create a follow-up plan.
        Add "followup_days" (when to follow up, in days from now) based on deadline.
        Add "escalate_to" field — if task owner doesn't respond, who gets notified (use PM name or "Manager").
        
        Return the complete tasks array with followup_days and escalate_to added.
        """,
        expected_output="JSON array with followup_days and escalate_to added to every task",
        agent=followup_agent,
        context=[validate]
    )

    audit = Task(
        description=f"""
        This is the final step. Take all tasks from the previous agents and:

        1. Format each task as a clean JSON object with these exact fields:
           - title
           - description  
           - assigned_to
           - deadline (use deadline_hint value)
           - confidence (number)
           - needs_review (true/false)
           - followup_days (number)
           - escalate_to (string)

        2. Use the SaveTasksTool to save all tasks with meeting_id: "{meeting_id}"

        3. Use the SaveLogTool to log: meeting_id="{meeting_id}", 
           agent_name="Audit Agent", 
           action="CrewAI completed processing. All tasks saved."

        4. Return a final JSON object:
           {{
             "meeting_id": "{meeting_id}",
             "total_tasks": <number>,
             "tasks": <array of all tasks>,
             "validation_summary": <summary from validation agent>,
             "status": "completed"
           }}
        """,
        expected_output="Final JSON with meeting_id, total_tasks, tasks array, validation_summary, status",
        agent=audit_agent,
        context=[followup]
    )

    return [extract, assign, score, validate, followup, audit], [
        extraction_agent, assignment_agent, confidence_agent,
        validation_agent, followup_agent, audit_agent
    ]