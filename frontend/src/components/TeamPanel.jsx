import { useEffect, useState } from 'react'
import { getCompanyTeam, getCompanyInfo, regenerateInvite, removeTeamMember } from '../api'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

const ROLE_STYLES = {
  pm:       { label: 'PM / Admin', color: '#c084fc', bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.3)' },
  manager:  { label: 'Manager',    color: '#34d399', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  employee: { label: 'Employee',   color: '#60a5fa', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
}

export default function TeamPanel({ isPM = false }) {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const [team, setTeam]               = useState([])
  const [companyInfo, setCompanyInfo]  = useState(null)
  const [loading, setLoading]         = useState(true)
  const [copied, setCopied]           = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [teamRes, infoRes] = await Promise.all([getCompanyTeam(), getCompanyInfo()])
      setTeam(teamRes.data)
      setCompanyInfo(infoRes.data)
    } catch {
      toast('Failed to load team data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const res = await regenerateInvite()
      setCompanyInfo(prev => ({
        ...prev,
        inviteCode: res.data.inviteCode,
        expiresAt: res.data.expiresAt,
      }))
      toast('Invite code regenerated successfully', 'success')
    } catch {
      toast('Failed to regenerate invite code', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleRemoveMember(uid, name) {
    if (!confirm(`Are you sure you want to remove ${name} from the company?`)) return
    try {
      await removeTeamMember(uid)
      setTeam(prev => prev.filter(m => m.uid !== uid))
      setCompanyInfo(prev => prev ? { ...prev, memberCount: prev.memberCount - 1 } : prev)
      toast(`${name} removed successfully`, 'success')
    } catch {
      toast(`Failed to remove ${name}`, 'error')
    }
  }

  function copyCode(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const roleCounts = team.reduce((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1
    return acc
  }, {})

  const isExpired = companyInfo?.expiresAt
    ? new Date(companyInfo.expiresAt) < new Date()
    : false

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="anim-spin" style={{
            width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)',
            borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 12px'
          }} />
          <p style={{ color: '#4b5563', fontSize: 13 }}>Loading team…</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Members" value={team.length} accent="#e5e7eb" icon="👥" />
        <StatCard label="PMs / Admins" value={roleCounts.pm || 0} accent="#c084fc" icon="🔮" />
        <StatCard label="Managers" value={roleCounts.manager || 0} accent="#34d399" icon="📊" />
        <StatCard label="Employees" value={roleCounts.employee || 0} accent="#60a5fa" icon="💼" />
      </div>

      {/* ── Invite code card ──────────────────────────────────────── */}
      {companyInfo && (
        <div className="anim-fade-up" style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            {/* Left: company + code */}
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(167,139,250,0.15))',
                  border: '1px solid rgba(124,58,237,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  🏢
                </div>
                <div>
                  <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{companyInfo.name}</p>
                  <p style={{ color: '#4b5563', fontSize: 12, margin: '2px 0 0' }}>
                    {companyInfo.memberCount} member{companyInfo.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '14px 18px',
              }}>
                <div>
                  <p style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                    Invite Code
                  </p>
                  <p style={{
                    color: '#c4b5fd', fontFamily: 'monospace', fontSize: 22, fontWeight: 800,
                    letterSpacing: '0.15em', margin: 0,
                  }}>
                    {companyInfo.inviteCode}
                  </p>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => copyCode(companyInfo.inviteCode)}
                    style={{
                      background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      color: copied ? '#22c55e' : '#9ca3af',
                      fontSize: 12, padding: '7px 14px', borderRadius: 8,
                      cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500,
                    }}
                  >
                    {copied ? '✓ Copied' : '⎘ Copy'}
                  </button>

                  {isPM && (
                    <button
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      style={{
                        background: regenerating ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.15)',
                        border: '1px solid rgba(124,58,237,0.3)',
                        color: '#a78bfa',
                        fontSize: 12, padding: '7px 14px', borderRadius: 8,
                        cursor: regenerating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s', fontWeight: 500,
                        opacity: regenerating ? 0.6 : 1,
                      }}
                    >
                      {regenerating ? '⟳ Regenerating…' : '↻ Regenerate'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expiry info */}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isExpired ? '#ef4444' : '#22c55e',
                }} />
                <span style={{ color: isExpired ? '#f87171' : '#4b5563', fontSize: 11 }}>
                  {isExpired
                    ? 'Expired — regenerate to create a new code'
                    : `Expires ${new Date(companyInfo.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Team members table ────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
            Team Members
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(roleCounts).map(([role, count]) => {
              const s = ROLE_STYLES[role] || { label: role, color: '#9ca3af', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' }
              return (
                <span key={role} style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                }}>
                  {count} {s.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1.4fr 120px 100px 30px',
          padding: '10px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(255,255,255,0.015)',
        }}>
          {['Name', 'Email', 'Role', 'Joined', ''].map((h, i) => (
            <span key={i} style={{
              color: '#374151', fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {team.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#374151', fontSize: 13 }}>
            No team members found
          </div>
        ) : (
          team.map((member, i) => {
            const s = ROLE_STYLES[member.role] || { label: member.role, color: '#9ca3af', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' }
            const initial = (member.name || '?').charAt(0).toUpperCase()
            
            let canDelete = false
            if (userProfile && member.uid !== userProfile.uid) {
              if (userProfile.role === 'pm' && member.role !== 'pm') canDelete = true
              if (userProfile.role === 'manager' && member.role === 'employee') canDelete = true
            }

            return (
              <div
                key={member.uid}
                className={i === 0 ? 'anim-fade-up' : ''}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.4fr 120px 100px 30px',
                  padding: '14px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                  animationDelay: `${i * 30}ms`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Name + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${s.bg}, ${s.border})`,
                    border: `1px solid ${s.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: s.color, flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                  <span style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>
                    {member.name}
                  </span>
                </div>

                {/* Email */}
                <span style={{ color: '#6b7280', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.email}
                </span>

                {/* Role badge */}
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                  width: 'fit-content',
                }}>
                  {s.label}
                </span>

                {/* Joined date */}
                <span style={{ color: '#4b5563', fontSize: 11 }}>
                  {member.createdAt
                    ? new Date(member.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'
                  }
                </span>
                
                {/* Actions */}
                <div>
                  {canDelete && (
                    <button
                      onClick={() => handleRemoveMember(member.uid, member.name)}
                      style={{
                        background: 'none', border: 'none', padding: '2px', margin: 0,
                        color: '#ef4444', fontSize: 14, cursor: 'pointer',
                        opacity: 0.5, transition: 'opacity 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                      title={`Remove ${member.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}


/* ── Stat card (local to this module) ──────────────────────────── */
function StatCard({ label, value, accent, icon }) {
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
          fontSize: 14,
        }}>{icon}</span>
      </div>
      <p style={{ color: accent || '#fff', fontSize: 30, fontWeight: 800, margin: 0, lineHeight: 1 }}>{value}</p>
    </div>
  )
}
