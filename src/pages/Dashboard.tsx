import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { taskStorage, userNoteStorage } from '../storage'
import type { Task } from '../types'
import TaskRow from '../components/TaskRow'
import TaskModal from '../components/TaskModal'
import './Dashboard.css'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (user) setTasks(taskStorage.getByUserId(user.id))
  }, [user])
  useEffect(() => {
    if (user) setNote(userNoteStorage.get(user.id))
  }, [user])
  useEffect(() => {
    if (user) userNoteStorage.set(user.id, note)
  }, [user, note])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const refreshTasks = useCallback(() => {
    if (user) setTasks(taskStorage.getByUserId(user.id))
  }, [user])

  const handleSave = useCallback(
    (data: {
      name: string
      details: string
      percent: number
      scheduledAt: string
      deadline: string
      parentId: string | null
    }) => {
      if (!user) return
      const now = new Date().toISOString()
      if (editingId) {
        taskStorage.update(editingId, { ...data, updatedAt: now })
        setEditingId(null)
      } else {
        taskStorage.add({
          id: crypto.randomUUID(),
          userId: user.id,
          ...data,
          createdAt: now,
          updatedAt: now,
        })
        setCreating(false)
      }
      refreshTasks()
    },
    [user, editingId, refreshTasks]
  )

  const handleDelete = useCallback(
    (id: string) => {
      taskStorage.remove(id)
      if (editingId === id) setEditingId(null)
      refreshTasks()
    },
    [editingId, refreshTasks]
  )

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter(t => t.percent >= 100).length
    const overdue = tasks.filter(t => new Date(t.deadline) < new Date() && t.percent < 100).length
    const avg = total ? Math.round(tasks.reduce((s, t) => s + t.percent, 0) / total) : 0
    return { total, done, overdue, avg }
  }, [tasks])

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const da = new Date(a.deadline).getTime()
        const db = new Date(b.deadline).getTime()
        return da - db
      }),
    [tasks]
  )

  const parentNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tasks) {
      if (!t.parentId) {
        map.set(t.id, t.name)
      }
    }
    return map
  }, [tasks])

  const editingTask: Task | null = editingId
    ? tasks.find(t => t.id === editingId) ?? null
    : null

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNote(e.target.value)
    },
    []
  )

  return (
    <div className="dashboard dashboard-with-sidebar">
      <aside className="dashboard-sidebar">
        <div className="note-panel">
          <h3 className="note-panel-title">记事栏</h3>
          <textarea
            className="note-textarea"
            placeholder="写点备忘…"
            value={note}
            onChange={handleNoteChange}
            rows={6}
          />
          <div className="note-footer">
            <span className="note-persist-hint">已自动保存到本地</span>
            <span className="note-char-count">{note.length} 字</span>
          </div>
        </div>
      </aside>
      <main className="dashboard-main">
      <header className="dashboard-header">
        <h1>项目进度</h1>
        <div className="header-actions">
          <Link to="/today" className="btn btn-ghost">
            今日计划
          </Link>
          <span className="user-email">{user?.email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            退出
          </button>
        </div>
      </header>

      <section className="stats">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">总任务</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.done}</span>
          <span className="stat-label">已完成</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-value">{stats.overdue}</span>
          <span className="stat-label">已逾期</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.avg}%</span>
          <span className="stat-label">平均进度</span>
        </div>
      </section>

      <section className="task-section">
        <div className="section-head">
          <h2>任务列表</h2>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            新建任务
          </button>
        </div>

        <div className="task-table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>任务名称</th>
                <th>层级</th>
                <th>明细</th>
                <th>进度</th>
                <th>预定时间</th>
                <th>剩余天数</th>
                <th>截止时间</th>
                <th className="th-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    暂无任务，点击「新建任务」添加
                  </td>
                </tr>
              ) : (
                sortedTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    levelLabel={task.parentId ? `子任务（${parentNameMap.get(task.parentId) ?? '未知'}）` : '大任务'}
                    onEdit={() => setEditingId(task.id)}
                    onDelete={() => handleDelete(task.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {(creating || editingTask) && (
        <TaskModal
          task={editingTask}
          parents={tasks.filter(t => !t.parentId)}
          onSave={handleSave}
          onClose={() => {
            setCreating(false)
            setEditingId(null)
          }}
        />
      )}
      </main>
    </div>
  )
}
