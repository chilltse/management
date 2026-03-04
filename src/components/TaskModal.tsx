import { useState, useEffect } from 'react'
import type { Task } from '../types'
import './TaskModal.css'

interface TaskModalProps {
  task: Task | null
  onSave: (data: {
    name: string
    details: string
    percent: number
    scheduledAt: string
    deadline: string
  }) => void
  onClose: () => void
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

function toISO(dt: string): string {
  return new Date(dt).toISOString()
}

export default function TaskModal({ task, onSave, onClose }: TaskModalProps) {
  const [name, setName] = useState('')
  const [details, setDetails] = useState('')
  const [percent, setPercent] = useState(0)
  const [scheduledAt, setScheduledAt] = useState('')
  const [deadline, setDeadline] = useState('')

  const isEdit = !!task

  useEffect(() => {
    if (task) {
      setName(task.name)
      setDetails(task.details)
      setPercent(task.percent)
      setScheduledAt(toLocalDatetime(task.scheduledAt))
      setDeadline(toLocalDatetime(task.deadline))
    } else {
      const now = new Date()
      const defaultStart = toLocalDatetime(now.toISOString())
      const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      setName('')
      setDetails('')
      setPercent(0)
      setScheduledAt(defaultStart)
      setDeadline(toLocalDatetime(defaultEnd.toISOString()))
    }
  }, [task])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    onSave({
      name: trimmedName,
      details: details.trim(),
      percent: Math.min(100, Math.max(0, percent)),
      scheduledAt: toISO(scheduledAt),
      deadline: toISO(deadline),
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? '编辑任务' : '新建任务'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            <span>任务名称 *</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入任务名称"
              required
            />
          </label>
          <label>
            <span>任务明细</span>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="描述、子项等"
              rows={3}
            />
          </label>
          <label>
            <span>完成进度 (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={percent}
              onChange={e => setPercent(Number(e.target.value) || 0)}
            />
          </label>
          <label>
            <span>预定开始时间</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
            />
          </label>
          <label>
            <span>截止时间 (DDL)</span>
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
