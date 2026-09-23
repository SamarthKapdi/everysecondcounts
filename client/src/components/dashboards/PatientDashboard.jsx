import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { 
  Stethoscope, FileHeart, Building2, MessageCircle, 
  Clock, ShieldAlert, FileText, Activity, CalendarCheck, AlertCircle, Loader2
} from 'lucide-react';
import api from '../../services/api';

const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const SEVERITY_CONFIG = {
  RED: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' },
  ORANGE: { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Urgent' },
  YELLOW: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Moderate' },
  GREEN: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Stable' },
};

const PatientDashboard = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/reports/history');
        setHistory(res.data.data.emergencyHistory || []);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section — AI Triage Assistant */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`relative overflow-hidden rounded-[2rem] border ${isDark ? 'border-[#1E293B] bg-[#0F172A]' : 'border-blue-100 bg-gradient-to-br from-blue-50 to-white'} shadow-sm`}
      >
        <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none">
          <Stethoscope className="w-96 h-96 text-blue-500" />
        </div>
        
        <div className="relative p-8 md:p-10 z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex-1 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">
              Welcome, <span className="text-blue-500">{user?.name?.split(' ')[0] || 'Patient'}</span>
            </h1>
            <p className={`text-sm md:text-base mb-8 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Every Second Counts is ready to assist you. Describe your symptoms for an instant AI-powered triage assessment, or connect with a specialist for a live consultation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/symptom-checker" className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                <Stethoscope className="w-5 h-5" /> Analyze Symptoms
              </Link>
              <Link to="/report-analyzer" className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border ${isDark ? 'bg-[#1E293B] text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                <FileHeart className="w-5 h-5" /> Upload Medical Report
              </Link>
            </div>
          </div>

          <div className="w-full md:w-72 flex-shrink-0">
            <div className={`p-6 rounded-2xl border backdrop-blur-md ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-blue-700 dark:text-blue-400">AI Triage Ready</p>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-500">Online</p>
                </div>
              </div>
              <p className={`text-xs ${isDark ? 'text-blue-500/80' : 'text-blue-700/80'}`}>
                Our hybrid AI engine can analyze symptoms, classify severity, and route you to the right hospital in seconds.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary Actions Grid */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { to: '/hospitals', icon: Building2, label: 'Nearby Hospitals', color: 'emerald', colorClass: 'bg-emerald-500/10 text-emerald-500' },
          { to: '/consult', icon: MessageCircle, label: 'Consult Doctor', color: 'purple', colorClass: 'bg-purple-500/10 text-purple-500' },
          { to: '/sos', icon: AlertCircle, label: 'Emergency SOS', color: 'red', colorClass: 'bg-red-500/10 text-red-500' },
          { to: '/report-analyzer', icon: FileText, label: 'My Reports', color: 'blue', colorClass: 'bg-blue-500/10 text-blue-500' },
        ].map((item, i) => (
          <motion.div key={i} variants={fadeUp}>
            <Link to={item.to} className={`flex flex-col items-center justify-center p-6 rounded-[1.5rem] border transition-all duration-300 group ${isDark ? 'bg-[#1E293B] border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'}`}>
              <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 ${item.colorClass}`}>
                <item.icon className="w-7 h-7" />
              </div>
              <span className="font-semibold text-sm text-center">{item.label}</span>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Secondary Information Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity Timeline — FROM REAL DATA */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className={`lg:col-span-2 p-6 rounded-[1.5rem] border ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> Recent Activity
            </h3>
          </div>
          
          <div className="space-y-4">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading history...
              </div>
            )}
            {!loading && history.length === 0 && (
              <div className="text-center py-6">
                <Activity className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">No emergency history yet. Use AI Triage to get started.</p>
              </div>
            )}
            {!loading && history.slice(0, 4).map((c, i) => {
              const sev = SEVERITY_CONFIG[c.severity] || SEVERITY_CONFIG.YELLOW;
              return (
                <div key={c.id || i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#1E293B]">
                  <div className={`w-10 h-10 rounded-full ${sev.bg} ${sev.color} flex items-center justify-center shrink-0`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm">AI Triage — {sev.label}</h4>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {c.aiReasoning || `Symptoms: ${(c.symptoms || []).join(', ')}`}
                    </p>
                    {c.hospital && (
                      <p className="text-[10px] font-semibold text-blue-500 mt-1">
                        Routed to: {c.hospital.name}
                      </p>
                    )}
                    <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      c.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' :
                      c.status === 'DISPATCHED' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>{c.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Links Sidebar */}
        <div className="space-y-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}
            className={`p-6 rounded-[1.5rem] border ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100'}`}
          >
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Emergency Quick Access
            </h3>
            <div className="space-y-3">
              <Link to="/sos" className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-sm text-red-600 dark:text-red-400">Trigger SOS Alert</span>
                </div>
                <span className="text-[10px] font-bold text-red-500">108</span>
              </Link>
              <Link to="/hospitals" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-sm">Find Nearest Hospital</span>
                </div>
              </Link>
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp}
            className={`p-6 rounded-[1.5rem] border ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100'}`}
          >
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-500" /> Quick Consult
            </h3>
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Connect with an available doctor for a live consultation.
            </p>
            <Link to="/consult" className="block w-full text-center py-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-sm hover:bg-purple-500/15 transition-colors">
              Browse Doctors
            </Link>
          </motion.div>
        </div>
        
      </div>
    </div>
  );
};

export default PatientDashboard;

