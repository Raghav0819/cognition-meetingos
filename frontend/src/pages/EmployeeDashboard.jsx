import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import TaskCard from '../components/TaskCard'
import { getUserTasks, updateTaskStatus } from '../api'

export default function EmployeeDashboard() {
  const user              = JSON.parse(localStorage.getItem('user') || '{}')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar title="My Tasks" />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">{pending.length}</p>
            <p className="text-gray-500 text-sm mt-1">Pending</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{done.length}</p>
            <p className="text-gray-500 text-sm mt-1">Done</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{overdue.length}</p>
            <p className="text-gray-500 text-sm mt-1">Overdue / Escalated</p>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500 text-center py-20">Loading your tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-gray-600 text-center py-20">No tasks assigned to you yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map(t => (
              <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}