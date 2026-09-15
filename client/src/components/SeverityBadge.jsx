import React from 'react';

const SeverityBadge = ({ severity }) => {
  const normalized = severity?.toLowerCase();
  
  if (normalized === 'critical') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
        Critical Risk
      </span>
    );
  }

  if (normalized === 'moderate') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Moderate Risk
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Low Risk
    </span>
  );
};

export default SeverityBadge;
