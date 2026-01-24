import { ReactNode, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Layout.css';

interface LayoutProps {
  children?: ReactNode;
}

interface MenuItem {
  path: string;
  label: string;
  permission?: string; // 权限编码
}

interface MenuGroup {
  key: string;
  title: string;
  permission: string; // 菜单组权限编码
  items: MenuItem[];
}

// 菜单组配置
const menuGroups: MenuGroup[] = [
  {
    key: 'students',
    title: '学员信息管理',
    permission: 'student',
    items: [
      { path: '/students/entry', label: '学员基本信息', permission: 'student:entry' },
      { path: '/students/payment', label: '报名与缴费', permission: 'student:payment' },
      { path: '/students/statistics', label: '招生统计', permission: 'student:statistics' },
    ]
  },
  {
    key: 'exam',
    title: '考试管理',
    permission: 'exam',
    items: [
      { path: '/exam/venues', label: '考试场地配置', permission: 'exam:venues' },
      { path: '/exam/schedules', label: '考试安排管理', permission: 'exam:schedules' },
      { path: '/exam/registrations', label: '学员考试管理', permission: 'exam:registrations' },
      { path: '/exam/statistics', label: '考试统计', permission: 'exam:statistics' },
    ]
  },
  {
    key: 'learning',
    title: '学员学习跟踪',
    permission: 'learning',
    items: [
      { path: '/learning/progress', label: '学习进度跟踪', permission: 'learning:progress' },
      { path: '/learning/plans', label: '学习计划管理', permission: 'learning:plans' },
    ]
  },
  {
    key: 'coaches',
    title: '教练管理',
    permission: 'coach',
    items: [
      { path: '/coaches/info', label: '教练基本信息', permission: 'coach:info' },
      { path: '/coaches/salary-config', label: '工资配置', permission: 'coach:salary-config' },
      { path: '/coaches/salary', label: '教练工资', permission: 'coach:salary' },
    ]
  },
  {
    key: 'basic',
    title: '基础数据管理',
    permission: 'basic',
    items: [
      { path: '/system/class-types', label: '班型管理', permission: 'basic:class-types' },
    ]
  },
  {
    key: 'system',
    title: '系统管理',
    permission: 'system',
    items: [
      { path: '/system/users', label: '用户管理', permission: 'system:users' },
      { path: '/system/roles', label: '角色管理', permission: 'system:roles' },
      { path: '/system/permissions', label: '权限管理', permission: 'system:permissions' },
      { path: '/system/dicts', label: '字典管理', permission: 'system:dicts' },
    ]
  },
];

export default function Layout({ children }: LayoutProps) {
  const { user, logout, permissions } = useAuth();
  // 默认折叠所有菜单组
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleLogout = () => {
    logout();
  };

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  // 检查是否有权限
  const hasPermission = (code: string): boolean => {
    return permissions.includes(code);
  };

  // 过滤有权限的菜单组和菜单项
  const filteredMenuGroups = menuGroups
    .filter(group => hasPermission(group.permission))
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.permission || hasPermission(item.permission))
    }))
    .filter(group => group.items.length > 0);

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="logo">驾校通</h1>
          </div>
          <div className="header-right">
            <div className="user-menu">
              <span className="user-name">{user?.realName || user?.username}</span>
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
            {filteredMenuGroups.map(group => {
              const isExpanded = expandedGroups.has(group.key);
              return (
                <div key={group.key} className="nav-group">
                  <div 
                    className={`nav-group-title ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <span className="nav-group-text">{group.title}</span>
                  </div>
                  <div className={`nav-group-items ${isExpanded ? 'expanded' : ''}`}>
                    {group.items.map(item => (
                      <Link 
                        key={item.path} 
                        to={item.path} 
                        className="nav-item nav-sub-item"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="layout-main">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
