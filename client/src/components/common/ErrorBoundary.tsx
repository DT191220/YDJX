import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // 记录错误到控制台
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo);
    
    // 可以在这里发送错误到监控服务
    this.reportError(error, errorInfo);
  }

  reportError(error: Error, errorInfo: ErrorInfo): void {
    // 发送错误报告到后端（可选）
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    // 发送到后端日志接口（如果存在）
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
    }).catch(() => {
      // 静默失败，避免无限循环
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '40px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            <h1 style={{ 
              color: '#e53e3e', 
              marginBottom: '16px',
              fontSize: '24px',
            }}>
              出错了
            </h1>
            <p style={{ 
              color: '#666', 
              marginBottom: '24px',
              lineHeight: '1.6',
            }}>
              抱歉，应用程序遇到了一个错误。请尝试刷新页面或返回首页。
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre style={{
                textAlign: 'left',
                padding: '12px',
                backgroundColor: '#f8f8f8',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '200px',
                marginBottom: '24px',
                color: '#c53030',
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                刷新页面
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
