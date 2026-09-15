import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import useAuthStore from '../store/authStore';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const Settings = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();

  const sections = [
    {
      title: 'Profile Details',
      icon: User,
      items: [
        { label: 'Full Name', value: user?.name || 'Not set' },
        { label: 'Email', value: user?.email || 'Not set' },
        { label: 'Phone', value: user?.phone || 'Not set' },
        { label: 'Role', value: user?.role?.replace('_', ' ') || 'PATIENT' },
      ]
    },
    {
      title: 'Notification Preferences',
      icon: Bell,
      items: [
        { label: 'Emergency Alerts', value: 'Enabled', toggle: true },
        { label: 'Consultation Updates', value: 'Enabled', toggle: true },
        { label: 'System Announcements', value: 'Enabled', toggle: true },
        { label: 'Email Notifications', value: 'Disabled', toggle: true },
      ]
    },
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        { label: 'Theme', value: isDark ? 'Dark Mode' : 'Light Mode' },
        { label: 'Language', value: user?.languagePref?.toUpperCase() || 'EN' },
      ]
    },
    {
      title: 'Account Security',
      icon: Shield,
      items: [
        { label: 'Two-Factor Auth', value: 'Not Configured', toggle: true },
        { label: 'Session Timeout', value: '30 minutes' },
        { label: 'Last Login', value: new Date().toLocaleDateString('en-IN') },
      ]
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black">Settings</h1>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Manage your account, notifications, and security preferences.
        </p>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {sections.map((section, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`glass-card rounded-2xl border p-6 ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <section.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">{section.title}</h3>
            </div>
            <div className="space-y-4">
              {section.items.map((item, j) => (
                <div key={j} className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                  {item.toggle ? (
                    <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${item.value === 'Enabled' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.value === 'Enabled' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  ) : (
                    <span className="text-sm font-semibold">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Settings;
