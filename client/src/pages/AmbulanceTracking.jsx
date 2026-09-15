import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Truck, MapPin, Clock, Radio } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const STATUS_STYLES = {
  AVAILABLE: 'bg-emerald-500/10 text-emerald-500',
  EN_ROUTE: 'bg-blue-500/10 text-blue-500',
  AT_HOSPITAL: 'bg-purple-500/10 text-purple-500',
  OFFLINE: 'bg-slate-200/50 text-slate-400 dark:bg-slate-800',
};

const AmbulanceTracking = () => {
  const { isDark } = useTheme();
  const [ambulances] = useState([]);

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Ambulance Tracking</h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Monitor fleet status and dispatch ambulances to emergency cases.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 py-2 px-4 rounded-xl text-xs font-bold">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          {ambulances.filter(a => a.status !== 'OFFLINE').length} UNITS ACTIVE
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Fleet', val: ambulances.length, color: 'blue' },
          { label: 'Available', val: ambulances.filter(a => a.status === 'AVAILABLE').length, color: 'emerald' },
          { label: 'En Route', val: ambulances.filter(a => a.status === 'EN_ROUTE').length, color: 'amber' },
          { label: 'Offline', val: ambulances.filter(a => a.status === 'OFFLINE').length, color: 'slate' },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`glass-card p-4 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
          >
            <p className="text-2xl font-black">{s.val}</p>
            <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Ambulance Cards */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {ambulances.length === 0 && (
          <div className="col-span-full text-center text-xs text-slate-400">No ambulance data available.</div>
        )}
        {ambulances.map((amb, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`glass-card rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-sm">{amb.id}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[amb.status]}`}>
                {amb.status.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-2">
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-semibold">Driver:</span> {amb.driver}
              </p>
              <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <MapPin className="w-3 h-3" /> {amb.location}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-semibold">Vehicle:</span> {amb.vehicle}
              </p>
              <p className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Clock className="w-3 h-3" /> Last update: {amb.lastUpdate}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default AmbulanceTracking;
