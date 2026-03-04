import type { Task } from '../types'

interface TaskRowProps {
  task: Task
  levelLabel?: string
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

function daysUntil(iso: string) {
  const now = new Date()
  const deadline = new Date(iso)
  const diffMs = deadline.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays
}

export default function TaskRow({ task, levelLabel, onEdit, onDelete }: TaskRowProps) {
  const isOverdue = new Date(task.deadline) < new Date() && task.percent < 100
  const progressClass = task.percent >= 100 ? 'done' : isOverdue ? 'overdue' : 'partial'
  const dLeft = daysUntil(task.deadline)

  return (
    <tr>
      <td>
        <strong>{task.name}</strong>
      </td>
      <td className="level-cell">{levelLabel ?? (task.parentId ? '子任务' : '大任务')}</td>
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
      <td className={`days-left-cell ${dLeft <= 10 ? 'urgent' : ''}`}>
        {dLeft > 0 && `${dLeft} 天`}
        {dLeft === 0 && '今天'}
        {dLeft < 0 && `${Math.abs(dLeft)} 天前`}
      </td>
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
