# Cognition MeetingOS — Complete Project Context

> **One-line pitch**: "We built an AI system that turns meetings into accountable execution — automatically."

---

## 1. Project Description

**Cognition MeetingOS** is a full-stack AI-powered meeting management platform that captures Google Meet transcripts (via a Chrome Extension) and processes them through a **multi-agent AI pipeline** (CrewAI + Groq) to automatically:

- Extract tasks, decisions, and risks from meeting transcripts
- Assign tasks to the correct people
- Score each task's confidence (0–100) based on clarity
- Flag low-confidence tasks for PM review
- Create follow-up schedules and escalation paths
- Generate structured Minutes of Meeting (MoM) documents
- Save a full audit trail of every AI action
- Provide role-based dashboards (PM, Employee, Manager) to manage tasks
- Allow users to chat with their meeting transcript via an AI Q&A sidebar

---

## 2. Architecture Overview

```
Google Meet → Chrome Extension (Manifest V3) → FastAPI Backend → CrewAI Multi-Agent System → SQLite DB → React Dashboard
```

The system has **3 main components**:

| Component | Tech | Purpose |
|-----------|------|---------|
| **Chrome Extension** | Manifest V3, JavaScript | Captures Google Meet captions/transcripts and sends them to the backend |
| **Backend** | Python, FastAPI, CrewAI, Groq (LLaMA 3.3 70B) | Receives transcripts, runs a 7-agent AI pipeline, stores results in SQLite |
| **Frontend** | React 19, Vite 8, Tailwind CSS 4 | Role-based dashboards for PMs, employees, and managers |

---

## 3. Tech Stack (Detailed)

### Backend
- **Language**: Python
- **Framework**: FastAPI (v0.135.2)
- **ORM**: SQLAlchemy (v2.0.48)
- **Database**: SQLite (`meetingos.db`) — file-based, zero-config
- **Server**: Uvicorn (v0.42.0)
- **Environment**: python-dotenv for `.env` management

### AI / Multi-Agent System
- **Framework**: CrewAI (v1.12.2) + crewai-tools (v1.12.2)
- **LLM Provider**: Groq API (via LiteLLM)
- **Primary Model**: `groq/llama-3.3-70b-versatile` (temperature: 0.3)
- **Secondary Model**: `groq/llama-3.1-8b-instant` (defined but used for higher TPM limits)
- **Agent Execution**: Sequential process (agents run one after another)

### Frontend
- **Framework**: React 19.2.4
- **Build Tool**: Vite 8.0.1
- **Styling**: Tailwind CSS 4.2.2 (via `@tailwindcss/vite` plugin)
- **Routing**: React Router DOM 7.13.2
- **HTTP Client**: Axios 1.14.0

### Chrome Extension
- **Manifest Version**: 3 (latest Chrome standard)
- **Permissions**: `activeTab`, `storage`, `scripting`
- **Host Permissions**: `https://meet.google.com/*`, `http://localhost:8000/*`

---

## 4. Project File Structure

