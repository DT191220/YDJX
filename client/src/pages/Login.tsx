import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/auth'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authService.login({ username, password })
      login(response.data!.token, response.data!.user, response.data!.permissions || [])
      
      const returnUrl = searchParams.get('returnUrl') || '/'
      navigate(returnUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* 左侧品牌区 */}
      <div className="login-brand">
        <div className="brand-content">
          <div className="brand-logo">
            <svg viewBox="0 0 48 48" fill="none" className="logo-icon">
              <rect width="48" height="48" rx="12" fill="currentColor" fillOpacity="0.1"/>
              <path d="M14 32V20L24 14L34 20V32L24 38L14 32Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M24 14V38" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 20L34 32" stroke="currentColor" strokeWidth="2"/>
              <path d="M34 20L14 32" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h1 className="brand-title">驾校通</h1>
          <p className="brand-subtitle">驾驶培训管理系统</p>
          
          <div className="brand-features">
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>高效学员管理</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>智能排课调度</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>财务数据分析</span>
            </div>
          </div>
        </div>
        
        <div className="brand-footer">
          <p>专业 · 高效 · 可靠</p>
        </div>
      </div>

      {/* 右侧登录区 */}
      <div className="login-form-area">
        <div className="login-card">
          <div className="login-header">
            <h2>欢迎登录</h2>
            <p>请输入您的账户信息</p>
          </div>
          
          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <div className="input-group">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">密码</label>
              <div className="input-group">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn-login"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  <span>登录中...</span>
                </>
              ) : (
                <span>登录</span>
              )}
            </button>
          </form>
          
          <div className="login-footer">
            <p className="demo-hint">
              演示账号：admin / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
