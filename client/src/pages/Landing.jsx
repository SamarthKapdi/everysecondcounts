import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  Activity, Zap, Shield, Brain, Ambulance, Hospital, MapPin, Clock,
  HeartPulse, Stethoscope, ArrowRight, Sparkles, Radio
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

const FEATURES = [
  { icon: Brain, title: 'AI Triage Engine', desc: 'Hybrid rule-based + Gemini AI analyzes symptoms in seconds with explainable confidence scoring.', color: 'from-blue-500 to-cyan-400' },
  { icon: MapPin, title: 'Smart Hospital Routing', desc: 'Multi-factor algorithm considers distance, ICU beds, load, and specialty to find the optimal hospital.', color: 'from-emerald-500 to-teal-400' },
  { icon: Radio, title: 'Real-Time Telemetry', desc: 'Live patient vitals streaming — heart rate, SpO2, blood pressure, ECG — with deterioration alerts.', color: 'from-orange-500 to-amber-400' },
  { icon: Ambulance, title: 'Live Ambulance Tracking', desc: 'GPS-enabled ambulance dispatch with real-time ETA updates and route visualization.', color: 'from-red-500 to-pink-400' },
  { icon: Shield, title: 'RBAC Security', desc: 'Role-based access for patients, doctors, hospital staff, ambulance drivers, and administrators.', color: 'from-violet-500 to-purple-400' },
  { icon: Stethoscope, title: 'Doctor Override Panel', desc: 'Physicians can review AI reasoning, override triage levels, and add clinical notes.', color: 'from-sky-500 to-blue-400' },
];

const STATS = [
  { value: '< 3s', label: 'AI Triage Time' },
  { value: '8+', label: 'Partner Hospitals' },
  { value: '99.2%', label: 'Rule Engine Accuracy' },
  { value: '24/7', label: 'Emergency Coverage' },
];

const Landing = () => {
  const { isDark } = useTheme();

  return (
    <div className="overflow-hidden relative">
      {/* ──────── LOOPING VIDEO BACKGROUND ──────── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        src="/bg_animation.mp4"
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0, opacity: isDark ? 0.5 : 0.35 }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1, background: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.60)' }}
      />
      {/* ──────── HERO SECTION ──────── */}
      <section className="relative z-10 min-h-[92vh] flex items-center justify-center px-4 sm:px-6">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-[120px] ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/20'}`} />
          <div className={`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-[120px] ${isDark ? 'bg-cyan-600/15' : 'bg-cyan-400/15'}`} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px] ${isDark ? 'bg-indigo-700/10' : 'bg-indigo-300/10'}`} />
        </div>

        <motion.div
          className="relative z-10 max-w-5xl mx-auto text-center"
          initial="hidden" animate="visible" variants={stagger}
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider mb-8 border backdrop-blur-md"
            style={{
              background: isDark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)',
              borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
              color: isDark ? '#93C5FD' : '#2563EB',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-POWERED EMERGENCY COORDINATION
          </motion.div>

          {/* Title */}
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6">
            Emergency Triage.{' '}
            <span className="gradient-text">Intelligent Routing.</span>
            <br />
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Lives Saved Faster.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={fadeUp} className={`text-base sm:text-lg max-w-2xl mx-auto mb-10 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            PulsePath AI analyzes symptoms in under 3 seconds, predicts severity with explainable AI,
            and routes patients to the optimal hospital — coordinating ambulances, beds, and specialists in real time.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="btn-primary text-base py-4 px-8 justify-center">
              <Zap className="w-5 h-5" /> Start Emergency Triage
            </Link>
            <Link to="/login" className="btn-secondary text-base py-4 px-8 justify-center">
              <Activity className="w-5 h-5" /> Access Dashboard
            </Link>
          </motion.div>

          {/* Live pulse indicator */}
          <motion.div variants={fadeUp} className="mt-12 flex items-center justify-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className={`text-xs font-semibold tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              SYSTEM OPERATIONAL — LIVE MONITORING ACTIVE
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ──────── STATS BAR ──────── */}
      <motion.section
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className={`relative z-10 py-8 border-y ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white/50'} backdrop-blur-md`}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl sm:text-4xl font-black gradient-text">{stat.value}</p>
              <p className={`text-xs font-semibold tracking-wider mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ──────── FEATURES GRID ──────── */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black mb-4">
              Built for <span className="gradient-text">Critical Infrastructure</span>
            </motion.h2>
            <motion.p variants={fadeUp} className={`max-w-xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Every module is designed for real-world emergency coordination — not a prototype.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp}
                className={`glass-card glass-card-hover p-6 rounded-2xl border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──────── HOW IT WORKS ──────── */}
      <section className={`relative z-10 py-20 sm:py-28 px-4 sm:px-6 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black mb-4">
              Emergency Flow in <span className="gradient-text">4 Steps</span>
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { step: '01', icon: HeartPulse, title: 'Report Symptoms', desc: 'Patient describes symptoms via text or voice input.' },
              { step: '02', icon: Brain, title: 'AI Analyzes', desc: 'Hybrid engine assigns severity with explainable reasoning.' },
              { step: '03', icon: Hospital, title: 'Hospital Matched', desc: 'Smart routing finds the optimal hospital for the case.' },
              { step: '04', icon: Ambulance, title: 'Ambulance Dispatched', desc: 'Nearest ambulance dispatched with live GPS tracking.' },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp}
                className={`relative glass-card p-6 rounded-2xl text-center border ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}
              >
                <span className={`text-5xl font-black ${isDark ? 'text-slate-800' : 'text-slate-100'} absolute top-3 right-4`}>{s.step}</span>
                <div className="w-14 h-14 mx-auto rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                  <s.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-base mb-1">{s.title}</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──────── FINAL CTA ──────── */}
      <section className="relative z-10 py-24 px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black mb-5">
            Ready to <span className="gradient-text">Save Lives Faster?</span>
          </motion.h2>
          <motion.p variants={fadeUp} className={`mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Join the PulsePath AI emergency network. Every second counts.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link to="/register" className="btn-primary text-base py-4 px-10 justify-center">
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Landing;