```
cognition-meetingos/
├── README.md
├── .gitignore
├── Project 3 Final Report (1).pdf        # Academic/project report (PDF)
├── screenshots/                           # UI screenshots
│   ├── PM-Dashboard.png
│   ├── employee-dashboard.png
│   ├── extension.png
│   ├── manager-dashboard.png
│   └── meeting-detail.png
│
├── backend/                               # Python FastAPI backend
│   ├── .env                               # Environment variables (API keys, DB URL)
│   ├── main.py                            # FastAPI app entry point
│   ├── database.py                        # SQLAlchemy engine & session setup
│   ├── models.py                          # Database models (Meeting, Participant, Task, Log)
│   ├── requirements.txt                   # Python dependencies (pip freeze)
│   ├── meetingos.db                       # SQLite database file
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── meetings.py                    # Meeting CRUD + transcript upload + chat + summary regeneration
│   │   └── tasks.py                       # Task CRUD + validation + status updates
│   └── crew/
│       ├── __init__.py
│       ├── agents.py                      # 7 CrewAI agent definitions
│       ├── tasks.py                       # 7 CrewAI task definitions with prompts
│       ├── crew.py                        # Crew orchestration (run_meeting_crew function)
│       └── tools.py                       # Custom CrewAI tools (SaveLogTool, SaveTasksTool)
│
├── frontend/                              # React + Vite frontend
│   ├── index.html                         # HTML entry point
│   ├── package.json                       # NPM dependencies
│   ├── vite.config.js                     # Vite + React + Tailwind plugin config
│   └── src/
│       ├── main.jsx                       # React DOM render entry
│       ├── App.jsx                        # React Router setup (5 routes)
│       ├── App.css                        # Vite boilerplate CSS (mostly unused)
│       ├── index.css                      # Tailwind CSS import
│       ├── api.js                         # Axios API client (all backend calls)
│       ├── components/
│       │   ├── Navbar.jsx                 # Top navigation bar with user info + logout
│       │   └── TaskCard.jsx               # Reusable task card with validation + status controls
│       └── pages/
│           ├── Login.jsx                  # Role-based login (no auth, localStorage)
│           ├── PMDashboard.jsx            # PM view: all meetings + transcript upload
│           ├── EmployeeDashboard.jsx      # Employee view: personal tasks + status updates
│           ├── ManagerDashboard.jsx        # Manager view: team breakdown + escalations
│           └── MeetingDetail.jsx          # Full meeting view: tasks, summary, transcript, logs, chat
│
└── extension/                             # Chrome Extension (Manifest V3)
    ├── manifest.json                      # Extension manifest
    ├── content.js                         # Content script — captures Google Meet captions
    ├── popup.html                         # Extension popup UI
    └── popup.js                           # Popup logic — recording controls + send to backend
```

---

## 5. Database Schema

The backend uses **SQLite** with **4 tables** managed by SQLAlchemy ORM:

### `meetings` table
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | String (PK) | UUID[:8] | Short unique ID |
| `title` | String | "Untitled Meeting" | Meeting name |
| `department` | String | "General" | Department/team |
| `date` | DateTime | `utcnow()` | Meeting timestamp |
| `transcript` | Text | — | Full meeting transcript |
| `mom` | Text | — | AI-generated Minutes of Meeting |
| `status` | String | "processing" | `processing` / `completed` / `failed` |

**Relationships**: `participants` (1:M), `tasks` (1:M), `logs` (1:M)

### `participants` table
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | String (PK) | UUID[:8] | Short unique ID |
| `meeting_id` | String (FK → meetings.id) | — | Parent meeting |
| `name` | String | — | Participant name |
| `role` | String | "employee" | `pm` / `employee` / `manager` |
| `department` | String | "General" | Department |

### `tasks` table
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | String (PK) | UUID[:8] | Short unique ID |
| `meeting_id` | String (FK → meetings.id) | — | Parent meeting |
| `title` | String | — | Task name |
| `description` | Text | — | What needs to be done |
| `assigned_to` | String | — | Person responsible |
| `deadline` | String | — | Deadline string |
| `status` | String | "pending" | `pending` / `done` / `overdue` / `escalated` |
| `confidence` | Float | 0.0 | AI confidence score (0–100) |
| `validated` | String | "pending" | `pending` / `approved` / `rejected` |
| `escalated_to` | String (nullable) | — | Escalation target |

### `logs` table (Audit Trail)
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | String (PK) | UUID[:8] | Short unique ID |
| `meeting_id` | String (FK → meetings.id) | — | Parent meeting |
| `agent` | String | — | Which agent/system logged this |
| `action` | Text | — | Description of what happened |
| `timestamp` | DateTime | `utcnow()` | When it happened |

---

## 6. Multi-Agent AI Pipeline (CrewAI)

The system uses **7 sequential agents**, each with a specific role. They run in order using `Process.sequential`:

```
Transcript → [1] Extraction → [2] Assignment → [3] Confidence → [4] Validation → [5] Follow-up → [6] Summary → [7] Audit → DB
```

