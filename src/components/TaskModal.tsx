import { useState, useEffect } from 'react'
import type { Task } from '../types'
import './TaskModal.css'

interface TaskModalProps {
  task: Task | null
  parents: Task[]
  onSave: (data: {
    name: string
    details: string
    percent: number
    scheduledAt: string
    deadline: string
    parentId: string | null
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

export default function TaskModal({ task, parents, onSave, onClose }: TaskModalProps) {
  const [name, setName] = useState('')
  const [details, setDetails] = useState('')
  const [percent, setPercent] = useState(0)
  const [scheduledAt, setScheduledAt] = useState('')
  const [deadline, setDeadline] = useState('')
  const [isSubtask, setIsSubtask] = useState(false)
  const [parentId, setParentId] = useState('')

  const isEdit = !!task

  useEffect(() => {
    if (task) {
      setName(task.name)
      setDetails(task.details)
      setPercent(task.percent)
      setScheduledAt(toLocalDatetime(task.scheduledAt))
      setDeadline(toLocalDatetime(task.deadline))
      setIsSubtask(!!task.parentId)
      setParentId(task.parentId ?? '')
    } else {
      const now = new Date()
      const defaultStart = toLocalDatetime(now.toISOString())
      const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      setName('')
      setDetails('')
      setPercent(0)
      setScheduledAt(defaultStart)
      setDeadline(toLocalDatetime(defaultEnd.toISOString()))
      setIsSubtask(false)
      setParentId('')
    }
  }, [task])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    if (isSubtask && !parentId) return
    onSave({
      name: trimmedName,
      details: details.trim(),
      percent: Math.min(100, Math.max(0, percent)),
      scheduledAt: toISO(scheduledAt),
      deadline: toISO(deadline),
      parentId: isSubtask ? parentId : null,
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
          <div className="modal-type-row">
            <label className="inline-label">
              <input
                type="radio"
                checked={!isSubtask}
                onChange={() => setIsSubtask(false)}
              />
              大任务
            </label>
            <label className="inline-label">
              <input
                type="radio"
                checked={isSubtask}
                onChange={() => {
                  if (parents.length === 0) return
                  setIsSubtask(true)
                }}
                disabled={parents.length === 0}
              />
              子任务
            </label>
          </div>
          {isSubtask && (
            <label>
              <span>所属大任务</span>
              <select value={parentId} onChange={e => setParentId(e.target.value)} required>
                <option value="">选择所属大任务</option>
                {parents.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
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
