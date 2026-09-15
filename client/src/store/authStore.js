import { create } from 'zustand';
import api from '../services/api';
import { reconnectSocket } from '../hooks/useSocket';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('pulsepath-token'),
  refreshToken: localStorage.getItem('pulsepath-refresh-token'),
  loading: true,
  error: null,

  setUser: (user) => set({ user }),

  login: async (credentials) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post('/auth/login', credentials);
      const { user } = res.data.data;
      const accessToken = res.data.tokens.accessToken;
      const refresh = res.data.tokens.refreshToken;
      localStorage.setItem('pulsepath-token', accessToken);
      if (refresh) localStorage.setItem('pulsepath-refresh-token', refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      set({ user, token: accessToken, refreshToken: refresh, loading: false });

      // Reconnect socket with fresh auth token so role rooms are joined
      reconnectSocket();

      return user;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Login failed', loading: false });
      throw err;
    }
  },

  register: async (userData) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post('/auth/register', userData);
      const { user } = res.data.data;
      const accessToken = res.data.tokens.accessToken;
      const refresh = res.data.tokens.refreshToken;
      localStorage.setItem('pulsepath-token', accessToken);
      if (refresh) localStorage.setItem('pulsepath-refresh-token', refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      set({ user, token: accessToken, refreshToken: refresh, loading: false });
      return user;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Registration failed', loading: false });
      throw err;
    }
  },

  fetchProfile: async () => {
    set({ loading: true, error: null });
    const token = get().token || localStorage.getItem('pulsepath-token');
    if (!token) {
      delete api.defaults.headers.common['Authorization'];
      set({ user: null, token: null, refreshToken: null, loading: false });
      return;
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.data.user, token, loading: false });
    } catch (err) {
      get().logout();
      set({ loading: false, error: err.response?.data?.message || 'Session expired. Please log in again.' });
    }
  },

  logout: () => {
    localStorage.removeItem('pulsepath-token');
    localStorage.removeItem('pulsepath-refresh-token');
    delete api.defaults.headers.common['Authorization'];
    reconnectSocket(); // disconnect authenticated socket
    set({ user: null, token: null, refreshToken: null, loading: false });
  },
}));

export default useAuthStore;
