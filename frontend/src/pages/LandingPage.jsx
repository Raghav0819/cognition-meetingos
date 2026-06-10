import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const EXTENSION_DOWNLOAD_URL = import.meta.env.VITE_EXTENSION_ZIP_URL || '#'

const extensionSteps = [
  {
    num: '01',
    title: 'Download the Extension',
    desc: 'Click the Download button below to get the Cognition MeetingOS Chrome Extension zip file.',
  },
  {
    num: '02',
    title: 'Unzip the File',
    desc: 'Extract the downloaded zip. You will get a folder named extension/ with manifest.json inside it.',
  },
  {
    num: '03',
    title: 'Open Chrome Extensions',
    desc: 'In Chrome, go to chrome://extensions/ in the address bar.',
  },
  {
    num: '04',
    title: 'Enable Developer Mode',
    desc: 'Toggle "Developer mode" on (top-right corner of the Extensions page).',
  },
  {
    num: '05',
    title: 'Load Unpacked',
    desc: 'Click "Load unpacked" and select the extracted extension/ folder.',
  },
  {
    num: '06',
    title: 'Pin the Extension',
    desc: 'Click the puzzle icon in Chrome toolbar → pin Cognition MeetingOS so it\'s always visible.',
  },
]

const userGuideSteps = [
  {
    role: 'PM / Admin',
    color: 'bg-purple-600',
    icon: '👩‍💼',
    steps: [
      'Log in as Priya (PM) on the dashboard.',
      'Upload a meeting transcript from the PM Dashboard or use the Chrome Extension to capture a live Google Meet.',
      'Wait for the AI pipeline to process — typically 30–60 seconds.',
      'Open the meeting detail to review extracted tasks, approve or reject flagged ones, and read the auto-generated Minutes of Meeting.',
    ],
  },
  {
    role: 'Employee',
    color: 'bg-blue-600',
    icon: '👨‍💻',
    steps: [
      'Log in as Rahul or Amit (Employee).',
      'Your personal task list appears on the Employee Dashboard.',
      'Update task status (Pending → Done) as you complete work.',
      'Escalate to your manager if a task is blocked.',
    ],
  },
  {
    role: 'Manager',
    color: 'bg-green-600',
    icon: '📊',
    steps: [
      'Log in as Manager.',
      'View your team\'s overall progress: completion rate, delayed tasks, and escalations.',
      'Escalated tasks appear in the orange banner at the top.',
      'Use the Team Breakdown section to see per-person stats.',
    ],
  },
]

const extensionUsage = [
  { icon: '▶', text: 'Join a Google Meet and enable captions (CC button).' },
  { icon: '🔴', text: 'Click the extension icon → fill in meeting title & department → press Start Recording.' },
  { icon: '⏹', text: 'When the meeting ends, press Stop Recording.' },
  { icon: '🚀', text: 'Click "Send to AI Agents" — the transcript is uploaded and processed automatically.' },
]

