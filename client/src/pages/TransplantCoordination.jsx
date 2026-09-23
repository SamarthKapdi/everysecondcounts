import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Plus, Search, CheckCircle2, User, Activity, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const TransplantCoordination = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  
  const [donors, setDonors] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('waitlist'); // 'waitlist' or 'donors'

  // Modals
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [matchingWaitlist, setMatchingWaitlist] = useState(null); // The waitlist entry currently being matched
  const [matches, setMatches] = useState([]); // AI-generated matches
  
  // Forms
  const [donorForm, setDonorForm] = useState({ externalDonorName: '', bloodGroup: 'O_POS', organType: 'KIDNEY' });
  const [waitlistForm, setWaitlistForm] = useState({ patientId: '', bloodGroup: 'O_POS', organType: 'KIDNEY', urgencyScore: 5 });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [donorsRes, waitlistRes] = await Promise.all([
        api.get('/transplants/donors'),
        api.get('/transplants/waitlist')
      ]);
      setDonors(donorsRes.data.data.donors);
      setWaitlist(waitlistRes.data.data.waitlist);
    } catch (err) {
      toast.error('Failed to load transplant data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role !== 'PATIENT') {
      fetchData();
    }
  }, []);

  const handleRegisterDonor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transplants/donors', donorForm);
      toast.success('Donor registered successfully');
      setShowDonorModal(false);
      if (user.role !== 'PATIENT') fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register donor');
    }
  };

  const handleAddWaitlist = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transplants/waitlist', waitlistForm);
      toast.success('Added to waitlist');
      setShowWaitlistModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to waitlist');
    }
  };

  const handleFindMatches = async (waitlistEntry) => {
    try {
      setMatchingWaitlist(waitlistEntry);
      const res = await api.get(`/transplants/waitlist/${waitlistEntry.id}/matches`);
      setMatches(res.data.data.matches);
    } catch (err) {
      toast.error('Failed to find matches');
      setMatchingWaitlist(null);
    }
  };

  const handleExecuteMatch = async (donorId) => {
    try {
      await api.post('/transplants/match', { waitlistId: matchingWaitlist.id, donorId });
      toast.success('Match successfully executed!');
      setMatchingWaitlist(null);
      setMatches([]);
      fetchData();
    } catch (err) {
      toast.error('Failed to execute match');
    }
  };

  const formatBloodGroup = (bg) => bg.replace('_POS', '+').replace('_NEG', '-');
  const formatOrganType = (ot) => ot.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  if (user.role === 'PATIENT') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="w-24 h-24 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center">
            <HeartPulse className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Be a Hero, Save a Life</h1>
            <p className={`max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Pledge to be an organ donor. One organ donor can save up to 8 lives. Your decision can make a miracle happen.
            </p>
          </div>
          <button 
            onClick={() => setShowDonorModal(true)}
            className="px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105"
          >
            Pledge to Donate Organ
          </button>
        </div>

        {/* Patient Donor Modal */}
        {showDonorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
            >
              <h2 className="text-xl font-bold mb-4">Register as Donor</h2>
              <form onSubmit={handleRegisterDonor} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Blood Group</label>
                    <select 
                      required
                      className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                      value={donorForm.bloodGroup}
                      onChange={(e) => setDonorForm({...donorForm, bloodGroup: e.target.value})}
                    >
                      <option value="A_POS">A+</option>
                      <option value="A_NEG">A-</option>
                      <option value="B_POS">B+</option>
                      <option value="B_NEG">B-</option>
                      <option value="AB_POS">AB+</option>
                      <option value="AB_NEG">AB-</option>
                      <option value="O_POS">O+</option>
                      <option value="O_NEG">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Organ to Pledge</label>
                    <select 
                      required
                      className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                      value={donorForm.organType}
                      onChange={(e) => setDonorForm({...donorForm, organType: e.target.value})}
                    >
                      <option value="KIDNEY">Kidney</option>
                      <option value="LIVER">Liver</option>
                      <option value="HEART">Heart</option>
                      <option value="LUNG">Lung</option>
                      <option value="CORNEA">Cornea</option>
                      <option value="BONE_MARROW">Bone Marrow</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowDonorModal(false)}
                    className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-semibold transition-colors"
                  >
                    Submit Pledge
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-pink-500" /> Transplant Coordination
          </h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Manage waitlists and AI-driven organ matching</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowDonorModal(true)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-semibold transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <User className="w-4 h-4" /> Add Donor
          </button>
          <button 
            onClick={() => setShowWaitlistModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-xl font-semibold hover:bg-pink-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add to Waitlist
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex p-1 gap-1 rounded-xl w-fit ${isDark ? 'bg-[#0F172A]' : 'bg-slate-100'}`}>
        <button
          onClick={() => setActiveTab('waitlist')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'waitlist' 
              ? isDark ? 'bg-[#1E293B] text-white shadow' : 'bg-white text-slate-900 shadow'
              : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Recipient Waitlist
        </button>
        <button
          onClick={() => setActiveTab('donors')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'donors' 
              ? isDark ? 'bg-[#1E293B] text-white shadow' : 'bg-white text-slate-900 shadow'
              : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Donors
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'waitlist' ? (
        <div className="space-y-4">
          {waitlist.map(entry => (
            <div key={entry.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 ${
                  entry.urgencyScore >= 8 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  entry.urgencyScore >= 5 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {entry.urgencyScore}/10
                </div>
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {entry.patient?.name || 'Unknown Patient'}
                    <span className="text-sm font-normal text-slate-500">
                      needs a {formatOrganType(entry.organType)}
                    </span>
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold">
                      Blood: {formatBloodGroup(entry.bloodGroup)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>Waiting since {new Date(entry.waitingSince).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end w-full md:w-auto">
                <button
                  onClick={() => handleFindMatches(entry)}
                  className="w-full md:w-auto px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" /> Find Matches
                </button>
              </div>
            </div>
          ))}
          {waitlist.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No patients currently on the waitlist.
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {donors.map(donor => (
            <div key={donor.id} className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 flex items-center justify-center font-bold">
                  {formatOrganType(donor.organType).charAt(0)}
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-xs font-bold">
                  ACTIVE
                </span>
              </div>
              <h3 className="font-bold text-lg">{donor.user?.name || donor.externalDonorName || 'Anonymous Donor'}</h3>
              <p className="text-sm font-semibold text-pink-500 dark:text-pink-400 mb-2">{formatOrganType(donor.organType)}</p>
              <div className="flex justify-between items-center text-sm text-slate-500 pt-3 border-t dark:border-slate-700">
                <span>Blood: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatBloodGroup(donor.bloodGroup)}</span></span>
                <span>{new Date(donor.registeredAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {donors.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No active donors registered.
            </div>
          )}
        </div>
      )}

      {/* Matching Modal */}
      {matchingWaitlist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-3xl p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" /> AI Match Results
              </h2>
              <button 
                onClick={() => { setMatchingWaitlist(null); setMatches([]); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>

            <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-[#0F172A]' : 'bg-slate-50'}`}>
              <p className="text-sm text-slate-500">Finding match for:</p>
              <h3 className="font-bold text-lg">{matchingWaitlist.patient?.name}</h3>
              <p className="text-sm font-semibold text-pink-500">{formatOrganType(matchingWaitlist.organType)} • {formatBloodGroup(matchingWaitlist.bloodGroup)}</p>
            </div>

            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Ranked Matches</h3>
            
            <div className="space-y-3">
              {matches.map((match, index) => (
                <div key={match.donor.id} className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${index === 0 ? (isDark ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-500 bg-emerald-50') : (isDark ? 'border-slate-700' : 'border-slate-200')}`}>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-100 text-emerald-600 dark:border-emerald-900/50 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold">{match.donor.user?.name || match.donor.externalDonorName || 'Anonymous Donor'}</h4>
                      <p className="text-sm text-slate-500">Blood: {formatBloodGroup(match.donor.bloodGroup)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-500">{match.score}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Match Score</div>
                    </div>
                    <button
                      onClick={() => handleExecuteMatch(match.donor.id)}
                      className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
                    >
                      Execute Match
                    </button>
                  </div>
                </div>
              ))}
              {matches.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No compatible donors found at this time.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Staff Donor/Waitlist Modals */}
      {/* ... (Skipping full implementation of staff forms for brevity, similar to previous ones) ... */}
      {showDonorModal && user.role !== 'PATIENT' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
         <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
         >
           <h2 className="text-xl font-bold mb-4">Register External Donor</h2>
           <form onSubmit={handleRegisterDonor} className="space-y-4">
             <div>
               <label className="block text-sm font-semibold mb-1">Donor Name</label>
               <input 
                 required
                 type="text"
                 placeholder="Enter full name"
                 className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                 value={donorForm.externalDonorName}
                 onChange={(e) => setDonorForm({...donorForm, externalDonorName: e.target.value})}
               />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-semibold mb-1">Blood Group</label>
                 <select 
                   required
                   className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                   value={donorForm.bloodGroup}
                   onChange={(e) => setDonorForm({...donorForm, bloodGroup: e.target.value})}
                 >
                   <option value="A_POS">A+</option>
                   <option value="A_NEG">A-</option>
                   <option value="B_POS">B+</option>
                   <option value="B_NEG">B-</option>
                   <option value="AB_POS">AB+</option>
                   <option value="AB_NEG">AB-</option>
                   <option value="O_POS">O+</option>
                   <option value="O_NEG">O-</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-semibold mb-1">Organ</label>
                 <select 
                   required
                   className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                   value={donorForm.organType}
                   onChange={(e) => setDonorForm({...donorForm, organType: e.target.value})}
                 >
                   <option value="KIDNEY">Kidney</option>
                   <option value="LIVER">Liver</option>
                   <option value="HEART">Heart</option>
                   <option value="LUNG">Lung</option>
                   <option value="CORNEA">Cornea</option>
                   <option value="BONE_MARROW">Bone Marrow</option>
                 </select>
               </div>
             </div>
             <div className="flex gap-3 pt-4">
               <button 
                 type="button" 
                 onClick={() => setShowDonorModal(false)}
                 className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
               >
                 Cancel
               </button>
               <button 
                 type="submit" 
                 className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
               >
                 Register Donor
               </button>
             </div>
           </form>
         </motion.div>
       </div>
      )}

      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
        >
          <h2 className="text-xl font-bold mb-4">Add to Waitlist</h2>
          <form onSubmit={handleAddWaitlist} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Patient ID</label>
              <input 
                required
                type="text"
                placeholder="Enter Patient UUID..."
                className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                value={waitlistForm.patientId}
                onChange={(e) => setWaitlistForm({...waitlistForm, patientId: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Organ</label>
                <select 
                  required
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={waitlistForm.organType}
                  onChange={(e) => setWaitlistForm({...waitlistForm, organType: e.target.value})}
                >
                  <option value="KIDNEY">Kidney</option>
                  <option value="LIVER">Liver</option>
                  <option value="HEART">Heart</option>
                  <option value="LUNG">Lung</option>
                  <option value="CORNEA">Cornea</option>
                  <option value="BONE_MARROW">Bone Marrow</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Blood Group</label>
                <select 
                  required
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={waitlistForm.bloodGroup}
                  onChange={(e) => setWaitlistForm({...waitlistForm, bloodGroup: e.target.value})}
                >
                  <option value="A_POS">A+</option>
                  <option value="A_NEG">A-</option>
                  <option value="B_POS">B+</option>
                  <option value="B_NEG">B-</option>
                  <option value="AB_POS">AB+</option>
                  <option value="AB_NEG">AB-</option>
                  <option value="O_POS">O+</option>
                  <option value="O_NEG">O-</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Urgency Score (1-10)</label>
              <input 
                required
                type="number"
                min="1"
                max="10"
                className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                value={waitlistForm.urgencyScore}
                onChange={(e) => setWaitlistForm({...waitlistForm, urgencyScore: e.target.value})}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setShowWaitlistModal(false)}
                className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
              >
                Add to List
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </div>
  );
};

export default TransplantCoordination;
