import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../Auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const result = login(email, password)
    if (result.ok) navigate('/')
    else setError(result.msg ?? '登录失败')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>登录</h1>
        <p className="auth-sub">管理你的项目进度</p>
        <form onSubmit={handleSubmit}>
          <label>
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="至少 6 位"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary">登录</button>
        </form>
        <p className="auth-switch">
          还没有账号？ <Link to="/register">注册</Link>
        </p>
      </div>
    </div>
  )
}
