import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { taskStorage, dailyPlanStorage, dailySummaryStorage } from '../storage'
import type { Task, DailyPlan } from '../types'
import './Dashboard.css'

function toDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export default function Today() {
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [plans, setPlans] = useState<DailyPlan[]>([])
  const [focusMinutes, setFocusMinutes] = useState(0)
  const [newPlanTitle, setNewPlanTitle] = useState('')
  const [newSegmentPercent, setNewSegmentPercent] = useState(10)
  const [newTaskId, setNewTaskId] = useState<string>('')

  const todayKey = useMemo(() => toDateKey(new Date()), [])

  useEffect(() => {
    if (user) {
      setTasks(taskStorage.getByUserId(user.id))
      setPlans(dailyPlanStorage.getByUserAndDate(user.id, todayKey))
      const summary = dailySummaryStorage.getByUserAndDate(user.id, todayKey)
      setFocusMinutes(summary?.focusMinutes ?? 0)
    }
  }, [user, todayKey])

  const todayPlans = useMemo(
    () => [...plans].sort((a, b) => (a.id < b.id ? -1 : 1)),
    [plans]
  )

  const getTaskForPlan = useCallback(
    (plan: DailyPlan): Task | null =>
      plan.taskId ? tasks.find(t => t.id === plan.taskId) ?? null : null,
    [tasks]
  )

  const handleAddPlan = useCallback(() => {
    if (!user) return
    const title = newPlanTitle.trim() || '未命名'
    const seg = Math.max(0, Math.min(100, Math.floor(newSegmentPercent) || 0))
    const entry: DailyPlan = {
      id: crypto.randomUUID(),
      userId: user.id,
      taskId: newTaskId || null,
      title,
      date: todayKey,
      expectedDurationMinutes: null,
      actualDurationMinutes: null,
      segmentPercent: seg,
      done: false,
    }
    dailyPlanStorage.add(entry)
    setPlans(prev => [...prev, entry])
    setNewPlanTitle('')
  }, [user, todayKey, newPlanTitle, newSegmentPercent, newTaskId])

  const handleToggleDone = useCallback(
    (plan: DailyPlan, checked: boolean) => {
      if (!user) return
      const seg = plan.segmentPercent ?? 0
      const wasDone = plan.done ?? false
      dailyPlanStorage.updateById(plan.id, { done: checked })
      if (plan.taskId) {
        const task = tasks.find(t => t.id === plan.taskId)
        if (task) {
          let delta = 0
          if (checked && !wasDone) delta = seg
          if (!checked && wasDone) delta = -seg
          const next = clampPercent(task.percent + delta)
          taskStorage.update(plan.taskId, { percent: next })
          setTasks(prev => prev.map(t => (t.id === plan.taskId ? { ...t, percent: next } : t)))
        }
      }
      setPlans(prev =>
        prev.map(p => (p.id === plan.id ? { ...p, done: checked } : p))
      )
    },
    [user, tasks]
  )

  const handlePlanPatch = useCallback((planId: string, patch: Partial<DailyPlan>) => {
    const updated = dailyPlanStorage.updateById(planId, patch)
    if (!updated) return
    setPlans(prev => prev.map(p => (p.id === planId ? updated : p)))
  }, [])

  const handlePercentChange = useCallback(
    (plan: DailyPlan, value: number) => {
      if (!plan.taskId) return
      const next = clampPercent(value)
      taskStorage.update(plan.taskId, { percent: next })
      setTasks(prev =>
        prev.map(t => (t.id === plan.taskId ? { ...t, percent: next } : t))
      )
      dailyPlanStorage.updateById(plan.id, { percentAtEnd: next })
      setPlans(prev => prev.map(p => (p.id === plan.id ? { ...p, percentAtEnd: next } : p)))
    },
    []
  )

  const handleRemovePlan = useCallback(
    (plan: DailyPlan) => {
      if (plan.done && plan.taskId) {
        const task = tasks.find(t => t.id === plan.taskId)
        if (task) {
          const next = clampPercent(task.percent - (plan.segmentPercent ?? 0))
          taskStorage.update(plan.taskId, { percent: next })
          setTasks(prev => prev.map(t => (t.id === plan.taskId ? { ...t, percent: next } : t)))
        }
      }
      dailyPlanStorage.remove(plan.id)
      setPlans(prev => prev.filter(p => p.id !== plan.id))
    },
    [tasks]
  )

  const handleFocusMinutesChange = useCallback(
    (value: number) => {
      if (!user) return
      const next = Math.max(0, Math.floor(value) || 0)
      setFocusMinutes(next)
      dailySummaryStorage.setFocusMinutes(user.id, todayKey, next)
    },
    [todayKey, user]
  )

  const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#14b8a6', '#ec4899']

  const todayPieItems = useMemo(() => {
    const items: { label: string; value: number; color: string }[] = []
    let colorIndex = 0
    for (const plan of plans) {
      const duration = plan.actualDurationMinutes ?? 0
      if (duration <= 0) continue
      const task = plan.taskId ? tasks.find(t => t.id === plan.taskId) : null
      items.push({
        label: plan.title ?? task?.name ?? '未命名',
        value: duration,
        color: COLORS[colorIndex % COLORS.length],
      })
      colorIndex += 1
    }
    return items
  }, [plans, tasks])

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>今日计划</h1>
        <div className="header-actions">
          <Link to="/" className="btn btn-ghost">
            总览
          </Link>
          <Link to="/stats" className="btn btn-ghost">
            统计分析
          </Link>
          <span className="user-email">{user?.email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            退出
          </button>
        </div>
      </header>

      <section className="task-section">
        <div className="section-head">
          <h2>今日任务</h2>
          <span className="stat-label">共 {todayPlans.length} 个</span>
        </div>

        <div
          style={{
            padding: '0 20px 12px',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span className="stat-label">今日任务名称</span>
          <input
            type="text"
            placeholder="输入名称即可添加"
            value={newPlanTitle}
            onChange={e => setNewPlanTitle(e.target.value)}
            style={{ width: 200 }}
          />
          <span className="stat-label">占比 %</span>
          <input
            type="number"
            min={0}
            max={100}
            style={{ width: 64 }}
            value={newSegmentPercent}
            onChange={e =>
              setNewSegmentPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
            }
          />
          <span className="stat-label">绑定总览任务（可选）</span>
          <select
            value={newTaskId}
            onChange={e => setNewTaskId(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">不绑定</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={handleAddPlan}>
            添加
          </button>
        </div>

        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <span className="stat-label">今日专注时间（分钟）</span>
          <input
            type="number"
            min={0}
            style={{ width: 100 }}
            value={focusMinutes}
            onChange={e => handleFocusMinutesChange(Number(e.target.value))}
          />
        </div>

        <div className="task-table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>完成</th>
                <th>今日任务名称</th>
                <th>绑定总览任务</th>
                <th>占比 %</th>
                <th>总览进度</th>
                <th>预计时长（分钟）</th>
                <th>实际时长（分钟）</th>
                <th>预定时间</th>
                <th>截止时间</th>
                <th className="th-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {todayPlans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-cell">
                    暂无今日计划，在上方输入今日任务名称并点击「添加」。
                  </td>
                </tr>
              ) : (
                todayPlans.map(plan => {
                  const task = getTaskForPlan(plan)
                  const start = task
                    ? new Date(task.scheduledAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'
                  const deadline = task
                    ? new Date(task.deadline).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'
                  return (
                    <tr key={plan.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={plan.done ?? false}
                          onChange={e => handleToggleDone(plan, e.target.checked)}
                        />
                      </td>
                      <td>
                        <textarea
                          value={plan.title ?? ''}
                          onChange={e =>
                            handlePlanPatch(plan.id, { title: e.target.value })
                          }
                          rows={2}
                          style={{ width: '100%', resize: 'vertical' }}
                        />
                      </td>
                      <td>
                        <span className="stat-label">
                          {task ? task.name : '—'}
                        </span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          style={{ width: 64 }}
                          value={plan.segmentPercent ?? 0}
                          onChange={e =>
                            handlePlanPatch(plan.id, {
                              segmentPercent: Math.max(
                                0,
                                Math.min(100, Number(e.target.value) || 0)
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        {task ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            style={{ width: 80 }}
                            value={task.percent}
                            onChange={e =>
                              handlePercentChange(plan, Number(e.target.value))
                            }
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          style={{ width: 100 }}
                          value={plan.expectedDurationMinutes ?? 0}
                          onChange={e =>
                            handlePlanPatch(plan.id, {
                              expectedDurationMinutes: Math.max(
                                0,
                                Math.floor(Number(e.target.value) || 0)
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          style={{ width: 100 }}
                          value={plan.actualDurationMinutes ?? 0}
                          onChange={e =>
                            handlePlanPatch(plan.id, {
                              actualDurationMinutes: Math.max(
                                0,
                                Math.floor(Number(e.target.value) || 0)
                              ),
                            })
                          }
                        />
                      </td>
                      <td className="date-cell">{start}</td>
                      <td className="date-cell">{deadline}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemovePlan(plan)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="task-section" style={{ marginTop: 24 }}>
        <div className="section-head">
          <h2>今日实际用时占比（饼状图）</h2>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '20px',
          }}
        >
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="#111118" />
            {todayPieItems.length === 0 ? (
              <text x="80" y="84" textAnchor="middle" fill="#666" fontSize="12">
                暂无实际用时数据
              </text>
            ) : (
              (() => {
                const total = todayPieItems.reduce((s, i) => s + i.value, 0)
                let startAngle = 0
                const radius = 70
                const cx = 80
                const cy = 80
                return todayPieItems.map((item, index) => {
                  const angle = (item.value / total) * Math.PI * 2
                  const endAngle = startAngle + angle
                  const x1 = cx + radius * Math.cos(startAngle)
                  const y1 = cy + radius * Math.sin(startAngle)
                  const x2 = cx + radius * Math.cos(endAngle)
                  const y2 = cy + radius * Math.sin(endAngle)
                  const largeArc = angle > Math.PI ? 1 : 0
                  const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
                  startAngle = endAngle
                  return <path key={index} d={d} fill={item.color} />
                })
              })()
            )}
          </svg>
          <div>
            <div className="stat-label" style={{ marginBottom: 8 }}>
              按「实际完成时长（分钟）」绘制。
            </div>
            {todayPieItems.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {todayPieItems.map((item, index) => (
                  <li
                    key={index}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: item.color,
                      }}
                    />
                    <span style={{ fontSize: 13 }}>
                      {item.label}（{item.value} 分钟）
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