### Agent 1: Extraction Agent
- **Role**: Meeting Extraction Specialist
- **Input**: Raw transcript + participant list
- **Output**: JSON array of tasks with fields: `title`, `description`, `mentioned_owner`, `deadline_hint`, `type` (task/decision/risk)

### Agent 2: Assignment Agent
- **Role**: Task Assignment Specialist
- **Input**: Extracted tasks + participant list
- **Output**: Same JSON array with `assigned_to` field added
- **Rules**: Matches names from transcript; PMs get coordination tasks; developers get technical tasks

### Agent 3: Confidence Agent
- **Role**: Task Confidence Scorer
- **Input**: Assigned tasks
- **Output**: Same JSON array with `confidence` field (0–100)
- **Scoring**: Clear title (+25), Named owner (+25), Specific deadline (+25), Clear description (+25)

### Agent 4: Validation Agent
- **Role**: Task Validation Specialist
- **Input**: Scored tasks
- **Output**: JSON object with `tasks` (array with `needs_review` boolean), `validation_summary`, `flagged_count`
- **Rule**: Tasks with confidence < 50 get flagged for PM review

### Agent 5: Follow-up Agent
- **Role**: Follow-up Coordinator
- **Input**: Validated tasks
- **Output**: Same JSON array with `followup_days` and `escalate_to` fields added

### Agent 6: Summary Agent
- **Role**: Meeting Summary Specialist
- **Input**: Original transcript + participant list + all processed task data
- **Output**: Structured Minutes of Meeting (MoM) document with 5 sections:
  1. Executive Summary
  2. Key Decisions
  3. Action Items
  4. Risks & Concerns
  5. Next Steps

### Agent 7: Audit Agent
- **Role**: Audit Logger
- **Input**: All processed data from previous agents + MoM
- **Tools**: `SaveTasksTool` (saves tasks to DB), `SaveLogTool` (saves audit log entry)
- **Output**: Final JSON with `meeting_id`, `total_tasks`, `tasks` array, `validation_summary`, `mom`, `status`
- **Action**: Saves all tasks to the database and logs the completion event

### Custom CrewAI Tools

**`SaveLogTool`**: Saves an audit log entry to the `logs` table.
- Parameters: `meeting_id`, `agent_name`, `action`

**`SaveTasksTool`**: Parses JSON tasks and saves each to the `tasks` table.
- Parameters: `meeting_id`, `tasks_json` (JSON string)

---

## 7. API Endpoints

Base URL: `http://localhost:8000`

### Root
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check — returns app name & status |
| GET | `/health` | Simple health check |

### Meetings (`/meetings`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/meetings/upload-transcript` | Upload a transcript + participants → triggers CrewAI in background |
| GET | `/meetings/` | List all meetings (id, title, department, date, status, task_count) |
| GET | `/meetings/{meeting_id}` | Full meeting detail (transcript, MoM, participants, tasks, logs) |
| GET | `/meetings/{meeting_id}/logs` | Get audit logs for a meeting |
| POST | `/meetings/{meeting_id}/regenerate-summary` | Re-run only the Summary Agent to regenerate MoM |
| POST | `/meetings/{meeting_id}/chat` | Chat with meeting transcript using Groq LLM |

#### Upload Transcript Request Body:
```json
{
  "title": "Sprint Planning Q2",
  "department": "IT",
  "participants": [
    { "name": "Rahul", "role": "employee", "department": "General" },
    { "name": "Priya", "role": "pm", "department": "General" }
  ],
  "transcript": "Rahul: I will complete the API by Monday\nPriya: Let's review on Wednesday..."
}
```

#### Chat Request Body:
```json
{
  "message": "What tasks were assigned to Rahul?"
}
```

The chat endpoint makes a direct HTTP call to the Groq API (`https://api.groq.com/openai/v1/chat/completions`) using `urllib.request` (not the CrewAI pipeline). It sends the transcript as system context and the user's question as user message.

