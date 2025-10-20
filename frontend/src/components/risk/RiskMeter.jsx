import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export default function RiskMeter({ riskData }) {
  const riskScore = riskData?.riskScore || 0;
  
  const getRiskLevel = (score) => {
    if (score >= 70) return { level: 'High', color: 'red', description: 'Immediate attention recommended' };
    if (score >= 30) return { level: 'Medium', color: 'yellow', description: 'Review recommended' };
    return { level: 'Low', color: 'green', description: 'Good security posture' };
  };

  const riskInfo = getRiskLevel(riskScore);

  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
      <h3 className="text-lg font-semibold mb-6 flex items-center space-x-2">
        <Shield className="h-5 w-5 text-blue-400" />
        <span>Risk Assessment</span>
      </h3>

      {/* Risk Score Circle */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-700"
            />
            {/* Progress Circle */}
            <motion.circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className={`${
                riskInfo.color === 'red' ? 'text-red-500' :
                riskInfo.color === 'yellow' ? 'text-yellow-500' : 'text-green-500'
              }`}
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 352' }}
              animate={{ strokeDasharray: `${(riskScore / 100) * 352} 352` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                riskInfo.color === 'red' ? 'text-red-400' :
                riskInfo.color === 'yellow' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {riskScore}
              </div>
              <div className="text-xs text-gray-400">/100</div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Level Info */}
      <div className="text-center">
        <div className={`text-lg font-semibold mb-2 ${
          riskInfo.color === 'red' ? 'text-red-400' :
          riskInfo.color === 'yellow' ? 'text-yellow-400' : 'text-green-400'
        }`}>
          {riskInfo.level} Risk
        </div>
        <p className="text-gray-400 text-sm mb-4">
          {riskInfo.description}
        </p>
        
        {/* Risk Factors Summary */}
        {riskData?.factors && (
          <div className="space-y-2">
            {Object.entries(riskData.factors).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                <span className="text-white">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}