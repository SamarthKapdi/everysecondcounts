import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { useSocket } from '../../hooks/useSocket';
import { 
  ShieldAlert, Users, MessageCircle, AlertTriangle, 
  Activity, Clock, ChevronRight, Stethoscope, HeartPulse, FileText
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const DoctorDashboard = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { onEvent } = useSocket();
  const [pendingConsults, setPendingConsults] = useState(0);
  const [incomingEmergencies, setIncomingEmergencies] = useState(0);

  // Listen for realtime events
  useEffect(() => {
    const unsubConsult = onEvent('consultation:incoming', () => {
      setPendingConsults(prev => prev + 1);
    });

    const unsubEmergency = onEvent('emergency_alert', () => {
      setIncomingEmergencies(prev => prev + 1);
    });

    return () => {
      if (typeof unsubConsult === 'function') unsubConsult();
      if (typeof unsubEmergency === 'function') unsubEmergency();
    };
  }, [onEvent]);

  return (
    <div className="space-y-6 pb-8">
      {/* Operations Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`flex flex-col lg:flex-row gap-6 p-6 md:p-8 rounded-[1.5rem] border ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-900 border-slate-800'} text-white shadow-xl`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              On Duty
            </span>
            <span className="text-slate-400 text-xs font-medium">Emergency Response</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">
            {user?.name?.startsWith('Dr.') ? user.name : `Dr. ${user?.name?.split(' ')[0] || 'Doctor'}`}
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            {incomingEmergencies > 0 && <span className="text-red-400 font-bold">{incomingEmergencies} incoming {incomingEmergencies === 1 ? 'emergency' : 'emergencies'}</span>}
            {incomingEmergencies > 0 && pendingConsults > 0 && ' and '}
            {pendingConsults > 0 && <span className="text-purple-400 font-bold">{pendingConsults} pending {pendingConsults === 1 ? 'consult' : 'consults'}</span>}
            {incomingEmergencies === 0 && pendingConsults === 0 && 'No pending items. System monitoring active.'}
            . Every Second Counts is routing patients in real-time.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center min-w-[200px]">
          <Link to="/incoming-emergencies" className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 transition-colors text-white font-bold text-sm shadow-lg shadow-red-500/20">
            <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Review Emergencies</span>
            {incomingEmergencies > 0 && <span className="bg-white text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black">{incomingEmergencies}</span>}
            {incomingEmergencies === 0 && <ChevronRight className="w-4 h-4" />}
          </Link>
          <Link to="/consultations" className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-bold text-sm">
            <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Open Queue</span>
            {pendingConsults > 0 && <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingConsults}</span>}
          </Link>
        </div>
      </motion.div>

      {/* Clinical Metrics */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Incoming Emergencies', val: String(incomingEmergencies), icon: AlertTriangle, color: 'red' },
          { label: 'Pending Consults', val: String(pendingConsults), icon: MessageCircle, color: 'purple' },
          { label: 'Notifications', val: String(unreadCount), icon: Activity, color: 'blue' },
          { label: 'System Status', val: 'Online', icon: Clock, color: 'emerald' },
        ].map((stat, i) => (
          <motion.div key={i} variants={fadeUp} className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stat.color === 'red' ? 'bg-red-500/10' :
                stat.color === 'purple' ? 'bg-purple-500/10' :
                stat.color === 'blue' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
              }`}>
                <stat.icon className={`w-4 h-4 ${
                  stat.color === 'red' ? 'text-red-500' :
                  stat.color === 'purple' ? 'text-purple-500' :
                  stat.color === 'blue' ? 'text-blue-500' : 'text-emerald-500'
                }`} />
              </div>
            </div>
            <p className="text-2xl font-black">{stat.val}</p>
            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Clinical Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Triage Queue */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className={`flex flex-col rounded-[1.5rem] border overflow-hidden ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}
        >
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-red-500" /> Active Triage Queue
            </h3>
            <Link to="/incoming-emergencies" className="text-[10px] font-bold text-slate-500 hover:text-blue-500 uppercase tracking-wider">View All</Link>
          </div>
          
          <div className="p-5 space-y-4 flex-1">
            {incomingEmergencies === 0 ? (
              <div className="text-center py-6">
                <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No active emergencies. Queue is clear.</p>
                <p className="text-[10px] text-slate-400 mt-1">New emergencies will appear here in real-time.</p>
              </div>
            ) : (
              <div className={`p-4 rounded-xl border border-red-500/30 bg-red-500/5 relative overflow-hidden`}>
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                <div className="flex justify-between items-start mb-2 pl-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-black uppercase tracking-widest mb-1">New Alert</span>
                    <h4 className="font-bold text-sm">Emergency Case Received</h4>
                  </div>
                  <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">LIVE</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-2 mb-3">
                  A new emergency case has been routed by the AI triage system. Review immediately.
                </p>
                <div className="pl-2">
                  <Link to="/incoming-emergencies" className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 hover:gap-2 transition-all">
                    Review Now <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Clinical Tasks */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className={`flex flex-col rounded-[1.5rem] border overflow-hidden ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}
        >
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-500" /> Quick Actions
            </h3>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
            <Link to="/consultations" className="p-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors block">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <h4 className="font-bold text-sm">Consultation Queue</h4>
                  {pendingConsults > 0 && <span className="text-[10px] font-bold text-purple-500">{pendingConsults} PENDING</span>}
                </div>
                <p className="text-xs text-slate-500">View and accept patient consultation requests in real-time.</p>
              </div>
            </Link>

            <Link to="/ai-reports" className="p-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors block">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <h4 className="font-bold text-sm">AI Report Review</h4>
                </div>
                <p className="text-xs text-slate-500">Review AI-generated triage reports and sign off on findings.</p>
              </div>
            </Link>

            <Link to="/active-patients" className="p-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors block">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <h4 className="font-bold text-sm">Active Patients</h4>
                </div>
                <p className="text-xs text-slate-500">View currently assigned patients and their emergency status.</p>
              </div>
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default DoctorDashboard;
