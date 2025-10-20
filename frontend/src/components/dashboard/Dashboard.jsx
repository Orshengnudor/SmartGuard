import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Coins,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import StatCard from '../ui/StatCard';
import RiskMeter from '../risk/RiskMeter';
import RecentActivities from './RecentActivities';
import QuickActions from './QuickActions';

export default function Dashboard({ onRefresh }) {
  const { walletData, connected } = useApp();
  const { risk, tokens, delegations, activities, analytics } = walletData;

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-300 mb-2">
            Welcome to SmartGuard
          </h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to start securing your digital assets
          </p>
        </motion.div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Risk Score',
      value: risk?.riskScore || 0,
      max: 100,
      icon: Shield,
      color: risk?.riskScore > 70 ? 'danger' : risk?.riskScore > 30 ? 'warning' : 'success',
      trend: 'neutral'
    },
    {
      title: 'Active Delegations',
      value: delegations?.delegations?.filter(d => d.status === 'Active').length || 0,
      icon: Users,
      color: 'primary',
      trend: 'up'
    },
    {
      title: 'Token Holdings',
      value: tokens?.tokens?.length || 0,
      icon: Coins,
      color: 'warning',
      trend: 'neutral'
    },
    {
      title: 'Threats Detected',
      value: activities?.analytics?.suspiciousInteractions || 0,
      icon: AlertTriangle,
      color: activities?.analytics?.suspiciousInteractions > 0 ? 'danger' : 'success',
      trend: 'down'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Security Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Overview of your wallet's security status and activities
          </p>
        </div>
        <QuickActions />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Analysis */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <RiskMeter riskData={risk} />
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <RecentActivities activities={activities} />
        </motion.div>
      </div>

      {/* Delegation Overview */}
      {delegations?.delegations && delegations.delegations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span>Active Delegations</span>
          </h3>
          <div className="space-y-3">
            {delegations.delegations.slice(0, 3).map((delegation, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div>
                    <div className="font-mono text-sm">
                      {delegation.contractAddr?.slice(0, 8)}...{delegation.contractAddr?.slice(-6)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Expires: {delegation.expiresIn}
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                  Active
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}