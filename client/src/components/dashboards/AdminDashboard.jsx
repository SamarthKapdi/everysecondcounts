import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../hooks/useSocket';
import {
  Activity, AlertTriangle, Bed, Truck, TrendingUp,
  Clock, Hospital, Radio, BarChart3
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';

const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const SEVERITY_COLORS = { RED: '#EF4444', ORANGE: '#F97316', YELLOW: '#EAB308', GREEN: '#22C55E' };

const SEVERITY_LABELS = {
  RED: 'Critical',
  ORANGE: 'Urgent',
  YELLOW: 'Moderate',
  GREEN: 'Stable',
};

const AdminDashboard = () => {
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [error, setError] = useState(null);
  useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [statsRes, trendsRes, distRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/trends'),
          api.get('/dashboard/severity-distribution'),
        ]);

        setStats(statsRes.data.data);
        setRecentCases(statsRes.data.data.recentCases || []);

        const trendRows = (trendsRes.data.data.trends || []).map((row) => ({
          day: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
          critical: row.critical || 0,
          urgent: row.urgent || 0,
          moderate: row.moderate || 0,
          low: row.low || 0,
        }));
        setTrends(trendRows);

        const distRows = (distRes.data.data.distribution || []).map((row) => ({
          name: SEVERITY_LABELS[row.severity] || row.severity,
          value: row.count,
          color: SEVERITY_COLORS[row.severity] || '#94A3B8',
        }));
        setDistribution(distRows);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load analytics data.');
        setStats(null);
        setRecentCases([]);
        setTrends([]);
        setDistribution([]);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Emergencies', value: stats?.totalEmergencies ?? '—', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Critical Patients', value: stats?.criticalPatients ?? '—', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Available Beds', value: stats?.availableBeds ?? '—', icon: Bed, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Active Ambulances', value: stats?.activeAmbulances ?? '—', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Partner Hospitals', value: stats?.totalHospitals ?? '—', icon: Hospital, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { label: 'Avg Response Time', value: '8m', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Command Center Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`relative overflow-hidden rounded-[1.5rem] border ${isDark ? 'bg-[#0B1120] border-slate-800' : 'bg-slate-900 border-slate-800'} p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl`}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Operations Command</h1>
            <p className="text-slate-400 text-sm mt-1">Network-wide telemetry and resource orchestration.</p>
          </div>
        </div>

        <div className="relative z-10 flex gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">System Load</p>
            <p className="text-white font-black text-lg">78%</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Network Status</p>
            <p className="text-emerald-400 font-black text-lg">ONLINE</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards (Compact & Analytical) */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {statCards.map((card, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`p-4 rounded-xl border flex flex-col ${isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{card.label}</span>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-black mt-auto">{card.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Trend Analysis */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className={`xl:col-span-2 flex flex-col rounded-[1.5rem] border overflow-hidden ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}
        >
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Network Capacity Trends
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last 7 Days</span>
          </div>
          <div className="p-5 flex-1">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trends} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUrgent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#F1F5F9'} vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748B' : '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748B' : '#94A3B8' }} />
                <Tooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="critical" stroke="#EF4444" fill="url(#colorCritical)" strokeWidth={2} />
                <Area type="monotone" dataKey="urgent" stroke="#F97316" fill="url(#colorUrgent)" strokeWidth={2} />
                <Area type="monotone" dataKey="moderate" stroke="#EAB308" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Severity Distribution */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className={`flex flex-col rounded-[1.5rem] border overflow-hidden ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}
        >
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" /> Triage Distribution
            </h3>
          </div>
          <div className="p-5 flex-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={distribution} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                  {distribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full mt-4 space-y-2">
              {distribution.length === 0 && (
                <div className="text-xs text-center text-slate-400">No distribution data available.</div>
              )}
              {distribution.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-50 dark:bg-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{d.name}</span>
                  </div>
                  <span className="font-black text-slate-800 dark:text-slate-100">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default AdminDashboard;
