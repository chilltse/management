import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { taskStorage, dailyPlanStorage, dailySummaryStorage } from '../storage'
import type { DailyPlan } from '../types'
import './Dashboard.css'

function groupByDate(plans: DailyPlan[]) {
  const map = new Map<string, DailyPlan[]>()
  for (const p of plans) {
    const arr = map.get(p.date)
    if (arr) arr.push(p)
    else map.set(p.date, [p])
  }
  return map
}

function formatDate(date: string) {
  return date.replace(/-/g, '/')
}

function avgMinutes(values: (number | null | undefined)[]) {
  const valid = values.map(v => (v ?? 0) as number).filter(v => v > 0)
  if (!valid.length) return 0
  const sum = valid.reduce((s, v) => s + v, 0)
  return Math.round(sum / valid.length)
}

function formatMinutes(value: number) {
  if (!value) return '-'
  const h = Math.floor(value / 60)
  const m = value % 60
  if (h === 0) return `${m} 分钟`
  if (m === 0) return `${h} 小时`
  return `${h} 小时 ${m} 分钟`
}

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f97316', '#a855f7']

export default function Stats() {
  const { user, logout } = useAuth()

  const data = useMemo(() => {
    if (!user) return null
    const allPlans = dailyPlanStorage.getAll().filter(p => p.userId === user.id)
    const allSummaries = dailySummaryStorage.getAll().filter(s => s.userId === user.id)
    const tasks = taskStorage.getByUserId(user.id)
    const byDate = groupByDate(allPlans)
    const rows = Array.from(byDate.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, plans]) => {
        const total = plans.length
        const completed = plans.filter(p => (p.percentAtEnd ?? 0) >= 100).length
        const completionRate = total ? Math.round((completed / total) * 100) : 0
        const expected = avgMinutes(plans.map(p => p.expectedDurationMinutes))
        const actual = avgMinutes(plans.map(p => p.actualDurationMinutes))
        const summary = allSummaries.find(s => s.date === date)
        const focusMinutes = summary?.focusMinutes ?? 0
        return { date, total, completed, completionRate, expected, actual, focusMinutes }
      })

    const latestDate = rows.length ? rows[rows.length - 1].date : null
    const latestPlans = latestDate ? byDate.get(latestDate) ?? [] : []
    const completedPlans = latestPlans.filter(
      p => (p.percentAtEnd ?? 0) >= 100 && (p.actualDurationMinutes ?? 0) > 0
    )
    const pieItems = completedPlans.map((p, index) => {
      const task = tasks.find(t => t.id === p.taskId)
      return {
        label: task?.name ?? '未命名任务',
        value: p.actualDurationMinutes ?? 0,
        color: COLORS[index % COLORS.length],
      }
    })

    return { rows, latestDate, pieItems }
  }, [user])

  if (!user) return null

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>统计分析</h1>
        <div className="header-actions">
          <Link to="/" className="btn btn-ghost">
            总览
          </Link>
          <Link to="/today" className="btn btn-ghost">
            今日计划
          </Link>
          <span className="user-email">{user.email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            退出
          </button>
        </div>
      </header>

      <section className="task-section">
        <div className="section-head">
          <h2>每日完成情况</h2>
        </div>
        <div className="task-table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>计划任务数</th>
                <th>已完成数</th>
                <th>完成率</th>
                <th>平均预计时长</th>
                <th>平均实际时长</th>
                <th>专注时间（分钟）</th>
              </tr>
            </thead>
            <tbody>
              {!data || data.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    暂无历史数据，在「今日计划」页进行计划和填写信息后会在这里汇总。
                  </td>
                </tr>
              ) : (
                data.rows.map(row => (
                  <tr key={row.date}>
                    <td className="date-cell">{formatDate(row.date)}</td>
                    <td>{row.total}</td>
                    <td>{row.completed}</td>
                    <td>{row.completionRate}%</td>
                    <td className="date-cell">{formatMinutes(row.expected)}</td>
                    <td className="date-cell">{formatMinutes(row.actual)}</td>
                    <td>{row.focusMinutes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {data && data.latestDate && (
        <section className="task-section" style={{ marginTop: 24 }}>
          <div className="section-head">
            <h2>{formatDate(data.latestDate)} 完成任务占比（饼状图）</h2>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              padding: '20px',
            }}
          >
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="74" fill="#020617" />
              {data.pieItems.length === 0 ? (
                <text x="100" y="104" textAnchor="middle" fill="#6b7280" fontSize="12">
                  暂无已完成任务
                </text>
              ) : (
                (() => {
                  const total = data.pieItems.reduce((s, i) => s + i.value, 0)
                  let startAngle = -Math.PI / 2
                  const radius = 60
                  const cx = 100
                  const cy = 100
                  const labelRadius = 80
                  return data.pieItems.map((item, index) => {
                    const angle = (item.value / total) * Math.PI * 2
                    const endAngle = startAngle + angle
                    const mid = (startAngle + endAngle) / 2
                    const x1 = cx + radius * Math.cos(startAngle)
                    const y1 = cy + radius * Math.sin(startAngle)
                    const x2 = cx + radius * Math.cos(endAngle)
                    const y2 = cy + radius * Math.sin(endAngle)
                    const largeArc = angle > Math.PI ? 1 : 0
                    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

                    const lx = cx + labelRadius * Math.cos(mid)
                    const ly = cy + labelRadius * Math.sin(mid)
                    const isLeft = mid > Math.PI / 2 || mid < -Math.PI / 2
                    const lineEndX = lx + (isLeft ? -14 : 14)
                    const textAnchor = isLeft ? 'end' : 'start'

                    const path = <path key={`slice-${index}`} d={d} fill={item.color} />
                    const connector = (
                      <g key={`label-${index}`}>
                        <line
                          x1={cx + (radius + 4) * Math.cos(mid)}
                          y1={cy + (radius + 4) * Math.sin(mid)}
                          x2={lx}
                          y2={ly}
                          stroke={item.color}
                          strokeWidth={0.8}
                        />
                        <line
                          x1={lx}
                          y1={ly}
                          x2={lineEndX}
                          y2={ly}
                          stroke={item.color}
                          strokeWidth={0.8}
                        />
                        <circle cx={lineEndX} cy={ly} r={1.6} fill={item.color} />
                        <text
                          x={lineEndX + (textAnchor === 'start' ? 4 : -4)}
                          y={ly - 2}
                          fontSize={11}
                          fill="#e5e7eb"
                          textAnchor={textAnchor as 'start' | 'end'}
                        >
                          {item.label}
                        </text>
                      </g>
                    )

                    startAngle = endAngle
                    return [path, connector]
                  })
                })()
              )}
            </svg>
            <div>
              <div className="stat-label" style={{ marginBottom: 8 }}>
                仅统计当日「已完成」任务，按实际完成时长（分钟）作为占比。
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

