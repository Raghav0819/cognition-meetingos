import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import TaskCard from '../components/TaskCard'
import { getUserTasks, updateTaskStatus } from '../api'
import { useAuth } from '../contexts/AuthContext'

function ProgressRing({ done, total, size = 96, thickness = 7 }) {
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const C = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  const filled = pct * C
  const color = pct >= 0.7 ? '#22c55e' : pct >= 0.4 ? '#fbbf24' : '#a78bfa'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1d2e" strokeWidth={thickness} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${filled} ${C}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
          {total > 0 ? Math.round(pct * 100) : 0}
        </span>
        <span style={{ color: '#4b5563', fontSize: 9, marginTop: 1 }}>%</span>
      </div>
    </div>
  )
}

export default function EmployeeDashboard() {
  const { userProfile } = useAuth()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    try {
      const res = await getUserTasks(user.name)
      setTasks(res.data)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(taskId, status) {
    await updateTaskStatus(taskId, { status })
    fetchTasks()
  }

  const pending   = tasks.filter(t => t.status === 'pending')
  const done      = tasks.filter(t => t.status === 'done')
  const overdue   = tasks.filter(t => t.status === 'overdue' || t.status === 'escalated')

  const filtered = filter === 'all' ? tasks :
                   filter === 'pending' ? pending :
                   filter === 'done' ? done : overdue

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  return (
    <div style={{ minHeight: '100vh', background: '#07070f' }}>
      <Navbar title="My Tasks" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header with progress ring */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18,
          padding: '24px 28px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 4px' }}>
              {greeting}, <span style={{ color: '#a78bfa', fontWeight: 600, textTransform: 'capitalize' }}>{userProfile?.name || user.name}</span>
            </p>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 16px' }}>
              Your Task Board
            </h1>

            {/* Inline stat pills */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Pending',   count: pending.length,   color: '#fbbf24' },
                { label: 'Completed', count: done.length,      color: '#22c55e' },
                { label: 'Overdue',   count: overdue.length,   color: '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 20,
                  background: `${s.color}14`,
                  border: `1px solid ${s.color}30`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                  <span style={{ color: s.color, fontSize: 12, fontWeight: 600 }}>{s.count}</span>
                  <span style={{ color: '#4b5563', fontSize: 11 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ProgressRing done={done.length} total={tasks.length} />
            <span style={{ color: '#4b5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Complete
            </span>
          </div>
        </div>

        {/* Filter tabs */}
        {tasks.length > 0 && (
          <div style={{
            display: 'flex', gap: 4, marginBottom: 20,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: 4, width: 'fit-content'
          }}>
            {[
              { key: 'all',     label: `All (${tasks.length})` },
              { key: 'pending', label: `Pending (${pending.length})` },
              { key: 'done',    label: `Done (${done.length})` },
              { key: 'overdue', label: `Overdue (${overdue.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '6px 14px', borderRadius: 7, border: 'none',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                  background: filter === tab.key ? 'rgba(124,58,237,0.25)' : 'transparent',
                  color: filter === tab.key ? '#c4b5fd' : '#6b7280',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Task grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, height: 180,
                animation: 'pulse-dot 1.5s ease-in-out infinite'
              }} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: '0 auto 18px',
              background: 'rgba(124,58,237,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30
            }}>
              ✅
            </div>
            <p style={{ color: '#4b5563', fontSize: 15, margin: 0 }}>No tasks assigned yet</p>
            <p style={{ color: '#374151', fontSize: 13, margin: '6px 0 0' }}>
              Tasks appear here once a PM processes a meeting that mentions your name
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#4b5563', fontSize: 14 }}>
            No tasks in this category
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filtered.map((t, i) => (
              <div key={t.id} className="anim-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <TaskCard task={t} onStatusChange={handleStatusChange} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
