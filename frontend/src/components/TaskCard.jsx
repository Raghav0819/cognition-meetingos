export default function TaskCard({ task, onValidate, onStatusChange, showValidation }) {
  const confidenceColor =
    task.confidence >= 70 ? 'text-green-400' :
    task.confidence >= 40 ? 'text-yellow-400' : 'text-red-400'

  const statusColor = {
    pending:   'bg-yellow-900 text-yellow-300',
    done:      'bg-green-900 text-green-300',
    overdue:   'bg-red-900 text-red-300',
    escalated: 'bg-orange-900 text-orange-300',
  }[task.status] || 'bg-gray-800 text-gray-300'

  const validatedColor = {
    approved: 'bg-green-900 text-green-300',
    rejected: 'bg-red-900 text-red-300',
    pending:  'bg-gray-800 text-gray-400',
  }[task.validated] || 'bg-gray-800 text-gray-400'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-white font-medium">{task.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${statusColor}`}>{task.status}</span>
      </div>

      <p className="text-gray-500 text-sm mb-4">{task.description}</p>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div><span className="text-gray-600">Assigned</span><p className="text-gray-300">{task.assigned_to}</p></div>
        <div><span className="text-gray-600">Deadline</span><p className="text-gray-300">{task.deadline}</p></div>
        <div><span className="text-gray-600">Confidence</span><p className={`font-semibold ${confidenceColor}`}>{task.confidence}%</p></div>
        <div><span className="text-gray-600">Validated</span><p className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${validatedColor}`}>{task.validated}</p></div>
      </div>

      {task.escalated_to && (
        <div className="text-xs text-orange-400 mb-3">Escalated to: {task.escalated_to}</div>
      )}

      {showValidation && task.validated === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onValidate(task.id, 'approved')}
            className="flex-1 py-1.5 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition"
          >Approve</button>
          <button
            onClick={() => onValidate(task.id, 'rejected')}
            className="flex-1 py-1.5 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg transition"
          >Reject</button>
        </div>
      )}

      {onStatusChange && (
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value)}
          className="w-full mt-3 bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700"
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