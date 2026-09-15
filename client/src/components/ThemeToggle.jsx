import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2.5 rounded-xl border transition-all ${
        isDark 
          ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:text-yellow-300' 
          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
      }`}
      aria-label="Toggle Theme"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

export default ThemeToggle;
