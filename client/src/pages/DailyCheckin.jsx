import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Sun, Sunset, Moon, CheckCircle2, AlertOctagon, Flame,
  Clock, ShieldAlert, ArrowRight, ArrowLeft, HeartPulse,
  Activity, PhoneCall, Building2, AlertTriangle, RefreshCw
} from 'lucide-react';

const QUESTIONS = [
  {
    id: 'chestPain',
    question: 'Are you experiencing chest pain, heaviness, or chest tightness?',
    options: [
      { value: 'none', label: 'None', desc: 'No chest discomfort', flag: 'green' },
      { value: 'mild', label: 'Mild / Fleeting', desc: 'Brief discomfort with heavy exertion', flag: 'yellow' },
      { value: 'at_rest', label: 'Pain at Rest', desc: 'Dull ache or pressure while resting', flag: 'red' },
      { value: 'radiating', label: 'Radiating Pain', desc: 'Pain spreading to jaw, neck, arm, or back', flag: 'red' }
    ]
  },
  {
    id: 'breathlessness',
    question: 'How is your breathing right now?',
    options: [
      { value: 'none', label: 'Normal', desc: 'Breathing effortlessly', flag: 'green' },
      { value: 'mild_on_exertion', label: 'Mild on Exertion', desc: 'Short of breath after stairs/walk', flag: 'yellow' },
      { value: 'moderate', label: 'Moderate', desc: 'Short of breath with minimal activity', flag: 'orange' },
      { value: 'severe', label: 'Severe / Gasping', desc: 'Struggling to breathe even while still', flag: 'red' }
    ]
  },
  {
    id: 'palpitations',
    question: 'Notice any abnormal heart sensations or fluttering?',
    options: [
      { value: 'none', label: 'None', desc: 'Heart rhythm feels steady and normal', flag: 'green' },
      { value: 'mild', label: 'Occasional Flutter', desc: 'Brief momentary thump or skip', flag: 'yellow' },
      { value: 'rapid_fluttering', label: 'Racing Heart', desc: 'Fast pounding heart for several minutes', flag: 'orange' },
      { value: 'irregular_skipped', label: 'Chaotic / Irregular', desc: 'Disorganized racing or skipping beats', flag: 'orange' }
    ]
  },
  {
    id: 'dizzinessFainting',
    question: 'Any dizziness, lightheadedness, or blackouts?',
    options: [
      { value: 'none', label: 'None', desc: 'Alert and fully balanced', flag: 'green' },
      { value: 'mild_dizziness', label: 'Mild Lightheadedness', desc: 'Brief head rush on standing up', flag: 'yellow' },
      { value: 'fainting_syncope', label: 'Blacked Out / Fainted', desc: 'Lost consciousness or nearly collapsed', flag: 'red' }
    ]
  },
  {
    id: 'fastSigns',
    question: 'Check for Stroke signs (FAST test): Face, Arm, or Speech changes?',
    options: [
      { value: 'none', label: 'All Normal', desc: 'Smile symmetrical, both arms strong, speech clear', flag: 'green' },
      { value: 'face_droop', label: 'Face Droop', desc: 'One side of mouth/face sagging', flag: 'red' },
      { value: 'arm_weakness', label: 'Arm Weakness', desc: 'Sudden weakness or numbness in one arm/leg', flag: 'red' },
      { value: 'speech_slur', label: 'Slurred Speech', desc: 'Difficulty speaking or understanding words', flag: 'red' },
      { value: 'multiple', label: 'Multiple Signs', desc: 'More than one sudden neurological sign', flag: 'red' }
    ]
  },
  {
    id: 'headacheSeverity',
    question: 'Headache or head pressure severity:',
    options: [
      { value: 'none', label: 'No Headache', desc: 'Head feels clear', flag: 'green' },
      { value: 'mild', label: 'Mild Tension', desc: 'Easily manageable with water/rest', flag: 'green' },
      { value: 'moderate', label: 'Moderate Headache', desc: 'Throbbing or persistent pain', flag: 'yellow' },
      { value: 'thunderclap_severe', label: 'Worst Headache of Life', desc: 'Sudden "thunderclap" explosive agony', flag: 'red' }
    ]
  },
  {
    id: 'unusualSweating',
    question: 'Any unusual sweating or cold clammy skin?',
    options: [
      { value: 'none', label: 'Normal', desc: 'Skin warm and dry', flag: 'green' },
      { value: 'mild', label: 'Mild Sweat', desc: 'Slightly warm/sweaty from room temp', flag: 'green' },
      { value: 'profuse_cold_sweat', label: 'Profuse Cold Sweat', desc: 'Drenched in clammy perspiration with nausea', flag: 'red' }
    ]
  },
  {
    id: 'swellingFeet',
    question: 'Any new or worsening swelling in your ankles or feet?',
    options: [
      { value: 'none', label: 'None', desc: 'No swelling noted', flag: 'green' },
      { value: 'mild_evening', label: 'Mild Evening Puffiness', desc: 'Tight shoes after standing all day', flag: 'yellow' },
      { value: 'both_feet_pitting', label: 'Deep Pitting Swelling', desc: 'Dent remains after pressing ankle/shin', flag: 'orange' }
    ]
  },
  {
    id: 'fatigue',
    question: 'Overall energy & physical stamina level today:',
    options: [
      { value: 'normal', label: 'Energetic / Normal', desc: 'Able to do standard activities', flag: 'green' },
      { value: 'moderate', label: 'Sluggish / Fatigued', desc: 'Tired more easily than usual', flag: 'yellow' },
      { value: 'exhausted', label: 'Severe Exhaustion', desc: 'Struggling with simple routine tasks', flag: 'orange' }
    ]
  },
  {
    id: 'sleepQuality',
    question: 'Quality of sleep during the last night/rest period:',
    options: [
      { value: 'good', label: 'Deep / Refreshing', desc: '7+ hours restful uninterrupted sleep', flag: 'green' },
      { value: 'fair', label: 'Fair', desc: 'Woke up once or twice, feel okay', flag: 'green' },
      { value: 'restless', label: 'Restless', desc: 'Tossed and turned, interrupted sleep', flag: 'yellow' },
      { value: 'insomnia', label: 'Insomnia / Orthopnea', desc: 'Woke up gasping or could not sleep lying flat', flag: 'orange' }
    ]
  },
  {
    id: 'stressLevel',
    question: 'Current mental stress or anxiety level:',
    options: [
      { value: 'low', label: 'Calm & Relaxed', desc: 'Low stress state', flag: 'green' },
      { value: 'moderate', label: 'Moderate Stress', desc: 'Busy workday or mild tension', flag: 'yellow' },
      { value: 'high', label: 'High Anxiety', desc: 'Feeling overwhelmed or jittery', flag: 'orange' },
      { value: 'extreme', label: 'Extreme Panic / Agitation', desc: 'Acute panic sensation or dread', flag: 'red' }
    ]
  },
  {
    id: 'medicationTaken',
    question: 'Have you taken your scheduled baseline medications today?',
    options: [
      { value: 'all_taken', label: 'All Taken as Prescribed', desc: '100% adherence to daily schedule', flag: 'green' },
      { value: 'partially', label: 'Partially Taken', desc: 'Took some, delayed or forgot one', flag: 'yellow' },
      { value: 'missed', label: 'Missed Completely', desc: 'Forgot morning/evening routine doses', flag: 'orange' },
      { value: 'not_applicable', label: 'No Medications Prescribed', desc: 'Not currently taking daily medication', flag: 'green' }
    ]
  }
];

