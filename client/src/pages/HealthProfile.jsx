import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HeartPulse, Shield, Activity, User, Save, AlertTriangle,
  CheckCircle2, Info, Lock, Flame, Moon, Heart, Stethoscope
} from 'lucide-react';

const HealthProfile = () => {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const targetPatientId = searchParams.get('patientId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completeness, setCompleteness] = useState(0);
  const [dataConfidence, setDataConfidence] = useState('LOW');
  const [patientInfo, setPatientInfo] = useState(null);

  const [form, setForm] = useState({
    dateOfBirth: '',
    sex: '',
    heightCm: '',
    weightKg: '',
    bloodGroup: '',
    restingBpSystolic: '',
    restingBpDiastolic: '',
    restingHeartRate: '',
    totalCholesterol: '',
    ldl: '',
    hdl: '',
    triglycerides: '',
    fastingGlucose: '',
    hba1c: '',
    smokingStatus: 'NEVER',
    alcoholUse: 'NONE',
    activityLevel: 'SEDENTARY',
    sleepHoursAvg: '',
    familyHistoryHeartDisease: false,
    familyHistoryStroke: false,
    familyHistoryDiabetes: false,
    existingConditions: {
      diabetes: false,
      hypertension: false,
      heartDisease: false,
      asthma: false,
      kidneyDisease: false,
      thyroid: false
    },
    currentMedications: '',
    allergies: '',
    emergencyContact: '',
    consentToHealthMonitoring: true
  });

  const isDoctorView = Boolean(targetPatientId && targetPatientId !== user?.id);

  // Compute live BMI
  const computedBmi = form.heightCm && form.weightKg && Number(form.heightCm) > 0
    ? (Number(form.weightKg) / ((Number(form.heightCm) / 100) ** 2)).toFixed(1)
    : null;

  useEffect(() => {
    fetchProfile();
  }, [targetPatientId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const url = targetPatientId ? `/health/profile?patientId=${targetPatientId}` : '/health/profile';
      const res = await api.get(url);
      const data = res.data.data;
      if (data.profile) {
        const p = data.profile;
        setForm({
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
          sex: p.sex || '',
          heightCm: p.heightCm !== null ? String(p.heightCm) : '',
          weightKg: p.weightKg !== null ? String(p.weightKg) : '',
          bloodGroup: p.bloodGroup || '',
          restingBpSystolic: p.restingBpSystolic !== null ? String(p.restingBpSystolic) : '',
          restingBpDiastolic: p.restingBpDiastolic !== null ? String(p.restingBpDiastolic) : '',
          restingHeartRate: p.restingHeartRate !== null ? String(p.restingHeartRate) : '',
          totalCholesterol: p.totalCholesterol !== null ? String(p.totalCholesterol) : '',
          ldl: p.ldl !== null ? String(p.ldl) : '',
          hdl: p.hdl !== null ? String(p.hdl) : '',
          triglycerides: p.triglycerides !== null ? String(p.triglycerides) : '',
          fastingGlucose: p.fastingGlucose !== null ? String(p.fastingGlucose) : '',
          hba1c: p.hba1c !== null ? String(p.hba1c) : '',
          smokingStatus: p.smokingStatus || 'NEVER',
          alcoholUse: p.alcoholUse || 'NONE',
          activityLevel: p.activityLevel || 'SEDENTARY',
          sleepHoursAvg: p.sleepHoursAvg !== null ? String(p.sleepHoursAvg) : '',
          familyHistoryHeartDisease: Boolean(p.familyHistoryHeartDisease),
          familyHistoryStroke: Boolean(p.familyHistoryStroke),
          familyHistoryDiabetes: Boolean(p.familyHistoryDiabetes),
          existingConditions: p.existingConditions || {
            diabetes: false,
            hypertension: false,
            heartDisease: false,
            asthma: false,
            kidneyDisease: false,
            thyroid: false
          },
          currentMedications: p.currentMedications || '',
          allergies: p.allergies || '',
          emergencyContact: p.emergencyContact || '',
          consentToHealthMonitoring: p.consentToHealthMonitoring !== undefined ? p.consentToHealthMonitoring : true
        });
        setCompleteness(data.completenessPercent || 0);
        setDataConfidence(data.dataConfidence || 'LOW');
        if (p.patient) setPatientInfo(p.patient);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || 'Access denied. Active clinical relationship required.');
      } else {
        toast.error('Failed to load health profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleConditionToggle = (key) => {
    setForm(prev => ({
      ...prev,
      existingConditions: {
        ...prev.existingConditions,
        [key]: !prev.existingConditions[key]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDoctorView) return;

    if (!form.consentToHealthMonitoring) {
      toast.error('Consent is required to enable local health monitoring.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        heightCm: form.heightCm ? parseFloat(form.heightCm) : null,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
        restingBpSystolic: form.restingBpSystolic ? parseInt(form.restingBpSystolic) : null,
        restingBpDiastolic: form.restingBpDiastolic ? parseInt(form.restingBpDiastolic) : null,
        restingHeartRate: form.restingHeartRate ? parseInt(form.restingHeartRate) : null,
        totalCholesterol: form.totalCholesterol ? parseFloat(form.totalCholesterol) : null,
        ldl: form.ldl ? parseFloat(form.ldl) : null,
        hdl: form.hdl ? parseFloat(form.hdl) : null,
        triglycerides: form.triglycerides ? parseFloat(form.triglycerides) : null,
        fastingGlucose: form.fastingGlucose ? parseFloat(form.fastingGlucose) : null,
        hba1c: form.hba1c ? parseFloat(form.hba1c) : null,
        sleepHoursAvg: form.sleepHoursAvg ? parseFloat(form.sleepHoursAvg) : null
      };

      const res = await api.put('/health/profile', payload);
      setCompleteness(res.data.data.completenessPercent);
      setDataConfidence(res.data.data.dataConfidence);
      toast.success('Health profile saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save health profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <HeartPulse className="w-8 h-8 text-emerald-500 animate-pulse" />
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading health profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Patient Health Profile</h1>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {patientInfo ? `Reviewing baseline profile for ${patientInfo.name}` : 'Comprehensive self-reported baseline profile for sudden-attack risk screening'}
              </p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Fully Local & Private
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1.5">
            <User className="w-3 h-3" /> Self-Reported
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 ${
            dataConfidence === 'HIGH'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : dataConfidence === 'MODERATE'
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            <Activity className="w-3 h-3" /> Confidence: {dataConfidence}
          </span>
        </div>
      </motion.div>

      {/* Profile Completeness Card */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className={`glass-card p-4 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/80 bg-white/80'}`}>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Baseline Completeness
          </span>
          <span className="font-extrabold text-emerald-500">{completeness}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
            style={{ width: `${completeness}%` }}
          />
        </div>
        <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Missing fields are explicitly treated as absent (with clinical median imputation) rather than zero, maintaining mathematical accuracy in subsequent sudden-attack risk models.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Biometrics & Vitals */}
        <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white/70'}`}>
          <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            <User className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm">1. Personal & Biometrics (Self-Reported)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Date of Birth</label>
              <input
                type="date"
                disabled={isDoctorView}
                value={form.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Sex assigned at birth</label>
              <select
                disabled={isDoctorView}
                value={form.sex}
                onChange={(e) => handleInputChange('sex', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="" className="text-black">Select...</option>
                <option value="MALE" className="text-black">Male</option>
                <option value="FEMALE" className="text-black">Female</option>
                <option value="OTHER" className="text-black">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Height (cm)</label>
              <input
                type="number"
                min="50"
                max="250"
                disabled={isDoctorView}
                placeholder="e.g. 175"
                value={form.heightCm}
                onChange={(e) => handleInputChange('heightCm', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Weight (kg)</label>
              <input
                type="number"
                min="20"
                max="350"
                step="0.5"
                disabled={isDoctorView}
                placeholder="e.g. 72.5"
                value={form.weightKg}
                onChange={(e) => handleInputChange('weightKg', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Calculated BMI</label>
              <input
                type="text"
                readOnly
                value={computedBmi ? `${computedBmi} kg/m²` : 'Enter height & weight'}
                className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Blood Group</label>
              <select
                disabled={isDoctorView}
                value={form.bloodGroup}
                onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="" className="text-black">Unknown / Not Tested</option>
                <option value="A+" className="text-black">A+</option>
                <option value="A-" className="text-black">A-</option>
                <option value="B+" className="text-black">B+</option>
                <option value="B-" className="text-black">B-</option>
                <option value="AB+" className="text-black">AB+</option>
                <option value="AB-" className="text-black">AB-</option>
                <option value="O+" className="text-black">O+</option>
                <option value="O-" className="text-black">O-</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Resting BP (Systolic mmHg)</label>
              <input
                type="number"
                min="60"
                max="260"
                disabled={isDoctorView}
                placeholder="e.g. 120"
                value={form.restingBpSystolic}
                onChange={(e) => handleInputChange('restingBpSystolic', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Resting BP (Diastolic mmHg)</label>
              <input
                type="number"
                min="40"
                max="160"
                disabled={isDoctorView}
                placeholder="e.g. 80"
                value={form.restingBpDiastolic}
                onChange={(e) => handleInputChange('restingBpDiastolic', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Resting Heart Rate (bpm)</label>
              <input
                type="number"
                min="35"
                max="220"
                disabled={isDoctorView}
                placeholder="e.g. 72"
                value={form.restingHeartRate}
                onChange={(e) => handleInputChange('restingHeartRate', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Laboratory / Metabolic Baseline */}
        <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white/70'}`}>
          <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            <Activity className="w-4 h-4 text-teal-500" />
            <h3 className="font-bold text-sm">2. Baseline Metabolic & Lipid Biomarkers</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Total Cholesterol (mg/dL)</label>
              <input
                type="number"
                disabled={isDoctorView}
                placeholder="e.g. 195"
                value={form.totalCholesterol}
                onChange={(e) => handleInputChange('totalCholesterol', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">LDL Cholesterol (mg/dL)</label>
              <input
                type="number"
                disabled={isDoctorView}
                placeholder="e.g. 110"
                value={form.ldl}
                onChange={(e) => handleInputChange('ldl', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">HDL Cholesterol (mg/dL)</label>
              <input
                type="number"
                disabled={isDoctorView}
                placeholder="e.g. 48"
                value={form.hdl}
                onChange={(e) => handleInputChange('hdl', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Serum Triglycerides (mg/dL)</label>
              <input
                type="number"
                disabled={isDoctorView}
                placeholder="e.g. 140"
                value={form.triglycerides}
                onChange={(e) => handleInputChange('triglycerides', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Fasting Blood Glucose (mg/dL)</label>
              <input
                type="number"
                min="40"
                max="500"
                disabled={isDoctorView}
                placeholder="e.g. 92"
                value={form.fastingGlucose}
                onChange={(e) => handleInputChange('fastingGlucose', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">HbA1c Glycated Hemoglobin (%)</label>
              <input
                type="number"
                step="0.1"
                min="3.0"
                max="20.0"
                disabled={isDoctorView}
                placeholder="e.g. 5.4"
                value={form.hba1c}
                onChange={(e) => handleInputChange('hba1c', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Lifestyle & Environmental Habits */}
        <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white/70'}`}>
          <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            <Flame className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-sm">3. Lifestyle & Daily Habits</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Smoking Status</label>
              <select
                disabled={isDoctorView}
                value={form.smokingStatus}
                onChange={(e) => handleInputChange('smokingStatus', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="NEVER" className="text-black">Never Smoked</option>
                <option value="FORMER" className="text-black">Former Smoker (Quit)</option>
                <option value="CURRENT" className="text-black">Current Smoker</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Alcohol Consumption</label>
              <select
                disabled={isDoctorView}
                value={form.alcoholUse}
                onChange={(e) => handleInputChange('alcoholUse', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="NONE" className="text-black">None</option>
                <option value="OCCASIONAL" className="text-black">Occasional (Social)</option>
                <option value="MODERATE" className="text-black">Moderate (1-2 drinks/day)</option>
                <option value="HEAVY" className="text-black">Heavy (&gt;2 drinks/day)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Physical Activity Level</label>
              <select
                disabled={isDoctorView}
                value={form.activityLevel}
                onChange={(e) => handleInputChange('activityLevel', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="SEDENTARY" className="text-black">Sedentary (&lt;30 min/week)</option>
                <option value="LIGHT" className="text-black">Light (1-2 days/week)</option>
                <option value="MODERATE" className="text-black">Moderate (3-4 days/week)</option>
                <option value="VERY_ACTIVE" className="text-black">Very Active (5+ days/week)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Average Sleep (Hours/Night)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="24"
                disabled={isDoctorView}
                placeholder="e.g. 7.5"
                value={form.sleepHoursAvg}
                onChange={(e) => handleInputChange('sleepHoursAvg', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Family History & Existing Diagnosed Conditions */}
        <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white/70'}`}>
          <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            <Shield className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-sm">4. Medical Conditions & Family History</h3>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2">Family History (First-degree relatives):</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isDoctorView}
                  checked={form.familyHistoryHeartDisease}
                  onChange={(e) => handleInputChange('familyHistoryHeartDisease', e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500"
                />
                Heart Disease / Heart Attack before age 60
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isDoctorView}
                  checked={form.familyHistoryStroke}
                  onChange={(e) => handleInputChange('familyHistoryStroke', e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500"
                />
                Stroke / TIA
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isDoctorView}
                  checked={form.familyHistoryDiabetes}
                  onChange={(e) => handleInputChange('familyHistoryDiabetes', e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500"
                />
                Type 2 Diabetes
              </label>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold mb-2">Existing Diagnosed Conditions:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {[
                { key: 'diabetes', label: 'Diabetes' },
                { key: 'hypertension', label: 'Hypertension' },
                { key: 'heartDisease', label: 'Heart Disease' },
                { key: 'asthma', label: 'Asthma / COPD' },
                { key: 'kidneyDisease', label: 'Kidney Disease' },
                { key: 'thyroid', label: 'Thyroid Disorder' }
              ].map(c => (
                <label key={c.key} className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  form.existingConditions[c.key]
                    ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-500'
                    : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="checkbox"
                    disabled={isDoctorView}
                    checked={Boolean(form.existingConditions[c.key])}
                    onChange={() => handleConditionToggle(c.key)}
                    className="hidden"
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5: Medications, Allergies & Emergency Contact */}
        <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white/70'}`}>
          <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            <Stethoscope className="w-4 h-4 text-cyan-500" />
            <h3 className="font-bold text-sm">5. Current Medications, Allergies & Contact</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Current Medications (with dosages if known)</label>
              <textarea
                rows="3"
                disabled={isDoctorView}
                placeholder="e.g., Amlodipine 5mg OD, Metformin 500mg BD..."
                value={form.currentMedications}
                onChange={(e) => handleInputChange('currentMedications', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Allergies (Drugs, Foods, Environmental)</label>
              <textarea
                rows="3"
                disabled={isDoctorView}
                placeholder="e.g., Penicillin, Sulfa drugs, Peanuts..."
                value={form.allergies}
                onChange={(e) => handleInputChange('allergies', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Emergency Contact (Name, Relation, Phone)</label>
              <input
                type="text"
                disabled={isDoctorView}
                placeholder="e.g., Sarah Doe (Spouse) +91 98765 43210"
                value={form.emergencyContact}
                onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Consent & Save */}
        <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
          <label className="flex items-start gap-3 cursor-pointer text-xs">
            <input
              type="checkbox"
              disabled={isDoctorView}
              checked={form.consentToHealthMonitoring}
              onChange={(e) => handleInputChange('consentToHealthMonitoring', e.target.checked)}
              className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500"
            />
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              <strong className="text-emerald-500 font-bold">Informed Consent for Local Health Monitoring:</strong> I agree that my self-reported health parameters and daily check-ins may be analyzed locally by Every Second Counts machine learning screening algorithms. I acknowledge that all calculations run locally on-device without third-party cloud AI egress, and that this serves as a decision-support and screening tool, not a formal medical diagnosis.
            </span>
          </label>

          {!isDoctorView && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Health Profile'}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default HealthProfile;
