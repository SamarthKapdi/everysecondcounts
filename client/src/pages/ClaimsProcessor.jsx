import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle2, XCircle, FileWarning, Search, Filter, Phone, User, DollarSign } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const ClaimsProcessor = () => {
  const { isDark } = useTheme();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal State
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [actionData, setActionData] = useState({ status: '', approvedAmount: '', reviewerNotes: '' });

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const url = filterStatus !== 'ALL' ? `/insurance/claims?status=${filterStatus}` : '/insurance/claims';
      const res = await api.get(url);
      setClaims(res.data.data.claims);
    } catch (err) {
      toast.error('Failed to load claims');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [filterStatus]);

  const handleProcessClaim = async (e) => {
    e.preventDefault();
    if (!actionData.status) {
      toast.error('Please select a status');
      return;
    }

    try {
      await api.patch(`/insurance/claims/${selectedClaim.id}/status`, actionData);
      toast.success(`Claim ${actionData.status.toLowerCase()} successfully`);
      setSelectedClaim(null);
      fetchClaims();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process claim');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED': return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-semibold">SUBMITTED</span>;
      case 'UNDER_REVIEW': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-semibold">UNDER REVIEW</span>;
      case 'APPROVED': return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-semibold">APPROVED</span>;
      case 'REJECTED': return <span className="px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-semibold">REJECTED</span>;
      default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Claims Processing</h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Review and process insurance claims</p>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <input 
              type="text"
              placeholder="Search claims..."
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm transition-colors ${
                isDark ? 'bg-[#0F172A] border-slate-700 text-white focus:border-blue-500' 
                       : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
              } border outline-none`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`py-2 pl-3 pr-8 rounded-xl text-sm cursor-pointer outline-none transition-colors border ${
                isDark ? 'bg-[#0F172A] border-slate-700 text-white focus:border-blue-500' 
                       : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : claims.length === 0 ? (
        <div className={`text-center p-12 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
          <FileWarning className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">No claims found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">There are no claims matching the current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {claims.map(claim => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={claim.id} 
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {claim.patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold">{claim.patient.name}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {claim.policy.provider}
                    </div>
                  </div>
                </div>
                {getStatusBadge(claim.status)}
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Claim Amount</span>
                  <span className="font-bold">${claim.claimAmount.toLocaleString()}</span>
                </div>
                {claim.approvedAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Approved</span>
                    <span className="font-bold text-emerald-500">${claim.approvedAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Policy No.</span>
                  <span className="font-mono">{claim.policy.policyNumber}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Submitted</span>
                  <span>{new Date(claim.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {(claim.status === 'SUBMITTED' || claim.status === 'UNDER_REVIEW') && (
                <button
                  onClick={() => {
                    setSelectedClaim(claim);
                    setActionData({ status: 'UNDER_REVIEW', approvedAmount: claim.claimAmount, reviewerNotes: '' });
                  }}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Process Claim
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Processing Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-lg p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" /> Process Claim
            </h2>
            
            <div className={`p-4 rounded-xl mb-6 text-sm ${isDark ? 'bg-[#0F172A]' : 'bg-slate-50'}`}>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Patient</span>
                <span className="font-medium">{selectedClaim.patient.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Requested Amount</span>
                <span className="font-bold">${selectedClaim.claimAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hospital Bill</span>
                <span className="font-medium">${selectedClaim.billing.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleProcessClaim} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  {['UNDER_REVIEW', 'APPROVED', 'REJECTED'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setActionData({ ...actionData, status })}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${
                        actionData.status === status 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-500' 
                          : isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {actionData.status === 'APPROVED' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Approved Amount ($)</label>
                  <input 
                    required
                    type="number"
                    max={selectedClaim.claimAmount}
                    className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    value={actionData.approvedAmount}
                    onChange={(e) => setActionData({...actionData, approvedAmount: e.target.value})}
                  />
                  <p className="text-xs text-slate-500 mt-1">Cannot exceed requested amount of ${selectedClaim.claimAmount}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">Reviewer Notes</label>
                <textarea 
                  required
                  rows={3}
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none resize-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={actionData.reviewerNotes}
                  onChange={(e) => setActionData({...actionData, reviewerNotes: e.target.value})}
                  placeholder="Enter reasoning for this decision..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setSelectedClaim(null)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ClaimsProcessor;
