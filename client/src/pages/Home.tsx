import { useState, useEffect } from 'react'
import './Home.css'

function Home() {
  const [status, setStatus] = useState<string>('检查中...')

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStatus(data.message))
      .catch(() => setStatus('服务器连接失败'))
  }, [])

  return (
    <div className="home">
      <header className="header">
        <div className="container">
          <h1>驾校通</h1>
          <nav>
            <a href="/">首页</a>
            <a href="/students">学员信息管理</a>
            <a href="/system">系统管理</a>
            <a href="/about">关于我们</a>
            <a href="/contact">联系我们</a>
          </nav>
        </div>
      </header>
      
      <main className="main">
        <section className="hero">
          <div className="container">
            <h2>专业驾驶培训，安全出行保障</h2>
            <p>驾校通，您身边的驾培专家</p>
          </div>
        </section>
        
        <section className="status">
          <div className="container">
            <p>服务器状态: {status}</p>
          </div>
        </section>
      </main>
      
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 驾校通 版权所有</p>
        </div>
      </footer>
    </div>
  )
}

export default Home
