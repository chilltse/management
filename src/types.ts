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
}

export interface User {
  id: string
  email: string
  passwordHash: string  // 简单存储，实际仅 base64 示意
  createdAt: string
}

export type TaskForm = Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
