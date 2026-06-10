import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import TaskCard from '../components/TaskCard'
import { getMeeting, validateTask, regenerateSummary, chatMeeting } from '../api'
import { useToast } from '../contexts/ToastContext'

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

function MomSection({ mom, onRegenerate, isRegenerating }) {
  // Detect if MoM is missing or old format (no ## sections)
  const hasStructuredMom = mom && mom.includes('## ')

  if (!hasStructuredMom) {
    return (
      <div style={{
        background: '#111',
        border: '1px solid #222',
        borderRadius: 16,
        padding: '40px 32px',
        textAlign: 'center'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: 'linear-gradient(135deg, #7c3aed33, #a78bfa22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 16px'
        }}>📄</div>
        <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 18, margin: '0 0 8px' }}>
          {mom ? 'Summary needs upgrade' : 'No summary available'}
        </h3>
        <p style={{ color: '#6b7280', fontSize: 13, maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
          {mom 
            ? 'This meeting was processed before the Summary Agent was added. Click below to generate a structured Minutes of Meeting.'
            : 'This meeting doesn\'t have an AI-generated summary yet. Click below to generate one.'
          }
        </p>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          style={{
            background: isRegenerating ? '#374151' : 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            color: '#fff',
            border: 'none',
            padding: '12px 28px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: isRegenerating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {isRegenerating ? (
            <>
              <span style={{
                width: 16, height: 16, border: '2px solid #ffffff55',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                display: 'inline-block'
              }} />
              Generating MoM...
            </>
          ) : (
            <>
              ✨ Generate Minutes of Meeting
            </>
          )}
        </button>
        {isRegenerating && (
          <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 12 }}>
            The Summary Agent is working. This may take 15-30 seconds. The page will auto-refresh.
          </p>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const [copied, setCopied] = useState(false)

  function copyMom() {
    navigator.clipboard.writeText(mom)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse the MoM text into sections
  const sections = []
  const lines = mom.split('\n')
  let currentSection = null
  let currentContent = []

  lines.forEach(line => {
    const headerMatch = line.match(/^##\s+(.+)/)
    if (headerMatch) {
      if (currentSection) {
        sections.push({ title: currentSection, content: currentContent.join('\n').trim() })
      }
      currentSection = headerMatch[1].trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  })
  if (currentSection) {
    sections.push({ title: currentSection, content: currentContent.join('\n').trim() })
  }

  // If parsing didn't find sections, show as a single block
  if (sections.length === 0) {
    sections.push({ title: 'Meeting Summary', content: mom })
  }

  const sectionConfig = {
    'Executive Summary':  { icon: '📋', gradient: 'from-purple-500/10 to-purple-900/5', border: 'border-purple-800/50', titleColor: 'text-purple-300', iconBg: 'bg-purple-900/50' },
    'Key Decisions':      { icon: '✅', gradient: 'from-green-500/10 to-green-900/5',  border: 'border-green-800/50',  titleColor: 'text-green-300',  iconBg: 'bg-green-900/50' },
    'Action Items':       { icon: '🎯', gradient: 'from-blue-500/10 to-blue-900/5',   border: 'border-blue-800/50',   titleColor: 'text-blue-300',   iconBg: 'bg-blue-900/50' },
    'Risks & Concerns':   { icon: '⚠️', gradient: 'from-orange-500/10 to-orange-900/5', border: 'border-orange-800/50', titleColor: 'text-orange-300', iconBg: 'bg-orange-900/50' },
    'Next Steps':         { icon: '🚀', gradient: 'from-cyan-500/10 to-cyan-900/5',   border: 'border-cyan-800/50',   titleColor: 'text-cyan-300',   iconBg: 'bg-cyan-900/50' },
    'Meeting Summary':    { icon: '📝', gradient: 'from-purple-500/10 to-purple-900/5', border: 'border-purple-800/50', titleColor: 'text-purple-300', iconBg: 'bg-purple-900/50' },
  }

  const defaultConfig = { icon: '📌', gradient: 'from-gray-500/10 to-gray-900/5', border: 'border-gray-700/50', titleColor: 'text-gray-300', iconBg: 'bg-gray-800/50' }

  function renderContent(content) {
    return content.split('\n').map((line, i) => {
      const trimmed = line.trim()
      if (!trimmed) return <div key={i} style={{ height: 8 }} />

      // Bullet points (-, •, *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[-•*]\s*/, '')
        return (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{ color: '#a78bfa', fontSize: 14, marginTop: 2, flexShrink: 0 }}>▸</span>
            <span style={{ color: '#d1d5db', fontSize: 13, lineHeight: '1.6' }}>{formatBoldText(text)}</span>
          </div>
        )
      }

      // Markdown table rows
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // Skip separator rows like | --- | --- |
        if (trimmed.replace(/[\s|:-]/g, '') === '') return null
        const cells = trimmed.split('|').filter(c => c.trim())
        const isHeader = i === 0 || (content.split('\n')[i + 1] || '').trim().match(/^\|[\s-:|]+\|$/)
        return (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
            gap: 4,
            marginBottom: 2,
            padding: '6px 0',
            borderBottom: '1px solid #222'
          }}>
            {cells.map((cell, ci) => (
              <span key={ci} style={{
                color: isHeader ? '#a78bfa' : '#d1d5db',
                fontSize: 12,
                fontWeight: isHeader ? 600 : 400,
                padding: '2px 8px'
              }}>{cell.trim()}</span>
            ))}
          </div>
        )
      }

      // Numbered items
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/)
      if (numMatch) {
        return (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{
              color: '#a78bfa', fontSize: 11, fontWeight: 700,
              background: 'rgba(167,139,250,0.15)', borderRadius: 4,
              minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1
            }}>{numMatch[1]}</span>
            <span style={{ color: '#d1d5db', fontSize: 13, lineHeight: '1.6' }}>{formatBoldText(numMatch[2])}</span>
          </div>
        )
      }

      // Regular text
      return <p key={i} style={{ color: '#d1d5db', fontSize: 13, lineHeight: '1.7', marginBottom: 4 }}>{formatBoldText(trimmed)}</p>
    })
  }

  function formatBoldText(text) {
    // Handle **bold** markdown syntax
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#fff', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16
          }}>📄</div>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0 }}>Minutes of Meeting</h3>
            <p style={{ color: '#6b7280', fontSize: 11, margin: 0, marginTop: 2 }}>AI-generated by Summary Agent</p>
          </div>
        </div>
        <button
          onClick={copyMom}
          style={{
            background: copied ? '#065f46' : '#1f2937',
            border: `1px solid ${copied ? '#059669' : '#374151'}`,
            color: copied ? '#6ee7b7' : '#9ca3af',
            fontSize: 12, fontWeight: 500,
            padding: '6px 14px', borderRadius: 8,
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          {copied ? '✓ Copied!' : '📋 Copy MoM'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sections.map((section, idx) => {
          const config = sectionConfig[section.title] || defaultConfig
          return (
            <div
              key={idx}
              style={{
                borderRadius: 12,
                border: '1px solid',
                overflow: 'hidden',
              }}
              className={`${config.border}`}
            >
              <div
                style={{ padding: '14px 18px' }}
                className={`bg-gradient-to-r ${config.gradient}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{
                    fontSize: 16, width: 30, height: 30, borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                    className={config.iconBg}
                  >{config.icon}</span>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }} className={config.titleColor}>
                    {section.title}
                  </h4>
                </div>
                <div style={{ paddingLeft: 40 }}>
                  {renderContent(section.content)}
                </div>
              </div>
            </div>
          )
        })}
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
  const { toast }                 = useToast()
  const [meeting,   setMeeting]   = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

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
    toast(`Task ${decision}`, decision === 'approved' ? 'success' : 'warning')
    fetchMeeting()
  }

  function refresh() {
    setRefreshing(true)
    fetchMeeting()
  }

  async function handleRegenerate() {
    setRegenerating(true)
    toast('Generating Minutes of Meeting…', 'info', 6000)
    try {
      await regenerateSummary(id)
      // Poll for completion — check every 5 seconds
      const pollInterval = setInterval(async () => {
        try {
          const res = await getMeeting(id)
          if (res.data.mom && res.data.mom.includes('## ')) {
            clearInterval(pollInterval)
            setMeeting(res.data)
            setRegenerating(false)
            toast('Minutes of Meeting ready', 'success')
          }
        } catch (e) {
          // keep polling
        }
      }, 5000)
      // Safety timeout — stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval)
        setRegenerating(false)
        fetchMeeting()
      }, 120000)
    } catch (e) {
      setRegenerating(false)
      toast('Failed to start summary generation', 'error')
    }
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

  const tabs = ['tasks', 'summary', 'transcript', 'logs']
  const agentColors = {
    'Extraction Agent':  '#a78bfa',
    'Assignment Agent':  '#60a5fa',
    'Confidence Agent':  '#34d399',
    'Validation Agent':  '#fbbf24',
    'Follow-up Agent':   '#f97316',
    'Audit Agent':                '#f43f5e',
    'Audit Logger':               '#f43f5e',
    'Meeting Summary Specialist': '#c084fc',
    'Summary Agent':              '#c084fc',
    'System':                     '#6b7280',
    'PM (Human)':                 '#22c55e',
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar title={meeting.title} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/pm')} className="text-gray-500 hover:text-white text-sm transition">
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatOpen(true)}
              className="text-xs bg-purple-900/50 hover:bg-purple-800 text-purple-300 border border-purple-700/50 px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <span>✨</span> Ask Your Meeting
            </button>
            <button
              onClick={refresh}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
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

        {meeting.mom && meeting.mom.includes('## ') && activeTab !== 'summary' && (
          <div
            onClick={() => setActiveTab('summary')}
            className="bg-purple-950/50 border border-purple-800/50 rounded-xl px-5 py-3 mb-6 cursor-pointer hover:border-purple-600/50 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="text-purple-300 font-semibold text-sm">AI Minutes of Meeting generated</span>
              </div>
              <span className="text-purple-400 text-xs">View Summary →</span>
            </div>
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
            >
              {t === 'summary' ? '📄 Summary' : t}
              {t === 'logs' && meeting.logs.length > 0 && ` (${meeting.logs.length})`}
            </button>
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

        {activeTab === 'summary' && (
          <MomSection mom={meeting.mom} onRegenerate={handleRegenerate} isRegenerating={regenerating} />
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

      {isChatOpen && <ChatSidebar meetingId={id} onClose={() => setIsChatOpen(false)} />}
    </div>
  )
}

function ChatSidebar({ meetingId, onClose }) {
  const [messages, setMessages] = useState([{ role: 'ai', content: 'Hi! Ask me anything about this meeting.' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await chatMeeting(meetingId, { message: userMsg.content })
      setMessages(prev => [...prev, { role: 'ai', content: res.data.response }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
      background: 'rgba(17, 17, 17, 0.95)',
      backdropFilter: 'blur(10px)',
      borderLeft: '1px solid #333',
      display: 'flex', flexDirection: 'column',
      zIndex: 50,
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>✨</span> Ask Your Meeting
        </h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%',
              background: m.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : '#222',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: 16,
              borderBottomRightRadius: m.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: m.role === 'ai' ? 4 : 16,
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#222', color: '#aaa', padding: '12px 16px', borderRadius: 16, borderBottomLeftRadius: 4, fontSize: 14 }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about decisions, tasks..."
            style={{
              flex: 1, background: '#222', border: '1px solid #444', color: '#fff',
              padding: '12px 16px', borderRadius: 24, fontSize: 14, outline: 'none'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            style={{
              background: loading ? '#444' : 'linear-gradient(135deg, #7c3aed, #a78bfa)', border: 'none',
              color: '#fff', width: 44, height: 44, borderRadius: '50%', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
