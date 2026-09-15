import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  Hospital, MapPin, Bed, Activity, Heart, Search, X,
  Phone, Navigation, Users, Clock, Shield, Stethoscope
} from 'lucide-react';
import api from '../services/api';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const getLoadColor = (load) => {
  if (load >= 85) return 'text-red-500';
  if (load >= 65) return 'text-orange-500';
  if (load >= 40) return 'text-yellow-500';
  return 'text-emerald-500';
};

const getLoadBg = (load) => {
  if (load >= 85) return 'bg-red-500';
  if (load >= 65) return 'bg-orange-500';
  if (load >= 40) return 'bg-yellow-500';
  return 'bg-emerald-500';
};

const Hospitals = () => {
  const { isDark } = useTheme();
  const [hospitals, setHospitals] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
  }, []);

  useEffect(() => {
    const fetchHospitals = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/hospitals');
        const raw = res.data.data.hospitals || [];
        // Calculate distances if we have user location
        const withDistance = raw.map(h => {
          if (userLocation && h.locationLat && h.locationLng) {
            const dist = haversine(userLocation.lat, userLocation.lng, h.locationLat, h.locationLng);
            return { ...h, distanceKm: dist.toFixed(1), estimatedETA: Math.round(dist * 3) };
          }
          return h;
        });
        // Sort by distance if available
        withDistance.sort((a, b) => (parseFloat(a.distanceKm) || 999) - (parseFloat(b.distanceKm) || 999));
        setHospitals(withDistance);
      } catch (err) {
        setHospitals([]);
        setError(err.response?.data?.message || 'Unable to load hospitals.');
      } finally {
        setLoading(false);
      }
    };
    fetchHospitals();
  }, [userLocation]);

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.specialties || []).some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Hospital Network</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {userLocation ? 'Sorted by proximity to your location' : 'Enable location for distance-based sorting'}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search hospital or specialty..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 text-sm py-2.5"
          />
        </div>
      </motion.div>

      {/* Location indicator */}
      <div className={`flex items-center gap-2 text-xs font-semibold ${userLocation ? 'text-emerald-500' : 'text-slate-400'}`}>
        <MapPin className="w-3 h-3" />
        {userLocation ? `Location acquired (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})` : 'Location unavailable — distances estimated'}
      </div>

      {/* Hospital Grid */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      >
        {loading && (
          <div className="col-span-full text-center text-xs text-slate-400">Loading hospitals...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full text-center text-xs text-slate-400">
            {error || 'No hospitals available yet.'}
          </div>
        )}
        {!loading && filtered.map((h, i) => (
          <motion.div key={h.id || i} variants={fadeUp}
            onClick={() => setSelected(h)}
            className={`glass-card glass-card-hover p-5 rounded-2xl border cursor-pointer transition-all ${
              selected?.id === h.id
                ? 'border-blue-500/50 ring-2 ring-blue-500/20'
                : isDark ? 'border-slate-800' : 'border-slate-200/80'
            }`}
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                  <Hospital className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">{h.name}</h3>
                  <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <MapPin className="w-3 h-3" /> {h.distanceKm || '—'} km • {h.estimatedETA || '—'} min ETA
                  </p>
                </div>
              </div>
              {h.hasICU && (
                <span className="text-[8px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold border border-red-500/20">ICU</span>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className={`text-center p-2 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <Bed className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-500" />
                <p className="text-sm font-black">{h.availableBeds}</p>
                <p className={`text-[8px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>BEDS</p>
              </div>
              <div className={`text-center p-2 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <Activity className={`w-3.5 h-3.5 mx-auto mb-0.5 ${getLoadColor(h.currentLoad)}`} />
                <p className={`text-sm font-black ${getLoadColor(h.currentLoad)}`}>{h.currentLoad}%</p>
                <p className={`text-[8px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>LOAD</p>
              </div>
              <div className={`text-center p-2 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <Heart className={`w-3.5 h-3.5 mx-auto mb-0.5 ${h.hasICU ? 'text-red-500' : 'text-slate-400'}`} />
                <p className="text-sm font-black">{h.hasICU ? 'Yes' : 'No'}</p>
                <p className={`text-[8px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ICU</p>
              </div>
            </div>

            {/* Load bar */}
            <div className={`w-full h-1.5 rounded-full mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div className={`h-full rounded-full transition-all duration-700 ${getLoadBg(h.currentLoad)}`}
                style={{ width: `${h.currentLoad}%` }}
              />
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(h.specialties || []).slice(0, 4).map((s, j) => (
                <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  {s}
                </span>
              ))}
            </div>

            {/* Address */}
            {h.address && (
              <p className={`text-[10px] mb-3 flex items-start gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {h.address}
              </p>
            )}

            {/* Action buttons: Call + Directions */}
            <div className="flex gap-2">
              {h.phone && (
                <a href={`tel:${h.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
              <a
                href={userLocation
                  ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${h.locationLat},${h.locationLng}`
                  : `https://www.google.com/maps/search/?api=1&query=${h.locationLat},${h.locationLng}`
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-500/20 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" /> Directions
              </a>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── HOSPITAL DETAIL MODAL ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden max-h-[85vh] overflow-y-auto ${
                isDark ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              {/* Modal Header */}
              <div className="gradient-primary p-6 text-white relative">
                <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Hospital className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{selected.name}</h2>
                    <p className="text-sm text-blue-100 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {selected.distanceKm ? `${selected.distanceKm} km away` : 'Distance unavailable'}
                      {selected.estimatedETA && ` • ~${selected.estimatedETA} min`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Emergency Availability */}
                <div className={`flex items-center justify-between p-4 rounded-xl ${
                  selected.availableBeds > 0
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <div className="flex items-center gap-3">
                    <Shield className={`w-5 h-5 ${selected.availableBeds > 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                    <div>
                      <p className="font-bold text-sm">Emergency Availability</p>
                      <p className="text-[10px] text-slate-500">
                        {selected.availableBeds > 0 ? 'Accepting emergency patients' : 'At full capacity'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${
                    selected.availableBeds > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {selected.availableBeds > 0 ? 'OPEN' : 'FULL'}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <Bed className="w-5 h-5 text-blue-500 mb-2" />
                    <p className="text-xl font-black">{selected.availableBeds}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Available Beds</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <Heart className={`w-5 h-5 mb-2 ${selected.hasICU ? 'text-red-500' : 'text-slate-400'}`} />
                    <p className="text-xl font-black">{selected.hasICU ? 'Available' : 'N/A'}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">ICU Status</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <Activity className={`w-5 h-5 mb-2 ${getLoadColor(selected.currentLoad)}`} />
                    <p className={`text-xl font-black ${getLoadColor(selected.currentLoad)}`}>{selected.currentLoad}%</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Current Load</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <Clock className="w-5 h-5 text-amber-500 mb-2" />
                    <p className="text-xl font-black">{selected.estimatedETA || '—'}<span className="text-xs font-normal">min</span></p>
                    <p className="text-[10px] text-slate-500 font-semibold">Estimated ETA</p>
                  </div>
                </div>

                {/* Specialties */}
                {(selected.specialties || []).length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5" /> Departments & Specialists
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.specialties.map((s, j) => (
                        <span key={j} className={`text-xs px-3 py-1.5 rounded-full font-medium border ${isDark ? 'border-slate-700 bg-slate-800/50 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources */}
                {(selected.resources || []).length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Resources</p>
                    <div className="space-y-2">
                      {selected.resources.map((r, j) => (
                        <div key={j} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <span className="text-sm font-semibold">{r.resourceType.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-black">{r.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Address */}
                {selected.address && (
                  <p className={`text-xs flex items-start gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" /> {selected.address}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {userLocation && selected.locationLat && (
                    <a
                      href={`https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${selected.locationLat},${selected.locationLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-colors"
                    >
                      <Navigation className="w-4 h-4" /> Get Directions
                    </a>
                  )}
                  <a
                    href={`tel:${selected.phone || '108'}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors"
                  >
                    <Phone className="w-4 h-4" /> {selected.phone || '108'}
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Haversine formula for distance calculation
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default Hospitals;
