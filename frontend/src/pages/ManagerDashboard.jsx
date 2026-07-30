import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getAllTasks, getMeetings } from '../api'
import TeamPanel from '../components/TeamPanel'

/* ── SVG Donut Chart ─────────────────────────────────────────────── */
function DonutChart({ data, size = 180, thickness = 22 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r  = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const C  = 2 * Math.PI * r

  let accDeg = 0
  const arcs = total > 0
    ? data.filter(d => d.value > 0).map(d => {
        const frac = d.value / total
        const arc  = { ...d, len: frac * C, startDeg: accDeg - 90 }
        accDeg += frac * 360
        return arc
      })
    : []

  const doneVal = data.find(d => d.key === 'done')?.value || 0
  const pct = total > 0 ? Math.round((doneVal / total) * 100) : 0
  const ringColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#fbbf24' : '#a78bfa'

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#14151f" strokeWidth={thickness} />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={thickness - 2}
            strokeDasharray={`${Math.max(arc.len - 4, 0)} ${C}`}
            transform={`rotate(${arc.startDeg} ${cx} ${cy})`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        ))}
        {/* Center glow ring */}
        {total === 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2030" strokeWidth={thickness - 2} strokeDasharray="4 8" />
        )}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: ringColor, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 10, color: '#4b5563', marginTop: 3, letterSpacing: '0.04em' }}>DONE</span>
      </div>
    </div>
  )
}

