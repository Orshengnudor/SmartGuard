import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowUpRight, ArrowDownLeft, ChevronDown, ChevronUp } from 'lucide-react';

export default function RecentActivities({ activities }) {
  const [showAll, setShowAll] = useState(false);
  
  const allActivities = activities?.transactions || [];
  const displayedActivities = showAll ? allActivities : allActivities.slice(0, 5);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown Date';
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Clock className="h-5 w-5 text-blue-400" />
          <span>Recent Activities</span>
        </h3>
        {allActivities.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>{showAll ? 'Show Less' : `Show All (${allActivities.length})`}</span>
            {showAll ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {displayedActivities.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {displayedActivities.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  activity.value && parseFloat(activity.value) > 0 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {activity.value && parseFloat(activity.value) > 0 ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {activity.value ? `${activity.value} MON` : 'Contract Interaction'}
                  </div>
                  <div className="text-xs text-gray-400 flex space-x-2">
                    <span>{formatTime(activity.timestamp)}</span>
                    <span>•</span>
                    <span>{formatDate(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-mono text-gray-400">
                  {activity.blockNumber ? `#${activity.blockNumber}` : 'Pending'}
                </div>
                {activity.hash && (
                  <a 
                    href={`https://testnet.monadexplorer.com/tx/${activity.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                  >
                    View
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No recent activities</p>
        </div>
      )}

      {/* Activity Summary */}
      {allActivities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Total Activities: {allActivities.length}</span>
            <span>
              Last: {allActivities.length > 0 ? formatDate(allActivities[0].timestamp) : 'Never'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}