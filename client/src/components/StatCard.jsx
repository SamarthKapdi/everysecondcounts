import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const StatCard = ({ title, value, change, changeType = 'increase', icon: Icon, color = 'blue', delay = 0 }) => {
  const { isDark } = useTheme();

  const colorMap = {
    blue: { bg: 'from-[#2563EB] to-[#3B82F6]', light: 'bg-[#EFF6FF]', shadow: 'shadow-blue-500/20', text: 'text-[#2563EB]' },
    cyan: { bg: 'from-[#06B6D4] to-[#22D3EE]', light: 'bg-[#ECFEFF]', shadow: 'shadow-cyan-500/20', text: 'text-[#06B6D4]' },
    green: { bg: 'from-[#10B981] to-[#34D399]', light: 'bg-[#ECFDF5]', shadow: 'shadow-emerald-500/20', text: 'text-[#10B981]' },
    red: { bg: 'from-[#EF4444] to-[#F87171]', light: 'bg-[#FEF2F2]', shadow: 'shadow-red-500/20', text: 'text-[#EF4444]' },
    amber: { bg: 'from-[#F59E0B] to-[#FBBF24]', light: 'bg-[#FFFBEB]', shadow: 'shadow-amber-500/20', text: 'text-[#F59E0B]' },
    purple: { bg: 'from-[#8B5CF6] to-[#A78BFA]', light: 'bg-[#F5F3FF]', shadow: 'shadow-purple-500/20', text: 'text-[#8B5CF6]' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card glass-card-hover p-6 ${isDark ? 'bg-[#1E293B]/80 border-[#334155]/50' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.bg} flex items-center justify-center shadow-lg ${c.shadow}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg ${
            changeType === 'increase' ? 'bg-[#ECFDF5] text-[#10B981]' :
            changeType === 'decrease' ? 'bg-[#FEF2F2] text-[#EF4444]' :
            'bg-[#F1F5F9] text-[#475569]'
          }`}>
            {changeType === 'increase' ? <TrendingUp className="w-3 h-3" /> :
             changeType === 'decrease' ? <TrendingDown className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {change}%
          </div>
        )}
      </div>
      <h3 className={`text-sm font-medium mb-1 ${isDark ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>{title}</h3>
      <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </motion.div>
  );
};

export default StatCard;
