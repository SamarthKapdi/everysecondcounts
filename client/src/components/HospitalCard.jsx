import React from 'react';
import { Building2, Phone, Star, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const HospitalCard = ({ hospital, onContactClick, delay = 0 }) => {
  const { isDark } = useTheme();

  return (
    <div className={`glass-card glass-card-hover p-6 flex flex-col justify-between ${isDark ? 'bg-[#1E293B]/80 border-[#334155]/50 text-white' : 'text-slate-800'}`}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-snug">{hospital.name}</h3>
              <p className={`text-xs flex items-center gap-1 mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <MapPin className="w-3.5 h-3.5" />
                {hospital.address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-lg text-xs font-semibold">
            <Star className="w-3 h-3 fill-current" />
            {hospital.rating}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 my-4">
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#0F172A]/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Available Beds</p>
            <p className="text-xl font-bold mt-1 text-primary">{hospital.available_beds} / {hospital.total_beds}</p>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#0F172A]/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ICU Availability</p>
            <div className="flex items-center gap-1.5 mt-1 font-bold">
              {hospital.icu_available ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">Available</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-rose-500">Full</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 my-3">
          {hospital.specialties?.map((spec, i) => (
            <span key={i} className={`text-xs px-2.5 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {spec}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 flex gap-2">
        <a 
          href={`tel:${hospital.emergency_contact}`} 
          className="btn-secondary !w-full justify-center text-sm py-2"
          onClick={onContactClick}
        >
          <Phone className="w-4 h-4" />
          Call Emergency
        </a>
      </div>
    </div>
  );
};

export default HospitalCard;
