import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import useAuthStore from '../store/authStore';
import {
  Send, ArrowLeft, User, Bot, Clock, CheckCheck, Loader2
} from 'lucide-react';
import api from '../services/api';

const ConsultationRoom = () => {
  const { id: consultationId } = useParams();
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const { emit, onEvent, joinRoom, leaveRoom } = useSocket();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Join consultation room
  useEffect(() => {
    if (consultationId) {
      joinRoom(`consultation:${consultationId}`);
    }
    return () => {
      if (consultationId) leaveRoom(`consultation:${consultationId}`);
    };
  }, [consultationId, joinRoom, leaveRoom]);

  // Listen for messages
  useEffect(() => {
    const unsubMsg = onEvent('consultation:message', (data) => {
      if (data.consultationId === consultationId) {
        setMessages(prev => [...prev, data]);
        if (data.senderId !== user?.id && data.senderName) {
          setPartnerName(data.senderName);
        }
      }
    });

    const unsubTyping = onEvent('consultation:typing', (data) => {
      setPartnerTyping(data.isTyping);
      setPartnerName(data.name || '');
    });

    const unsubAccepted = onEvent('consultation:accepted', (data) => {
      if (data.consultationId === consultationId) {
        setPartnerName(data.doctorName || 'Doctor');
        setMessages(prev => [...prev, {
          id: Date.now(),
          message: `${(data.doctorName || 'Doctor').startsWith('Dr.') ? data.doctorName : `Dr. ${data.doctorName || 'Doctor'}`} has joined the consultation.`,
          senderRole: 'SYSTEM',
          timestamp: data.timestamp,
        }]);
      }
    });

    const unsubEnded = onEvent('consultation:ended', (data) => {
      if (data.consultationId === consultationId) {
        setIsActive(false);
        setMessages(prev => [...prev, {
          id: Date.now(),
          message: `Consultation ended by ${data.endedBy}.`,
          senderRole: 'SYSTEM',
          timestamp: data.timestamp,
        }]);
      }
    });

    return () => {
      if (typeof unsubMsg === 'function') unsubMsg();
      if (typeof unsubTyping === 'function') unsubTyping();
      if (typeof unsubAccepted === 'function') unsubAccepted();
      if (typeof unsubEnded === 'function') unsubEnded();
    };
  }, [consultationId, onEvent, user?.id]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !isActive) return;

    emit('consultation:message', {
      consultationId,
      message: input.trim(),
      senderName: user?.name,
      senderRole: user?.role,
    });
    setInput('');

    // Stop typing indicator
    emit('consultation:typing', { consultationId, isTyping: false });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    emit('consultation:typing', { consultationId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emit('consultation:typing', { consultationId, isTyping: false });
    }, 2000);
  };

  const endConsultation = async () => {
    try {
      await api.patch(`/consultations/${consultationId}/end`);
    } catch (err) {
      console.error('Failed to end consultation in DB:', err);
    }
    emit('consultation:end', { consultationId });
    setIsActive(false);
  };

  const isMe = (msg) => msg.senderId === user?.id;
  const isSystem = (msg) => msg.senderRole === 'SYSTEM';

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className={`flex items-center justify-between p-4 rounded-t-2xl border-b ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">{partnerName || 'Consultation Room'}</p>
            <div className="flex items-center gap-1.5">
              {isActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-500 font-semibold">Active</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-[10px] text-slate-400 font-semibold">Ended</span>
                </>
              )}
            </div>
          </div>
        </div>

        {isActive && (
          <button onClick={endConsultation} className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-colors">
            End Consultation
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDark ? 'bg-[#0F172A]' : 'bg-slate-50'}`}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-400">Consultation Room</p>
            <p className="text-xs text-slate-400">Waiting for messages...</p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (isSystem(msg)) {
            return (
              <div key={msg.id || i} className="text-center">
                <span className="text-[10px] px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 font-semibold">
                  {msg.message}
                </span>
              </div>
            );
          }

          const me = isMe(msg);
          return (
            <div key={msg.id || i} className={`flex gap-2 ${me ? 'justify-end' : 'justify-start'}`}>
              {!me && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${isDark ? 'bg-slate-800 text-blue-400' : 'bg-slate-200 text-blue-600'}`}>
                  {msg.senderRole === 'DOCTOR' ? '🩺' : '👤'}
                </div>
              )}
              <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                me
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : isDark
                  ? 'bg-[#1E293B] border border-slate-700 rounded-bl-none'
                  : 'bg-white border border-slate-200 rounded-bl-none'
              }`}>
                {!me && (
                  <p className="text-[10px] font-bold text-blue-500 mb-1">{msg.senderName}</p>
                )}
                <p className="leading-relaxed">{msg.message}</p>
                <p className={`text-[9px] mt-1 flex items-center gap-1 ${me ? 'text-blue-200 justify-end' : 'text-slate-400'}`}>
                  <Clock className="w-2.5 h-2.5" />
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  {me && <CheckCheck className="w-3 h-3 ml-1" />}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {partnerTyping && (
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-2xl text-xs ${isDark ? 'bg-[#1E293B]' : 'bg-white border border-slate-200'}`}>
              <span className="text-slate-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {partnerName || 'Someone'} is typing...
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className={`p-4 border-t flex gap-2 rounded-b-2xl ${isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={isActive ? 'Type your message...' : 'Consultation ended'}
          disabled={!isActive}
          className="input-field flex-1 !py-2.5 !rounded-xl text-sm disabled:opacity-50"
        />
        <button type="submit" disabled={!input.trim() || !isActive}
          className="px-4 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default ConsultationRoom;
