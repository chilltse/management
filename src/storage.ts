import type { Task, User, DailyPlan, DailySummary } from './types'

const USERS_KEY = 'pm_users'
const TASKS_KEY = 'pm_tasks'
const DAILY_PLAN_KEY = 'pm_daily_plans'
const DAILY_SUMMARY_KEY = 'pm_daily_summaries'
const CURRENT_USER_KEY = 'pm_current_user'

function safeJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function setItem(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const userStorage = {
  getAll(): User[] {
    return safeJson<User[]>(USERS_KEY, [])
  },
  saveAll(users: User[]) {
    setItem(USERS_KEY, users)
  },
  add(user: User) {
    const users = this.getAll()
    if (users.some(u => u.email === user.email)) return null
    users.push(user)
    this.saveAll(users)
    return user
  },
  findByEmail(email: string): User | undefined {
    return this.getAll().find(u => u.email === email)
  },
  getCurrentId(): string | null {
    return localStorage.getItem(CURRENT_USER_KEY)
  },
  setCurrentId(userId: string | null) {
    if (userId) localStorage.setItem(CURRENT_USER_KEY, userId)
    else localStorage.removeItem(CURRENT_USER_KEY)
  },
}

export const taskStorage = {
  getAll(): Task[] {
    return safeJson<Task[]>(TASKS_KEY, [])
  },
  saveAll(tasks: Task[]) {
    setItem(TASKS_KEY, tasks)
  },
  getByUserId(userId: string): Task[] {
    return this.getAll().filter(t => t.userId === userId)
  },
  add(task: Task) {
    const tasks = this.getAll()
    tasks.push(task)
    this.saveAll(tasks)
    return task
  },
  update(id: string, patch: Partial<Task>) {
    const tasks = this.getAll()
    const i = tasks.findIndex(t => t.id === id)
    if (i === -1) return null
    tasks[i] = { ...tasks[i], ...patch, updatedAt: new Date().toISOString() }
    this.saveAll(tasks)
    return tasks[i]
  },
  remove(id: string) {
    const tasks = this.getAll().filter(t => t.id !== id)
    this.saveAll(tasks)
  },
}

export const dailyPlanStorage = {
  getAll(): DailyPlan[] {
    return safeJson<DailyPlan[]>(DAILY_PLAN_KEY, [])
  },
  saveAll(plans: DailyPlan[]) {
    setItem(DAILY_PLAN_KEY, plans)
  },
  getByUserAndDate(userId: string, date: string): DailyPlan[] {
    return this.getAll().filter(p => p.userId === userId && p.date === date)
  },
  upsert(entry: DailyPlan) {
    const plans = this.getAll()
    const idx = plans.findIndex(
      p => p.userId === entry.userId && p.taskId === entry.taskId && p.date === entry.date
    )
    if (idx === -1) {
      plans.push(entry)
    } else {
      plans[idx] = { ...plans[idx], ...entry }
    }
    this.saveAll(plans)
    return entry
  },
}

export const dailySummaryStorage = {
  getAll(): DailySummary[] {
    return safeJson<DailySummary[]>(DAILY_SUMMARY_KEY, [])
  },
  saveAll(summaries: DailySummary[]) {
    setItem(DAILY_SUMMARY_KEY, summaries)
  },
  getByUserAndDate(userId: string, date: string): DailySummary | null {
    return this.getAll().find(s => s.userId === userId && s.date === date) ?? null
  },
  setFocusMinutes(userId: string, date: string, minutes: number) {
    const summaries = this.getAll()
    const idx = summaries.findIndex(s => s.userId === userId && s.date === date)
    if (idx === -1) {
      summaries.push({
        id: crypto.randomUUID(),
        userId,
        date,
        focusMinutes: minutes,
      })
    } else {
      summaries[idx] = { ...summaries[idx], focusMinutes: minutes }
    }
    this.saveAll(summaries)
  },
}