/* ── Team member row with progress bar ───────────────────────────── */
function TeamRow({ name, tasks, rank }) {
  const done    = tasks.filter(t => t.status === 'done').length
  const pending = tasks.filter(t => t.status === 'pending').length
  const overdue = tasks.filter(t => t.status === 'overdue' || t.status === 'escalated').length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
  const barColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#fbbf24' : '#ef4444'
  const rankColors = ['#fbbf24', '#9ca3af', '#cd7c39']

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {rank < 3 && (
            <span style={{ fontSize: 12, color: rankColors[rank], fontWeight: 700, minWidth: 16 }}>
              #{rank + 1}
            </span>
          )}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(167,139,250,0.15))',
            border: '1px solid rgba(124,58,237,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#a78bfa', flexShrink: 0
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <span style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#22c55e', fontSize: 11 }}>{done} done</span>
          <span style={{ color: '#374151' }}>·</span>
          <span style={{ color: '#fbbf24', fontSize: 11 }}>{pending} left</span>
          {overdue > 0 && (
            <>
              <span style={{ color: '#374151' }}>·</span>
              <span style={{ color: '#ef4444', fontSize: 11 }}>{overdue} late</span>
            </>
          )}
          <span style={{ color: barColor, fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>
            {pct}%
          </span>
        </div>
      </div>
      <div style={{ height: 5, background: '#14151f', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(to right, ${barColor}66, ${barColor})`,
          borderRadius: 3,
          transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)'
        }} />
      </div>
    </div>
  )
}

/* ── Mini bar chart ──────────────────────────────────────────────── */
function MiniBarChart({ data, height = 100 }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{d.value || ''}</span>
          <div style={{
            width: '100%',
            height: Math.max((d.value / max) * (height - 26), d.value > 0 ? 4 : 2),
            background: d.value > 0
              ? `linear-gradient(to top, ${d.color}88, ${d.color})`
              : '#14151f',
            borderRadius: '3px 3px 0 0',
            transition: 'height 1s cubic-bezier(0.4,0,0.2,1)',
          }} />
          <span style={{ fontSize: 9, color: '#374151', textAlign: 'center', lineHeight: 1.2 }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Stat card ───────────────────────────────────────────────────── */
function StatCard({ label, value, accent, icon, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: '#4b5563', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14
        }}>{icon}</span>
      </div>
      <p style={{ color: accent || '#fff', fontSize: 30, fontWeight: 800, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ color: '#374151', fontSize: 11, margin: '6px 0 0' }}>{sub}</p>}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────── */
export default function ManagerDashboard() {
  const [tasks,    setTasks]    = useState([])
  const [meetings, setMeetings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [activeTab, setActiveTab] = useState('analytics')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [t, m] = await Promise.all([getAllTasks(), getMeetings()])
      setTasks(t.data)
      setMeetings(m.data)
    } finally {
      setLoading(false)
    }
  }

  const total     = tasks.length
  const done      = tasks.filter(t => t.status === 'done').length
  const pending   = tasks.filter(t => t.status === 'pending').length
  const overdue   = tasks.filter(t => t.status === 'overdue').length
  const escalated = tasks.filter(t => t.status === 'escalated').length
  const compRate  = total ? Math.round((done / total) * 100) : 0

  const donutData = [
    { key: 'done',      value: done,      color: '#22c55e', label: 'Done' },
    { key: 'pending',   value: pending,   color: '#a78bfa', label: 'Pending' },
    { key: 'overdue',   value: overdue,   color: '#ef4444', label: 'Overdue' },
    { key: 'escalated', value: escalated, color: '#f97316', label: 'Escalated' },
  ]

  const byPerson = tasks.reduce((acc, t) => {
    if (!acc[t.assigned_to]) acc[t.assigned_to] = []
    acc[t.assigned_to].push(t)
    return acc
  }, {})

  const sortedTeam = Object.entries(byPerson).sort((a, b) => {
    const ra = a[1].filter(t => t.status === 'done').length / a[1].length
    const rb = b[1].filter(t => t.status === 'done').length / b[1].length
    return rb - ra
  })

  const byDept = meetings.reduce((acc, m) => {
    acc[m.department] = (acc[m.department] || 0) + 1
    return acc
  }, {})

  const deptColors = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

  // Bar chart for dept meetings
  const deptBarData = Object.entries(byDept)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([dept, count], i) => ({ label: dept, value: count, color: deptColors[i % deptColors.length] }))

  // Meeting status breakdown
  const completedM = meetings.filter(m => m.status === 'completed').length
  const processingM = meetings.filter(m => m.status === 'processing').length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07070f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="anim-spin" style={{
          width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)',
          borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 12px'
        }} />
        <p style={{ color: '#4b5563', fontSize: 13 }}>Loading analytics…</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07070f' }}>
      <Navbar title="Manager Overview" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Page header with tabs */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
            {['analytics', 'team'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: activeTab === tab ? '#fff' : '#6b7280',
                  fontSize: 22, fontWeight: 700, cursor: 'pointer',
                  textTransform: 'capitalize', transition: 'color 0.2s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <p style={{ color: '#4b5563', fontSize: 13, margin: 0 }}>
            {activeTab === 'analytics' ? 'Real-time overview across all meetings and tasks' : 'View your organization members and invites'}
          </p>
        </div>

        {activeTab === 'team' ? (
          <TeamPanel isPM={false} />
        ) : (
          <>
            {/* Escalation alert */}
        {escalated > 0 && (
          <div className="anim-fade-up" style={{
            background: 'rgba(249,115,22,0.07)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 14
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(249,115,22,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
            }}>
              🚨
            </div>
            <div>
              <p style={{ color: '#fb923c', fontWeight: 600, fontSize: 13, margin: 0 }}>
                {escalated} escalated task{escalated > 1 ? 's' : ''} require your attention
              </p>
              <p style={{ color: '#78350f', fontSize: 12, margin: '3px 0 0' }}>
                {tasks.filter(t => t.status === 'escalated').map(t => t.title).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Tasks"     value={total}            accent="#e5e7eb" icon="📋" sub={`from ${meetings.length} meetings`} />
          <StatCard label="Completed"       value={done}             accent="#22c55e" icon="✅" sub={`${compRate}% completion rate`} />
          <StatCard label="In Progress"     value={pending}          accent="#a78bfa" icon="⏳" sub="awaiting action" />
          <StatCard label="Needs Attention" value={overdue+escalated} accent="#ef4444" icon="⚠️" sub={`${overdue} overdue · ${escalated} escalated`} />
        </div>

        {/* Row 2: donut + team bars */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 16 }}>

          {/* Donut + legend */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 20px' }}>
              Task Breakdown
            </p>
            {total > 0 ? (
              <>
                <DonutChart data={donutData} />
                <div style={{ marginTop: 20, width: '100%', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {donutData.filter(d => d.value > 0).map(d => (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>{d.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600 }}>{d.value}</span>
                        <span style={{ color: '#374151', fontSize: 10 }}>
                          {Math.round(d.value / total * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#374151', fontSize: 13 }}>
                No task data yet
              </div>
            )}
          </div>

          {/* Team performance */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                Team Performance
              </p>
              <span style={{
                background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                fontSize: 10, padding: '2px 8px', borderRadius: 20,
                border: '1px solid rgba(124,58,237,0.25)'
              }}>
                {sortedTeam.length} members
              </span>
            </div>

            {sortedTeam.length === 0 ? (
              <p style={{ color: '#374151', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
                No task assignments yet
              </p>
            ) : (
              sortedTeam.map(([name, ptasks], i) => (
                <TeamRow key={name} name={name} tasks={ptasks} rank={i} />
              ))
            )}
          </div>
        </div>

        {/* Row 3: recent meetings + dept chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* Recent meetings */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                Recent Meetings
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: '#22c55e', fontSize: 11 }}>{completedM} completed</span>
                {processingM > 0 && (
                  <span style={{ color: '#fbbf24', fontSize: 11 }}>{processingM} processing</span>
                )}
              </div>
            </div>

            {meetings.length === 0 ? (
              <p style={{ color: '#374151', textAlign: 'center', padding: '30px 0', fontSize: 13 }}>
                No meetings yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {meetings.slice(0, 7).map(m => {
                  const isComp = m.status === 'completed'
                  const isProc = m.status === 'processing'
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 14px', borderRadius: 10, transition: 'background 0.15s',
                        cursor: 'default'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                          background: isComp ? '#22c55e' : isProc ? '#fbbf24' : '#6b7280',
                          ...(isProc ? { animation: 'pulse-dot 1.5s ease-in-out infinite' } : {})
                        }} />
                        <div>
                          <p style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 500, margin: 0 }}>{m.title}</p>
                          <p style={{ color: '#374151', fontSize: 11, margin: '2px 0 0' }}>
                            {m.department} · {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ color: '#7c3aed', fontSize: 12, fontWeight: 600 }}>
                          {m.task_count} tasks
                        </span>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                          background: isComp ? 'rgba(34,197,94,0.12)' : isProc ? 'rgba(251,191,36,0.12)' : 'rgba(107,114,128,0.12)',
                          color: isComp ? '#22c55e' : isProc ? '#fbbf24' : '#9ca3af',
                          border: `1px solid ${isComp ? 'rgba(34,197,94,0.25)' : isProc ? 'rgba(251,191,36,0.25)' : 'rgba(107,114,128,0.2)'}`,
                        }}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Department bar chart */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '24px'
          }}>
            <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 20px' }}>
              Meetings by Dept
            </p>

            {deptBarData.length > 0 ? (
              <>
                <MiniBarChart data={deptBarData} height={120} />
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {Object.entries(byDept).sort((a, b) => b[1] - a[1]).map(([dept, count], i) => {
                    const maxVal = Math.max(...Object.values(byDept))
                    return (
                      <div key={dept} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#9ca3af', fontSize: 11 }}>{dept}</span>
                          <span style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 600 }}>{count}</span>
                        </div>
                        <div style={{ height: 3, background: '#14151f', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${(count / maxVal) * 100}%`, height: '100%',
                            background: deptColors[i % deptColors.length],
                            borderRadius: 2, transition: 'width 1s ease'
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p style={{ color: '#374151', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
                No meeting data yet
              </p>
            )}

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#374151', fontSize: 10, margin: '0 0 3px' }}>Total meetings</p>
                <p style={{ color: '#9ca3af', fontSize: 15, fontWeight: 700, margin: 0 }}>{meetings.length}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#374151', fontSize: 10, margin: '0 0 3px' }}>Departments</p>
                <p style={{ color: '#9ca3af', fontSize: 15, fontWeight: 700, margin: 0 }}>{Object.keys(byDept).length}</p>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

