import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import useAuthStore from '../store/authStore';
import { Clock, MessageCircle, Users, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const STATUS_STYLES = {
  PENDING: 'bg-amber-500/10 text-amber-500',
  ACTIVE: 'bg-blue-500/10 text-blue-500',
  COMPLETED: 'bg-emerald-500/10 text-emerald-500',
};

const Consultations = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const { emit, onEvent } = useSocket();
  const navigate = useNavigate();
  const [consults, setConsults] = useState([]);
  const [acceptingId, setAcceptingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch existing consultations from DB on mount
  useEffect(() => {
    const fetchConsultations = async () => {
      setLoading(true);
      try {
        const res = await api.get('/consultations/doctor');
        const dbConsults = (res.data.data.consultations || []).map(c => ({
          consultationId: c.id,
          patient: c.patientName,
          patientId: c.patientId,
          query: c.query || 'General consultation',
          time: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: c.status,
          avatar: c.patientName?.[0] || 'P',
          doctorName: c.doctorName,
        }));
        setConsults(dbConsults);
      } catch (err) {
        console.error('Failed to fetch consultations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConsultations();
  }, []);

  // Listen for NEW incoming consultation requests via Socket.IO (real-time)
  useEffect(() => {
    const unsub = onEvent('consultation:incoming', (data) => {
      setConsults(prev => {
        if (prev.find(c => c.consultationId === data.consultationId)) return prev;
        return [{
          consultationId: data.consultationId,
          patient: data.patientName,
          patientId: data.patientId,
          query: data.query || 'General consultation',
          time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'PENDING',
          avatar: data.patientName?.[0] || 'P',
        }, ...prev];
      });
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [onEvent]);

  const acceptConsultation = async (consult) => {
    setAcceptingId(consult.consultationId);

    try {
      await api.patch(`/consultations/${consult.consultationId}/accept`);
    } catch (err) {
      console.error('Failed to accept consultation in DB:', err);
    }

    emit('consultation:accept', {
      consultationId: consult.consultationId,
      doctorName: user?.name || 'Doctor',
    });

    setConsults(prev => prev.map(c =>
      c.consultationId === consult.consultationId
        ? { ...c, status: 'ACTIVE' }
        : c
    ));

    toast.success(`Consultation with ${consult.patient} accepted!`);

    setTimeout(() => {
      setAcceptingId(null);
      navigate(`/consultation/${consult.consultationId}`);
    }, 800);
  };

  const openChat = (consult) => {
    navigate(`/consultation/${consult.consultationId}`);
  };

  const pending = consults.filter(c => c.status === 'PENDING');
  const active = consults.filter(c => c.status === 'ACTIVE');
  const completed = consults.filter(c => c.status === 'COMPLETED');

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black">Consultations</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Manage patient consultation requests and active chats.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Pending', val: pending.length, color: 'amber' },
          { label: 'Active', val: active.length, color: 'blue' },
          { label: 'Completed', val: completed.length, color: 'emerald' },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`glass-card p-4 rounded-2xl border text-center ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
          >
            <p className="text-2xl font-black">{s.val}</p>
            <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Consultation List */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="space-y-3"
      >
        {loading && (
          <div className={`p-8 rounded-2xl border text-center ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}>
            <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Loading consultations...</p>
          </div>
        )}
        {!loading && consults.length === 0 && (
          <div className={`p-8 rounded-2xl border text-center ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}>
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">No consultations yet</p>
            <p className="text-xs text-slate-400 mt-1">Patient consultation requests will appear here in real-time.</p>
          </div>
        )}
        {!loading && consults.map((c, i) => (
          <motion.div key={c.consultationId || i} variants={fadeUp}
            className={`glass-card rounded-2xl border p-4 ${isDark ? 'border-slate-800' : 'border-slate-200/80'} flex items-center gap-4`}
          >
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {c.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{c.patient}</p>
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.query}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Clock className="w-3 h-3" /> {c.time}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status]}`}>
                {c.status}
              </span>
              {c.status === 'PENDING' && (
                <button
                  onClick={() => acceptConsultation(c)}
                  disabled={acceptingId === c.consultationId}
                  className="py-1.5 px-3 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  {acceptingId === c.consultationId ? (
                    <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Accepting</span>
                  ) : 'Accept'}
                </button>
              )}
              {c.status === 'ACTIVE' && (
                <button
                  onClick={() => openChat(c)}
                  className="py-1.5 px-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" /> Chat
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Consultations;
