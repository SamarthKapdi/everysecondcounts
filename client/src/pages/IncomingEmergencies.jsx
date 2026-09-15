import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { ShieldAlert, Clock, MapPin, Truck, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const SEVERITY_BG = {
  RED: 'border-red-500/30 bg-red-500/5',
  ORANGE: 'border-orange-500/30 bg-orange-500/5',
  YELLOW: 'border-yellow-500/30 bg-yellow-500/5',
};
const SEVERITY_BADGE = {
  RED: 'bg-red-500 text-white',
  ORANGE: 'bg-orange-500 text-white',
  YELLOW: 'bg-yellow-500 text-white',
};

const IncomingEmergencies = () => {
  const { isDark } = useTheme();
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmergencies = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/emergencies');
        const all = res.data.data.emergencies || [];
        const active = all.filter((em) => ['PENDING', 'DISPATCHED'].includes(em.status));
        setEmergencies(active);
      } catch (err) {
        setEmergencies([]);
        setError(err.response?.data?.message || 'Unable to load emergencies.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencies();
  }, []);

  const handleAcceptCase = async (emergencyId) => {
    try {
      await api.put(`/emergencies/${emergencyId}`, { status: 'ADMITTED' });
      setEmergencies((prev) => prev.filter((em) => em.id !== emergencyId));
      toast.success('Case accepted — patient admitted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to accept case.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Incoming Emergencies</h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Live emergency queue sorted by severity priority.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-500 py-2 px-4 rounded-xl text-xs font-bold">
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          {emergencies.length} ACTIVE CASES
        </div>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="space-y-4"
      >
        {loading && (
          <div className="text-xs text-center text-slate-400">Loading emergencies...</div>
        )}
        {!loading && emergencies.length === 0 && (
          <div className="text-xs text-center text-slate-400">{error || 'No active emergencies.'}</div>
        )}
        {!loading && emergencies.map((em, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`rounded-2xl border p-5 ${SEVERITY_BG[em.severity] || SEVERITY_BG.YELLOW} transition-colors`}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${SEVERITY_BADGE[em.severity] || SEVERITY_BADGE.YELLOW}`}>{em.severity} SEVERITY</span>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{em.id}</span>
                </div>
                <p className="font-bold text-sm">{em.patient?.name || 'Unknown Patient'}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className="font-semibold">Symptoms:</span> {(em.symptoms || []).join(', ') || '—'}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 text-xs md:text-right">
                <p className="flex items-center gap-1 md:justify-end">
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span className="font-bold">Status: {em.status}</span>
                </p>
                <p className={`flex items-center gap-1 md:justify-end ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Truck className="w-3 h-3" /> {em.ambulance?.vehicleNumber || '—'}
                </p>
                <p className={`flex items-center gap-1 md:justify-end ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <MapPin className="w-3 h-3" /> {em.locationLat && em.locationLng ? `${em.locationLat}, ${em.locationLng}` : '—'}
                </p>
              </div>
              <button onClick={() => handleAcceptCase(em.id)} className="btn-primary text-xs !py-2 !px-4 self-start md:self-center flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Accept Case
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default IncomingEmergencies;
