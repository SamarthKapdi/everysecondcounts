import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Building2, Bed, Users, AlertTriangle, MapPin } from 'lucide-react';
import api from '../services/api';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const HospitalNetwork = () => {
  const { isDark } = useTheme();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHospitals = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/hospitals');
        setHospitals(res.data.data.hospitals || []);
      } catch (err) {
        setHospitals([]);
        setError(err.response?.data?.message || 'Unable to load hospital network.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black">Hospital Network</h1>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Manage and monitor all partner hospitals in the Every Second Counts network.
        </p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Hospitals', val: hospitals.length, icon: Building2, color: 'blue' },
          { label: 'Available Beds', val: hospitals.reduce((s, h) => s + (h.availableBeds || 0), 0), icon: Bed, color: 'emerald' },
          { label: 'ICU Facilities', val: hospitals.filter(h => h.hasICU).length, icon: AlertTriangle, color: 'red' },
          { label: 'Active Facilities', val: hospitals.filter(h => h.isActive).length, icon: Users, color: 'purple' },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`glass-card p-4 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
          >
            <s.icon className={`w-5 h-5 text-${s.color}-500 mb-2`} />
            <p className="text-2xl font-black">{s.val}</p>
            <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Hospital Table */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`glass-card rounded-2xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <th className="text-left px-5 py-3 font-semibold">Hospital</th>
                <th className="text-left px-5 py-3 font-semibold">Beds</th>
                <th className="text-left px-5 py-3 font-semibold">ICU</th>
                <th className="text-left px-5 py-3 font-semibold">Load</th>
                <th className="text-left px-5 py-3 font-semibold">Specialties</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-xs text-slate-400">Loading hospitals...</td>
                </tr>
              )}
              {!loading && hospitals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-xs text-slate-400">{error || 'No hospitals available.'}</td>
                </tr>
              )}
              {!loading && hospitals.map((h, i) => (
                <tr key={i} className={`border-t ${isDark ? 'border-slate-800 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                  <td className="px-5 py-3 font-semibold">{h.name}</td>
                  <td className="px-5 py-3">{h.availableBeds ?? '—'}</td>
                  <td className="px-5 py-3">{h.hasICU ? 'Yes' : 'No'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full ${h.currentLoad > 80 ? 'bg-red-500' : h.currentLoad > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${h.currentLoad}%` }} />
                      </div>
                      <span className="font-bold">{h.currentLoad}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(h.specialties || []).map((s, j) => (
                        <span key={j} className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/10 text-blue-500 font-semibold">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200/50 text-slate-400'}`}>
                      {h.isActive ? 'ACTIVE' : 'OFFLINE'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <a href={`https://www.google.com/maps/search/?api=1&query=${h.locationLat},${h.locationLng}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors">
                        <MapPin className="w-3.5 h-3.5" />
                      </a>
                    </div>
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

export default HospitalNetwork;
