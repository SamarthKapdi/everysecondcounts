import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, CheckCircle2, AlertTriangle, ChevronRight, Plus, Download, Clock } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const InsuranceDashboard = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // New policy modal state
  const [showNewPolicy, setShowNewPolicy] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    provider: '',
    policyNumber: '',
    coverageAmount: '',
    validUntil: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [polRes, claimsRes] = await Promise.all([
        api.get('/insurance/policies/me'),
        api.get('/insurance/claims')
      ]);
      setPolicies(polRes.data.data.policies);
      setClaims(claimsRes.data.data.claims);
    } catch (err) {
      toast.error('Failed to load insurance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPolicy = async (e) => {
    e.preventDefault();
    try {
      await api.post('/insurance/policies', newPolicy);
      toast.success('Policy added successfully');
      setShowNewPolicy(false);
      setNewPolicy({ provider: '', policyNumber: '', coverageAmount: '', validUntil: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add policy');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'APPEALED': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Insurance & Claims</h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Manage your policies and track claims</p>
        </div>
        <button 
          onClick={() => setShowNewPolicy(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Policy
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Policies Section */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" /> Active Policies
          </h2>
          
          {policies.length === 0 ? (
            <div className={`p-6 text-center rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
              <Shield className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="font-semibold">No Policies Found</h3>
              <p className="text-sm text-slate-500 mt-1">Add your insurance policy to link it to your hospital visits.</p>
            </div>
          ) : (
            policies.map(policy => (
              <div key={policy.id} className={`p-5 rounded-2xl border relative overflow-hidden ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
                {/* Decorative background logo */}
                <Shield className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-100 dark:text-slate-800/50 -z-10" />
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{policy.provider}</h3>
                    <p className="text-sm font-mono text-slate-500">{policy.policyNumber}</p>
                  </div>
                  {policy.isActive ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ACTIVE
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-bold">
                      EXPIRED
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Coverage</span>
                    <span className="font-bold">${policy.coverageAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valid Until</span>
                    <span className="font-medium">{new Date(policy.validUntil).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Claims Section */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" /> Recent Claims
          </h2>

          {claims.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="font-semibold">No Claims Submitted</h3>
              <p className="text-sm text-slate-500 mt-1">Hospital staff will initiate claims during your admission billing process.</p>
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
              <table className="w-full text-left text-sm">
                <thead className={`border-b ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <tr>
                    <th className="p-4 font-semibold">Hospital</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Amount</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {claims.map(claim => (
                    <tr key={claim.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold">{claim.hospital?.name || 'Unknown Hospital'}</div>
                        <div className="text-xs text-slate-500">{claim.policy?.provider}</div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {new Date(claim.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold">${claim.claimAmount.toLocaleString()}</div>
                        {claim.approvedAmount > 0 && (
                          <div className="text-xs text-emerald-500">Approved: ${claim.approvedAmount.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(claim.status)}`}>
                          {claim.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Policy Modal */}
      {showNewPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
          >
            <h2 className="text-xl font-bold mb-4">Add Insurance Policy</h2>
            <form onSubmit={handleAddPolicy} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Provider Name</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g., Star Health"
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={newPolicy.provider}
                  onChange={(e) => setNewPolicy({...newPolicy, provider: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Policy Number</label>
                <input 
                  required
                  type="text"
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={newPolicy.policyNumber}
                  onChange={(e) => setNewPolicy({...newPolicy, policyNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Coverage Amount ($)</label>
                <input 
                  required
                  type="number"
                  min="0"
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={newPolicy.coverageAmount}
                  onChange={(e) => setNewPolicy({...newPolicy, coverageAmount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Valid Until</label>
                <input 
                  required
                  type="date"
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={newPolicy.validUntil}
                  onChange={(e) => setNewPolicy({...newPolicy, validUntil: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowNewPolicy(false)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default InsuranceDashboard;
