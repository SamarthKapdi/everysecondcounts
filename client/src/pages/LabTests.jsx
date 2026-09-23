import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, CheckCircle2, FlaskConical, Search, Clock, FileWarning, Microscope } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const LabTests = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // New Order Form
  const [newOrder, setNewOrder] = useState({ admissionId: '', testType: '' });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/labs/orders');
      setOrders(res.data.data.orders);
    } catch (err) {
      toast.error('Failed to load lab orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/labs/orders', newOrder);
      toast.success('Test ordered successfully');
      setShowOrderModal(false);
      setNewOrder({ admissionId: '', testType: '' });
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to order test');
    }
  };

  const handleUploadResult = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('report', uploadFile);

    try {
      setIsUploading(true);
      await api.post(`/labs/orders/${selectedOrder.id}/result`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Lab result uploaded & processed successfully');
      setShowUploadModal(false);
      setUploadFile(null);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload result');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReview = async (resultId) => {
    try {
      await api.patch(`/labs/results/${resultId}/review`);
      toast.success('Result marked as reviewed');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to review result');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ORDERED': return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-semibold">ORDERED</span>;
      case 'SAMPLE_COLLECTED': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-semibold">SAMPLE COLLECTED</span>;
      case 'IN_LAB': return <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-semibold">IN LAB</span>;
      case 'COMPLETED': return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-semibold">COMPLETED</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-blue-500" /> Pathology & Labs
          </h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Manage lab test orders and AI-extracted results</p>
        </div>
        {(user.role === 'DOCTOR' || user.role === 'HOSPITAL_STAFF' || user.role === 'SUPER_ADMIN') && (
          <button 
            onClick={() => setShowOrderModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            <Microscope className="w-4 h-4" /> Order New Test
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className={`text-center p-12 rounded-2xl border ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
          <FlaskConical className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">No Lab Orders Found</h3>
          <p className="text-sm text-slate-500">There are no pending or completed lab tests at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {orders.map(order => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={order.id} 
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{order.testType}</h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Patient: <span className="font-semibold text-slate-700 dark:text-slate-300">{order.admission.patient.name}</span>
                  </div>
                </div>
                {getStatusBadge(order.status)}
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ordered By</span>
                  <span className="font-medium">Dr. {order.orderedBy.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ordered At</span>
                  <span>{new Date(order.orderedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Action Area */}
              <div className={`pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                {order.status !== 'COMPLETED' ? (
                  <div className="flex justify-end">
                    {(user.role === 'HOSPITAL_STAFF' || user.role === 'SUPER_ADMIN') && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowUploadModal(true);
                        }}
                        className="flex items-center gap-2 text-sm font-semibold text-blue-500 hover:text-blue-600"
                      >
                        <Upload className="w-4 h-4" /> Upload Results
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0F172A]' : 'bg-slate-50'}`}>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" /> 
                        AI Extracted Findings
                      </h4>
                      {order.result?.resultData?.findings ? (
                        <div className="space-y-2">
                          {order.result.resultData.findings.map((finding, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-slate-500">{finding.label}</span>
                              <span className={`font-semibold ${
                                finding.status === 'high' ? 'text-red-500' : 
                                finding.status === 'low' ? 'text-orange-500' : 'text-emerald-500'
                              }`}>
                                {finding.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No structured data extracted.</p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      {order.result?.reviewedById ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                          <CheckCircle2 className="w-4 h-4" /> Reviewed by {order.result.reviewedBy?.name}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                          <AlertTriangle className="w-4 h-4" /> Pending Doctor Review
                        </div>
                      )}

                      {(!order.result?.reviewedById && (user.role === 'DOCTOR' || user.role === 'SUPER_ADMIN')) && (
                        <button
                          onClick={() => handleReview(order.result.id)}
                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Mark as Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
          >
            <h2 className="text-xl font-bold mb-4">Order Lab Test</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Admission ID</label>
                <input 
                  required
                  type="text"
                  placeholder="Enter patient admission ID..."
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={newOrder.admissionId}
                  onChange={(e) => setNewOrder({...newOrder, admissionId: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Test Type</label>
                <select 
                  required
                  className={`w-full p-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  value={newOrder.testType}
                  onChange={(e) => setNewOrder({...newOrder, testType: e.target.value})}
                >
                  <option value="">Select a test...</option>
                  <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                  <option value="Basic Metabolic Panel (BMP)">Basic Metabolic Panel (BMP)</option>
                  <option value="Lipid Panel">Lipid Panel</option>
                  <option value="Liver Function Test">Liver Function Test</option>
                  <option value="Thyroid Panel">Thyroid Panel</option>
                  <option value="Urinalysis">Urinalysis</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowOrderModal(false)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Place Order
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDark ? 'bg-[#1E293B] border border-slate-700' : 'bg-white'}`}
          >
            <h2 className="text-xl font-bold mb-4">Upload Lab Results</h2>
            <p className="text-sm text-slate-500 mb-6">
              Uploading results for <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedOrder?.testType}</span>. The AI will automatically extract and structure the findings from the PDF.
            </p>
            <form onSubmit={handleUploadResult} className="space-y-6">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDark ? 'border-slate-700 hover:border-blue-500/50 bg-[#0F172A]' : 'border-slate-300 hover:border-blue-500/50 bg-slate-50'}`}>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  id="result-file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
                <label htmlFor="result-file" className="cursor-pointer flex flex-col items-center">
                  <Upload className={`w-8 h-8 mb-3 ${uploadFile ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-semibold">
                    {uploadFile ? uploadFile.name : 'Click to upload PDF report'}
                  </span>
                </label>
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!uploadFile || isUploading}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing AI...
                    </>
                  ) : (
                    'Upload & Analyze'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LabTests;
