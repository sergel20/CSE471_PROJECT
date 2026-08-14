import { createContext, useContext, useState } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (error) {
      sessionStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));

  const persist = (nextToken, nextUser) => {
    sessionStorage.setItem('token', nextToken);
    sessionStorage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const signup = async (name, email, password, role) => {
    const { data } = await apiClient.post('/auth/signup', { name, email, password, role });
    persist(data.token, data.user);
  };

  const login = async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    persist(data.token, data.user);
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    // Clear credentials created by older builds so they cannot unexpectedly
    // restore a shared cross-tab session.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
