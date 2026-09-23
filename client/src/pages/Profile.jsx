import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, HeartPulse, Shield } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const Profile = () => {
  const { user } = useAuthStore();
  const { isDark } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/reports');
        setReports(res.data.data.reports || []);
      } catch (err) {
        setReports([]);
        setError(err.response?.data?.message || 'Unable to load reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-black">User Profile Center</h1>
        <p className="text-xs text-slate-400 mt-0.5">Manage Your Medical Identity, Security Settings and Triage Logs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* User Card info */}
        <div className="md:col-span-4 glass-card p-6 border-slate-200/50 dark:border-slate-800/80 flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-white text-3xl font-extrabold shadow-xl">
            {user?.name?.[0] || 'U'}
          </div>
          <div>
            <h3 className="font-extrabold text-lg leading-snug">{user?.name || 'Every Second Counts User'}</h3>
            <p className="text-xs text-primary font-bold uppercase tracking-wider mt-0.5 capitalize">{user?.role || 'Patient'}</p>
          </div>

          <div className="w-full pt-4 border-t border-slate-200/50 dark:border-slate-700/50 text-left space-y-3.5 text-xs">
            <div className="flex items-center gap-2.5 text-slate-500">
              <Mail className="w-4 h-4 text-primary" />
              <span>{user?.email || 'user@Every Second Counts.ai'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-500">
              <Phone className="w-4 h-4 text-cyan-500" />
              <span>{user?.phone || '+91 98765 43210'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-500">
              <Shield className="w-4 h-4 text-accent" />
              <span>Security Token Active</span>
            </div>
          </div>
        </div>

        {/* Medical History logs & reports */}
        <div className="md:col-span-8 glass-card p-6 border-slate-200/50 dark:border-slate-800/80 space-y-6">
          <div>
            <h3 className="font-bold text-base mb-1">Clinical Triage logs</h3>
            <p className="text-[11px] text-slate-400">Electronic health logs and AI emergency evaluations</p>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="text-xs text-center text-slate-400">Loading reports...</div>
            )}
            {!loading && reports.length === 0 && (
              <div className="text-xs text-center text-slate-400">{error || 'No reports available.'}</div>
            )}
            {!loading && reports.map((report) => (
              <div 
                key={report.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800/30 border-slate-700 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-primary">Doctor Note</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{report.note}</p>
                <p className="text-[10px] text-slate-400 mt-2">
                  By {report.doctor?.name || 'Doctor'} • Severity {report.emergency?.severity || '—'}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 flex items-start gap-3">
            <HeartPulse className="w-5 h-5 shrink-0 animate-pulse" />
            <div>
              <p className="font-bold uppercase tracking-wider">HIPAA & Privacy Confirmed</p>
              <p className="mt-0.5 leading-relaxed text-slate-500 dark:text-slate-400">
                Your medical symptom data remains end-to-end encrypted and HIPAA compliant. Only routed hospitals gain emergency access when SOS triggers.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Profile;
