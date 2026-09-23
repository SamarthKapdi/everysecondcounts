import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplet, Search, Filter, AlertCircle, Plus, Building2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const BloodBank = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'requests'

  // Modals
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  
  // Forms
  const [updateForm, setUpdateForm] = useState({ hospitalId: '', bloodGroup: 'A_POS', unitsAvailable: 0 });
  const [requestForm, setRequestForm] = useState({ admissionId: '', bloodGroup: 'A_POS', unitsRequested: 1 });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, reqRes] = await Promise.all([
        api.get('/blood-bank/inventory'),
        api.get('/blood-bank/requests')
      ]);
      setInventory(invRes.data.data.inventory);
      setRequests(reqRes.data.data.requests);
    } catch (err) {
      toast.error('Failed to load blood bank data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateInventory = async (e) => {
    e.preventDefault();
    try {
      // In a real app, hospitalId would auto-fill for STAFF. Here we ask for it to test.
      if (!updateForm.hospitalId) {
        toast.error('Hospital ID is required for demo purposes');
        return;
      }
      await api.post('/blood-bank/inventory', updateForm);
      toast.success('Inventory updated');
      setShowUpdateModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update inventory');
    }
  };

  const handleRequestBlood = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/blood-bank/requests', requestForm);
      if (res.data.matchedHospitalId) {
        toast.success('Blood matched at nearby hospital!');
      } else {
        toast.error('No inventory found nearby, request pending');
      }
      setShowRequestModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request blood');
    }
  };

  const handleFulfillRequest = async (requestId) => {
    try {
      // For demo, fulfill from the first hospital that matches (requires a sourceHospitalId)
      // Usually staff would pick their own hospital ID. We prompt for it via prompt() for simplicity.
      const sourceHospitalId = prompt("Enter source Hospital ID to fulfill from:");
      if (!sourceHospitalId) return;

      await api.post(`/blood-bank/requests/${requestId}/fulfill`, { sourceHospitalId });
      toast.success('Request fulfilled and inventory deducted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fulfill request (Check inventory)');
    }
  };

  const formatBloodGroup = (bg) => {
    return bg.replace('_POS', '+').replace('_NEG', '-');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Droplet className="w-6 h-6 text-red-500" /> Blood Bank Network
          </h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Manage inventory and fulfill cross-hospital requests</p>
        </div>
        <div className="flex gap-2">
          {(user.role === 'HOSPITAL_STAFF' || user.role === 'SUPER_ADMIN') && (
            <button 
              onClick={() => setShowUpdateModal(true)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-semibold transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              Update Inventory
            </button>
          )}
          {(user.role === 'DOCTOR' || user.role === 'HOSPITAL_STAFF' || user.role === 'SUPER_ADMIN') && (
            <button 
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Request Blood
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex p-1 gap-1 rounded-xl w-fit ${isDark ? 'bg-[#0F172A]' : 'bg-slate-100'}`}>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'inventory' 
              ? isDark ? 'bg-[#1E293B] text-white shadow' : 'bg-white text-slate-900 shadow'
              : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Network Inventory
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'requests' 
              ? isDark ? 'bg-[#1E293B] text-white shadow' : 'bg-white text-slate-900 shadow'
              : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Requests
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'inventory' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {inventory.map(inv => (
            <div key={inv.id} className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center font-bold text-lg">
                    {formatBloodGroup(inv.bloodGroup)}
                  </div>
                </div>
                <span className={`text-2xl font-bold ${inv.unitsAvailable < 5 ? 'text-orange-500' : ''}`}>
                  {inv.unitsAvailable} <span className="text-sm text-slate-500 font-normal">units</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="truncate">{inv.hospital.name}</span>
              </div>
              <div className="text-xs text-slate-400">
                Updated: {new Date(inv.lastUpdated).toLocaleString()}
              </div>
            </div>
          ))}
          {inventory.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No inventory data available.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center font-bold text-xl shrink-0">
                  {formatBloodGroup(req.bloodGroup)}
                </div>
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {req.unitsRequested} Units Requested
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      req.status === 'MATCHED' ? 'bg-blue-100 text-blue-700' :
                      req.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {req.status}
                    </span>
                  </h3>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    For {req.admission?.patient?.name} at {req.admission?.hospital?.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Requested by Dr. {req.requestedBy.name} • {new Date(req.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                {req.status === 'MATCHED' && (user.role === 'HOSPITAL_STAFF' || user.role === 'SUPER_ADMIN') && (
                  <button
                    onClick={() => handleFulfillRequest(req.id)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    Fulfill Request
                  </button>
                )}
                {req.status === 'FULFILLED' && (
                  <div className="flex flex-col items-end">
                    <span className="flex items-center gap-1 text-sm font-semibold text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" /> Fulfilled
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      From {req.fulfilledFromHospital?.name}
                    </span>
                  </div>
                )}
                {req.status === 'UNAVAILABLE' && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-red-500">
                    <AlertCircle className="w-4 h-4" /> No Inventory
                  </span>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No active blood requests.
            </div>
          )}
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
          >
            <h2 className="text-xl font-bold mb-4">Request Blood</h2>
            <form onSubmit={handleRequestBlood} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Admission ID</label>
                <input 
                  required
                  type="text"
                  placeholder="Enter patient admission ID..."
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={requestForm.admissionId}
                  onChange={(e) => setRequestForm({...requestForm, admissionId: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Blood Group</label>
                  <select 
                    required
                    className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    value={requestForm.bloodGroup}
                    onChange={(e) => setRequestForm({...requestForm, bloodGroup: e.target.value})}
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
                  <label className="block text-sm font-semibold mb-1">Units</label>
                  <input 
                    required
                    type="number"
                    min="1"
                    max="10"
                    className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    value={requestForm.unitsRequested}
                    onChange={(e) => setRequestForm({...requestForm, unitsRequested: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowRequestModal(false)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Send Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Update Inventory Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
          >
            <h2 className="text-xl font-bold mb-4">Update Inventory</h2>
            <form onSubmit={handleUpdateInventory} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Hospital ID</label>
                <input 
                  required
                  type="text"
                  placeholder="Enter Hospital ID..."
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={updateForm.hospitalId}
                  onChange={(e) => setUpdateForm({...updateForm, hospitalId: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Blood Group</label>
                  <select 
                    required
                    className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    value={updateForm.bloodGroup}
                    onChange={(e) => setUpdateForm({...updateForm, bloodGroup: e.target.value})}
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
                  <label className="block text-sm font-semibold mb-1">Total Units</label>
                  <input 
                    required
                    type="number"
                    min="0"
                    className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    value={updateForm.unitsAvailable}
                    onChange={(e) => setUpdateForm({...updateForm, unitsAvailable: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowUpdateModal(false)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Save Inventory
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BloodBank;
