import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { userStorage } from '../storage'
import { hashPassword, verifyPassword, validateEmail, validatePassword } from '../auth'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => { ok: boolean; msg?: string }
  register: (email: string, password: string) => { ok: boolean; msg?: string }
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const id = userStorage.getCurrentId()
    if (!id) return
    const u = userStorage.getAll().find(x => x.id === id) ?? null
    setUser(u)
  }, [])

  const login = useCallback((email: string, password: string) => {
    const trimmed = email.trim()
    if (!validateEmail(trimmed)) return { ok: false, msg: '请输入有效邮箱' }
    const u = userStorage.findByEmail(trimmed)
    if (!u) return { ok: false, msg: '该邮箱未注册' }
    if (!verifyPassword(password, u.passwordHash)) return { ok: false, msg: '密码错误' }
    userStorage.setCurrentId(u.id)
    setUser(u)
    return { ok: true }
  }, [])

  const register = useCallback((email: string, password: string) => {
    const trimmed = email.trim()
    if (!validateEmail(trimmed)) return { ok: false, msg: '请输入有效邮箱' }
    const p = validatePassword(password)
    if (!p.ok) return { ok: false, msg: p.msg }
    const newUser: User = {
      id: crypto.randomUUID(),
      email: trimmed,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    }
    const added = userStorage.add(newUser)
    if (!added) return { ok: false, msg: '该邮箱已注册' }
    userStorage.setCurrentId(added.id)
    setUser(added)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    userStorage.setCurrentId(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
