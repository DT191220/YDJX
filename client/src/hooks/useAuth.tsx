import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getToken, getUser, getPermissions, setToken, setUser, setPermissions, clearAuth } from '../utils/storage';

interface User {
  id: number;
  username: string;
  realName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  login: (token: string, user: User, permissions: string[]) => void;
  logout: () => void;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [permissionsState, setPermissionsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 从localStorage恢复登录状态
    const savedToken = getToken();
    const savedUser = getUser();
    const savedPermissions = getPermissions();
    
    if (savedToken && savedUser) {
      setTokenState(savedToken);
      setUserState(savedUser);
      setPermissionsState(savedPermissions);
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User, newPermissions: string[]) => {
    setToken(newToken);
    setUser(newUser);
    setPermissions(newPermissions);
    setTokenState(newToken);
    setUserState(newUser);
    setPermissionsState(newPermissions);
  };

  const logout = () => {
    clearAuth();
    setTokenState(null);
    setUserState(null);
    setPermissionsState([]);
    window.location.href = '/login';
  };

  const hasPermission = (code: string): boolean => {
    return permissionsState.includes(code);
  };

  const authContextValue = {
    user,
    token,
    permissions: permissionsState,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    hasPermission,
  };

  // 在初始加载时不渲染子组件，避免闪烁和错误的重定向
  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
