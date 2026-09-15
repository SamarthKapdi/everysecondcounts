import React from 'react';

const AIConfidenceMeter = ({ score = 85 }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="5"
            fill="transparent"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            className="stroke-cyan-500 transition-all duration-1000 ease-out"
            strokeWidth="5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xs font-bold">{score}%</span>
      </div>
      <div>
        <h5 className="font-bold text-xs">AI Diagnosis Match Confidence</h5>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">Based on symptom-correlation weight</p>
      </div>
    </div>
  );
};

export default AIConfidenceMeter;
