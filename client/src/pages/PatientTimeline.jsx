import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Clock, CheckCircle2, ChevronRight, User, Phone, FileText, ArrowLeft, HeartPulse, Stethoscope, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const STAGE_ORDER = [
  'REGISTERED', 'TRIAGED', 'ADMITTED', 'IN_TREATMENT',
  'UNDER_OBSERVATION', 'READY_FOR_DISCHARGE', 'DISCHARGED'
];

const PatientTimeline = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdmission = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admissions/${id}`);
      setAdmission(res.data.data.admission);
    } catch (err) {
      toast.error('Failed to load admission details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmission();
  }, [id]);

  const handleStageUpdate = async (newStage) => {
    try {
      await api.patch(`/admissions/${id}/stage`, { stage: newStage });
      toast.success(`Patient moved to ${newStage.replace(/_/g, ' ')}`);
      fetchAdmission();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stage');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!admission) return null;

  const currentStageIndex = STAGE_ORDER.indexOf(admission.stage);
  const nextStage = STAGE_ORDER[currentStageIndex + 1];

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/admissions')}
        className={`flex items-center gap-2 text-sm font-semibold transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Admissions
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Patient Info & Timeline */}
        <div className="flex-1 space-y-6">
          
          {/* Patient Header Card */}
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {admission.patient.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{admission.patient.name}</h1>
                  <div className={`flex items-center gap-4 mt-2 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {admission.patient.phone || 'N/A'}</span>
                    <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> ID: {admission.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>
              </div>
              
              {admission.emergencyCase?.severity === 'RED' && (
                <div className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> CRITICAL CASE
                </div>
              )}
            </div>
          </div>

          {/* Timeline Process */}
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold mb-6">Patient Lifecycle</h2>
            
            <div className="relative pl-6 space-y-8">
              {/* Vertical line connecting nodes */}
              <div className={`absolute left-[11px] top-2 bottom-2 w-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              
              {STAGE_ORDER.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isPending = index > currentStageIndex;

                let iconColor = isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400';
                if (isCompleted) iconColor = 'bg-emerald-500 text-white';
                if (isCurrent) iconColor = 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/20';

                return (
                  <div key={stage} className="relative">
                    {/* Node icon */}
                    <div className={`absolute -left-[35px] w-6 h-6 rounded-full flex items-center justify-center transition-colors ${iconColor} z-10`}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-2 h-2 rounded-full bg-current"></div>}
                    </div>
                    
                    {/* Content */}
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isPending ? 'opacity-50' : ''}`}>
                      <div>
                        <h3 className={`font-semibold ${isCurrent ? 'text-blue-500 dark:text-blue-400' : ''}`}>
                          {stage.replace(/_/g, ' ')}
                        </h3>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                        </p>
                      </div>
                      
                      {isCurrent && stage !== 'DISCHARGED' && (user.role === 'DOCTOR' || user.role === 'HOSPITAL_STAFF' || user.role === 'SUPER_ADMIN') && (
                        <button
                          onClick={() => {
                            if (stage === 'READY_FOR_DISCHARGE') {
                              navigate(`/admissions/${admission.id}/discharge`);
                            } else {
                              handleStageUpdate(nextStage);
                            }
                          }}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all"
                        >
                          {stage === 'READY_FOR_DISCHARGE' ? 'Proceed to Discharge' : `Move to ${nextStage.replace(/_/g, ' ')}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Case Details & Quick Actions */}
        <div className="w-full lg:w-96 space-y-6">
          
          {/* Medical Context */}
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-500" /> Clinical Context
            </h2>
            
            {admission.emergencyCase ? (
              <div className="space-y-4">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Symptoms</p>
                  <div className="flex flex-wrap gap-2">
                    {admission.emergencyCase.symptoms.map((sym, i) => (
                      <span key={i} className={`px-2.5 py-1 text-xs font-medium rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>AI Reasoning</p>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {admission.emergencyCase.aiReasoning || 'N/A'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No emergency case linked.</p>
            )}
          </div>

          {/* Quick Actions / Integration Links */}
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold mb-4">Quick Links</h2>
            <div className="space-y-3">
              <button className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:border-blue-500 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm">Order Lab Test</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              
              <button className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:border-red-500 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm">Request Blood</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default PatientTimeline;
