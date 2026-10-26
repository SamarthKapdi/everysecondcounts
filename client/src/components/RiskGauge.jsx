import React from 'react';

const RiskGauge = ({ score = 0, tier = null, size = 'md', label = 'Risk Score' }) => {
  const isLarge = size === 'lg';
  const radius = isLarge ? 55 : 40;
  const stroke = isLarge ? 10 : 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const resolvedTier = tier || (
    clampedScore >= 80 ? 'CRITICAL' :
    clampedScore >= 60 ? 'HIGH' :
    clampedScore >= 30 ? 'MODERATE' : 'LOW'
  );

  const getRiskColor = (t) => {
    switch (t) {
      case 'CRITICAL': return 'stroke-red-600';
      case 'HIGH': return 'stroke-rose-500';
      case 'MODERATE': return 'stroke-amber-500';
      default: return 'stroke-emerald-500';
    }
  };

  const getTextColor = (t) => {
    switch (t) {
      case 'CRITICAL': return 'text-red-600 dark:text-red-400';
      case 'HIGH': return 'text-rose-500 dark:text-rose-400';
      case 'MODERATE': return 'text-amber-500 dark:text-amber-400';
      default: return 'text-emerald-500 dark:text-emerald-400';
    }
  };

  const dim = isLarge ? 'w-36 h-36' : 'w-24 h-24';
  const center = isLarge ? 72 : 48;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className={`relative ${dim} flex items-center justify-center`}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            className="stroke-slate-100 dark:stroke-slate-800"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={center}
            cy={center}
          />
          <circle
            className={`${getRiskColor(resolvedTier)} transition-all duration-1000 ease-out`}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={center}
            cy={center}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`${isLarge ? 'text-3xl' : 'text-xl'} font-black`}>{clampedScore}</span>
          <span className="text-[9px] uppercase font-bold text-slate-400">/ 100</span>
        </div>
      </div>
      <div className="text-center mt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{label}</span>
        <span className={`text-xs font-black tracking-wide ${getTextColor(resolvedTier)}`}>
          {resolvedTier}
        </span>
      </div>
    </div>
  );
};

export default RiskGauge;
