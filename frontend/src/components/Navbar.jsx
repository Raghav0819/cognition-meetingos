import { useNavigate } from 'react-router-dom'

export default function Navbar({ title }) {
  const navigate  = useNavigate()
  const user      = JSON.parse(localStorage.getItem('user') || '{}')

  function logout() {
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
      <div>
        <span className="text-white font-semibold text-lg">Cognition MeetingOS</span>
        {title && <span className="text-gray-500 ml-3 text-sm">/ {title}</span>}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-400 text-sm">{user.name}</span>
        <span className="text-xs bg-purple-900 text-purple-300 px-3 py-1 rounded-full">{user.role}</span>
        <button onClick={logout} className="text-gray-500 hover:text-white text-sm transition">Logout</button>
      </div>
    </div>
  )
}