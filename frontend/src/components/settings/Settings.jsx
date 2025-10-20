import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Shield, Monitor } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Settings() {
  const { settings, updateSettings } = useApp();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-400 to-blue-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-400 mt-1">
          Configure your SmartGuard preferences
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-400" />
            <span>Security Settings</span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Risk Threshold</div>
                <div className="text-gray-400 text-sm">High risk alert level</div>
              </div>
              <select
                value={settings.riskThreshold}
                onChange={(e) => updateSettings({ riskThreshold: parseInt(e.target.value) })}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value={50}>Low (50+)</option>
                <option value={70}>Medium (70+)</option>
                <option value={85}>High (85+)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Bell className="h-5 w-5 text-yellow-400" />
            <span>Notifications</span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Auto-refresh Data</div>
                <div className="text-gray-400 text-sm">Automatically update wallet data</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) => updateSettings({ autoRefresh: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Display Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Monitor className="h-5 w-5 text-blue-400" />
            <span>Display</span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Theme</div>
                <div className="text-gray-400 text-sm">Interface appearance</div>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value })}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5 text-gray-400" />
            <span>About SmartGuard</span>
          </h3>
          
          <div className="space-y-3 text-sm text-gray-400">
            <p>SmartGuard helps you secure your digital assets with advanced risk analysis and delegation management.</p>
            <div className="pt-2 border-t border-gray-600">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Network</span>
                <span className="text-white">Monad Testnet</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}