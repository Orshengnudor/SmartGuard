import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Shield, 
  Users, 
  Zap,
  Coins,
  FileText,
  Settings,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'blue' },
  { id: 'risk', label: 'Risk Analysis', icon: Shield, color: 'red' },
  { id: 'delegation', label: 'Delegation', icon: Users, color: 'green' },
  { id: 'autorevoke', label: 'Auto Revoke', icon: Zap, color: 'orange' },
  { id: 'tokens', label: 'Tokens', icon: Coins, color: 'yellow' },
  { id: 'reports', label: 'Security Reports', icon: FileText, color: 'purple' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'gray' }
];

const colorClasses = {
  blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  red: 'bg-red-500/20 border-red-500/30 text-red-400',
  green: 'bg-green-500/20 border-green-500/30 text-green-400',
  orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  gray: 'bg-gray-500/20 border-gray-500/30 text-gray-400'
};

export default function Sidebar() {
  const { activeView, setActiveView, connected } = useApp();

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-64 bg-gray-900/80 backdrop-blur-md border-r border-gray-700 flex flex-col"
    >
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveView(item.id)}
              disabled={!connected && item.id !== 'dashboard' && item.id !== 'settings'}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all ${
                isActive 
                  ? colorClasses[item.color] 
                  : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50'
              } ${!connected && item.id !== 'dashboard' && item.id !== 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t border-gray-700">
        <div className={`p-3 rounded-lg border ${
          connected 
            ? 'bg-green-500/20 border-green-500/30 text-green-400' 
            : 'bg-gray-800/50 border-gray-600 text-gray-400'
        }`}>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium">
              {connected ? 'Wallet Connected' : 'Not Connected'}
            </span>
          </div>
          {connected && (
            <p className="text-xs mt-1 text-green-300">
              Ready for secure management
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}