import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import TaskCard from '../components/TaskCard'
import { getMeeting, validateTask } from '../api'

function EfficiencyScore({ tasks }) {
  if (!tasks.length) return null
  const avg = tasks.reduce((s, t) => s + t.confidence, 0) / tasks.length
  const score = Math.round(avg)
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'
  const label = score >= 70 ? 'High efficiency' : score >= 40 ? 'Medium efficiency' : 'Needs attention'

  return (
    <div style={{
      background: '#111',
      border: '1px solid #222',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 20
    }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#222" strokeWidth="6"/>
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${score * 1.759} 175.9`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontSize: 14, fontWeight: 700, color
        }}>{score}</span>
      </div>
      <div>
        <p style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Meeting Efficiency Score</p>
        <p style={{ color, fontSize: 12, marginTop: 2 }}>{label}</p>
        <p style={{ color: '#555', fontSize: 11, marginTop: 4 }}>
          Based on task clarity, owner assignment, and deadline specificity
        </p>
      </div>
    </div>
  )
}

function StatBar({ tasks }) {
  const byType = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const stats = [
    { label: 'Total',    value: tasks.length,           color: '#a78bfa' },
    { label: 'Pending',  value: byType.pending  || 0,   color: '#eab308' },
    { label: 'Done',     value: byType.done     || 0,   color: '#22c55e' },
    { label: 'Flagged',  value: tasks.filter(t => t.validated === 'pending').length, color: '#f97316' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{s.label}</p>
        </div>
      ))}
    </div>
  )
}

export default function MeetingDetail() {
  const { id }                    = useParams()
  const navigate                  = useNavigate()
  const [meeting,   setMeeting]   = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchMeeting() }, [id])

  async function fetchMeeting() {
    try {
      const res = await getMeeting(id)
      setMeeting(res.data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleValidate(taskId, decision) {
    await validateTask(taskId, { validated: decision })
    fetchMeeting()
  }

  function refresh() {
    setRefreshing(true)
    fetchMeeting()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">
      Loading meeting...
    </div>
  )
  if (!meeting) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">
      Meeting not found
    </div>
  )

  const tabs = ['tasks', 'transcript', 'logs']
  const agentColors = {
    'Extraction Agent':  '#a78bfa',
    'Assignment Agent':  '#60a5fa',
    'Confidence Agent':  '#34d399',
    'Validation Agent':  '#fbbf24',
    'Follow-up Agent':   '#f97316',
    'Audit Agent':       '#f43f5e',
    'Audit Logger':      '#f43f5e',
    'System':            '#6b7280',
    'PM (Human)':        '#22c55e',
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar title={meeting.title} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/pm')} className="text-gray-500 hover:text-white text-sm transition">
            ← Back
          </button>
          <button
            onClick={refresh}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-white">{meeting.title}</h2>
          <span className="text-xs bg-purple-900 text-purple-300 px-3 py-1 rounded-full">{meeting.department}</span>
          <span className={`text-xs px-3 py-1 rounded-full ${
            meeting.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
          }`}>{meeting.status}</span>
        </div>
        <p className="text-gray-600 text-sm mb-6">
          {meeting.participants?.map(p => p.name).join(', ')} · {new Date(meeting.date).toLocaleDateString()}
        </p>

        {meeting.tasks.length > 0 && <EfficiencyScore tasks={meeting.tasks} />}

        {meeting.mom && (
          <div className="bg-yellow-950 border border-yellow-800 rounded-xl px-5 py-3 mb-6 text-yellow-300 text-sm">
            <span className="font-semibold">AI Summary: </span>{meeting.mom}
          </div>
        )}

        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition ${
                activeTab === t ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >{t} {t === 'logs' && meeting.logs.length > 0 && `(${meeting.logs.length})`}</button>
          ))}
        </div>

        {activeTab === 'tasks' && (
          <div>
            {meeting.tasks.length > 0 && <StatBar tasks={meeting.tasks} />}
            {meeting.tasks.length === 0 ? (
              <div className="text-center py-20">
                {meeting.status === 'processing' ? (
                  <div>
                    <p className="text-yellow-400 mb-2">AI agents are processing this meeting...</p>
                    <p className="text-gray-600 text-sm">Click Refresh in 30 seconds</p>
                  </div>
                ) : (
                  <p className="text-gray-600">No tasks extracted</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meeting.tasks.map(t => (
                  <TaskCard key={t.id} task={t} showValidation={true} onValidate={handleValidate} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-4">Original Transcript</h3>
            <pre className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {meeting.transcript}
            </pre>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-6">
              Agent Audit Trail
              <span className="ml-2 text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full">
                {meeting.logs.length} events
              </span>
            </h3>
            <div className="flex flex-col gap-4">
              {meeting.logs.length === 0 ? (
                <p className="text-gray-600 text-sm">No logs yet — agents may still be running</p>
              ) : (
                meeting.logs.map((log, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="flex flex-col items-center">
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: agentColors[log.agent] || '#6b7280',
                        marginTop: 3, flexShrink: 0
                      }}/>
                      {i < meeting.logs.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: '#222', marginTop: 4 }}/>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: agentColors[log.agent] || '#6b7280'
                        }}>{log.agent}</span>
                        <span className="text-gray-700 text-xs">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{log.action}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
