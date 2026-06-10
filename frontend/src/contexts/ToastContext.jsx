import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

const CONFIG = {
  success: { icon: '✓', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)'  },
  error:   { icon: '✕', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)'  },
  warning: { icon: '!', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
  info:    { icon: 'i', color: '#a78bfa', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.3)' },
}

function ToastItem({ toast, onDismiss }) {
  const c = CONFIG[toast.type] || CONFIG.info
  return (
    <div
      className="anim-fade-up"
      style={{
        background: 'rgba(10,10,18,0.97)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.color}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 280,
        maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: c.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: c.color, flexShrink: 0,
      }}>
        {c.icon}
      </div>

      <span style={{ color: '#e5e7eb', fontSize: 13, lineHeight: 1.45, flex: 1 }}>
        {toast.message}
      </span>

      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', color: '#374151',
          cursor: 'pointer', fontSize: 13, padding: '0 2px',
          flexShrink: 0, lineHeight: 1, transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#9ca3af'}
        onMouseLeave={e => e.currentTarget.style.color = '#374151'}
      >
        ✕
      </button>

      {/* Shrinking progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'rgba(255,255,255,0.05)',
      }}>
        <div style={{
          height: '100%', background: c.color, transformOrigin: 'left',
          animation: `toast-shrink ${toast.duration}ms linear forwards`,
        }} />
      </div>

      <style>{`@keyframes toast-shrink { from { width: 100% } to { width: 0% } }`}</style>
    </div>
  )
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column-reverse', gap: 8,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration + 400)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