const DailyCheckin = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [slotData, setSlotData] = useState(null);
  const [activeQuizSlot, setActiveQuizSlot] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [vitals, setVitals] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    spo2: '',
    glucose: '',
    weight: '',
    temperature: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [redFlagEmergency, setRedFlagEmergency] = useState(null);

  useEffect(() => {
    fetchSlotStatus();
  }, []);

  const fetchSlotStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/checkins/today');
      setSlotData(res.data.data);
    } catch (err) {
      toast.error('Failed to load check-in schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = (slotKey) => {
    setActiveQuizSlot(slotKey);
    setStep(0);
    setAnswers({});
    setVitals({
      systolic: '',
      diastolic: '',
      heartRate: '',
      spo2: '',
      glucose: '',
      weight: '',
      temperature: ''
    });
    setRedFlagEmergency(null);
  };

  const handleSelectOption = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));

    // Instant red flag check
    if (
      (questionId === 'chestPain' && (value === 'at_rest' || value === 'radiating')) ||
      (questionId === 'breathlessness' && value === 'severe') ||
      (questionId === 'dizzinessFainting' && value === 'fainting_syncope') ||
      (questionId === 'fastSigns' && value !== 'none') ||
      (questionId === 'headacheSeverity' && value === 'thunderclap_severe')
    ) {
      toast.error('Warning: Severe red-flag symptom detected!', { duration: 4000 });
    }

    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 180);
    }
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    try {
      // Clean numeric vitals
      const parsedVitals = {};
      Object.keys(vitals).forEach(k => {
        if (vitals[k]) parsedVitals[k] = parseFloat(vitals[k]);
      });

      const payload = {
        slot: activeQuizSlot,
        answers,
        selfReportedVitals: Object.keys(parsedVitals).length > 0 ? parsedVitals : null
      };

      const res = await api.post('/checkins', payload);
      const data = res.data.data;

      if (data.redFlag) {
        setRedFlagEmergency({
          hospitals: data.nearbyHospitals || [],
          symptomScore: data.checkin?.symptomScore
        });
        toast.error('Emergency red flag triggered. Please review the urgent assistance card below.', { duration: 6000 });
      } else {
        toast.success(`Check-in for ${activeQuizSlot} recorded! Symptom score: ${data.checkin?.symptomScore}/100`);
        setActiveQuizSlot(null);
      }
      fetchSlotStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = QUESTIONS[step];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <HeartPulse className="w-8 h-8 text-emerald-500 animate-pulse" />
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading check-in schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
            <HeartPulse className="w-7 h-7 text-emerald-500" /> Daily Health Check-ins
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            3 quick 60-second evaluations per day to track trends and prevent sudden cardiac or stroke crises.
          </p>
        </div>

        {/* Streak Counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-orange-500/30 text-orange-500">
            <Flame className="w-5 h-5 fill-orange-500 text-orange-500 animate-bounce" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Current Streak</p>
              <p className="text-sm font-black leading-none">{slotData?.streak || 0} Day{slotData?.streak === 1 ? '' : 's'}</p>
            </div>
          </div>
          <button
            onClick={fetchSlotStatus}
            className={`p-2.5 rounded-2xl border text-xs transition-colors ${isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}
            title="Refresh status">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </motion.div>

      {/* Red Flag Emergency Card (Persistent Alert if Triggered) */}
      <AnimatePresence>
        {redFlagEmergency && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 rounded-3xl border-2 border-red-500 bg-red-500/10 dark:bg-red-950/40 backdrop-blur-xl shadow-2xl shadow-red-500/20 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                <AlertOctagon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-black text-red-600 dark:text-red-400 flex items-center gap-2">
                  CRITICAL SYMPTOMS DETECTED — EMERGENCY PROTOCOL ACTIVE
                </h2>
                <p className="text-xs text-red-800 dark:text-red-300 mt-1 leading-relaxed">
                  Your responses indicate high-risk emergency symptoms (such as chest pain at rest/radiating, sudden neurological deficit, or severe breathlessness). Do not ignore this. Immediate medical evaluation is required.
                </p>
              </div>
            </div>

            {/* Emergency Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => navigate('/sos')}
                className="btn-danger w-full justify-center py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-600/30">
                <PhoneCall className="w-4 h-4" /> Trigger Emergency SOS (112 / 108)
              </button>
              <button
                onClick={() => navigate('/hospitals')}
                className="btn-secondary w-full justify-center py-3.5 text-sm font-bold flex items-center gap-2 border-red-500/40 text-red-500 hover:bg-red-500/10">
                <Building2 className="w-4 h-4" /> View Nearest Trauma Hospitals
              </button>
            </div>

            {/* Nearest recommended hospitals */}
            {redFlagEmergency.hospitals && redFlagEmergency.hospitals.length > 0 && (
              <div className="pt-3 border-t border-red-500/20">
                <p className="text-[11px] font-bold text-red-700 dark:text-red-300 uppercase tracking-wider mb-2">
                  Immediate ICU Facilities Available Nearby:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {redFlagEmergency.hospitals.map(h => (
                    <div key={h.id} className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
                      <p className="font-bold truncate">{h.name}</p>
                      <p className="text-[10px] text-slate-500">{h.address}</p>
                      <p className="text-[10px] text-red-500 font-semibold mt-1">📞 {h.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3 Slot Cards */}
      {!activeQuizSlot && slotData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              key: 'MORNING',
              label: 'Morning Slot',
              time: '05:00 - 12:00 IST',
              icon: Sun,
              color: 'from-amber-400 to-orange-500',
              data: slotData.slots?.MORNING
            },
            {
              key: 'AFTERNOON',
              label: 'Afternoon Slot',
              time: '12:00 - 17:00 IST',
              icon: Sunset,
              color: 'from-blue-400 to-cyan-500',
              data: slotData.slots?.AFTERNOON
            },
            {
              key: 'EVENING',
              label: 'Evening Slot',
              time: '17:00 - 24:00 IST',
              icon: Moon,
              color: 'from-indigo-500 to-purple-600',
              data: slotData.slots?.EVENING
            }
          ].map(slot => {
            const Icon = slot.icon;
            const state = slot.data?.status || 'upcoming';
            const checkin = slot.data?.checkin;

            return (
              <motion.div
                key={slot.key}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card p-5 rounded-3xl border relative overflow-hidden flex flex-col justify-between min-h-[220px] transition-all ${
                  state === 'open'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10'
                    : isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${slot.color} flex items-center justify-center text-white shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Status Pill */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      state === 'done'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : state === 'open'
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : state === 'missed'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : 'bg-slate-200/50 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {state}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base">{slot.label}</h3>
                  <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Clock className="w-3 h-3" /> {slot.time}
                  </p>

                  {/* Summary if done */}
                  {state === 'done' && checkin && (
                    <div className="mt-3 p-2.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                        <span className="font-extrabold text-[11px]">
                          Score: {checkin.symptomScore}/100
                        </span>
                      </div>
                      {checkin.redFlag && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">⚠️ Red flag was flagged</p>
                      )}
                    </div>
                  )}

                  {state === 'missed' && (
                    <p className="text-[11px] text-rose-400 mt-3">
                      Window closed. Next check-in opens on time.
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-2">
                  {state === 'open' ? (
                    <button
                      onClick={() => handleStartQuiz(slot.key)}
                      className="btn-primary w-full justify-center py-2.5 text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-500/20"
                      style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}>
                      Start 60-Sec Check-in <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : state === 'done' ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800/50 cursor-default">
                      Check-in Recorded
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800/40 cursor-not-allowed">
                      {state === 'missed' ? 'Window Expired' : 'Opens Soon'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Stepper Quiz Modal / Section */}
      <AnimatePresence>
        {activeQuizSlot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`glass-card p-6 md:p-8 rounded-3xl border ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/90'} shadow-2xl space-y-6`}>
            {/* Stepper Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: isDark ? '#1e293b' : '#f1f5f9' }}>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                  {activeQuizSlot} CHECK-IN QUIZ
                </span>
                <p className="text-xs text-slate-400">
                  {step < QUESTIONS.length ? `Question ${step + 1} of ${QUESTIONS.length}` : 'Optional Vitals Check'}
                </p>
              </div>
              <button
                onClick={() => setActiveQuizSlot(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                Cancel
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${((step + 1) / (QUESTIONS.length + 1)) * 100}%` }}
              />
            </div>

            {/* Question Screen */}
            {step < QUESTIONS.length ? (
              <div className="space-y-4">
                <h2 className="text-base md:text-lg font-extrabold leading-snug">
                  {currentQ.question}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map(opt => {
                    const isSelected = answers[currentQ.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, opt.value)}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                            : isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-800/40' : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                        }`}>
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{opt.label}</span>
                            {opt.flag === 'red' && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            )}
                          </div>
                          <p className={`text-[11px] mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    disabled={step === 0}
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30">
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  <button
                    disabled={!answers[currentQ.id]}
                    onClick={() => setStep(step + 1)}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Final Vitals & Submission Screen */
              <div className="space-y-4">
                <div>
                  <h2 className="text-base md:text-lg font-extrabold">Optional Vitals (Self-Reported)</h2>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    If you checked any readings just now, enter them below. All fields optional.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Blood Pressure (Sys)</label>
                    <input
                      type="number"
                      placeholder="e.g. 120"
                      value={vitals.systolic}
                      onChange={(e) => setVitals(v => ({ ...v, systolic: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Blood Pressure (Dia)</label>
                    <input
                      type="number"
                      placeholder="e.g. 80"
                      value={vitals.diastolic}
                      onChange={(e) => setVitals(v => ({ ...v, diastolic: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      placeholder="e.g. 72"
                      value={vitals.heartRate}
                      onChange={(e) => setVitals(v => ({ ...v, heartRate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Blood Oxygen SpO2 (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 98"
                      value={vitals.spo2}
                      onChange={(e) => setVitals(v => ({ ...v, spo2: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Quiz
                  </button>

                  <button
                    disabled={submitting}
                    onClick={handleSubmitQuiz}
                    className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}>
                    <CheckCircle2 className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Complete & Record Check-in'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyCheckin;
