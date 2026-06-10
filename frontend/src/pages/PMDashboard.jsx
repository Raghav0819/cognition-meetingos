import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getMeetings, uploadTranscript } from '../api'
import { useAuth } from '../contexts/AuthContext'

const STATUS = {
  processing: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)',  dot: '#fbbf24' },
  completed:  { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',   dot: '#22c55e' },
  failed:     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',   dot: '#ef4444' },
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      <p style={{ color: '#4b5563', fontSize: 11, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ color: accent || '#fff', fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub !== undefined && (
        <p style={{ color: '#374151', fontSize: 11, margin: '6px 0 0' }}>{sub}</p>
      )}
    </div>
  )
}

function MeetingCard({ meeting, onClick }) {
  const s = STATUS[meeting.status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', dot: '#6b7280' }
  const isProcessing = meeting.status === 'processing'

  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: `2px solid ${s.dot}`,
        borderRadius: 14,
        padding: '18px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.4)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Title + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <h3 style={{ color: '#f3f4f6', fontWeight: 600, fontSize: 14, margin: 0, lineHeight: 1.3, flex: 1 }}>
          {meeting.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {isProcessing && (
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#fbbf24',
              animation: 'pulse-dot 1.5s ease-in-out infinite'
            }} />
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            letterSpacing: '0.03em'
          }}>
            {meeting.status}
          </span>
        </div>
      </div>

      {/* Department */}
      <div style={{ marginBottom: 14 }}>
        <span style={{
          fontSize: 11, color: '#7c3aed',
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(124,58,237,0.25)',
          padding: '2px 8px', borderRadius: 6
        }}>
          {meeting.department}
        </span>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#4b5563', fontSize: 11 }}>
          {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>{meeting.task_count}</span>
          <span style={{ color: '#4b5563', fontSize: 11 }}>tasks</span>
        </div>
      </div>
    </div>
  )
}

