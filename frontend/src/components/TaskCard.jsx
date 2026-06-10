export default function TaskCard({ task, onValidate, onStatusChange, showValidation }) {
  const statusConfig = {
    pending:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  label: 'Pending' },
    done:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   label: 'Done' },
    overdue:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   label: 'Overdue' },
    escalated: { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  label: 'Escalated' },
  }
  const s = statusConfig[task.status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)', label: task.status }

  const validatedConfig = {
    approved: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   label: 'approved' },
    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   label: 'rejected' },
    pending:  { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', label: 'pending' },
  }
  const v = validatedConfig[task.validated] || validatedConfig.pending

  const confColor = task.confidence >= 70 ? '#22c55e' : task.confidence >= 40 ? '#fbbf24' : '#ef4444'

  const deadlineSoon = (() => {
    try {
      const d = new Date(task.deadline)
      const diff = (d - Date.now()) / 86400000
      return diff >= 0 && diff <= 3
    } catch { return false }
  })()

  return (
    <div
      className="anim-fade-up"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${s.color}`,
        borderRadius: 12,
        padding: '16px 18px',
        transition: 'transform 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${s.color}22`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <h3 style={{ color: '#f3f4f6', fontWeight: 600, fontSize: 13, lineHeight: 1.45, flex: 1, margin: 0 }}>
          {task.title}
        </h3>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: s.bg, color: s.color, border: `1px solid ${s.border}`,
          flexShrink: 0, letterSpacing: '0.03em', whiteSpace: 'nowrap'
        }}>
          {s.label}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.55, marginBottom: 14, margin: '0 0 14px' }}>
          {task.description.length > 110 ? task.description.slice(0, 110) + '…' : task.description}
        </p>
      )}

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
        <div>
          <p style={{ color: '#374151', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Assigned</p>
          <p style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 500, margin: 0, textTransform: 'capitalize' }}>{task.assigned_to}</p>
        </div>
        <div>
          <p style={{ color: '#374151', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Deadline</p>
          <p style={{ color: deadlineSoon ? '#fbbf24' : '#e5e7eb', fontSize: 12, fontWeight: 500, margin: 0 }}>
            {deadlineSoon && <span style={{ marginRight: 3 }}>⚡</span>}
            {task.deadline}
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ color: '#374151', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Confidence</span>
          <span style={{ color: confColor, fontSize: 11, fontWeight: 700 }}>{task.confidence}%</span>
        </div>
        <div style={{ height: 3, background: '#1e2030', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${task.confidence}%`, height: '100%',
            background: `linear-gradient(to right, ${confColor}88, ${confColor})`,
            borderRadius: 2,
            animation: 'bar-grow 1s ease both'
          }} />
        </div>
      </div>

      {/* Validated badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: task.escalated_to || showValidation || onStatusChange ? 10 : 0 }}>
        <span style={{
          fontSize: 9, padding: '2px 8px', borderRadius: 4,
          background: v.bg, color: v.color, letterSpacing: '0.04em'
        }}>
          Validated: {v.label}
        </span>
      </div>

      {/* Escalation notice */}
      {task.escalated_to && (
        <div style={{
          fontSize: 11, color: '#fb923c',
          background: 'rgba(249,115,22,0.08)',
          border: '1px solid rgba(249,115,22,0.2)',
          padding: '5px 10px', borderRadius: 6, marginBottom: 10
        }}>
          Escalated → {task.escalated_to}
        </div>
      )}

      {/* Validation buttons */}
      {showValidation && task.validated === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onValidate(task.id, 'approved')}
            style={{
              flex: 1, padding: '8px', fontSize: 12, fontWeight: 600,
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
              color: '#22c55e', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.12)'}
          >
            Approve
          </button>
          <button
            onClick={() => onValidate(task.id, 'rejected')}
            style={{
              flex: 1, padding: '8px', fontSize: 12, fontWeight: 600,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
          >
            Reject
          </button>
        </div>
      )}

      {/* Status change */}
      {onStatusChange && (
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value)}
          style={{
            width: '100%', marginTop: 4,
            background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)',
            color: s.color, fontSize: 12, borderRadius: 8,
            padding: '7px 10px', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="pending">Pending</option>
          <option value="done">Done</option>
          <option value="overdue">Overdue</option>
          <option value="escalated">Escalated</option>
        </select>
      )}
    </div>
  )
}