### Tasks (`/tasks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks/` | List all tasks across all meetings |
| GET | `/tasks/user/{name}` | Get tasks assigned to a specific person |
| POST | `/tasks/{task_id}/validate` | PM validates a task (approve/reject, optionally edit title/assignee/deadline) |
| PATCH | `/tasks/{task_id}/status` | Update task status (pending/done/overdue/escalated) |

#### Validate Task Request Body:
```json
{
  "validated": "approved",
  "edited_title": "Optional new title",
  "edited_assigned_to": "Optional new assignee",
  "edited_deadline": "Optional new deadline"
}
```

#### Update Status Request Body:
```json
{
  "status": "done",
  "escalated_to": "Optional manager name"
}
```

---

## 8. Frontend — Pages & Routing

The frontend is a React SPA with **5 routes**:

| Route | Page | Component | Description |
|-------|------|-----------|-------------|
| `/` | Login | `Login.jsx` | Role-based login (no real auth) |
| `/pm` | PM Dashboard | `PMDashboard.jsx` | All meetings + transcript upload form |
| `/employee` | Employee Dashboard | `EmployeeDashboard.jsx` | Personal tasks + status updates |
| `/manager` | Manager Dashboard | `ManagerDashboard.jsx` | Team overview + escalations |
| `/meeting/:id` | Meeting Detail | `MeetingDetail.jsx` | Full meeting view with tabs |
| `*` | Catch-all | Redirects to `/` | — |

### Login Page (`/`)
- **No real authentication** — simulated role selection
- 4 hardcoded users: Priya (PM), Rahul (Employee), Amit (Employee), Manager
- Saves selected user to `localStorage` as JSON
- Redirects to role-appropriate dashboard

### PM Dashboard (`/pm`)
- Lists all meetings as cards (title, department, date, status, task count)
- Clicking a meeting navigates to `/meeting/:id`
- **"Upload Transcript" button** opens an inline form with:
  - Meeting title
  - Department
  - Participants (comma-separated, format: `Name:role`)
  - Transcript textarea
  - "Process with CrewAI" submit button
- After upload, polls meetings after 2 seconds

### Employee Dashboard (`/employee`)
- Shows tasks assigned to the logged-in user
- Summary stats: Pending count, Done count, Overdue/Escalated count
- Each task rendered as a `TaskCard` with a status dropdown (pending/done/overdue/escalated)

### Manager Dashboard (`/manager`)
- Overview stats: Total Tasks, Completed, Delayed, Delay Rate %
- **Escalation banner**: Orange alert if any tasks are escalated
- **Team Breakdown**: Groups tasks by assignee, shows per-person stats (total/done/delayed)
- **Recent Meetings**: Lists last 5 meetings with status

### Meeting Detail (`/meeting/:id`)
- **Header**: Meeting title, department badge, status badge, participant names, date
- **Efficiency Score**: Circular progress showing average task confidence
- **MoM Banner**: Purple banner linking to Summary tab (if MoM exists)
- **4 Tabs**:
  1. **Tasks**: Stat bar (total/pending/done/flagged) + task cards with Approve/Reject buttons
  2. **Summary (📄)**: Parsed MoM with 5 color-coded sections (Executive Summary, Key Decisions, Action Items, Risks & Concerns, Next Steps) — with copy button and regenerate button if MoM is missing
  3. **Transcript**: Raw transcript text
  4. **Logs**: Agent audit trail with color-coded timeline (each agent has a unique color)
- **"Ask Your Meeting" Chat Sidebar**: Slide-in panel (right side, 400px) for AI Q&A about the meeting transcript. Uses the `/meetings/{id}/chat` endpoint.

### Shared Components
- **`Navbar.jsx`**: Top bar with "Cognition MeetingOS" branding, current page title, user name/role badge, logout button
- **`TaskCard.jsx`**: Reusable card showing task title, status badge, description, assigned_to, deadline, confidence %, validated status, escalation info. Supports:
  - Validation buttons (Approve/Reject) — for PM view
  - Status dropdown — for Employee view

---

## 9. Chrome Extension Flow

