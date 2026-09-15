import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, CornerDownLeft, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ChatBot = () => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I am PulsePath AI's Emergency Assistant. I can guide you through emergencies, check symptoms, or provide immediate medical first-aid instructions. How can I assist you today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now(), text: userMsg, sender: 'user' }]);
    setInput('');

    // Simulate AI thinking and replying
    setTimeout(() => {
      let botResponse = "I'm processing that symptom. For an official clinical assessment, please use our 'AI Symptom Checker' tool. If this is a life-threatening crisis, press the red SOS button or call emergency services immediately!";
      
      const lower = userMsg.toLowerCase();
      if (lower.includes('chest pain') || lower.includes('heart attack')) {
        botResponse = "🚨 CRITICAL FIRST AID INSTRUCTION: Chest pain could indicate a serious cardiac event. 1. Call emergency services immediately. 2. Sit down, try to remain calm. 3. Chew an aspirin (325mg) if available and not allergic. 4. Unlock your front door for emergency crew.";
      } else if (lower.includes('bleeding')) {
        botResponse = "🩸 FIRST AID FOR BLEEDING: 1. Apply direct pressure to the wound with a clean cloth or bandage. 2. Elevate the injured area above the heart level. 3. If bleeding does not stop, continue applying pressure and seek immediate medical care.";
      } else if (lower.includes('burn')) {
        botResponse = "🔥 FIRST AID FOR BURNS: 1. Cool the burn immediately under cool running water for 10-15 minutes. 2. Do not use ice. 3. Cover loosely with sterile non-stick dressing. 4. Take over-the-counter pain reliever if suitable.";
      } else if (lower.includes('stroke') || lower.includes('numb')) {
        botResponse = "🧠 STROKE SYMPTOM WARNING (FAST): 1. F (Face drooping). 2. A (Arm weakness). 3. S (Speech difficulty). 4. T (Time to call emergency services!). Time is critical. Do not wait.";
      } else if (lower.includes('choking')) {
        botResponse = "🗣️ CHOKING ASSISTANCE: If adult is conscious, perform the Heimlich Maneuver: 1. Stand behind the person. 2. Wrap arms around waist. 3. Make a fist and place thumb side just above navel. 4. Grasp fist and perform quick, upward thrusts.";
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, text: botResponse, sender: 'bot' }]);
    }, 1000);
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
                  <h4 className="font-semibold text-sm">PulsePath AI Assistant</h4>
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
