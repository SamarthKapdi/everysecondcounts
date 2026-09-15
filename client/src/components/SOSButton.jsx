import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, HelpCircle, PhoneCall, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const SOSButton = () => {
  const [isPressing, setIsPressing] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [sosActive, setSosActive] = useState(false);
  const [timerId, setTimerId] = useState(null);

  const startPress = () => {
    setIsPressing(true);
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          triggerSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerId(interval);
  };

  const cancelPress = () => {
    setIsPressing(false);
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
  };

  const triggerSOS = async () => {
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const res = await api.post('/sos/trigger', {
            locationLat: latitude,
            locationLng: longitude,
            symptoms: ['SOS Triggered'],
            message: 'SOS trigger emergency push button from dashboard',
          });
          setSosActive(true);
          toast.success(res.data.message || 'SOS Triggered! Ambulance and hospitals notified.', { duration: 6000 });
        },
        async (error) => {
          const res = await api.post('/sos/trigger', {
            symptoms: ['SOS Triggered'],
            message: 'SOS trigger emergency push button (Location Denied)',
          });
          setSosActive(true);
          toast.success('SOS Triggered! Location denied but hospitals and dispatch have been notified.', { duration: 6000 });
        }
      );
    } catch (err) {
      toast.error('Could not trigger SOS. Please dial emergency services directly.');
    } finally {
      setIsPressing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <h3 className="text-xl font-bold mb-2">Emergency SOS Button</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        Press and hold the button for 3 seconds to trigger an instant emergency alert, dispatch nearest ambulance and notify nearest hospitals.
      </p>

      <div className="relative w-44 h-44 flex items-center justify-center">
        <AnimatePresence>
          {isPressing && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
              className="absolute w-full h-full rounded-full bg-rose-500 z-0"
            />
          )}
        </AnimatePresence>

        <button
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          className={`w-36 h-36 rounded-full flex flex-col items-center justify-center z-10 transition-all shadow-2xl relative select-none cursor-pointer ${
            sosActive
              ? 'bg-emerald-500 text-white shadow-emerald-500/30'
              : isPressing
              ? 'bg-rose-600 text-white scale-95'
              : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
          }`}
        >
          {sosActive ? (
            <>
              <Check className="w-12 h-12 stroke-[3]" />
              <span className="text-xs font-bold uppercase tracking-wider mt-1">Dispatched</span>
            </>
          ) : isPressing ? (
            <>
              <span className="text-4xl font-extrabold">{countdown}</span>
              <span className="text-xs font-bold uppercase tracking-wider mt-1">Hold...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-wider mt-2">Trigger SOS</span>
            </>
          )}
        </button>
      </div>

      {sosActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm max-w-sm"
        >
          <p className="font-bold flex items-center justify-center gap-1.5">
            <PhoneCall className="w-4 h-4 animate-bounce" /> Ambulance en route!
          </p>
          <p className="text-xs mt-1 text-emerald-600">
            Estimated arrival time is 8-12 minutes. Emergency doctors at Apollo Hospital are pre-triage preparing.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SOSButton;
