import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Activity, Clock, Building2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const SEVERITY_BG = {
  RED: 'bg-red-500/10 text-red-500 border-red-500/20',
  ORANGE: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  YELLOW: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  GREEN: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

const EmergencyHistory = () => {
  const { isDark } = useTheme();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/reports/history');
        setHistory(res.data.data.emergencyHistory || []);
      } catch (err) {
        setHistory([]);
        setError(err.response?.data?.message || 'Unable to load emergency history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black">Emergency History</h1>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          View your past emergency cases and triage outcomes.
        </p>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="space-y-4"
      >
        {loading && (
          <div className="text-xs text-center text-slate-400">Loading history...</div>
        )}
        {!loading && history.length === 0 && (
          <div className="text-xs text-center text-slate-400">{error || 'No emergency history available.'}</div>
        )}
        {!loading && history.map((item, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`glass-card rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{item.id}</p>
                  <p className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Clock className="w-3 h-3" /> {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border self-start ${SEVERITY_BG[item.severity] || SEVERITY_BG.GREEN}`}>
                {item.severity}
              </span>

              <div className="flex items-center gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{item.hospital?.name || '—'}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">{item.status}</span>
              </div>
            </div>
            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-semibold">Symptoms:</span> {(item.symptoms || []).join(', ') || '—'}
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-semibold">Action:</span> {item.recommendedAction || item.notes || '—'}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default EmergencyHistory;
