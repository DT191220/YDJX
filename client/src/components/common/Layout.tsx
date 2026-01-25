import { ReactNode, useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { menuService, Menu } from '../../services/menu';
import './Layout.css';

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, permissions } = useAuth();
  // 默认折叠所有菜单组
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [menuGroups, setMenuGroups] = useState<Menu[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  // 从后端获取用户可访问的菜单
  useEffect(() => {
    const fetchMenus = async () => {
      if (permissions.length === 0) {
        setMenuLoading(false);
        return;
      }
      
      try {
        const response = await menuService.getUserMenus(permissions);
        if (response.data) {
          setMenuGroups(response.data);
        }
      } catch (error) {
        console.error('获取菜单失败:', error);
      } finally {
        setMenuLoading(false);
      }
    };

    fetchMenus();
  }, [permissions]);

  const handleLogout = () => {
    logout();
  };

  const toggleGroup = (id: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="logo">驾校通</h1>
          </div>
          <div className="header-right">
            <div className="user-menu">
              <span className="user-name">
                {user?.realName || user?.username}
                {user?.roleName && (
                  <span style={{ 
                    marginLeft: '8px', 
                    padding: '2px 8px', 
                    background: '#e6f7ff', 
                    border: '1px solid #91d5ff',
                    borderRadius: '4px', 
                    fontSize: '12px',
                    color: '#1890ff'
                  }}>
                    {user.roleName}
                  </span>
                )}
              </span>
              <button onClick={handleLogout} className="logout-btn">
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="layout-container">
        <aside className="layout-sidebar">
          <nav className="sidebar-nav">
            <Link to="/" className="nav-item">
              首页
            </Link>
            {menuLoading ? (
              <div style={{ padding: '12px', color: '#999', fontSize: '14px' }}>加载中...</div>
            ) : (
              menuGroups.map(group => {
                const isExpanded = expandedGroups.has(group.id);
                return (
                  <div key={group.id} className="nav-group">
                    <div 
                      className={`nav-group-title ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <span className="nav-group-text">{group.menu_name}</span>
                    </div>
                    <div className={`nav-group-items ${isExpanded ? 'expanded' : ''}`}>
                      {group.children?.map(item => (
                        <Link 
                          key={item.id} 
                          to={item.menu_path || '#'} 
                          className="nav-item nav-sub-item"
                        >
                          {item.menu_name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </nav>
        </aside>

        <main className="layout-main">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
