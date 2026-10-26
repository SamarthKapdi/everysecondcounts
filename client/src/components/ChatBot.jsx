import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, CornerDownLeft, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import api from '../services/api';

const ChatBot = () => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I am Every Second Counts Emergency Assistant. All AI runs locally. I can provide immediate first-aid guidance for burns, bleeding, choking, chest pain, and other emergencies. How can I assist you today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now(), text: userMsg, sender: 'user' }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat', { message: userMsg });
      const reply = res.data?.data?.reply || "I'm not sure. Please contact a doctor or use the SOS button.";
      setMessages(prev => [...prev, { id: Date.now() + 1, text: reply, sender: 'bot' }]);
    } catch (err) {
      // Fallback if network or auth error
      let botResponse = "I'm not sure about that condition. For your safety, please contact a doctor, use our AI Symptom Checker, or press the SOS button.";
      const lower = userMsg.toLowerCase();
      if (lower.includes('chest pain') || lower.includes('heart attack')) {
        botResponse = "🚨 CRITICAL FIRST AID: Chest pain may indicate a cardiac emergency. 1. Call 112/108 or tap SOS immediately. 2. Rest quietly. 3. Chew an aspirin (325mg) if not allergic. 4. Unlock your door for paramedics.";
      } else if (lower.includes('bleeding')) {
        botResponse = "🩸 FIRST AID FOR BLEEDING: 1. Apply firm direct pressure with a clean cloth. 2. Elevate the wound above heart level. 3. Add more cloths on top if soaked. 4. Seek emergency care immediately.";
      } else if (lower.includes('burn')) {
        botResponse = "🔥 FIRST AID FOR BURNS: 1. Cool under running water for 10-20 minutes. 2. Do not apply ice or grease. 3. Cover loosely with sterile dressing. 4. Seek emergency evaluation.";
      } else if (lower.includes('stroke') || lower.includes('droop')) {
        botResponse = "🧠 STROKE WARNING (F.A.S.T.): Check Face, Arms, Speech. Time is critical—call 112/108 immediately. Do not administer aspirin or food.";
      } else if (lower.includes('choking')) {
        botResponse = "🗣️ CHOKING FIRST AID: 1. Give 5 back blows between shoulder blades. 2. Give 5 upward abdominal thrusts (Heimlich maneuver). 3. Call 112/108 if unconscious.";
      }
      setMessages(prev => [...prev, { id: Date.now() + 1, text: botResponse, sender: 'bot' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className={`w-[360px] h-[500px] rounded-3xl shadow-2xl border flex flex-col overflow-hidden mb-4 ${
              isDark ? 'bg-[#1E293B] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Header */}
            <div className="gradient-primary p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Every Second Counts Assistant</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-white/80">Ready to triage</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message Area */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin`}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                    msg.sender === 'user' ? 'bg-primary text-white' : isDark ? 'bg-slate-800 text-cyan-400' : 'bg-slate-100 text-primary'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : isDark
                      ? 'bg-slate-800/80 rounded-tl-none border border-slate-700/50'
                      : 'bg-slate-50 rounded-tl-none border border-slate-100'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <input
                type="text"
                placeholder="Ask about first aid, symptoms..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="input-field !py-2 !px-3.5 !rounded-xl text-xs flex-1"
              />
              <button type="submit" className="btn-primary !p-2.5 !rounded-xl">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
      </button>
    </div>
  );
};

export default ChatBot;
