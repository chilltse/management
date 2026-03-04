export interface Task {
  id: string
  name: string
  details: string
  percent: number
  scheduledAt: string  // ISO date
  deadline: string     // ISO date
  userId: string
  createdAt: string
  updatedAt: string
  // 子任务会记录所属大任务 id；为空或 undefined 代表大任务
  parentId?: string | null
}

export interface User {
  id: string
  email: string
  passwordHash: string  // 简单存储，实际仅 base64 示意
  createdAt: string
}

export type TaskForm = Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

// 当日计划：独立的今日任务，可选通过 taskId 外键关联总览任务
export interface DailyPlan {
  id: string
  userId: string
  /** 外键，关联总览任务 id；为空表示不绑定 */
  taskId?: string | null
  /** 今日任务名称（可与总览任务名称不同） */
  title?: string | null
  /** YYYY-MM-DD，本地日期 */
  date: string
  /** 预计完成时长（分钟） */
  expectedDurationMinutes?: number | null
  /** 实际完成时长（分钟） */
  actualDurationMinutes?: number | null
  /** 本次今日计划占总任务进度的百分比（0-100） */
  segmentPercent?: number | null
  /** 当日计划是否已勾选完成（用于避免重复加减进度） */
  done?: boolean
  /** 当日结束时该任务的完成百分比 */
  percentAtEnd?: number
}

// 当日汇总：记录每天的专注时间等
export interface DailySummary {
  id: string
  userId: string
  /** YYYY-MM-DD，本地日期 */
  date: string
  /** 该日专注时间（分钟） */
  focusMinutes: number
}
