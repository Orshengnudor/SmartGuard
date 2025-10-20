import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, FileText, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const actions = [
  {
    icon: Shield,
    label: 'Risk Scan',
    description: 'Run security scan',
    color: 'red',
    onClick: () => console.log('Risk scan')
  },
  {
    icon: Users,
    label: 'Manage Delegations',
    description: 'View all delegations',
    color: 'green',
    onClick: () => console.log('Manage delegations')
  },
  {
    icon: FileText,
    label: 'Generate Report',
    description: 'Create security report',
    color: 'purple',
    onClick: () => console.log('Generate report')
  },
  {
    icon: RefreshCw,
    label: 'Refresh Data',
    description: 'Update all information',
    color: 'blue',
    onClick: () => console.log('Refresh data')
  }
];

const colorClasses = {
  red: 'from-red-500 to-pink-500',
  green: 'from-green-500 to-emerald-500',
  purple: 'from-purple-500 to-indigo-500',
  blue: 'from-blue-500 to-cyan-500'
};

export default function QuickActions() {
  const { setActiveView } = useApp();

  return (
    <div className="flex items-center space-x-2">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (action.label === 'Manage Delegations') setActiveView('delegation');
              else if (action.label === 'Generate Report') setActiveView('reports');
              else action.onClick();
            }}
            className="group relative"
          >
            <div className={`p-3 bg-gradient-to-br ${colorClasses[action.color]} rounded-xl text-white shadow-lg`}>
              <Icon className="h-4 w-4" />
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              {action.description}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}