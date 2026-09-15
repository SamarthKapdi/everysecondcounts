import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart3, TrendingUp, PieChart as PieChartIcon, Activity,
  Truck, Hospital, AlertTriangle
} from 'lucide-react';
import {
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../services/api';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const SEVERITY_LABELS = {
  RED: 'Critical',
  ORANGE: 'Urgent',
  YELLOW: 'Moderate',
  GREEN: 'Stable',
};
const SEVERITY_COLORS = {
  RED: '#EF4444',
  ORANGE: '#F97316',
  YELLOW: '#EAB308',
  GREEN: '#22C55E',
};

const Analytics = () => {
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setError(null);
        const [statsRes, trendsRes, distRes, occupancyRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/trends'),
          api.get('/dashboard/severity-distribution'),
          api.get('/dashboard/occupancy'),
        ]);

        setStats(statsRes.data.data);
        setTrends((trendsRes.data.data.trends || []).map((row) => ({
          label: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
          total: row.total || 0,
          critical: row.critical || 0,
        })));
        setDistribution((distRes.data.data.distribution || []).map((row) => ({
          name: SEVERITY_LABELS[row.severity] || row.severity,
          value: row.count,
          color: SEVERITY_COLORS[row.severity] || '#94A3B8',
        })));
        setOccupancy(occupancyRes.data.data.occupancy || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load analytics.');
        setStats(null);
        setTrends([]);
        setDistribution([]);
        setOccupancy([]);
      }
    };

    fetchAnalytics();
  }, []);

  const kpiCards = [
    { label: 'Total Emergencies', value: stats?.totalEmergencies ?? '—', icon: Activity, gradient: 'from-emerald-500 to-teal-400', change: '—' },
    { label: 'Critical Patients', value: stats?.criticalPatients ?? '—', icon: AlertTriangle, gradient: 'from-red-500 to-amber-400', change: '—' },
    { label: 'Active Ambulances', value: stats?.activeAmbulances ?? '—', icon: Truck, gradient: 'from-violet-500 to-purple-400', change: '—' },
    { label: 'Hospital Network', value: stats?.totalHospitals ?? '—', icon: Hospital, gradient: 'from-amber-500 to-orange-400', change: '—' },
  ];

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black">Operational Analytics</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          System-wide emergency operations intelligence dashboard
        </p>
      </motion.div>

      {/* KPI Row */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {kpiCards.map((card, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`glass-card glass-card-hover p-5 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-lg`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-black">{card.value}</p>
            <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{card.label}</p>
            <span className="text-[10px] font-bold text-emerald-500">{card.change}</span>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Trend */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className={`glass-card p-6 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
        >
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Emergency Volume (7 days)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="responseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#F1F5F9'} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? '#64748B' : '#94A3B8' }} />
              <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748B' : '#94A3B8' }} />
              <Tooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="#3B82F6" fill="url(#responseGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          {trends.length === 0 && (
            <p className="text-xs text-center text-slate-400 mt-3">No trend data available.</p>
          )}
        </motion.div>

        {/* Department Distribution */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className={`glass-card p-6 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
        >
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-500" /> Cases by Department
          </h3>
          <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
            Department analytics are not available from the backend yet.
          </div>
        </motion.div>

        {/* Severity Pie */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className={`glass-card p-6 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
        >
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-amber-500" /> Severity Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {distribution.length === 0 && (
              <div className="col-span-2 text-center text-xs text-slate-400">No severity data available.</div>
            )}
            {distribution.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{d.name}</span>
                <span className="font-bold ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hospital Occupancy */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className={`glass-card p-6 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
        >
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <Hospital className="w-4 h-4 text-violet-500" /> Hospital Occupancy
          </h3>
          <div className="space-y-3">
            {occupancy.length === 0 && (
              <div className="text-xs text-center text-slate-400">No occupancy data available.</div>
            )}
            {occupancy.map((h, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold">{h.name}</span>
                  <span className={`font-bold ${h.currentLoad >= 85 ? 'text-red-500' : h.currentLoad >= 65 ? 'text-orange-500' : 'text-emerald-500'}`}>{h.currentLoad}%</span>
                </div>
                <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${h.currentLoad >= 85 ? 'bg-red-500' : h.currentLoad >= 65 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                    style={{ width: `${h.currentLoad}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
