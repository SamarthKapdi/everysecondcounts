import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import RiskGauge from '../components/RiskGauge';
import {
  ShieldAlert, Activity, HeartPulse, AlertTriangle, PhoneCall,
  Calendar, Flame, RefreshCw, Info, Lock, ArrowUpRight, CheckCircle2,
  Stethoscope, Clock, AlertOctagon
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from 'recharts';

const RiskDashboard = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetPatientId = searchParams.get('patientId');

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(0);

  const isDoctorView = Boolean(targetPatientId && targetPatientId !== user?.id);

  useEffect(() => {
    fetchRiskData();
  }, [targetPatientId]);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const url = targetPatientId ? `/risk/patient/${targetPatientId}` : '/risk/me';
      const res = await api.get(url);
      const data = res.data.data;
      setAssessment(data.assessment);
      setHistory(data.history || []);

      // Also get streak
      try {
        const checkinRes = await api.get('/checkins/today');
        setStreak(checkinRes.data.data?.streak || 0);
      } catch (e) {}
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || 'Access denied. Active clinical relationship required.');
      } else {
        toast.error('Failed to load risk assessment.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Format history for Recharts
  const chartData = history.map((h, idx) => ({
    name: new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: h.finalScore,
    baseline: h.baselineRisk,
    dynamic: h.dynamicRisk,
    tier: h.tier
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <HeartPulse className="w-8 h-8 text-emerald-500 animate-pulse" />
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Evaluating local risk models...</p>
        </div>
      </div>
    );
  }

  const tier = assessment?.tier || 'LOW';
  const score = assessment?.finalScore || 0;
  const isEmergency = tier === 'HIGH' || tier === 'CRITICAL';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${
              tier === 'CRITICAL' ? 'bg-red-600 shadow-red-600/30' :
              tier === 'HIGH' ? 'bg-rose-500 shadow-rose-500/20' :
              tier === 'MODERATE' ? 'bg-amber-500 shadow-amber-500/20' :
              'bg-emerald-500 shadow-emerald-500/20'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Sudden-Attack Risk Dashboard</h1>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Hybrid Multi-Modal Local ML: Static UCI Cleveland baseline blended with recent 14-day symptom trends.
              </p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-orange-500/30 text-orange-500 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
            <span>{streak} Day Streak</span>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 ${
            assessment?.dataConfidence === 'HIGH' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
            assessment?.dataConfidence === 'MODERATE' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
            'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            <Activity className="w-3 h-3" /> Confidence: {assessment?.dataConfidence || 'MODERATE'}
          </span>

          <button
            onClick={fetchRiskData}
            className={`p-2 rounded-xl border text-xs transition-colors ${isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}
            title="Recompute">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </motion.div>

      {/* Emergency Alert Banner if HIGH or CRITICAL */}
      {isEmergency && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-5 rounded-3xl border-2 ${
            tier === 'CRITICAL'
              ? 'border-red-600 bg-red-600/10 dark:bg-red-950/40 shadow-2xl shadow-red-600/20'
              : 'border-rose-500 bg-rose-500/10 dark:bg-rose-950/40 shadow-xl shadow-rose-500/15'
          } space-y-3`}>
          <div className="flex items-start gap-3">
            <AlertOctagon className={`w-7 h-7 flex-shrink-0 animate-pulse ${tier === 'CRITICAL' ? 'text-red-600' : 'text-rose-500'}`} />
            <div>
              <h2 className="text-base font-extrabold uppercase tracking-wide">
                {tier === 'CRITICAL' ? 'CRITICAL RISK PROTOCOL ACTIVE — IMMEDIATE INTERVENTION' : 'HIGH RISK DETECTED — CLINICAL EVALUATION REQUIRED'}
              </h2>
              <p className="text-xs mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                {assessment?.recommendedAction}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => navigate('/sos')}
              className="btn-danger py-2.5 px-4 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/25">
              <PhoneCall className="w-3.5 h-3.5" /> Emergency SOS (112 / 108)
            </button>
            <button
              onClick={() => navigate('/consult')}
              className="btn-secondary py-2.5 px-4 text-xs font-bold flex items-center gap-1.5 border-rose-500/40 text-rose-500 hover:bg-rose-500/10">
              <Stethoscope className="w-3.5 h-3.5" /> Consult Doctor Now
            </button>
            <button
              onClick={() => navigate('/hospitals')}
              className={`py-2.5 px-4 text-xs font-bold rounded-xl border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
              Find ICU Hospital
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Grid: Gauge + Model Breakdown + Prescribed Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Risk Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card p-6 rounded-3xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/80 bg-white/80'
          }`}>
          <RiskGauge score={score} tier={tier} size="lg" label="Sudden-Attack Risk" />
          <p className="text-[11px] text-slate-400 mt-2 max-w-[200px]">
            Calibrated multi-modal probability blend (0 – 100 scale).
          </p>
        </motion.div>

        {/* Card 2: Two-Tier Model Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`glass-card p-5 rounded-3xl border flex flex-col justify-between ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/80 bg-white/80'
          }`}>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 block mb-1">
              Architecture Breakdown
            </span>
            <h3 className="text-sm font-bold">Two-Tier Hybrid Engine</h3>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-400">Tier A: Static Baseline (UCI)</span>
                  <span className="font-extrabold">{assessment?.baselineRisk}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${assessment?.baselineRisk}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">35% weight • Profile biometrics & history</p>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-400">Tier B: Dynamic Trend (Check-ins)</span>
                  <span className="font-extrabold">{assessment?.dynamicRisk}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-teal-400 rounded-full" style={{ width: `${assessment?.dynamicRisk}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">65% weight • 14-day velocity & vitals deviation</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t text-[11px] text-slate-400 flex items-center justify-between" style={{ borderColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            <span>Engine: {assessment?.modelVersion || 'v1.0-local-uci-hybrid'}</span>
            <span className="text-emerald-500 font-bold">100% Local</span>
          </div>
        </motion.div>

        {/* Card 3: Prescribed Action & Status */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`glass-card p-5 rounded-3xl border flex flex-col justify-between ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/80 bg-white/80'
          }`}>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 block mb-1">
              Recommended Action
            </span>
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              {tier === 'LOW' ? (
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Baseline Normal
                </span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Action Required
                </span>
              )}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              {assessment?.recommendedAction}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t" style={{ borderColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            <button
              onClick={() => navigate('/daily-checkin')}
              className="w-full py-2.5 rounded-xl border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
              Log Today's Check-in <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* 14-Day Risk Trend Chart (Recharts) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={`glass-card p-5 md:p-6 rounded-3xl border ${
          isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/80 bg-white/80'
        }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> 14-Day Trajectory Trend
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Longitudinal tracking of combined sudden-attack risk and symptom velocity.
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {chartData.length} Assessment{chartData.length === 1 ? '' : 's'} Logged
          </span>
        </div>

        <div className="h-56 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '1rem',
                    fontSize: '11px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
                  }}
                />
                <ReferenceLine y={60} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'High Risk (60)', fill: '#f43f5e', fontSize: 9 }} />
                <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Moderate (30)', fill: '#f59e0b', fontSize: 9 }} />
                <Area type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" name="Risk Score" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              No trend history available yet. Complete check-ins to build your trajectory.
            </div>
          )}
        </div>
      </motion.div>

      {/* Contributing Factors */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`glass-card p-5 md:p-6 rounded-3xl border ${
          isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/80 bg-white/80'
        }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-500" /> Primary Contributing Factors
          </h3>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Feature Attributions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {assessment?.factors && assessment.factors.length > 0 ? (
            assessment.factors.map((f, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-2xl border transition-all ${
                  f.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                  f.severity === 'high' ? 'border-rose-500/20 bg-rose-500/5' :
                  f.severity === 'moderate' ? 'border-amber-500/20 bg-amber-500/5' :
                  isDark ? 'border-slate-800 bg-slate-800/30' : 'border-slate-200 bg-slate-50'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">{f.factor}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    f.severity === 'critical' ? 'bg-red-500 text-white' :
                    f.severity === 'high' ? 'bg-rose-500/10 text-rose-500' :
                    f.severity === 'moderate' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {f.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.detail}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center text-xs text-slate-400 py-4">
              All baseline vitals and symptom parameters are in optimal range.
            </div>
          )}
        </div>
      </motion.div>

      {/* Mandatory Clinical Disclaimer Banner */}
      <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
        isDark ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}>
        <Lock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 dark:text-slate-200">Clinical Screening & Decision-Support Notice:</strong> Every Second Counts risk stratification models execute 100% locally on-device without third-party cloud AI dependencies. This tool serves as decision-support for early alert screening and does not provide an FDA-cleared clinical diagnosis. A LOW tier denotes <em>"No elevated risk detected from the data you entered."</em> Always consult a licensed healthcare practitioner for medical diagnosis.
        </div>
      </div>
    </div>
  );
};

export default RiskDashboard;
