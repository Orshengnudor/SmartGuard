import React from 'react';
import { motion } from 'framer-motion';

const colorClasses = {
  primary: 'from-blue-500 to-cyan-500',
  success: 'from-green-500 to-emerald-500',
  warning: 'from-yellow-500 to-amber-500',
  danger: 'from-red-500 to-orange-500'
};

const iconColors = {
  primary: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400'
};

export default function StatCard({ title, value, icon: Icon, color = 'primary', trend }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 relative overflow-hidden"
    >
      {/* Background Gradient */}
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full -translate-y-8 translate-x-8`}></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 bg-gray-700/50 rounded-lg ${iconColors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          
          {trend && (
            <div className={`text-xs px-2 py-1 rounded-full ${
              trend === 'up' ? 'bg-green-500/20 text-green-400' :
              trend === 'down' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </div>
          )}
        </div>
        
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-gray-400 text-sm">{title}</div>
      </div>
    </motion.div>
  );
}