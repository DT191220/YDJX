// LocalStorage工具类
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const PERMISSIONS_KEY = 'permissions';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getUser = (): any | null => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const setUser = (user: any): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const removeUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

export const getPermissions = (): string[] => {
  const permStr = localStorage.getItem(PERMISSIONS_KEY);
  return permStr ? JSON.parse(permStr) : [];
};

export const setPermissions = (permissions: string[]): void => {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
};

export const removePermissions = (): void => {
  localStorage.removeItem(PERMISSIONS_KEY);
};

export const clearAuth = (): void => {
  removeToken();
  removeUser();
  removePermissions();
};
