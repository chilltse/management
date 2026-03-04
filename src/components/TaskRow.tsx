import type { Task } from '../types'

interface TaskRowProps {
  task: Task
  onEdit: () => void
  onDelete: () => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TaskRow({ task, onEdit, onDelete }: TaskRowProps) {
  const isOverdue = new Date(task.deadline) < new Date() && task.percent < 100
  const progressClass = task.percent >= 100 ? 'done' : isOverdue ? 'overdue' : 'partial'

  return (
    <tr>
      <td>
        <strong>{task.name}</strong>
      </td>
      <td className="details-cell" title={task.details}>
        {task.details || '—'}
      </td>
      <td className="progress-cell">
        <div className="progress-bar-wrap">
          <div
            className={`progress-bar-fill ${progressClass}`}
            style={{ width: `${Math.min(100, task.percent)}%` }}
          />
        </div>
        <span className="progress-text">{task.percent}%</span>
      </td>
      <td className="date-cell">{formatDate(task.scheduledAt)}</td>
      <td className={`date-cell ${isOverdue ? 'overdue' : ''}`}>
        {formatDate(task.deadline)}
      </td>
      <td>
        <div className="row-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onEdit}>
            编辑
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
            删除
          </button>
        </div>
      </td>
    </tr>
  )
}
