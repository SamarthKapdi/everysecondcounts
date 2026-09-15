import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  FileHeart, Upload, Sparkles, AlertTriangle, CheckCircle2, FileText,
  Loader2, Clock, X, ChevronDown, ChevronUp, Trash2, User
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ReportAnalyzer = () => {
  const { isDark } = useTheme();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (selected) => {
    if (!selected) return;
    if (selected.size > 15 * 1024 * 1024) { toast.error('File too large. Max 15MB.'); return; }
    setFile(selected);
    setResult(null);
    setStreamText('');
    if (selected.type.startsWith('image/')) {
      const r = new FileReader();
      r.onloadend = () => setPreview(r.result);
      r.readAsDataURL(selected);
    } else { setPreview(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);
    setStreamText('');

    try {
      const token = localStorage.getItem('pulsepath-token');
      const formData = new FormData();
      formData.append('report', file);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/symptoms/report-analyze-stream`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        }
      );

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullStream = '';
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
              fullStream += parsed.text;
              setStreamText(fullStream);
            } else if (parsed.type === 'complete') {
              finalResult = parsed.data;
            }
          } catch (e) {}
        }
      }

      if (finalResult) {
        setResult(finalResult);
        toast.success('Report analyzed successfully!');
      }
    } catch (err) {
      toast.error('Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadHistory = async () => {
    if (showHistory) { setShowHistory(false); return; }
    setHistoryLoading(true);
    try {
      const res = await api.get('/symptoms/report-history');
      setHistory(res.data.data.history || []);
    } catch (e) { setHistory([]); }
    setHistoryLoading(false);
    setShowHistory(true);
  };

  const clearAll = () => {
    setFile(null); setPreview(null); setResult(null); setStreamText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <FileHeart className="w-7 h-7 text-emerald-500" /> AI Report Analyzer
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Upload lab reports or prescriptions. AI extracts findings in simple language.
            </p>
          </div>
          <button onClick={loadHistory}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              showHistory ? 'bg-emerald-500 text-white border-emerald-500' : isDark ? 'border-slate-700 hover:border-emerald-500 text-slate-300' : 'border-slate-200 hover:border-emerald-500 text-slate-600'
            }`}>
            <Clock className="w-3.5 h-3.5" /> History {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upload */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`glass-card rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}>
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-500" /> Upload Report
          </h3>

          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
              dragOver
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]'
                : isDark ? 'border-slate-700 hover:border-emerald-500/50 bg-slate-800/30' : 'border-slate-300 hover:border-emerald-500/50 bg-slate-50'
            }`}>
            <FileHeart className={`w-10 h-10 mb-3 ${dragOver ? 'text-emerald-500' : 'text-emerald-500/40'}`} />
            <p className="text-sm font-semibold text-emerald-500">
              {dragOver ? 'Drop file here' : 'Click or drag to upload'}
            </p>
            <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>PNG, JPG, PDF — Max 15MB</p>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e.target.files[0])} />
          </label>

          {file && (
            <div className={`mt-3 p-3 rounded-xl border flex items-center gap-3 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <FileText className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{file.name}</p>
                <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={clearAll} className="text-slate-400 hover:text-red-400"><X className="w-4 h-4" /></button>
            </div>
          )}

          {preview && (
            <div className="mt-3">
              <img src={preview} alt="Preview" className={`rounded-xl max-h-44 w-full object-contain border ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />
            </div>
          )}

          <button onClick={handleAnalyze} disabled={!file || analyzing}
            className="btn-primary w-full justify-center mt-4 text-sm py-3 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}>
            {analyzing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Analyze Report
              </span>
            )}
          </button>
        </motion.div>

        {/* Results */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`glass-card rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}>

          {/* Streaming indicator */}
          {analyzing && streamText && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-emerald-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI analyzing report...
              </p>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {streamText}<span className="animate-pulse">▊</span>
              </p>
            </div>
          )}

          {!result && !analyzing ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Sparkles className="w-12 h-12 text-emerald-500/20 mb-4" />
              <p className="font-semibold text-sm">Analysis Results</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Upload a report to see AI insights
              </p>
            </div>
          ) : result && (
            <div className="space-y-4">
              {/* Summary */}
              <div>
                <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Medical Summary
                </h3>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{result.summary}</p>
              </div>

              {/* Findings */}
              {result.findings && result.findings.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm mb-2">Key Findings</h3>
                  <div className="space-y-1.5">
                    {result.findings.map((f, i) => (
                      <div key={i} className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <span className="text-xs font-medium">{f.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{f.value}</span>
                          {f.status === 'high' || f.status === 'low' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {result.actions && result.actions.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm mb-2">Suggested Actions</h3>
                  <ul className="space-y-1.5">
                    {result.actions.map((a, i) => (
                      <li key={i} className={`text-xs flex items-start gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specialist */}
              {result.specialist && (
                <div className={`p-3 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Recommended Specialist</p>
                  <p className="text-sm font-bold flex items-center gap-2"><User className="w-4 h-4 text-emerald-500" /> {result.specialist}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`glass-card rounded-2xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              <h3 className="font-bold text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-500" /> Report Analysis History</h3>
              <button onClick={() => setShowHistory(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {historyLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500" /></div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No report history yet.</div>
              ) : history.map((h) => (
                <div key={h.id} className={`p-3 border-b last:border-0 ${isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-bold truncate max-w-[200px]">{h.fileName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                  <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {h.result?.summary || 'N/A'}
                  </p>
                  {h.result?.specialist && (
                    <p className="text-[10px] mt-1 font-semibold text-emerald-500">→ {h.result.specialist}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportAnalyzer;
