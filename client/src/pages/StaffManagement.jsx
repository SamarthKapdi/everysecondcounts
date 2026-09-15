import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Clock } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const STATUS_STYLES = {
  'On Duty': 'bg-emerald-500/10 text-emerald-500',
  'Off Duty': 'bg-slate-200/50 text-slate-400 dark:bg-slate-800',
  'On Leave': 'bg-amber-500/10 text-amber-500',
};

const StaffManagement = () => {
  const { isDark } = useTheme();
  const [staff] = useState([]);

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black">Staff Management</h1>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          View and manage hospital staff schedules, roles, and availability.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Staff', val: staff.length, color: 'blue' },
          { label: 'On Duty', val: staff.filter(s => s.status === 'On Duty').length, color: 'emerald' },
          { label: 'Off Duty', val: staff.filter(s => s.status === 'Off Duty').length, color: 'slate' },
          { label: 'On Leave', val: staff.filter(s => s.status === 'On Leave').length, color: 'amber' },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`glass-card p-4 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
          >
            <p className="text-2xl font-black">{s.val}</p>
            <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Staff Table */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`glass-card rounded-2xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Role</th>
                <th className="text-left px-5 py-3 font-semibold">Department</th>
                <th className="text-left px-5 py-3 font-semibold">Shift</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-xs text-slate-400">
                    No staff records available.
                  </td>
                </tr>
              )}
              {staff.map((s, i) => (
                <tr key={i} className={`border-t ${isDark ? 'border-slate-800 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-[10px]">
                        {s.avatar}
                      </div>
                      <span className="font-semibold">{s.name}</span>
                    </div>
                  </td>
                  <td className={`px-5 py-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.role}</td>
                  <td className="px-5 py-3">
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/10 text-blue-500 font-semibold">{s.dept}</span>
                  </td>
                  <td className={`px-5 py-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {s.shift}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status]}`}>
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffManagement;
