import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus, Search, User, TrendingUp, HandHeart } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const Fundraising = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  
  // Forms
  const [createForm, setCreateForm] = useState({ title: '', description: '', targetAmount: '', admissionId: '' });
  const [contributeForm, setContributeForm] = useState({ amount: '', contributorName: '', isAnonymous: false });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fundraising/campaigns');
      setCampaigns(res.data.data.campaigns);
    } catch (err) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fundraising/campaigns', createForm);
      toast.success('Campaign created successfully');
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '', targetAmount: '', admissionId: '' });
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create campaign');
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/fundraising/campaigns/${selectedCampaign.id}/contribute`, contributeForm);
      toast.success('Thank you for your contribution!');
      setShowContributeModal(false);
      setContributeForm({ amount: '', contributorName: '', isAnonymous: false });
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process contribution');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HandHeart className="w-6 h-6 text-emerald-500" /> Patient Fundraising
          </h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Support patients in need or start a medical campaign</p>
        </div>
        {user?.role === 'PATIENT' && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Start a Campaign
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className={`text-center p-12 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
          <HandHeart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">No Active Campaigns</h3>
          <p className="text-sm text-slate-500">There are currently no fundraising campaigns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(campaign => {
            const progress = Math.min(100, Math.round((campaign.amountRaised / campaign.targetAmount) * 100));
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={campaign.id} 
                className={`flex flex-col rounded-2xl border overflow-hidden transition-all hover:shadow-lg ${isDark ? 'bg-[#1E293B] border-slate-700 hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-500/50'}`}
              >
                {/* Header Image Placeholder */}
                <div className="h-32 bg-gradient-to-br from-emerald-400 to-teal-500 relative p-4 flex items-end">
                  <div className="absolute top-4 right-4 px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-xs font-bold uppercase">
                    {campaign.status}
                  </div>
                  <h3 className="text-white font-bold text-lg leading-tight truncate w-full shadow-sm">
                    {campaign.title}
                  </h3>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <User className="w-4 h-4" />
                    <span>Beneficiary: <span className="font-semibold text-slate-700 dark:text-slate-300">{campaign.patient.name}</span></span>
                  </div>

                  <p className={`text-sm mb-6 line-clamp-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {campaign.description}
                  </p>

                  <div className="mt-auto space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1 font-semibold">
                        <span className="text-emerald-500">${campaign.amountRaised.toLocaleString()} raised</span>
                        <span className="text-slate-500">of ${campaign.targetAmount.toLocaleString()}</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <button
                      disabled={campaign.status === 'CLOSED'}
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setShowContributeModal(true);
                      }}
                      className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {campaign.status === 'CLOSED' ? 'Goal Reached' : 'Contribute Now'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-lg p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
          >
            <h2 className="text-xl font-bold mb-4">Start a Campaign</h2>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Campaign Title</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g., Help John beat Cancer"
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={createForm.title}
                  onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Target Amount ($)</label>
                <input 
                  required
                  type="number"
                  min="1"
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={createForm.targetAmount}
                  onChange={(e) => setCreateForm({...createForm, targetAmount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Admission ID (Optional)</label>
                <input 
                  type="text"
                  placeholder="Link to a specific hospital bill..."
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={createForm.admissionId}
                  onChange={(e) => setCreateForm({...createForm, admissionId: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Story / Description</label>
                <textarea 
                  required
                  rows={4}
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none resize-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-sm p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
          >
            <h2 className="text-xl font-bold mb-2">Contribute</h2>
            <p className="text-sm text-slate-500 mb-6 line-clamp-1">To: {selectedCampaign.title}</p>
            
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Amount ($)</label>
                <input 
                  required
                  type="number"
                  min="1"
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none font-bold text-lg text-emerald-500 text-center ${isDark ? 'bg-[#0F172A] border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  value={contributeForm.amount}
                  onChange={(e) => setContributeForm({...contributeForm, amount: e.target.value})}
                  autoFocus
                />
              </div>
              
              {!contributeForm.isAnonymous && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Your Name</label>
                  <input 
                    type="text"
                    placeholder="Leave blank for Anonymous"
                    className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    value={contributeForm.contributorName}
                    onChange={(e) => setContributeForm({...contributeForm, contributorName: e.target.value})}
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
                <input 
                  type="checkbox" 
                  checked={contributeForm.isAnonymous}
                  onChange={(e) => setContributeForm({...contributeForm, isAnonymous: e.target.checked})}
                  className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                Donate anonymously
              </label>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowContributeModal(false);
                    setSelectedCampaign(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Donate
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Fundraising;
