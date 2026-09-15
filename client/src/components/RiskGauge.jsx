import React from 'react';

const RiskGauge = ({ score = 75 }) => {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getRiskColor = (s) => {
    if (s >= 70) return 'stroke-rose-500';
    if (s >= 40) return 'stroke-amber-500';
    return 'stroke-emerald-500';
  };

  const getRiskText = (s) => {
    if (s >= 70) return 'High';
    if (s >= 40) return 'Medium';
    return 'Low';
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            className="stroke-slate-100 dark:stroke-slate-800"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="48"
            cy="48"
          />
          <circle
            className={`${getRiskColor(score)} transition-all duration-1000 ease-out`}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx="48"
            cy="48"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xl font-black">{score}</span>
          <span className="text-[9px] uppercase font-bold text-slate-400">Score</span>
        </div>
      </div>
      <p className="text-xs font-bold mt-2 text-slate-500">Triage Risk Level: <span className={score >= 70 ? 'text-rose-500' : score >= 40 ? 'text-amber-500' : 'text-emerald-500'}>{getRiskText(score)}</span></p>
    </div>
  );
};

export default RiskGauge;
