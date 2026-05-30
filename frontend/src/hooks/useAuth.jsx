import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cq_token');
    if (token) {
      api.me().then(setUser).catch(() => localStorage.removeItem('cq_token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem('cq_token', token);
    setUser(user);
    return user;
  };

  const register = async (email, password, name) => {
    const { token, user } = await api.register({ email, password, name });
    localStorage.setItem('cq_token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('cq_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
