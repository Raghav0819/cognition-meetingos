import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar({ title }) {
  const navigate = useNavigate()
  const { userProfile, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const roleConfig = {
    pm:       { label: 'Project Manager', cls: 'text-violet-300',  bg: 'rgba(124,58,237,0.15)',  border: 'rgba(124,58,237,0.35)' },
    employee: { label: 'Employee',        cls: 'text-sky-300',     bg: 'rgba(14,165,233,0.15)',  border: 'rgba(14,165,233,0.35)' },
    manager:  { label: 'Manager',         cls: 'text-emerald-300', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)' },
  }
  const role = roleConfig[userProfile?.role] || { label: userProfile?.role, cls: 'text-gray-300', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' }
  const initials = (userProfile?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <nav style={{
      background: 'rgba(7,7,15,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '0 24px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Left: brand + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #7c3aed, #c084fc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.3px' }}>Cognition</span>
          <span style={{ color: '#a78bfa', fontWeight: 300, fontSize: 14 }}>MeetingOS</span>
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 16 }}>/</span>
            <span style={{ color: '#6b7280', fontSize: 13 }}>{title}</span>
          </div>
        )}
      </div>

      {/* Right: role badge + user + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          padding: '4px 10px', borderRadius: 20,
          background: role.bg, color: role.cls,
          border: `1px solid ${role.border}`,
          letterSpacing: '0.02em'
        }}>
          {role.label}
        </span>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
            flexShrink: 0, userSelect: 'none'
          }}>
            {initials}
          </div>
          <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 500 }}>{userProfile?.name}</span>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            color: '#9ca3af',
            fontSize: 12, padding: '5px 12px', borderRadius: 8,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
