import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getAllTasks, getMeetings } from '../api'

export default function ManagerDashboard() {
  const [tasks,    setTasks]    = useState([])
  const [meetings, setMeetings] = useState([])
  const [loading,  setLoading]  = useState(true)

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
  const delayed   = tasks.filter(t => t.status === 'overdue').length
  const escalated = tasks.filter(t => t.status === 'escalated').length
  const delayPct  = total ? Math.round((delayed / total) * 100) : 0

  // Group tasks by assignee
  const byPerson = tasks.reduce((acc, t) => {
    if (!acc[t.assigned_to]) acc[t.assigned_to] = []
    acc[t.assigned_to].push(t)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar title="Manager Overview" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Tasks',  value: total,    color: 'text-white' },
            { label: 'Completed',    value: done,      color: 'text-green-400' },
            { label: 'Delayed',      value: delayed,   color: 'text-red-400' },
            { label: 'Delay Rate',   value: `${delayPct}%`, color: delayPct > 30 ? 'text-red-400' : 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {escalated > 0 && (
          <div className="bg-orange-950 border border-orange-800 rounded-xl p-4 mb-6">
            <p className="text-orange-300 font-medium">{escalated} escalated task{escalated > 1 ? 's' : ''} need your attention</p>
            <div className="mt-3 flex flex-col gap-2">
              {tasks.filter(t => t.status === 'escalated').map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-orange-200">{t.title}</span>
                  <span className="text-orange-400">{t.assigned_to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 className="text-white font-semibold mb-4">Team Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Object.entries(byPerson).map(([person, ptasks]) => {
            const pdone    = ptasks.filter(t => t.status === 'done').length
            const pdelayed = ptasks.filter(t => t.status === 'overdue').length
            return (
              <div key={person} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h4 className="text-white font-medium mb-3">{person}</h4>
                <div className="flex gap-4 text-sm">
                  <div><p className="text-yellow-400 font-semibold">{ptasks.length}</p><p className="text-gray-600">total</p></div>
                  <div><p className="text-green-400 font-semibold">{pdone}</p><p className="text-gray-600">done</p></div>
                  <div><p className="text-red-400 font-semibold">{pdelayed}</p><p className="text-gray-600">delayed</p></div>
                </div>
              </div>
            )
          })}
        </div>

        <h3 className="text-white font-semibold mb-4">Recent Meetings</h3>
        <div className="flex flex-col gap-3">
          {meetings.slice(0, 5).map(m => (
            <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{m.title}</p>
                <p className="text-gray-500 text-sm">{m.department} · {new Date(m.date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-purple-400 text-sm">{m.task_count} tasks</span>
                <span className={`text-xs px-2 py-1 rounded-full ${m.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}