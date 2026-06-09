import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getMeetings, uploadTranscript } from '../api'

export default function PMDashboard() {
  const [meetings,    setMeetings]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showUpload,  setShowUpload]  = useState(false)
  const [form,        setForm]        = useState({ title: '', department: 'IT', participants: '', transcript: '' })
  const [submitting,  setSubmitting]  = useState(false)
  const navigate = useNavigate()

  useEffect(() => { fetchMeetings() }, [])

  async function fetchMeetings() {
    try {
      const res = await getMeetings()
      setMeetings(res.data)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    setSubmitting(true)
    try {
      const participants = form.participants.split(',').map(p => {
        const [name, role] = p.trim().split(':')
        return { name: name.trim(), role: (role || 'employee').trim() }
      })
      await uploadTranscript({ ...form, participants })
      setShowUpload(false)
      setForm({ title: '', department: 'IT', participants: '', transcript: '' })
      setTimeout(fetchMeetings, 2000)
    } finally {
      setSubmitting(false)
    }
  }

  const statusColor = {
    processing: 'bg-yellow-900 text-yellow-300',
    completed:  'bg-green-900 text-green-300',
    failed:     'bg-red-900 text-red-300',
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar title="PM Dashboard" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">All Meetings</h2>
            <p className="text-gray-500 mt-1">Click any meeting to review AI-extracted tasks</p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-medium transition"
          >
            + Upload Transcript
          </button>
        </div>

        {showUpload && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
            <h3 className="text-white font-semibold mb-4">New Meeting Transcript</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Meeting Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="Sprint Planning Q2"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Department</label>
                <input
                  value={form.department}
                  onChange={e => setForm({...form, department: e.target.value})}
                  placeholder="IT"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-1 block">
                Participants <span className="text-gray-600">(format: Name:role, Name:role)</span>
              </label>
              <input
                value={form.participants}
                onChange={e => setForm({...form, participants: e.target.value})}
                placeholder="Rahul:employee, Priya:pm, Amit:employee"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-1 block">Transcript</label>
              <textarea
                value={form.transcript}
                onChange={e => setForm({...form, transcript: e.target.value})}
                rows={5}
                placeholder="Paste the meeting transcript here..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                {submitting ? 'Sending to AI agents...' : 'Process with CrewAI'}
              </button>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-white px-4 py-2 transition"
              >Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-gray-500 text-center py-20">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <div className="text-gray-600 text-center py-20">No meetings yet. Upload a transcript to get started.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map(m => (
              <div
                key={m.id}
                onClick={() => navigate(`/meeting/${m.id}`)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-purple-700 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-white font-medium">{m.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${(statusColor[m.status] || 'bg-gray-800 text-gray-400')}`}>
                    {m.status}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-3">{m.department}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{new Date(m.date).toLocaleDateString()}</span>
                  <span className="text-purple-400">{m.task_count} tasks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}