export default function LandingPage() {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-xl font-bold text-white">Cognition</span>
          <span className="text-gray-400 ml-2 text-sm">MeetingOS</span>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === 1 ? 'bg-purple-600 text-white' : 'bg-purple-900 text-purple-300'}`}>1</div>
            <span className={`text-sm hidden sm:inline ${step === 1 ? 'text-white font-medium' : 'text-gray-500'}`}>Extension Setup</span>
          </div>
          <div className="w-8 h-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === 2 ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500'}`}>2</div>
            <span className={`text-sm hidden sm:inline ${step === 2 ? 'text-white font-medium' : 'text-gray-500'}`}>User Guide</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {step === 1 && (
          <div className="max-w-3xl mx-auto px-6 py-12">
            <div className="mb-10">
              <div className="inline-block bg-purple-900/40 text-purple-300 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">Step 1 of 2</div>
              <h1 className="text-3xl font-bold text-white mb-3">Install the Chrome Extension</h1>
              <p className="text-gray-400 text-base">The extension captures Google Meet captions in real time and sends them to the AI pipeline with one click.</p>
            </div>

            {/* Download button */}
            <a
              href={EXTENSION_DOWNLOAD_URL}
              download
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-white mb-10 transition-opacity ${EXTENSION_DOWNLOAD_URL === '#' ? 'bg-gray-700 cursor-not-allowed opacity-60' : 'bg-purple-600 hover:opacity-90'}`}
              onClick={e => EXTENSION_DOWNLOAD_URL === '#' && e.preventDefault()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Extension (.zip)
            </a>
            {EXTENSION_DOWNLOAD_URL === '#' && (
              <p className="text-yellow-500 text-xs mb-10 -mt-8">Download link not configured. Clone the repository and use the <code className="bg-gray-800 px-1 rounded">extension/</code> folder manually.</p>
            )}

            {/* Installation steps */}
            <div className="space-y-4 mb-10">
              {extensionSteps.map(s => (
                <div key={s.num} className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <span className="text-purple-500 font-mono font-bold text-lg w-8 shrink-0">{s.num}</span>
                  <div>
                    <p className="font-semibold text-white mb-1">{s.title}</p>
                    <p className="text-gray-400 text-sm">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Extension usage */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-10">
              <h2 className="font-bold text-white mb-4 text-lg">Using the Extension During a Meeting</h2>
              <div className="space-y-3">
                {extensionUsage.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-purple-400 w-5 shrink-0 mt-0.5">{item.icon}</span>
                    <span className="text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 transition-colors px-6 py-3 rounded-xl font-semibold text-white"
              >
                Next: User Guide
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-3xl mx-auto px-6 py-12">
            <div className="mb-10">
              <div className="inline-block bg-purple-900/40 text-purple-300 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">Step 2 of 2</div>
              <h1 className="text-3xl font-bold text-white mb-3">How to Use MeetingOS</h1>
              <p className="text-gray-400 text-base">Three roles — PM, Employee, and Manager — each with a dedicated dashboard and workflow.</p>
            </div>

            {/* System overview */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
              <h2 className="font-bold text-white mb-4 text-lg">End-to-End Flow</h2>
              <ol className="space-y-3">
                {[
                  'Upload or capture a meeting transcript (via Extension or PM Dashboard).',
                  'The AI pipeline (7 agents) extracts tasks, assigns them, scores confidence, and writes a Minutes of Meeting document — automatically.',
                  'The PM reviews flagged low-confidence tasks and approves or edits them.',
                  'Employees see their assigned tasks and update status as they work.',
                  'The Manager monitors team progress and responds to escalations.',
                ].map((text, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-bold text-xs">{i + 1}</span>
                    <span className="text-gray-300 mt-0.5">{text}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Role guides */}
            <div className="space-y-6 mb-10">
              {userGuideSteps.map(r => (
                <div key={r.role} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{r.icon}</span>
                    <span className={`text-xs px-3 py-1 rounded-full text-white font-semibold ${r.color}`}>{r.role}</span>
                  </div>
                  <ol className="space-y-2">
                    {r.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="text-gray-600 font-mono w-4 shrink-0">{i + 1}.</span>
                        <span className="text-gray-300">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            {/* Features callout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
              {[
                { icon: '🤖', label: '7 AI Agents' },
                { icon: '📄', label: 'Auto MoM' },
                { icon: '✅', label: 'Task Validation' },
                { icon: '💬', label: 'Chat with Transcript' },
                { icon: '📈', label: 'Confidence Scoring' },
                { icon: '🔔', label: 'Escalation Alerts' },
              ].map(f => (
                <div key={f.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-xl">{f.icon}</span>
                  <span className="text-sm text-gray-300 font-medium">{f.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-3 rounded-xl text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 transition-colors px-8 py-3 rounded-xl font-semibold text-white text-base"
              >
                Enter App
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
