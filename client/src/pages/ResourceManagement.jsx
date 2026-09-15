import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Package } from 'lucide-react';
import api from '../services/api';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const ResourceManagement = () => {
  const { isDark } = useTheme();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/hospitals');
        setHospitals(res.data.data.hospitals || []);
      } catch (err) {
        setHospitals([]);
        setError(err.response?.data?.message || 'Unable to load resources.');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const resources = useMemo(() => {
    return hospitals.flatMap((hospital) =>
      (hospital.resources || []).map((resource) => ({
        id: resource.id,
        resourceType: resource.resourceType,
        quantity: resource.quantity,
        hospitalName: hospital.name,
      }))
    );
  }, [hospitals]);

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black">Resource Management</h1>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Track medical equipment, blood supply, and critical resources across the hospital network.
        </p>
      </motion.div>

      {/* Resource Table */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`glass-card rounded-2xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <th className="text-left px-5 py-3 font-semibold">Resource</th>
                <th className="text-left px-5 py-3 font-semibold">Location</th>
                <th className="text-left px-5 py-3 font-semibold">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-xs text-slate-400">Loading resources...</td>
                </tr>
              )}
              {!loading && resources.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-xs text-slate-400">{error || 'No resource data available.'}</td>
                </tr>
              )}
              {!loading && resources.map((r) => (
                <tr key={r.id} className={`border-t ${isDark ? 'border-slate-800 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold">{r.resourceType}</span>
                    </div>
                  </td>
                  <td className={`px-5 py-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{r.hospitalName}</td>
                  <td className="px-5 py-3 font-bold">{r.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default ResourceManagement;
