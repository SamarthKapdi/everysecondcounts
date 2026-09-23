import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('esc-token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const newToken = res.data.tokens.accessToken;
    const { user: userData } = res.data.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('esc-token', newToken);
    if (res.data.tokens.refreshToken) {
      localStorage.setItem('esc-refresh-token', res.data.tokens.refreshToken);
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    return userData;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const newToken = res.data.tokens.accessToken;
    const { user: newUser } = res.data.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('esc-token', newToken);
    if (res.data.tokens.refreshToken) {
      localStorage.setItem('esc-refresh-token', res.data.tokens.refreshToken);
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    return newUser;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('esc-token');
    localStorage.removeItem('esc-refresh-token');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
