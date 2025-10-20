import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  RefreshCw, 
  Bell, 
  Settings,
  Wallet,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle
} from 'lucide-react';
import WalletConnectButton from '../WalletConnectButton';
import { useApp } from '../../context/AppContext';

export default function Header({ onRefresh }) {
  const { 
    walletAddress, 
    connected, 
    loading,
    notifications,
    smartAccount,
    clearNotification,
    clearAllNotifications
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'info': return <Info className="h-4 w-4 text-blue-400" />;
      default: return <Bell className="h-4 w-4 text-gray-400" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'border-l-green-500';
      case 'error': return 'border-l-red-500';
      case 'warning': return 'border-l-yellow-500';
      case 'info': return 'border-l-blue-500';
      default: return 'border-l-gray-500';
    }
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setShowNotifications(false);
  };

  const handleClearOne = (index) => {
    clearNotification(index);
  };

  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700 px-6 py-4 relative z-40"> {/* Added relative z-40 */}
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2"
          >
            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                SmartGuard
              </h1>
              <p className="text-xs text-gray-400">Secure Wallet Management</p>
            </div>
          </motion.div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-4">
          {connected && walletAddress && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400 font-mono">
                {smartAccount?.address ? `${smartAccount.address.slice(0, 6)}...${smartAccount.address.slice(-4)} (Smart)` : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </span>
            </motion.div>
          )}

          {/* Refresh Button */}
          {connected && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefresh}
              disabled={loading}
              className="p-2 bg-gray-800 rounded-lg border border-gray-600 hover:bg-gray-700 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
          )}

          {/* Notifications Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-gray-800 rounded-lg border border-gray-600 hover:bg-gray-700 relative"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-12 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-[100]" // Increased to z-[100]
                >
                  {/* Notifications Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 className="font-semibold text-white">Notifications</h3>
                    <div className="flex items-center space-x-2">
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-700">
                        {notifications.map((notification, index) => (
                          <motion.div
                            key={notification.id || index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 border-l-4 ${getNotificationColor(notification.type)} hover:bg-gray-700/50 transition-colors`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                {getNotificationIcon(notification.type)}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-white mb-1">
                                    {notification.title}
                                  </h4>
                                  <p className="text-xs text-gray-300">
                                    {notification.message}
                                  </p>
                                  {notification.timestamp && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(notification.timestamp).toLocaleTimeString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleClearOne(index)}
                                className="p-1 hover:bg-gray-600 rounded transition-colors flex-shrink-0 ml-2"
                              >
                                <X className="h-3 w-3 text-gray-400" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notifications Footer */}
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-700 bg-gray-900/50">
                      <p className="text-xs text-gray-400 text-center">
                        {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Wallet Connect Button */}
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}