### Content Script (`content.js`)
Injected on `https://meet.google.com/*`. Uses a **MutationObserver** with 1500ms debounce to capture Google Meet's live captions.

**Caption selectors tried** (multiple fallbacks):
- `[jsname="tgaKEf"]`, `[class*="CNusmb"]`, `[data-message-text]`, `.iOzk7`, `[jsname="YSxPC"]`, `[class*="caption-text"]`, `[class*="transcript"]`

**Name selectors** (for participant detection):
- `[data-self-name]`, `[jsname="oxlgce"]`, `[class*="zWGUib"]`, etc.

**Smart deduplication**: If a new caption text starts with the previous line's text, it replaces the old entry (handles word-by-word buildup).

**Message handlers**:
- `START_RECORDING`: Resets state, starts MutationObserver
- `STOP_RECORDING`: Stops observer, captures final text
- `INJECT_TRANSCRIPT`: Manually load transcript text (parses `Speaker: text` format)
- `GET_DATA`: Returns formatted transcript + participant list
- `GET_STATUS`: Returns recording state + line count + participants

### Popup (`popup.html` + `popup.js`)
Dark-themed popup (340px wide) with:
- Status indicator (green dot when recording)
- Stats grid: Lines captured, Participants detected
- Meeting Title + Department input fields
- **Start Recording** / **Stop Recording** buttons
- **Send to AI Agents** button → POSTs to `http://localhost:8000/meetings/upload-transcript`
- **Manual transcript input** (toggle) — for pasting transcripts when auto-capture fails
- **Load This Transcript** button — injects manual text into the content script
- Polls stats every 3 seconds while recording

---

## 10. End-to-End Project Flow

### Flow 1: Full Pipeline (Extension → AI → Dashboard)

```
1. User opens Google Meet with captions enabled
2. User opens the Chrome Extension popup
3. User clicks "Start Recording" → content script begins observing DOM mutations
4. As people speak, captions are captured with 1.5s debounce
5. User clicks "Stop Recording" → captures final text
6. User fills in meeting title + department
7. User clicks "Send to AI Agents"
8. Extension POSTs to /meetings/upload-transcript with {title, department, participants, transcript}
9. Backend creates Meeting + Participants + initial Log in DB → returns 202-style "processing" response
10. Backend runs CrewAI pipeline in background (FastAPI BackgroundTasks):
    a. Extraction Agent → extracts tasks/decisions/risks as JSON
    b. Assignment Agent → assigns tasks to participants
    c. Confidence Agent → scores each task 0-100
    d. Validation Agent → flags tasks with confidence < 50
    e. Follow-up Agent → adds follow-up schedule + escalation paths
    f. Summary Agent → generates structured MoM document
    g. Audit Agent → saves all tasks + MoM to DB using tools
11. Meeting status updated to "completed" in DB
12. PM opens the React dashboard, sees the meeting card
13. PM clicks into meeting detail → sees tasks, MoM, transcript, agent logs
14. PM approves/rejects flagged tasks
15. Employees see their assigned tasks on their dashboard → update status to "done"
16. Manager sees team overview with delay rates and escalations
```

### Flow 2: Manual Transcript Upload (Dashboard only)

```
1. PM opens /pm dashboard
2. PM clicks "Upload Transcript"
3. PM fills in: title, department, participants (format: Name:role,Name:role), transcript text
4. PM clicks "Process with CrewAI"
5. Same pipeline (steps 9-16 above) runs
```

### Flow 3: Chat with Meeting

```
1. User opens a meeting detail page (/meeting/:id)
2. User clicks "✨ Ask Your Meeting" button
3. Chat sidebar slides in from the right
4. User types a question (e.g., "What did Rahul commit to?")
5. Frontend POSTs to /meetings/{id}/chat with { message: "..." }
6. Backend sends transcript as system context + user question to Groq API
7. LLM responds based ONLY on the transcript
8. Response displayed in chat bubble
```

### Flow 4: Regenerate MoM

