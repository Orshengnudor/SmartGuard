import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function RiskAnalysis() {
  const { walletData } = useApp();
  const { risk } = walletData;

  if (!risk || Object.keys(risk).length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Risk Data</h3>
          <p className="text-gray-400">Connect your wallet to see risk analysis</p>
        </div>
      </div>
    );
  }

  const riskFactors = risk.factors || {};
  const recommendations = risk.recommendations || [];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Risk Analysis
          </h1>
          <p className="text-gray-400 mt-1">
            Comprehensive security assessment of your wallet
          </p>
        </div>
      </motion.div>

      {/* Risk Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Risk Score</h2>
            <p className="text-gray-400">Overall security assessment</p>
          </div>
          <div className={`text-4xl font-bold ${
            risk.riskScore > 70 ? 'text-red-400' : 
            risk.riskScore > 30 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {risk.riskScore}/100
          </div>
        </div>

        {/* Risk Meter */}
        <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
          <div 
            className={`h-4 rounded-full transition-all duration-1000 ${
              risk.riskScore > 70 ? 'bg-red-500' : 
              risk.riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${risk.riskScore}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-sm text-gray-400">
          <span>Low Risk</span>
          <span>Medium Risk</span>
          <span>High Risk</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Factors */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <span>Risk Factors</span>
          </h3>
          <div className="space-y-4">
            {Object.entries(riskFactors).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                <span className="text-white font-medium">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>Recommendations</span>
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-green-300 text-sm">{rec}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Detailed Analysis */}
      {risk.reasons && risk.reasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
          <div className="space-y-2">
            {risk.reasons.map((reason, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Clock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span className="text-blue-300 text-sm">{reason}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}