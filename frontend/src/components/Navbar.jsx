import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar({ title }) {
  const navigate = useNavigate()
  const { userProfile, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const roleColors = {
    pm:       'bg-purple-900 text-purple-300',
    employee: 'bg-blue-900 text-blue-300',
    manager:  'bg-green-900 text-green-300',
  }

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
      <div>
        <span className="text-white font-semibold text-lg">Cognition MeetingOS</span>
        {title && <span className="text-gray-500 ml-3 text-sm">/ {title}</span>}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-400 text-sm">{userProfile?.name}</span>
        <span className={`text-xs px-3 py-1 rounded-full ${roleColors[userProfile?.role] || 'bg-gray-800 text-gray-400'}`}>
          {userProfile?.role}
        </span>
        <button onClick={handleLogout} className="text-gray-500 hover:text-white text-sm transition">
          Logout
        </button>
      </div>
    </div>
  )
}