```
1. User opens a meeting that was processed before the Summary Agent existed (no structured MoM)
2. User sees "Summary needs upgrade" prompt
3. User clicks "✨ Generate Minutes of Meeting"
4. Backend runs ONLY the Summary Agent in background (not the full pipeline)
5. Frontend polls every 5 seconds until MoM appears (checks for "## " sections)
6. Structured MoM displayed with color-coded sections
```

---

## 11. Environment Variables

File: `backend/.env`

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key (may be used as fallback by LiteLLM) |
| `GROQ_API_KEY` | Primary LLM provider API key for Groq |
| `CREWAI_LLM_PROVIDER` | Set to `groq` — tells CrewAI to use Groq |
| `DATABASE_URL` | SQLAlchemy connection string — `sqlite:///./meetingos.db` |
| `APP_NAME` | Application name displayed in API root response |

---

## 12. Key Design Decisions

1. **No real authentication**: Uses localStorage-based role simulation. Users select a role on login (PM/Employee/Manager) — suitable for demo/academic project.

2. **Background processing**: CrewAI pipeline runs asynchronously via FastAPI's `BackgroundTasks`. The upload endpoint returns immediately with a "processing" status.

3. **Sequential agent execution**: Agents run one after another (`Process.sequential`), each building on the previous agent's output via CrewAI's `context` parameter.

4. **SQLite**: Zero-config file-based database. No separate DB server needed.

5. **Groq over OpenAI**: Uses Groq's hosted LLaMA 3.3 70B model for faster inference (Groq's custom LPU hardware).

6. **CORS open**: `allow_origins=["*"]` for local development.

7. **Extension captures captions, not audio**: Uses DOM scraping of Google Meet's built-in caption/transcript elements — no audio processing or speech-to-text.

8. **MoM is markdown-formatted**: The Summary Agent outputs markdown with `##` headers, which the frontend parses and renders as styled, color-coded sections.

9. **Chat uses raw Groq API**: The chat endpoint bypasses CrewAI entirely and makes a direct HTTP call to Groq's OpenAI-compatible API for lower latency.

---

## 13. How to Run

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Create .env with API keys
uvicorn main:app --reload      # Runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                    # Runs on http://localhost:5173
```

### Chrome Extension
1. Open `chrome://extensions/`
2. Enable "Developer Mode"
3. Click "Load Unpacked"
4. Select the `extension/` folder
5. Open Google Meet → enable captions → use the extension popup

---

## 14. API Client (Frontend → Backend)

All API calls are centralized in `frontend/src/api.js`:

```js
const api = axios.create({ baseURL: 'http://localhost:8000' })

getMeetings()                    // GET /meetings/
getMeeting(id)                   // GET /meetings/{id}
getMeetingLogs(id)               // GET /meetings/{id}/logs
uploadTranscript(data)           // POST /meetings/upload-transcript
getAllTasks()                     // GET /tasks/
getUserTasks(name)               // GET /tasks/user/{name}
validateTask(id, data)           // POST /tasks/{id}/validate
updateTaskStatus(id, data)       // PATCH /tasks/{id}/status
regenerateSummary(id)            // POST /meetings/{id}/regenerate-summary
chatMeeting(id, data)            // POST /meetings/{id}/chat
```

---

## 15. Notes & Known Issues

1. **`requirements.txt` has a git merge conflict** — contains `<<<<<<< HEAD` / `=======` / `>>>>>>> f07e3e1` markers that need to be cleaned up.

2. **`App.css`** contains Vite boilerplate CSS that isn't actually used by the application (hero animations, counter styles, etc.).

3. **`groq_llm_small`** (llama-3.1-8b-instant) is defined in `agents.py` but never used — reserved for future use or higher TPM scenarios.

4. **Windows encoding fix**: Both `process_with_crew` and `regenerate_summary_task` include `sys.stdout.reconfigure(encoding='utf-8', errors='replace')` to handle CrewAI's Unicode box-drawing characters that crash on Windows' cp1252 encoding.

5. **No persistent auth**: The "login" is just localStorage — refreshing the page or opening a new tab preserves the session, but there's no server-side session or JWT.
