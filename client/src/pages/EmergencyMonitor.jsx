import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import useTelemetryStore from '../store/telemetryStore';
import {
  HeartPulse, Thermometer, Wind, Activity, Droplets,
  AlertTriangle, Shield, Radio, Zap, TrendingDown
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const VitalCard = ({ icon: Icon, label, value, unit, color, isDark, alert }) => (
  <div className={`glass-card p-4 rounded-2xl border relative overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200/80'} ${alert ? 'ring-2 ring-red-500/30' : ''}`}>
    {alert && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />}
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4" style={{ color }} />
      <span className={`text-[10px] font-semibold tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
    </div>
    <div className="flex items-end gap-1">
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
      <span className={`text-[10px] mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{unit}</span>
    </div>
  </div>
);

const EmergencyMonitor = () => {
  const { isDark } = useTheme();
  const { currentVitals, ecgWaveform, alerts, isStreaming } = useTelemetryStore();
  const vitals = currentVitals;
  const ecgHistory = (ecgWaveform || []).map((val, index) => ({ t: index, val }));
  const hr = vitals?.heartRate;
  const spo2 = vitals?.oxygenSaturation;
  const bp = vitals?.bloodPressure;
  const temp = vitals?.temperature;
  const rr = vitals?.respiratoryRate;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Emergency Telemetry Monitor</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time patient vitals streaming with deterioration alerts
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Radio className={`w-3.5 h-3.5 ${isStreaming ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
          <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isStreaming ? 'LIVE' : 'NO STREAM'}
          </span>
        </div>
      </motion.div>

      {/* ECG Waveform */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`glass-card p-5 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-red-500" /> ECG Waveform
          </h3>
          <span className={`text-xs font-bold ${hr?.value > 120 ? 'text-red-500' : 'text-emerald-500'}`}>
            {hr?.value || '—'} bpm
          </span>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ecgHistory}>
              <YAxis hide domain={[-1.5, 3]} />
              <Line type="monotone" dataKey="val" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Vital Cards Grid */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        <motion.div variants={fadeUp}>
          <VitalCard icon={HeartPulse} label="HEART RATE" value={hr?.value || '—'} unit={hr?.unit || 'bpm'}
            color={hr?.value > 120 ? '#EF4444' : hr?.value > 100 ? '#F97316' : '#22C55E'} isDark={isDark} alert={hr?.value > 130} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <VitalCard icon={Droplets} label="SpO₂" value={spo2?.value || '—'} unit={spo2?.unit || '%'}
            color={spo2?.value < 90 ? '#EF4444' : spo2?.value < 95 ? '#F97316' : '#22C55E'} isDark={isDark} alert={spo2?.value < 90} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <VitalCard icon={Activity} label="BLOOD PRESSURE" value={`${bp?.systolic || '—'}/${bp?.diastolic || '—'}`} unit={bp?.unit || 'mmHg'}
            color={bp?.systolic > 160 ? '#EF4444' : bp?.systolic > 140 ? '#F97316' : '#22C55E'} isDark={isDark} alert={bp?.systolic > 180} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <VitalCard icon={Thermometer} label="TEMPERATURE" value={temp?.value || '—'} unit={temp?.unit || '°C'}
            color={temp?.value > 39 ? '#EF4444' : temp?.value > 38 ? '#F97316' : '#22C55E'} isDark={isDark} alert={temp?.value > 39.5} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <VitalCard icon={Wind} label="RESP RATE" value={rr?.value || '—'} unit={rr?.unit || 'br/min'}
            color={rr?.value > 25 ? '#EF4444' : rr?.value > 20 ? '#F97316' : '#22C55E'} isDark={isDark} alert={rr?.value > 28} />
        </motion.div>
      </motion.div>

      {/* Alerts Panel */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`glass-card p-5 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
      >
        <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Active Alerts & Deterioration Warnings
        </h3>
        <div className="space-y-2">
          {!vitals && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-sm">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>No telemetry stream available yet.</span>
            </div>
          )}
          {hr?.value > 120 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
              <Zap className="w-4 h-4 text-red-500 shrink-0" />
              <span><strong className="text-red-500">Tachycardia:</strong> Heart rate at {hr.value} bpm exceeds safe threshold</span>
            </div>
          )}
          {spo2?.value < 92 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
              <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
              <span><strong className="text-red-500">Hypoxemia:</strong> SpO₂ at {spo2.value}% — supplemental oxygen recommended</span>
            </div>
          )}
          {bp?.systolic > 160 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
              <span><strong className="text-orange-500">Hypertension:</strong> Blood pressure {bp.systolic}/{bp.diastolic} mmHg requires monitoring</span>
            </div>
          )}
          {temp?.value > 39 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
              <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
              <span><strong className="text-amber-500">Fever:</strong> Temperature at {temp.value}°C — antipyretic intervention may be needed</span>
            </div>
          )}
          {vitals && hr?.value <= 120 && spo2?.value >= 92 && bp?.systolic <= 160 && temp?.value <= 39 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong className="text-emerald-500">Stable:</strong> All vitals within acceptable parameters. Monitoring continues.</span>
            </div>
          )}
          {alerts?.length > 0 && alerts.map((alert, index) => (
            <div key={`${alert.type}-${index}`} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span><strong className="text-amber-500">{alert.type}:</strong> {alert.message}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default EmergencyMonitor;
