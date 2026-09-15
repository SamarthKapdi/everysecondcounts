import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { HeartPulse, Clock, ChevronDown, ChevronUp, Send } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const SEVERITY_DOT = { RED: 'bg-red-500', ORANGE: 'bg-orange-500', YELLOW: 'bg-yellow-500', GREEN: 'bg-emerald-500' };

const ActivePatients = () => {
  const { isDark } = useTheme();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/emergencies', { params: { status: 'ADMITTED' } });
        setPatients(res.data.data.emergencies || []);
      } catch (err) {
        setPatients([]);
        setError(err.response?.data?.message || 'Unable to load active patients.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleAddNote = async (caseId) => {
    const content = noteInputs[caseId]?.trim();
    if (!content) return;
    try {
      await api.post('/reports', { case_id: caseId, content });
      toast.success('Clinical note added.');
      setNoteInputs((prev) => ({ ...prev, [caseId]: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add note.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black">Active Patients</h1>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Patients currently assigned to you across all wards.
        </p>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {loading && (
          <div className="text-xs text-center text-slate-400">Loading patients...</div>
        )}
        {!loading && patients.length === 0 && (
          <div className="text-xs text-center text-slate-400">{error || 'No admitted patients found.'}</div>
        )}
        {!loading && patients.map((p, i) => (
          <motion.div key={i} variants={fadeUp}
            className={`glass-card rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-xs">
                {(p.patient?.name || 'U').split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{p.patient?.name || 'Unknown Patient'}</p>
                <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Case ID: {p.id}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${SEVERITY_DOT[p.severity] || SEVERITY_DOT.YELLOW}`} />
            </div>
            <div className="space-y-2">
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-semibold">Condition:</span> {(p.symptoms || []).join(', ') || '—'}
              </p>
              <div className="flex items-center gap-4 text-xs">
                <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Clock className="w-3 h-3" /> Admitted {new Date(p.createdAt).toLocaleDateString()}
                </span>
                <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <HeartPulse className="w-3 h-3" /> {p.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => toggleExpand(p.id)} className="flex-1 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1">
                {expandedId === p.id ? <><ChevronUp className="w-3 h-3" /> Hide Details</> : <><ChevronDown className="w-3 h-3" /> View Details</>}
              </button>
              <button onClick={() => { setExpandedId(p.id); document.getElementById(`note-${p.id}`)?.focus(); }} className="flex-1 py-2 rounded-xl bg-purple-500/10 text-purple-500 text-[10px] font-bold hover:bg-purple-500/20 transition-colors">
                Add Note
              </button>
            </div>

            {/* Expanded Details */}
            {expandedId === p.id && (
              <div className={`mt-4 pt-4 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="space-y-1.5">
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><span className="font-semibold">Severity:</span> {p.severity}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><span className="font-semibold">Hospital:</span> {p.hospital?.name || '—'}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><span className="font-semibold">AI Reasoning:</span> {p.aiReasoning || '—'}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><span className="font-semibold">Recommended:</span> {p.recommendedAction || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <input
                    id={`note-${p.id}`}
                    type="text"
                    placeholder="Add clinical note..."
                    value={noteInputs[p.id] || ''}
                    onChange={(e) => setNoteInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(p.id); }}
                    className="input-field flex-1 !py-2 text-xs"
                  />
                  <button onClick={() => handleAddNote(p.id)} className="px-3 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 transition-colors flex items-center gap-1">
                    <Send className="w-3 h-3" /> Send
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default ActivePatients;
