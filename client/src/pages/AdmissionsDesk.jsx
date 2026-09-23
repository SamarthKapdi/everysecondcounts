import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Plus, Search, Filter, AlertCircle, ChevronRight, User, Phone, CheckCircle2, DollarSign } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AdmissionsDesk = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState('ALL');

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      const url = filterStage !== 'ALL' ? `/admissions?stage=${filterStage}` : '/admissions';
      const res = await api.get(url);
      setAdmissions(res.data.data.admissions);
    } catch (err) {
      toast.error('Failed to fetch admissions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, [filterStage]);

  const updateStage = async (id, newStage) => {
    try {
      await api.patch(`/admissions/${id}/stage`, { stage: newStage });
      toast.success(`Stage updated to ${newStage}`);
      fetchAdmissions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stage');
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'REGISTERED': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
      case 'TRIAGED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'ADMITTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'IN_TREATMENT': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'UNDER_OBSERVATION': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'READY_FOR_DISCHARGE': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'DISCHARGED': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
      case 'TRANSFERRED': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'RED': return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">RED</span>;
      case 'ORANGE': return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">ORANGE</span>;
      case 'YELLOW': return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">YELLOW</span>;
      case 'GREEN': return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">GREEN</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admissions Desk</h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Manage patient lifecycle and hospital admissions</p>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <input 
              type="text"
              placeholder="Search by patient name..."
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm transition-colors ${
                isDark ? 'bg-[#0F172A] border-slate-700 text-white focus:border-blue-500' 
                       : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
              } border outline-none`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className={`py-2 pl-3 pr-8 rounded-xl text-sm cursor-pointer outline-none transition-colors border ${
                isDark ? 'bg-[#0F172A] border-slate-700 text-white focus:border-blue-500' 
                       : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
              }`}
            >
              <option value="ALL">All Stages</option>
              <option value="REGISTERED">Registered</option>
              <option value="ADMITTED">Admitted</option>
              <option value="READY_FOR_DISCHARGE">Ready for Discharge</option>
              <option value="DISCHARGED">Discharged</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : admissions.length === 0 ? (
        <div className={`text-center p-12 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No admissions found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {admissions.map(adm => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={adm.id} 
              className={`p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-lg ${isDark ? 'bg-[#1E293B] border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}
              onClick={() => navigate(`/admissions/${adm.id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {adm.patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold">{adm.patient.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <Phone className="w-3 h-3" /> {adm.patient.phone || 'N/A'}
                    </div>
                  </div>
                </div>
                {getSeverityBadge(adm.emergencyCase?.severity)}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Current Stage</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStageColor(adm.stage)}`}>
                    {adm.stage.replace(/_/g, ' ')}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Assigned Doctor</span>
                  <span className="font-medium">{adm.assignedDoctor?.name || 'Unassigned'}</span>
                </div>

                {adm.billing && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Billing Status</span>
                    <div className="flex items-center gap-1.5 font-medium">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      {adm.billing.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                )}
              </div>

              <div className={`pt-4 border-t flex justify-between items-center ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Updated {new Date(adm.updatedAt).toLocaleDateString()}
                </span>
                <button className="text-blue-500 text-sm font-semibold flex items-center gap-1 group">
                  View Timeline <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdmissionsDesk;
