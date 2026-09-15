import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Stethoscope, Building2, BarChart3, User, FileText,
  Activity, MessageCircle, FileHeart, Users, ShieldAlert, Truck,
  Package, Settings, LogOut, Menu, X, AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import useAuthStore from '../store/authStore';

const Sidebar = () => {
  const { isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || 'PATIENT';

  const patientLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/symptom-checker', icon: Stethoscope, label: 'AI Symptom Analyzer' },
    { to: '/report-analyzer', icon: FileHeart, label: 'AI Report Analyzer' },
    { to: '/hospitals', icon: Building2, label: 'Hospitals Nearby' },
    { to: '/consult', icon: MessageCircle, label: 'Consult Doctor' },
    { to: '/sos', icon: AlertCircle, label: 'Emergency SOS', highlight: true },
    { to: '/emergency-history', icon: Activity, label: 'Emergency History' },
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const doctorLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Doctor Dashboard' },
    { to: '/incoming-emergencies', icon: ShieldAlert, label: 'Incoming Emergencies' },
    { to: '/active-patients', icon: Users, label: 'Active Patients' },
    { to: '/consultations', icon: MessageCircle, label: 'Consultations' },
    { to: '/ai-reports', icon: FileText, label: 'AI Reports' },
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Operations Dashboard' },
    { to: '/hospital-network', icon: Building2, label: 'Hospital Network' },
    { to: '/ambulance-tracking', icon: Truck, label: 'Ambulance Tracking' },
    { to: '/resources', icon: Package, label: 'Resource Management' },
    { to: '/staff', icon: Users, label: 'Staff Management' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  let links = patientLinks;
  if (role === 'DOCTOR') links = doctorLinks;
  if (role === 'SUPER_ADMIN' || role === 'HOSPITAL_STAFF') links = adminLinks;

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 flex-1">
        {/* Status indicator */}
        <div className={`mb-6 p-4 rounded-2xl ${isDark ? 'bg-[#1E293B]' : 'bg-gradient-to-br from-[#EFF6FF] to-[#F0FDFA]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#10B981]">System Online</span>
          </div>
          <p className={`text-xs ${isDark ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
            All services operational
          </p>
        </div>

        {/* Navigation */}
        <div className="space-y-1">
          <p className={`text-xs font-semibold uppercase tracking-wider px-3 mb-3 ${isDark ? 'text-[#475569]' : 'text-[#94A3B8]'}`}>
            Navigation
          </p>
          {links.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${link.highlight && !isActive
                  ? 'text-red-500 hover:bg-red-500/10 font-semibold'
                  : isActive
                    ? 'bg-[#2563EB]/10 text-[#2563EB]'
                    : isDark
                      ? 'text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/5'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#2563EB]' : link.highlight ? 'text-red-500' : ''}`} />
                <span className="text-sm font-medium">{link.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Logout button */}
        <div className="mt-6 px-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* User card */}
      <div className={`p-4 border-t ${isDark ? 'border-[#1E293B]' : 'border-[#F1F5F9]'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${isDark ? 'text-[#E2E8F0]' : 'text-[#0F172A]'}`}>
              {user?.name || 'Guest User'}
            </p>
            <p className="text-xs text-[#94A3B8] capitalize">{(user?.role || 'patient').replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className={`lg:hidden fixed top-[72px] left-4 z-40 p-2 rounded-xl shadow-lg border transition-colors ${isDark ? 'bg-[#1E293B] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`lg:hidden fixed top-16 left-0 w-64 h-[calc(100vh-64px)] z-40 border-r overflow-y-auto scrollbar-thin flex flex-col ${isDark ? 'bg-[#0F172A] border-[#1E293B]' : 'bg-white border-[#F1F5F9]'
              }`}
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col w-64 h-[calc(100vh-64px)] fixed top-16 left-0 border-r transition-colors overflow-y-auto scrollbar-thin ${isDark ? 'bg-[#0F172A] border-[#1E293B]' : 'bg-white border-[#F1F5F9]'
        }`}>
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
