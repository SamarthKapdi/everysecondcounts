import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Bell, LogOut, User, Settings, Moon, Sun, ChevronDown } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { user, token, logout } = useAuthStore();
  const { notifications, unreadCount, markAllRead } = useNotificationStore();
  const isAuthenticated = !!token;
  const { isDark, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setProfileOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isDark
        ? 'bg-[#0F172A]/90 border-b border-[#334155]/50'
        : 'bg-white/80 border-b border-[#E2E8F0]/50'
    } backdrop-blur-xl`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              <span className="gradient-text">Pulse</span>
              <span className={isDark ? 'text-white' : 'text-[#0F172A]'}>Path</span>
              <span className="text-[#06B6D4] text-sm ml-1 font-medium">AI</span>
            </span>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isDark ? 'text-[#94A3B8] hover:bg-white/5 hover:text-yellow-400' : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
              }`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {isAuthenticated && (
              <>
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); if (!notifOpen) markAllRead(); }}
                    className={`p-2 rounded-xl relative transition-all duration-200 ${
                      isDark ? 'text-[#94A3B8] hover:bg-white/5' : 'text-[#475569] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                        {Math.min(unreadCount, 9)}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className={`absolute right-0 top-12 w-80 rounded-2xl shadow-2xl border overflow-hidden ${
                          isDark ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'
                        }`}
                      >
                        <div className={`p-4 border-b ${isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
                          <h3 className="font-semibold text-sm">Notifications</h3>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {notifications.length === 0 && (
                            <div className={`p-4 text-xs ${isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                              No notifications yet.
                            </div>
                          )}
                          {notifications.slice(0, 10).map(n => (
                            <div key={n.id} className={`p-4 border-b last:border-0 transition-colors cursor-pointer ${
                              isDark ? 'border-[#334155] hover:bg-white/5' : 'border-[#F1F5F9] hover:bg-[#F8FAFC]'
                            }`}>
                              <p className={`text-xs font-semibold ${isDark ? 'text-[#E2E8F0]' : 'text-[#0F172A]'}`}>{n.title}</p>
                              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>{n.message}</p>
                              <p className="text-[10px] text-[#94A3B8] mt-1">{n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : ''}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                    className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-all duration-200 ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-sm font-bold">
                      {user?.name?.[0] || 'U'}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${isDark ? 'text-[#E2E8F0]' : 'text-[#0F172A]'}`}>
                      {user?.name?.startsWith('Dr.') ? user.name.split(' ').slice(0, 2).join(' ') : user?.name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${profileOpen ? 'rotate-180' : ''} ${isDark ? 'text-[#94A3B8]' : 'text-[#475569]'}`} />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className={`absolute right-0 top-12 w-56 rounded-2xl shadow-2xl border overflow-hidden ${
                          isDark ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'
                        }`}
                      >
                        <div className={`p-4 border-b ${isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
                          <p className="font-semibold text-sm">{user?.name}</p>
                          <p className="text-xs text-[#94A3B8] capitalize">{(user?.role || 'patient').replace('_', ' ')}</p>
                        </div>
                        <Link to="/profile" onClick={() => setProfileOpen(false)} className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'hover:bg-white/5 text-[#E2E8F0]' : 'hover:bg-[#F8FAFC] text-[#475569]'}`}>
                          <User className="w-4 h-4" /> Profile
                        </Link>
                        <Link to="/settings" onClick={() => setProfileOpen(false)} className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'hover:bg-white/5 text-[#E2E8F0]' : 'hover:bg-[#F8FAFC] text-[#475569]'}`}>
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <button onClick={handleLogout} className={`flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 w-full border-t ${isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
