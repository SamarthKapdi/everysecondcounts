import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import {
  AlertCircle, Phone, MapPin, Hospital, Truck as AmbulanceIcon,
  ShieldAlert, Check, PhoneCall, Loader2, Navigation
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const SOSPage = () => {
  const { isDark } = useTheme();
  const { emit } = useSocket();
  const [isPressing, setIsPressing] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosData, setSosData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [timerId, setTimerId] = useState(null);

  // Get user location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
  }, []);

  // Fetch nearby hospitals
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await api.get('/hospitals?availableOnly=true');
        setNearbyHospitals((res.data.data.hospitals || []).slice(0, 3));
      } catch {
        setNearbyHospitals([]);
      }
    };
    fetchHospitals();
  }, []);

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
    setLoading(true);
    try {
      const payload = {
        symptoms: ['Emergency SOS'],
        message: 'SOS trigger from emergency page',
      };
      if (userLocation) {
        payload.locationLat = userLocation.lat;
        payload.locationLng = userLocation.lng;
      }

      const res = await api.post('/sos/trigger', payload);
      setSosTriggered(true);
      setSosData(res.data.data);

      // Server-side broadcast already handles Socket.IO notification to DOCTOR/ADMIN rooms

      toast.success('🚨 SOS Alert Triggered! Emergency services notified.', { duration: 6000 });
    } catch (err) {
      toast.error('Could not trigger SOS. Please call 108 directly.');
    } finally {
      setIsPressing(false);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-red-500" /> Emergency SOS
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Trigger instant emergency alert — dispatches ambulance and notifies nearest hospitals
        </p>
      </motion.div>

      {/* Emergency Helpline Banner */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className="flex items-center justify-between p-5 rounded-2xl bg-red-500/10 border-2 border-red-500/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Phone className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider">National Ambulance Helpline</p>
            <p className="text-2xl font-black text-red-600">108</p>
          </div>
        </div>
        <a href="tel:108" className="px-6 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20">
          <PhoneCall className="w-4 h-4" /> Call Now
        </a>
      </motion.div>

      {/* SOS Button Section */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`p-8 rounded-2xl border text-center ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}
      >
        <div className="flex flex-col items-center justify-center">
          <p className={`text-sm mb-6 max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Press and hold the button for 3 seconds to trigger an instant emergency alert.
          </p>

          <div className="relative w-44 h-44 flex items-center justify-center mb-6">
            <AnimatePresence>
              {isPressing && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                  className="absolute w-full h-full rounded-full bg-red-500 z-0"
                />
              )}
            </AnimatePresence>

            <button
              onMouseDown={!sosTriggered ? startPress : undefined}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={!sosTriggered ? startPress : undefined}
              onTouchEnd={cancelPress}
              disabled={sosTriggered || loading}
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center z-10 transition-all shadow-2xl select-none cursor-pointer disabled:cursor-not-allowed ${
                sosTriggered
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                  : isPressing
                  ? 'bg-red-600 text-white scale-95'
                  : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
              }`}
            >
              {loading ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : sosTriggered ? (
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
                  <span className="text-sm font-bold uppercase tracking-wider mt-2">SOS</span>
                </>
              )}
            </button>
          </div>

          {sosTriggered && sosData && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 max-w-md"
            >
              <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 mb-2">
                <PhoneCall className="w-4 h-4 animate-bounce" /> Emergency Services Notified
              </p>
              <p className={`text-xs ${isDark ? 'text-emerald-500/80' : 'text-emerald-700'}`}>
                {sosData.estimatedResponseTime || '8-12 minutes'} estimated response time.
                {sosData.ambulanceDispatched ? ` Ambulance ${sosData.ambulanceDispatched.vehicleNumber} dispatched.` : ' Nearest ambulance notified.'}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Nearest Emergency Hospitals */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className={`p-6 rounded-2xl border ${isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}
      >
        <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Hospital className="w-4 h-4 text-blue-500" /> Nearest Emergency Hospitals
        </h3>
        <div className="space-y-3">
          {nearbyHospitals.length === 0 && (
            <p className="text-xs text-slate-400">Loading hospitals...</p>
          )}
          {nearbyHospitals.map((h, i) => (
            <div key={h.id || i} className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200/50 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  <Hospital className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{h.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {h.availableBeds} beds • {h.hasICU ? 'ICU Available' : 'No ICU'} • {h.currentLoad}% load
                  </p>
                </div>
              </div>
              {userLocation && h.locationLat && (
                <a
                  href={`https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${h.locationLat},${h.locationLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" /> Directions
                </a>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Location Status */}
      <div className={`text-center text-[10px] font-semibold ${userLocation ? 'text-emerald-500' : 'text-slate-400'}`}>
        <MapPin className="w-3 h-3 inline mr-1" />
        {userLocation ? 'Location acquired — emergency responders will use your GPS coordinates' : 'Location unavailable — enable GPS for faster response'}
      </div>
    </div>
  );
};

export default SOSPage;
