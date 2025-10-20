import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, Shield, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function SecurityReport() {
  const { walletData, walletAddress } = useApp();
  const [generatedReport, setGeneratedReport] = useState(null);

  const generateReport = async () => {
    // Simulate report generation
    const mockReport = {
      id: 'report_' + Date.now(),
      generatedAt: new Date().toISOString(),
      wallet: walletAddress,
      riskScore: walletData.risk?.riskScore || 50,
      status: walletData.risk?.riskLevel || 'Medium Risk',
      summary: {
        totalDelegations: walletData.delegations?.delegations?.length || 0,
        activeDelegations: walletData.delegations?.delegations?.filter(d => d.status === 'Active').length || 0,
        tokenCount: walletData.tokens?.tokens?.length || 0,
        suspiciousActivities: walletData.activities?.analytics?.suspiciousInteractions || 0
      },
      recommendations: walletData.risk?.recommendations || [
        'Regularly review your token approvals',
        'Use hardware wallet for large holdings',
        'Enable transaction monitoring'
      ]
    };
    
    setGeneratedReport(mockReport);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Security Reports
          </h1>
          <p className="text-gray-400 mt-1">
            Generate comprehensive security assessment reports
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={generateReport}
          className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <FileText className="h-4 w-4" />
          <span>Generate Report</span>
        </motion.button>
      </motion.div>

      {generatedReport ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6"
        >
          {/* Report Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Security Report</h2>
              <div className="flex items-center space-x-2 text-gray-400 mt-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(generatedReport.generatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </motion.button>
          </div>

          {/* Risk Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl border border-red-500/30 p-4">
              <div className="text-2xl font-bold text-red-400">{generatedReport.riskScore}/100</div>
              <div className="text-gray-300 text-sm">Risk Score</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30 p-4">
              <div className="text-2xl font-bold text-blue-400">{generatedReport.summary.activeDelegations}</div>
              <div className="text-gray-300 text-sm">Active Delegations</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30 p-4">
              <div className="text-2xl font-bold text-green-400">{generatedReport.summary.tokenCount}</div>
              <div className="text-gray-300 text-sm">Token Holdings</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/30 p-4">
              <div className="text-2xl font-bold text-yellow-400">{generatedReport.summary.suspiciousActivities}</div>
              <div className="text-gray-300 text-sm">Threats Detected</div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Shield className={`h-6 w-6 ${
                generatedReport.riskScore > 70 ? 'text-red-400' : 
                generatedReport.riskScore > 30 ? 'text-yellow-400' : 'text-green-400'
              }`} />
              <div>
                <div className="font-semibold text-white">Overall Status: {generatedReport.status}</div>
                <div className="text-gray-400 text-sm">
                  {generatedReport.riskScore > 70 
                    ? 'Immediate attention recommended' 
                    : generatedReport.riskScore > 30 
                    ? 'Moderate risk level - review recommended'
                    : 'Good security posture - maintain current practices'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gray-700/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <span>Security Recommendations</span>
            </h3>
            <div className="space-y-3">
              {generatedReport.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-yellow-300">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            No Report Generated
          </h3>
          <p className="text-gray-400 mb-6">
            Generate a security report to get a comprehensive analysis of your wallet's security status
          </p>
        </motion.div>
      )}
    </div>
  );
}