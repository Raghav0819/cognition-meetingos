from crewai import Agent, LLM
from crew.tools import SaveLogTool, SaveTasksTool

save_log = SaveLogTool()
save_tasks = SaveTasksTool()

# Define Groq LLM once, reuse everywhere
groq_llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    temperature=0.3
)

groq_llm_small = LLM(
    model="groq/llama-3.1-8b-instant",  # much higher TPM limit
    temperature=0.3
)

def get_extraction_agent():
    return Agent(
        role="Meeting Extraction Specialist",
        goal="Extract all tasks, decisions, and risks from the meeting transcript with high accuracy",
        backstory="""You are an expert at analyzing meeting transcripts. 
        You identify every action item, decision made, and risk mentioned. 
        You never miss a task and always structure your output as clean JSON.""",
        tools=[save_log],
        llm=groq_llm,
        verbose=True,
        allow_delegation=False
    )

def get_assignment_agent():
    return Agent(
        role="Task Assignment Specialist",
        goal="Assign every task to the correct person based on the transcript and participant list",
        backstory="""You are an expert at matching tasks to people. 
        If a name is mentioned near a task, assign it to them directly. 
        If no name is mentioned, assign based on role (PM gets coordination tasks, 
        developers get technical tasks). Never leave a task unassigned.""",
        tools=[save_log],
        llm=groq_llm,
        verbose=True,
        allow_delegation=False
    )

def get_confidence_agent():
    return Agent(
        role="Task Confidence Scorer",
        goal="Score each task from 0-100 based on clarity, owner assignment, and deadline specificity",
        backstory="""You evaluate task quality. A task with a clear title, named owner, 
        and specific deadline scores 90-100. A task with a vague title and no deadline 
        scores below 40. You are strict but fair.""",
        tools=[save_log],
        llm=groq_llm,
        verbose=True,
        allow_delegation=False
    )

def get_validation_agent():
    return Agent(
        role="Task Validation Specialist",
        goal="Flag tasks with confidence below 50 and prepare a validation summary for the PM",
        backstory="""You are the quality gate before tasks reach employees. 
        You review all scored tasks and flag anything that needs PM attention.""",
        tools=[save_log],
        llm=groq_llm,
        verbose=True,
        allow_delegation=False
    )

def get_followup_agent():
    return Agent(
        role="Follow-up Coordinator",
        goal="Generate follow-up schedule and escalation rules for all approved tasks",
        backstory="""You ensure nothing falls through the cracks after a meeting. 
        You create follow-up timelines and assign escalation paths for delayed tasks.""",
        tools=[save_log],
        llm=groq_llm,
        verbose=True,
        allow_delegation=False
    )

def get_summary_agent():
    return Agent(
        role="Meeting Summary Specialist",
        goal="Generate a comprehensive, professional Minutes of Meeting (MoM) document from the transcript and extracted data",
        backstory="""You are an expert at writing clear, structured meeting summaries. 
        You distill long transcripts into concise, actionable Minutes of Meeting documents. 
        You always organize information into sections: executive summary, key decisions, 
        action items, risks, and next steps. Your summaries are professional and ready 
        to be shared with stakeholders. You write in a clear, direct style.""",
        tools=[save_log],
        llm=groq_llm,
        verbose=True,
        allow_delegation=False
    )


def get_audit_agent():
    return Agent(
        role="Audit Logger",
        goal="Create a complete audit trail and save all tasks to the database",
        backstory="""You are the final step in every meeting processing pipeline. 
        You save everything to the database. Auditability is your core value.""",
        tools=[save_log, save_tasks],
        llm=groq_llm,
        verbose=True,
        allow_delegation=False
    )