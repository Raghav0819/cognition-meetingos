import { useNavigate } from 'react-router-dom'

const users = [
  { name: 'Priya',   role: 'pm',       label: 'PM / Admin',  color: 'bg-purple-600', route: '/pm' },
  { name: 'Rahul',   role: 'employee', label: 'Employee',    color: 'bg-blue-600',   route: '/employee' },
  { name: 'Amit',    role: 'employee', label: 'Employee',    color: 'bg-blue-600',   route: '/employee' },
  { name: 'Manager', role: 'manager',  label: 'Manager',     color: 'bg-green-600',  route: '/manager' },
]

export default function Login() {
  const navigate = useNavigate()

  function login(user) {
    localStorage.setItem('user', JSON.stringify(user))
    navigate(user.route)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Cognition</h1>
          <p className="text-gray-400 text-lg">MeetingOS — AI Execution Platform</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <p className="text-gray-400 text-sm mb-6 text-center">Select your role to continue</p>
          <div className="flex flex-col gap-3">
            {users.map(u => (
              <button
                key={u.name}
                onClick={() => login(u)}
                className="w-full py-3 px-5 rounded-xl text-white font-medium flex items-center justify-between hover:opacity-90 transition bg-gray-800 border border-gray-700 hover:border-gray-500"
              >
                <span>{u.name}</span>
                <span className={`text-xs px-3 py-1 rounded-full text-white ${u.color}`}>{u.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}