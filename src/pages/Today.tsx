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

function isToday(iso: string) {
  const d = new Date(iso)
  const todayKey = toDateKey(new Date())
  return toDateKey(d) === todayKey
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
  const [newTaskId, setNewTaskId] = useState<string>('')
  const [newSegmentPercent, setNewSegmentPercent] = useState<number>(10)
  const [newBaseTaskName, setNewBaseTaskName] = useState('')

  const todayKey = useMemo(() => toDateKey(new Date()), [])

  useEffect(() => {
    if (user) {
      setTasks(taskStorage.getByUserId(user.id))
      setPlans(dailyPlanStorage.getByUserAndDate(user.id, todayKey))
      const summary = dailySummaryStorage.getByUserAndDate(user.id, todayKey)
      setFocusMinutes(summary?.focusMinutes ?? 0)
    }
  }, [user, todayKey])

  const todayTasks = useMemo(() => {
    const ids = new Set<string>()
    // 1) 预定时间是今天的任务
    for (const t of tasks) {
      if (isToday(t.scheduledAt)) ids.add(t.id)
    }
    // 2) 已经为今天创建过计划的任务
    for (const p of plans) {
      if (p.date === todayKey) ids.add(p.taskId)
    }
    return tasks
      .filter(t => ids.has(t.id))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  }, [plans, tasks, todayKey])

  const handleToggleDone = useCallback(
    (task: Task, checked: boolean) => {
      if (!user) return
      const existing = plans.find(p => p.taskId === task.id && p.date === todayKey)
      const seg = existing?.segmentPercent ?? 0
      const wasDone = existing?.done ?? false

      // 计算对总进度的增量：勾选 -> +seg；取消勾选 -> -seg
      let delta = 0
      if (checked && !wasDone) delta = seg
      if (!checked && wasDone) delta = -seg

      const nextPercent = clampPercent(task.percent + delta)
      const updated = taskStorage.update(task.id, { percent: nextPercent })
      if (!updated) return
      setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)))

      const entry: DailyPlan = {
        id: existing?.id ?? crypto.randomUUID(),
        userId: user.id,
        taskId: task.id,
        title: existing?.title ?? null,
        date: todayKey,
        expectedDurationMinutes: existing?.expectedDurationMinutes,
        actualDurationMinutes: existing?.actualDurationMinutes,
        segmentPercent: seg,
        done: checked,
        percentAtEnd: nextPercent,
      }
      dailyPlanStorage.upsert(entry)
      setPlans(prev => {
        const idx = prev.findIndex(p => p.taskId === task.id && p.date === todayKey)
        if (idx === -1) return [...prev, entry]
        const copy = [...prev]
        copy[idx] = entry
        return copy
      })
    },
    [plans, todayKey, user]
  )

  const handlePercentChange = useCallback(
    (task: Task, value: number) => {
      const next = clampPercent(value)
      const updated = taskStorage.update(task.id, { percent: next })
      if (!updated || !user) return
      setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)))

      const entry: DailyPlan = {
        id: crypto.randomUUID(),
        userId: user.id,
        taskId: task.id,
        title: getPlanForTask(task.id)?.title ?? null,
        date: todayKey,
        percentAtEnd: next,
      }
      dailyPlanStorage.upsert(entry)
      setPlans(prev => {
        const idx = prev.findIndex(p => p.taskId === task.id && p.date === todayKey)
        if (idx === -1) return [...prev, entry]
        const copy = [...prev]
        copy[idx] = { ...copy[idx], ...entry }
        return copy
      })
    },
    [todayKey, user]
  )

  const handleExpectedDurationChange = useCallback(
    (task: Task, value: number) => {
      if (!user) return
      const minutes = Math.max(0, Math.floor(value) || 0)
      const existing = getPlanForTask(task.id)
      const entry: DailyPlan = {
        id: existing?.id ?? crypto.randomUUID(),
        userId: user.id,
        taskId: task.id,
        title: existing?.title ?? null,
        date: todayKey,
        expectedDurationMinutes: minutes,
        actualDurationMinutes: existing?.actualDurationMinutes,
        segmentPercent: existing?.segmentPercent,
        done: existing?.done,
        percentAtEnd: existing?.percentAtEnd,
      }
      dailyPlanStorage.upsert(entry)
      setPlans(prev => {
        const idx = prev.findIndex(p => p.taskId === task.id && p.date === todayKey)
        if (idx === -1) return [...prev, entry]
        const copy = [...prev]
        copy[idx] = { ...copy[idx], ...entry }
        return copy
      })
    },
    [todayKey, user]
  )

  const handleActualDurationChange = useCallback(
    (task: Task, value: number) => {
      if (!user) return
      const minutes = Math.max(0, Math.floor(value) || 0)
      const existing = getPlanForTask(task.id)
      const entry: DailyPlan = {
        id: existing?.id ?? crypto.randomUUID(),
        userId: user.id,
        taskId: task.id,
        title: existing?.title ?? null,
        date: todayKey,
        expectedDurationMinutes: existing?.expectedDurationMinutes,
        actualDurationMinutes: minutes,
        segmentPercent: existing?.segmentPercent,
        done: existing?.done,
        percentAtEnd: existing?.percentAtEnd,
      }
      dailyPlanStorage.upsert(entry)
      setPlans(prev => {
        const idx = prev.findIndex(p => p.taskId === task.id && p.date === todayKey)
        if (idx === -1) return [...prev, entry]
        const copy = [...prev]
        copy[idx] = { ...copy[idx], ...entry }
        return copy
      })
    },
    [todayKey, user]
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

  const getPlanForTask = useCallback(
    (taskId: string) => plans.find(p => p.taskId === taskId && p.date === todayKey),
    [plans, todayKey]
  )

  const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#14b8a6', '#ec4899']

  const todayPieItems = useMemo(() => {
    const items: { label: string; value: number; color: string }[] = []
    let colorIndex = 0
    for (const plan of plans) {
      if (plan.date !== todayKey) continue
      const duration = plan.actualDurationMinutes ?? 0
      if (duration <= 0) continue
      const task = tasks.find(t => t.id === plan.taskId)
      items.push({
        label: task?.name ?? '未命名任务',
        value: duration,
        color: COLORS[colorIndex % COLORS.length],
      })
      colorIndex += 1
    }
    return items
  }, [plans, tasks, todayKey])

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
          <h2>今天的任务（按预定时间）</h2>
          <span className="stat-label">共 {todayTasks.length} 个</span>
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
          <span className="stat-label">添加今日计划：</span>
          <select
            value={newTaskId}
            onChange={e => setNewTaskId(e.target.value)}
            style={{ minWidth: 200 }}
          >
            <option value="">选择总览中的任务</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="stat-label">占总任务进度</span>
          <input
            type="number"
            min={1}
            max={100}
            style={{ width: 80 }}
            value={newSegmentPercent}
            onChange={e => setNewSegmentPercent(Math.max(1, Math.min(100, Number(e.target.value) || 0)))}
          />
          <span className="stat-label">%</span>
          <span className="stat-label">或快速新建总览任务</span>
          <input
            type="text"
            placeholder="输入总览任务名称"
            value={newBaseTaskName}
            onChange={e => setNewBaseTaskName(e.target.value)}
            style={{ width: 180 }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (!user) return
              const name = newBaseTaskName.trim()
              if (!name) return
              const now = new Date()
              const nowIso = now.toISOString()
              const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
              const task: Task = {
                id: crypto.randomUUID(),
                userId: user.id,
                name,
                details: '',
                percent: 0,
                scheduledAt: nowIso,
                deadline,
                createdAt: nowIso,
                updatedAt: nowIso,
              }
              taskStorage.add(task)
              setTasks(prev => [...prev, task])
              setNewTaskId(task.id)
              setNewBaseTaskName('')
            }}
          >
            新建总览任务
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (!user) return
              if (!newTaskId) {
                window.alert('请先在下拉框选择一个总览任务，或先输入名称点击「新建总览任务」。')
                return
              }
              const seg = Math.max(1, Math.min(100, Math.floor(newSegmentPercent) || 0))
              const existing = plans.find(p => p.taskId === newTaskId && p.date === todayKey)
              const boundTask = tasks.find(t => t.id === newTaskId)
              const entry: DailyPlan = {
                id: existing?.id ?? crypto.randomUUID(),
                userId: user.id,
                taskId: newTaskId,
                title: existing?.title ?? boundTask?.name ?? null,
                date: todayKey,
                expectedDurationMinutes: existing?.expectedDurationMinutes ?? null,
                actualDurationMinutes: existing?.actualDurationMinutes ?? null,
                segmentPercent: seg,
                done: existing?.done ?? false,
                percentAtEnd: existing?.percentAtEnd,
              }
              dailyPlanStorage.upsert(entry)
              setPlans(prev => {
                const idx = prev.findIndex(p => p.taskId === newTaskId && p.date === todayKey)
                if (idx === -1) return [...prev, entry]
                const copy = [...prev]
                copy[idx] = entry
                return copy
              })
            }}
          >
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
                <th>进度 %</th>
                <th>预计时长（分钟）</th>
                <th>实际时长（分钟）</th>
                <th>预定时间</th>
                <th>截止时间</th>
              </tr>
            </thead>
            <tbody>
              {todayTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    今天还没有预定任务，在总览页为任务设定预定时间即可显示到这里。
                  </td>
                </tr>
              ) : (
                todayTasks.map(task => {
                  const start = new Date(task.scheduledAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const deadline = new Date(task.deadline).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const plan = getPlanForTask(task.id)
                  const expectedMinutes = plan?.expectedDurationMinutes ?? 0
                  const actualMinutes = plan?.actualDurationMinutes ?? 0
                  const todayTitle = plan?.title ?? task.name
                  return (
                    <tr key={task.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={getPlanForTask(task.id)?.done ?? false}
                          onChange={e => handleToggleDone(task, e.target.checked)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={todayTitle}
                          onChange={e => {
                            if (!user) return
                            const existing = plan
                            const entry: DailyPlan = {
                              id: existing?.id ?? crypto.randomUUID(),
                              userId: user.id,
                              taskId: task.id,
                              title: e.target.value,
                              date: todayKey,
                              expectedDurationMinutes: existing?.expectedDurationMinutes,
                              actualDurationMinutes: existing?.actualDurationMinutes,
                              segmentPercent: existing?.segmentPercent,
                              done: existing?.done,
                              percentAtEnd: existing?.percentAtEnd,
                            }
                            dailyPlanStorage.upsert(entry)
                            setPlans(prev => {
                              const idx = prev.findIndex(
                                p => p.taskId === task.id && p.date === todayKey
                              )
                              if (idx === -1) return [...prev, entry]
                              const copy = [...prev]
                              copy[idx] = entry
                              return copy
                            })
                          }}
                          style={{ width: 180 }}
                        />
                      </td>
                      <td>
                        <span className="stat-label">{task.name}</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={task.percent}
                          onChange={e => handlePercentChange(task, Number(e.target.value))}
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={expectedMinutes}
                          onChange={e => handleExpectedDurationChange(task, Number(e.target.value))}
                          style={{ width: 100 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={actualMinutes}
                          onChange={e => handleActualDurationChange(task, Number(e.target.value))}
                          style={{ width: 100 }}
                        />
                      </td>
                      <td className="date-cell">{start}</td>
                      <td className="date-cell">{deadline}</td>
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
              按「实际完成时长（分钟）」绘制，仅统计填写了实际时长的任务。
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

