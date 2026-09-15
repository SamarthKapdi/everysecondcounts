import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  Brain, Mic, MicOff, AlertCircle, CheckCircle2, Loader2, Shield,
  Sparkles, Hospital, Activity, Clock, Trash2, ChevronDown, ChevronUp,
  Volume2, VolumeX, Send, X
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const SEVERITY_CONFIG = {
  RED: { color: '#EF4444', label: 'CRITICAL', desc: 'Immediate emergency' },
  ORANGE: { color: '#F97316', label: 'URGENT', desc: 'Rapid attention needed' },
  YELLOW: { color: '#EAB308', label: 'MODERATE', desc: 'Schedule evaluation' },
  GREEN: { color: '#22C55E', label: 'STABLE', desc: 'Monitor at home' },
};

const COMMON_SYMPTOMS = [
  'chest pain','shortness of breath','high fever','severe headache',
  'dizziness','abdominal pain','nausea','vomiting','seizures',
  'confusion','bleeding','difficulty breathing','back pain','numbness',
];

const SymptomChecker = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  const recognitionRef = useRef(null);
  const symptomsRef = useRef(symptoms);
  const voiceActiveRef = useRef(false);
  const autoAnalyzeTimer = useRef(null);
  const isAnalyzingRef = useRef(false);
  const streamRef = useRef('');

  useEffect(() => { symptomsRef.current = symptoms; }, [symptoms]);
  useEffect(() => { return () => { window.speechSynthesis?.cancel(); stopRecognition(); clearTimeout(autoAnalyzeTimer.current); }; }, []);

  const stopRecognition = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e){} }
    setIsListening(false);
  };

  // Auto-analyze after voice captures symptoms (2s debounce)
  const scheduleAutoAnalyze = useCallback((updatedSymptoms) => {
    clearTimeout(autoAnalyzeTimer.current);
    autoAnalyzeTimer.current = setTimeout(() => {
      if (voiceActiveRef.current && !isAnalyzingRef.current && updatedSymptoms.length > 0) {
        analyzeSymptoms(updatedSymptoms);
      }
    }, 2000);
  }, []);

  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    // Support both Hindi and English
    rec.lang = 'hi-IN';
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      // Show live transcript
      if (interim) setVoiceTranscript(interim);
      
      if (final.trim()) {
        const cleaned = final.trim().toLowerCase();
        setVoiceTranscript('');
        const current = symptomsRef.current;
        if (!current.includes(cleaned)) {
          const updated = [...current, cleaned];
          setSymptoms(updated);
          symptomsRef.current = updated;
          // Auto-trigger analysis after 2 seconds of silence
          scheduleAutoAnalyze(updated);
        }
      }
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setIsListening(false); setVoiceActive(false); voiceActiveRef.current = false;
      }
    };
    rec.onend = () => {
      if (voiceActiveRef.current && !isAnalyzingRef.current) {
        setTimeout(() => { try { rec.start(); } catch(e){} }, 300);
      } else if (!voiceActiveRef.current) { setIsListening(false); }
    };
    recognitionRef.current = rec;
    return rec;
  }, [scheduleAutoAnalyze]);

  const toggleVoice = () => {
    const rec = initRecognition();
    if (!rec) { toast.error('Voice not supported in this browser'); return; }
    if (voiceActive) {
      voiceActiveRef.current = false;
      setVoiceActive(false);
      stopRecognition();
      window.speechSynthesis?.cancel();
    } else {
      voiceActiveRef.current = true;
      setVoiceActive(true);
      setIsListening(true);
      try { rec.start(); } catch(e){}
    }
  };

  const speakText = (text, cb) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) { cb?.(); return; }
    window.speechSynthesis.cancel();
    
    // Stop listening while speaking
    stopRecognition();
    
    const u = new SpeechSynthesisUtterance(text);
    
    // Detect if text contains Hindi/Devanagari characters
    const hasHindi = /[\u0900-\u097F]/.test(text);
    
    // Try to find a Hindi voice if text is Hindi
    const voices = window.speechSynthesis.getVoices();
    if (hasHindi) {
      const hindiVoice = voices.find(v => v.lang.startsWith('hi'));
      if (hindiVoice) u.voice = hindiVoice;
      u.lang = 'hi-IN';
    } else {
      const enVoice = voices.find(v => v.lang.startsWith('en-IN')) || voices.find(v => v.lang.startsWith('en'));
      if (enVoice) u.voice = enVoice;
      u.lang = 'en-IN';
    }
    
    u.rate = 1.0;
    u.onend = () => {
      cb?.();
      // Resume listening after speaking
      if (voiceActiveRef.current && recognitionRef.current) {
        setIsListening(true);
        try { recognitionRef.current.start(); } catch(e){}
      }
    };
    window.speechSynthesis.speak(u);
  };

  const addSymptom = (s) => {
    const c = s.trim().toLowerCase();
    if (c && !symptoms.includes(c)) setSymptoms([...symptoms, c]);
    setInputValue('');
  };

  const analyzeSymptoms = async (syms = symptomsRef.current) => {
    if (syms.length === 0) return;
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    setLoading(true);
    setResult(null);
    setStreamText('');
    streamRef.current = '';
    clearTimeout(autoAnalyzeTimer.current);

    // Stop listening while analyzing
    stopRecognition();

    try {
      const token = localStorage.getItem('pulsepath-token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/symptoms/analyze-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ symptoms: syms }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === 'chunk') {
              streamRef.current += parsed.text;
              setStreamText(streamRef.current);
            } else if (parsed.type === 'complete') {
              finalResult = parsed.data;
            }
          } catch(e){}
        }
      }

      if (finalResult) {
        setResult(finalResult);
        const speech = finalResult.isValid === false
          ? finalResult.message
          : (finalResult.reasoning + '. ' + finalResult.recommendedAction);
        speakText(speech, () => {
          // Voice mode continues after speaking
        });
      } else {
        // No result but voice mode active — resume listening
        if (voiceActiveRef.current && recognitionRef.current) {
          setIsListening(true);
          try { recognitionRef.current.start(); } catch(e){}
        }
      }
    } catch (err) {
      toast.error('Analysis failed. Please try again.');
      if (voiceActiveRef.current && recognitionRef.current) {
        setIsListening(true);
        try { recognitionRef.current.start(); } catch(e){}
      }
    } finally {
      setLoading(false);
      isAnalyzingRef.current = false;
    }
  };

  const loadHistory = async () => {
    if (showHistory) { setShowHistory(false); return; }
    setHistoryLoading(true);
    try {
      const res = await api.get('/symptoms/history');
      setHistory(res.data.data.history || []);
    } catch(e) { setHistory([]); }
    setHistoryLoading(false);
    setShowHistory(true);
  };

  const sev = result ? SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.GREEN : null;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Brain className="w-7 h-7 text-blue-500" /> AI Symptom Analyzer
            </h1>
            <p className={`text-xs mt-1 ${isDark?'text-slate-400':'text-slate-500'}`}>
              Describe symptoms via voice or text. AI analyzes severity in real-time.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-xl border transition-all ${isDark?'border-slate-700 hover:border-blue-500':'border-slate-200 hover:border-blue-500'}`}
              title={ttsEnabled ? 'Mute AI voice' : 'Enable AI voice'}>
              {ttsEnabled ? <Volume2 className="w-4 h-4 text-blue-500"/> : <VolumeX className="w-4 h-4 text-slate-400"/>}
            </button>
            <button onClick={loadHistory}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                showHistory ? 'bg-blue-500 text-white border-blue-500' : isDark?'border-slate-700 hover:border-blue-500 text-slate-300':'border-slate-200 hover:border-blue-500 text-slate-600'
              }`}>
              <Clock className="w-3.5 h-3.5"/> History {showHistory ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Voice Section */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        className={`glass-card p-5 rounded-2xl border ${isDark?'border-slate-800':'border-slate-200/80'}`}>
        <div className={`p-6 rounded-2xl border-2 flex flex-col items-center text-center transition-all duration-500 ${
          isListening
            ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_40px_-5px_rgba(59,130,246,0.25)]'
            : isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="mb-3 relative">
            {isListening && <>
              <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20" style={{ transform:'scale(1.6)' }}/>
              <span className="absolute inset-0 rounded-full bg-blue-500 animate-pulse opacity-10" style={{ transform:'scale(2.2)' }}/>
            </>}
            <button onClick={toggleVoice}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                voiceActive
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-blue-500/40'
                  : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}>
              {isListening ? <Mic className="w-9 h-9 animate-pulse"/> : voiceActive ? <Loader2 className="w-8 h-8 animate-spin"/> : <Mic className="w-8 h-8"/>}
            </button>
          </div>
          <h3 className={`font-bold text-base ${voiceActive?'text-blue-500':''}`}>
            {loading ? '⚡ Analyzing...' : isListening ? '🎙️ Listening... (Hindi / English)' : voiceActive ? '🔊 AI Speaking...' : 'Voice Assistant'}
          </h3>
          <p className={`text-xs mt-1 max-w-sm ${isDark?'text-slate-400':'text-slate-500'}`}>
            {voiceActive ? 'Speak symptoms in Hindi or English. Auto-analyzes after you pause.' : 'Tap mic for hands-free voice chat (Hindi/English)'}
          </p>
          {/* Live voice transcript */}
          {voiceTranscript && isListening && (
            <p className="mt-2 text-sm text-blue-400 italic animate-pulse">"{voiceTranscript}"</p>
          )}
          {voiceActive && symptoms.length > 0 && !loading && (
            <button onClick={() => analyzeSymptoms()} className="mt-3 btn-primary text-xs py-2 px-4">
              <Sparkles className="w-3.5 h-3.5"/> Analyze Now
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className={`flex-1 border-t ${isDark?'border-slate-700':'border-slate-200'}`}/>
          <span className="mx-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">or type</span>
          <div className={`flex-1 border-t ${isDark?'border-slate-700':'border-slate-200'}`}/>
        </div>

        {/* Text Input */}
        <div className="flex gap-2 mb-4">
          <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter' && inputValue.trim()) addSymptom(inputValue); }}
            placeholder="Type symptom & press Enter..."
            className="input-field text-sm flex-1"/>
          <button onClick={() => addSymptom(inputValue)} disabled={!inputValue.trim()}
            className="btn-primary px-4 text-sm disabled:opacity-40">
            <Send className="w-4 h-4"/>
          </button>
        </div>

        {/* Quick tags */}
        <div className="mb-4">
          <p className={`text-[10px] font-bold tracking-wider mb-2 ${isDark?'text-slate-500':'text-slate-400'}`}>COMMON</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SYMPTOMS.map(s => (
              <button key={s} onClick={() => addSymptom(s)} disabled={symptoms.includes(s)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium border transition-all ${
                  symptoms.includes(s)
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 cursor-not-allowed'
                    : isDark ? 'border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-400' : 'border-slate-200 text-slate-500 hover:border-blue-500 hover:text-blue-600'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Selected */}
        {symptoms.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[10px] font-bold tracking-wider ${isDark?'text-slate-500':'text-slate-400'}`}>SELECTED ({symptoms.length})</p>
              <button onClick={() => { setSymptoms([]); setResult(null); setStreamText(''); }}
                className="text-[10px] text-red-400 hover:text-red-500 font-semibold flex items-center gap-1">
                <Trash2 className="w-3 h-3"/> Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {symptoms.map(s => (
                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {s}
                  <button onClick={() => setSymptoms(symptoms.filter(x=>x!==s))} className="hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => analyzeSymptoms()} disabled={symptoms.length === 0 || loading}
          className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-40">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin"/> Analyzing...</> : <><Sparkles className="w-4 h-4"/> Run AI Triage</>}
        </button>
      </motion.div>

      {/* Streaming Text */}
      <AnimatePresence>
        {loading && streamText && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className={`glass-card p-4 rounded-2xl border ${isDark?'border-slate-800':'border-slate-200/80'}`}>
            <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDark?'text-blue-400':'text-blue-600'}`}>
              <Loader2 className="w-3.5 h-3.5 animate-spin"/> AI is thinking...
            </p>
            <p className={`text-sm leading-relaxed ${isDark?'text-slate-300':'text-slate-600'}`}>{streamText}<span className="animate-pulse">▊</span></p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && result.isValid === false ? (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className={`glass-card p-5 rounded-2xl border ${isDark?'border-amber-500/30 bg-amber-500/5':'border-amber-200 bg-amber-50'}`}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500"><Brain className="w-5 h-5"/></div>
              <div>
                <h3 className="font-bold text-amber-600 dark:text-amber-400 text-sm">Not a Medical Query</h3>
                <p className={`text-xs mt-0.5 ${isDark?'text-slate-300':'text-slate-600'}`}>{result.message}</p>
              </div>
            </div>
            <button onClick={() => { setResult(null); setSymptoms([]); setStreamText(''); }} className="mt-3 text-xs font-bold text-amber-600 hover:underline">Clear & try again</button>
          </motion.div>
        ) : result && sev && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-4">
            {/* Severity */}
            <div className={`rounded-2xl border-2 p-5`} style={{ borderColor: sev.color+'30', background: sev.color+'08' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: sev.color+'20' }}>
                    <AlertCircle className="w-6 h-6" style={{ color: sev.color }}/>
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping" style={{ background: sev.color }}/>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background: sev.color }}/>
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest" style={{ color: sev.color }}>TRIAGE LEVEL</p>
                  <h2 className="text-xl font-black">{sev.label}</h2>
                  <p className={`text-[11px] ${isDark?'text-slate-400':'text-slate-500'}`}>{sev.desc}</p>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${isDark?'bg-black/20':'bg-white/60'}`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold flex items-center gap-1"><Shield className="w-3 h-3"/> Confidence</span>
                  <span className="font-black text-lg" style={{ color: sev.color }}>{Math.round((result.confidenceScore||0)*100)}%</span>
                </div>
                <div className={`w-full h-2 rounded-full ${isDark?'bg-slate-700':'bg-slate-200'}`}>
                  <motion.div initial={{ width:0 }} animate={{ width:`${(result.confidenceScore||0)*100}%` }}
                    transition={{ duration:1 }} className="h-full rounded-full" style={{ background: sev.color }}/>
                </div>
                {result.isRuleOverride && (
                  <p className="text-[10px] mt-1.5 font-semibold flex items-center gap-1" style={{ color: sev.color }}>
                    <Shield className="w-3 h-3"/> Rule-based safety override
                  </p>
                )}
              </div>
            </div>

            {/* Reasoning */}
            <div className={`glass-card p-4 rounded-2xl border ${isDark?'border-slate-800':'border-slate-200/80'}`}>
              <h3 className="font-bold text-sm flex items-center gap-2 mb-2"><Brain className="w-4 h-4 text-blue-500"/> AI Reasoning</h3>
              <p className={`text-sm leading-relaxed ${isDark?'text-slate-300':'text-slate-600'}`}>{result.reasoning}</p>
            </div>

            {/* Action */}
            <div className={`glass-card p-4 rounded-2xl border ${isDark?'border-slate-800':'border-slate-200/80'}`}>
              <h3 className="font-bold text-sm flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Recommended Action</h3>
              <p className={`text-sm ${isDark?'text-slate-300':'text-slate-600'}`}>{result.recommendedAction}</p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button onClick={() => navigate('/hospitals')} className="btn-primary text-xs py-2 px-4 justify-center">
                  <Hospital className="w-4 h-4"/> Find Hospital
                </button>
                <button onClick={() => navigate('/sos')} className="btn-secondary text-xs py-2 px-4 justify-center">
                  <Activity className="w-4 h-4"/> Trigger SOS
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            className={`glass-card rounded-2xl border overflow-hidden ${isDark?'border-slate-800':'border-slate-200/80'}`}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: isDark?'#1e293b':'#e2e8f0' }}>
              <h3 className="font-bold text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500"/> Analysis History</h3>
              <button onClick={() => setShowHistory(false)}><X className="w-4 h-4 text-slate-400"/></button>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {historyLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500"/></div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No history yet. Analyze symptoms to build history.</div>
              ) : history.map((h) => {
                const sv = SEVERITY_CONFIG[h.result?.severity] || SEVERITY_CONFIG.GREEN;
                return (
                  <div key={h.id} className={`p-3 border-b last:border-0 ${isDark?'border-slate-800 hover:bg-slate-800/50':'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: sv.color }}/>
                        <span className="text-xs font-bold" style={{ color: sv.color }}>{sv.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {h.symptoms?.map((s,i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">{s}</span>
                      ))}
                    </div>
                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDark?'text-slate-400':'text-slate-500'}`}>
                      {h.result?.reasoning || h.result?.message || 'N/A'}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SymptomChecker;
