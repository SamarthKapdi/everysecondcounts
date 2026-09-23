import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ArrowLeft, FileText, User, DollarSign } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const DischargeSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAdmission = async () => {
      try {
        const res = await api.get(`/admissions/${id}`);
        setAdmission(res.data.data.admission);
      } catch (err) {
        toast.error('Failed to load admission details');
        navigate('/admissions');
      } finally {
        setLoading(false);
      }
    };
    fetchAdmission();
  }, [id, navigate]);

  const handleDischarge = async (e) => {
    e.preventDefault();
    
    if (admission.billing?.status === 'PENDING' && admission.billing?.totalAmount > 0) {
      toast.error('Cannot discharge. Billing is still pending.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.patch(`/admissions/${id}/discharge`, { dischargeSummary: summary });
      toast.success('Patient discharged successfully');
      navigate('/admissions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discharge patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaiveBill = async () => {
    try {
      await api.patch(`/admissions/${id}/billing`, { 
        status: 'WAIVED',
        totalAmount: 0 
      });
      toast.success('Bill waived successfully');
      
      // Update local state to reflect change
      setAdmission(prev => ({
        ...prev,
        billing: { ...prev.billing, status: 'WAIVED', totalAmount: 0 }
      }));
    } catch (err) {
      toast.error('Failed to waive bill');
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

  const isBillingPending = admission.billing?.status === 'PENDING' && admission.billing?.totalAmount > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(`/admissions/${id}`)}
        className={`flex items-center gap-2 text-sm font-semibold transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Timeline
      </button>

      <div>
        <h1 className="text-2xl font-bold">Discharge Patient</h1>
        <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Complete the medical summary and finalize discharge.</p>
      </div>

      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
            {admission.patient.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold">{admission.patient.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Admission ID: {admission.id.substring(0,8).toUpperCase()}</p>
          </div>
        </div>

        {isBillingPending && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Pending Billing Outstanding</h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 mb-3">
                This patient has an outstanding bill of ${admission.billing.totalAmount}. They cannot be discharged until the bill is settled or waived by an administrator.
              </p>
              <button 
                type="button"
                onClick={handleWaiveBill}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Waive Bill (Admin Override)
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleDischarge} className="space-y-6">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Discharge Summary & Instructions
            </label>
            <textarea
              required
              rows={8}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Enter clinical summary, prescribed medications, and follow-up instructions..."
              className={`w-full p-4 rounded-xl text-sm transition-colors ${
                isDark ? 'bg-[#0F172A] border-slate-700 text-white focus:border-blue-500' 
                       : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
              } border outline-none resize-y`}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="submit"
              disabled={isSubmitting || isBillingPending || !summary.trim()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed dark:disabled:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirm Discharge
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DischargeSummary;