export default function PMDashboard() {
  const [meetings,   setMeetings]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [form,       setForm]       = useState({ title: '', department: 'IT', participants: '', transcript: '' })
  const [submitting, setSubmitting] = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [fetchError, setFetchError] = useState('')
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  useEffect(() => { fetchMeetings() }, [])

  useEffect(() => {
    const hasProcessing = meetings.some(m => m.status === 'processing')
    const interval = setInterval(fetchMeetings, hasProcessing ? 5000 : 15000)
    return () => clearInterval(interval)
  }, [meetings])

  async function fetchMeetings() {
    try {
      const res = await getMeetings()
      setMeetings(res.data)
      setFetchError('')
    } catch (err) {
      setFetchError(err?.response?.data?.detail || 'Failed to load meetings.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    setSubmitting(true)
    try {
      const participants = form.participants.split(',').map(p => {
        const [name, role] = p.trim().split(':')
        return { name: name.trim(), role: (role || 'employee').trim() }
      })
      await uploadTranscript({ ...form, participants })
      setShowUpload(false)
      setForm({ title: '', department: 'IT', participants: '', transcript: '' })
      setTimeout(fetchMeetings, 2000)
    } finally {
      setSubmitting(false)
    }
  }

  const totalTasks = meetings.reduce((s, m) => s + (m.task_count || 0), 0)
  const processing = meetings.filter(m => m.status === 'processing').length
  const completed  = meetings.filter(m => m.status === 'completed').length

  return (
    <div style={{ minHeight: '100vh', background: '#07070f' }}>
      <Navbar title="PM Dashboard" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Meetings</h1>
            <p style={{ color: '#4b5563', fontSize: 13, margin: '4px 0 0' }}>
              All AI-processed meeting transcripts for your team
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={fetchMeetings}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#9ca3af', fontSize: 13,
                padding: '9px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            >
              ↻ Refresh
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              style={{
                background: showUpload ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                padding: '9px 20px', borderRadius: 10, cursor: 'pointer', transition: 'opacity 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {showUpload ? '✕ Cancel' : '+ Upload Transcript'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Meetings" value={meetings.length} sub="all time" />
          <StatCard label="Processing"     value={processing}       sub="running now"  accent="#fbbf24" />
          <StatCard label="Completed"      value={completed}        sub="fully analyzed" accent="#22c55e" />
          <StatCard label="Tasks Extracted" value={totalTasks}      sub="across all meetings" accent="#a78bfa" />
        </div>

        {/* Company ID banner */}
        {userProfile?.companyId && (
          <div style={{
            background: 'rgba(124,58,237,0.07)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(124,58,237,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0
              }}>
                🔗
              </div>
              <div>
                <p style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                  Chrome Extension — Company ID
                </p>
                <p style={{ color: '#c4b5fd', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, margin: 0 }}>
                  {userProfile.companyId}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(userProfile.companyId)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              style={{
                background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: copied ? '#22c55e' : '#9ca3af',
                fontSize: 11, padding: '5px 12px', borderRadius: 7,
                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, fontWeight: 500
              }}
            >
              {copied ? '✓ Copied!' : 'Copy ID'}
            </button>
          </div>
        )}

        {!userProfile?.companyId && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 12, padding: '12px 18px', marginBottom: 20,
            color: '#fbbf24', fontSize: 13
          }}>
            No company linked. Sign out and complete company setup to see your meetings.
          </div>
        )}

        {/* Error */}
        {fetchError && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 12, padding: '12px 18px', marginBottom: 20,
            color: '#f87171', fontSize: 13
          }}>
            {fetchError}
          </div>
        )}

        {/* Upload form */}
        {showUpload && (
          <div
            className="anim-fade-up"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 16, padding: '24px', marginBottom: 28
            }}
          >
            <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: '0 0 20px' }}>
              New Meeting Transcript
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[
                { label: 'Meeting Title', key: 'title', placeholder: 'Sprint Planning Q2' },
                { label: 'Department',   key: 'department', placeholder: 'IT' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {f.label}
                  </label>
                  <input
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                      borderRadius: 9, padding: '9px 12px', fontSize: 13, outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Participants <span style={{ color: '#374151', textTransform: 'none', letterSpacing: 0 }}>(Name:role, comma-separated)</span>
              </label>
              <input
                value={form.participants}
                onChange={e => setForm({ ...form, participants: e.target.value })}
                placeholder="Rahul:employee, Priya:pm, Amit:manager"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                  borderRadius: 9, padding: '9px 12px', fontSize: 13, outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Transcript
              </label>
              <textarea
                value={form.transcript}
                onChange={e => setForm({ ...form, transcript: e.target.value })}
                rows={6}
                placeholder="Paste the meeting transcript here..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                  borderRadius: 9, padding: '10px 12px', fontSize: 13, outline: 'none',
                  resize: 'vertical', lineHeight: 1.6
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleUpload}
                disabled={submitting}
                style={{
                  background: submitting ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  border: 'none', color: '#fff', fontWeight: 600, fontSize: 13,
                  padding: '10px 22px', borderRadius: 9, cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                {submitting ? (
                  <>
                    <span className="anim-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                    Sending to AI agents...
                  </>
                ) : 'Process with CrewAI'}
              </button>
            </div>
          </div>
        )}

        {/* Meeting grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, height: 140,
                animation: 'pulse-dot 1.5s ease-in-out infinite'
              }} />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16, margin: '0 auto 16px',
              background: 'rgba(124,58,237,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26
            }}>
              📋
            </div>
            <p style={{ color: '#4b5563', fontSize: 15, margin: 0 }}>No meetings yet</p>
            <p style={{ color: '#374151', fontSize: 13, margin: '6px 0 0' }}>
              Upload a transcript or record via the Chrome Extension
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {meetings.map((m, i) => (
              <div key={m.id} className="anim-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <MeetingCard meeting={m} onClick={() => navigate(`/meeting/${m.id}`)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
