import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../Auth.css'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const result = register(email, password)
    if (result.ok) navigate('/')
    else setError(result.msg ?? '注册失败')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>注册</h1>
        <p className="auth-sub">创建账号以管理任务</p>
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
              autoComplete="new-password"
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary">注册</button>
        </form>
        <p className="auth-switch">
          已有账号？ <Link to="/login">登录</Link>
        </p>
      </div>
    </div>
  )
}
