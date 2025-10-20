import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Eye, EyeOff, Trash2, AlertTriangle, CheckCircle, Settings, RefreshCw, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import { formatEther } from 'viem';

const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const MONAD_EXPLORER = 'https://testnet.monadexplorer.com';

export default function AutoRevokeManager() {
  const { walletAddress, connected, signer, addNotification, provider } = useApp();
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [delegationStatus, setDelegationStatus] = useState({
    isDelegated: false,
    monitoringStatus: "inactive"
  });
  const [settings, setSettings] = useState({
    autoRevokeEnabled: true,
    riskThreshold: 70,
    monitorAllContracts: true
  });
  const [revokeLoading, setRevokeLoading] = useState(null);

  useEffect(() => {
    if (connected && walletAddress) {
      fetchRealTransactionData();
      checkDelegationStatus();
    } else {
      setInteractions([]);
    }
  }, [connected, walletAddress]);

  // Fetch REAL contract interactions from your backend with Alchemy
  const fetchRealTransactionData = async () => {
    if (!walletAddress) {
      setInteractions([]);
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔍 Fetching REAL contract interactions for:', walletAddress);
      
      // Call the new backend endpoint for contract interactions
      const response = await axios.get(
        `${backendURL}/api/alchemy/contract-interactions/${walletAddress}`
      );
      
      if (response.data.success && response.data.interactions) {
        const contractInteractions = response.data.interactions;
        console.log('📊 Real contract interactions from Alchemy:', contractInteractions.length);
        
        // Enhance with risk assessment
        const enhancedInteractions = contractInteractions.map(interaction => ({
          ...interaction,
          riskLevel: calculateContractRisk(interaction),
          riskScore: calculateRiskScore(interaction),
          recommendations: getRiskRecommendations(interaction)
        }));
        
        setInteractions(enhancedInteractions);
        
        if (enhancedInteractions.length === 0) {
          addNotification({
            type: 'info',
            title: 'No Contract Interactions',
            message: 'No recent contract interactions found for this wallet.'
          });
        } else {
          addNotification({
            type: 'success',
            title: 'Real Data Loaded',
            message: `Found ${enhancedInteractions.length} contract interactions from blockchain`
          });
        }
      } else {
        throw new Error('No interaction data received from backend');
      }
      
    } catch (error) {
      console.error('❌ Fetch real data error:', error);
      
      // Fallback: Try alternative endpoint
      await tryAlternativeDataSources();
    } finally {
      setLoading(false);
    }
  };

  // Alternative data sources if main endpoint fails
  const tryAlternativeDataSources = async () => {
    try {
      console.log('🔄 Trying alternative data sources...');
      
      // Try basic transactions endpoint as fallback
      const response = await axios.get(
        `${backendURL}/api/alchemy/transactions/${walletAddress}`
      );
      
      if (response.data.success && response.data.transactions) {
        const transactions = response.data.transactions;
        
        // Process transactions to find contract interactions
        const contractInteractions = {};
        
        transactions.forEach(tx => {
          if (tx.to && tx.to !== walletAddress.toLowerCase() && tx.input && tx.input !== '0x') {
            const contractAddress = tx.to.toLowerCase();
            
            if (!contractInteractions[contractAddress]) {
              contractInteractions[contractAddress] = {
                address: contractAddress,
                name: getContractName(contractAddress),
                type: analyzeTransactionType(tx),
                interactionCount: 0,
                lastInteraction: 0,
                totalValue: '0',
                transactions: []
              };
            }
            
            const interaction = contractInteractions[contractAddress];
            interaction.interactionCount += 1;
            interaction.transactions.push(tx);
            
            const txTimestamp = tx.timeStamp || Date.now();
            if (txTimestamp > interaction.lastInteraction) {
              interaction.lastInteraction = txTimestamp;
            }
            
            const value = parseFloat(tx.value || '0');
            interaction.totalValue = (parseFloat(interaction.totalValue) + value).toString();
          }
        });
        
        const interactionsArray = Object.values(contractInteractions).map(interaction => ({
          ...interaction,
          riskLevel: calculateContractRisk(interaction),
          riskScore: calculateRiskScore(interaction),
          recommendations: getRiskRecommendations(interaction)
        }));
        
        setInteractions(interactionsArray);
        
        if (interactionsArray.length > 0) {
          addNotification({
            type: 'info',
            title: 'Limited Data Available',
            message: 'Using basic transaction data (contract interactions may be incomplete)'
          });
        }
      }
    } catch (fallbackError) {
      console.error('❌ All data sources failed:', fallbackError);
      setInteractions([]);
      addNotification({
        type: 'error',
        title: 'Data Unavailable',
        message: 'Cannot connect to blockchain data service. Check backend and Alchemy configuration.'
      });
    }
  };

  // Get contract name from known addresses or backend
  const getContractName = (address) => {
    const knownContracts = {
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
      '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router',
      '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Permit2',
      '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'Wrapped ETH',
    };
    
    return knownContracts[address] || `Contract ${address.slice(0, 8)}...`;
  };

  const analyzeTransactionType = (tx) => {
    if (!tx.input || tx.input === '0x') return 'Transfer';
    
    // Basic function signature analysis
    const input = tx.input.toLowerCase();
    
    if (input.startsWith('0x7ff36ab5') || input.startsWith('0xfb3bdb41')) return 'DEX Swap';
    if (input.startsWith('0x095ea7b3')) return 'Token Approval';
    if (input.startsWith('0x23b872dd')) return 'NFT Transfer';
    if (input.startsWith('0x42842e0e')) return 'NFT Approval';
    
    return 'Contract Call';
  };

  const calculateContractRisk = (interaction) => {
    const score = calculateRiskScore(interaction);
    
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  const calculateRiskScore = (interaction) => {
    let score = 50; // Base score
    
    // High value transactions are riskier
    const totalValue = parseFloat(interaction.totalValue);
    if (totalValue > 10) score += 30;
    else if (totalValue > 1) score += 15;
    
    // Multiple interactions might indicate dependency
    if (interaction.interactionCount > 10) score += 10;
    
    // Unknown contracts are riskier
    if (interaction.name.startsWith('Contract 0x')) score += 15;
    
    return Math.min(score, 100);
  };

  const getRiskRecommendations = (interaction) => {
    if (interaction.riskLevel === 'high') {
      return ['Consider revoking token approvals', 'Monitor for unusual activity'];
    } else if (interaction.riskLevel === 'medium') {
      return ['Review token allowances', 'Monitor contract interactions'];
    }
    return ['No immediate action needed'];
  };

  // Check delegation status from backend
  const checkDelegationStatus = async () => {
    if (!walletAddress) return;
    
    try {
      const response = await axios.get(
        `${backendURL}/api/wallet/${walletAddress}/delegations`
      );
      
      if (response.data.success) {
        setDelegationStatus({
          isDelegated: response.data.delegations && response.data.delegations.length > 0,
          monitoringStatus: response.data.delegations && response.data.delegations.length > 0 ? "active" : "inactive"
        });
      }
    } catch (error) {
      console.log('Delegation status check failed, using local state');
      // Use localStorage as fallback
      const stored = localStorage.getItem(`smartguard_${walletAddress}`);
      setDelegationStatus({
        isDelegated: stored === 'active',
        monitoringStatus: stored === 'active' ? 'active' : 'inactive'
      });
    }
  };

  // Enable SmartGuard through backend
  const enableSmartGuard = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      // Since we don't have a specific enable-protection endpoint yet,
      // we'll use the delegation endpoint as a proxy
      const response = await axios.post(
        `${backendURL}/api/delegation`,
        {
          userAddress: walletAddress,
          contractAddress: process.env.SMARTGUARD_ADDRESS, // Use your SmartGuard contract
          duration: 2592000, // 30 days in seconds
          description: "Auto-revoke protection enabled"
        }
      );

      if (response.data.success) {
        setDelegationStatus({
          isDelegated: true,
          monitoringStatus: "active"
        });

        // Also store locally
        localStorage.setItem(`smartguard_${walletAddress}`, 'active');

        addNotification({
          type: 'success',
          title: 'SmartGuard Activated',
          message: 'Real-time contract monitoring enabled'
        });
      }
    } catch (error) {
      console.error('Enable SmartGuard error:', error);
      addNotification({
        type: 'error',
        title: 'Activation Failed',
        message: 'Backend service unavailable. Check server connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Real contract revocation through backend
  const revokeContractAccess = async (contractAddress) => {
    if (!walletAddress || !contractAddress) return;

    if (!confirm('This will revoke all token approvals for this contract. Continue?')) {
      return;
    }

    if (!signer) {
      addNotification({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to revoke contracts'
      });
      return;
    }

    setRevokeLoading(contractAddress);
    
    try {
      const response = await axios.post(
        `${backendURL}/api/revoke`,
        {
          userAddress: walletAddress,
          contractAddress: contractAddress
        }
      );

      if (response.data.success) {
        addNotification({
          type: 'success',
          title: 'Access Revoked',
          message: `Contract permissions revoked successfully`
        });

        // Remove from local list
        setInteractions(prev => prev.filter(i => i.address !== contractAddress));
      }
    } catch (error) {
      console.error('Revoke contract error:', error);
      addNotification({
        type: 'error',
        title: 'Revoke Failed',
        message: error.response?.data?.message || 'Failed to revoke contract access'
      });
    } finally {
      setRevokeLoading(null);
    }
  };

  const ignoreContract = async (contractAddress) => {
    if (!confirm('Remove this contract from monitoring?')) return;

    try {
      // Since we don't have a specific ignore-contract endpoint yet,
      // we'll handle this locally for now
      addNotification({
        type: 'success',
        title: 'Contract Ignored',
        message: 'Contract removed from monitoring list'
      });
      
      setInteractions(prev => prev.filter(i => i.address !== contractAddress));
    } catch (error) {
      console.error('Ignore contract error:', error);
      addNotification({
        type: 'error',
        title: 'Ignore Failed',
        message: 'Failed to ignore contract'
      });
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const viewOnExplorer = (hashOrAddress) => {
    window.open(`${MONAD_EXPLORER}/address/${hashOrAddress}`, '_blank');
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400">Connect your wallet to monitor contract interactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Auto-Revoke Manager
          </h1>
          <p className="text-gray-400 mt-1">
            Real blockchain data from {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchRealTransactionData}
          disabled={loading}
          className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Blockchain Data</span>
        </motion.button>
      </motion.div>

      {/* Protection Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl border ${
          delegationStatus.isDelegated
            ? 'bg-green-500/20 border-green-500/30'
            : 'bg-yellow-500/20 border-yellow-500/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${
              delegationStatus.isDelegated ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              {delegationStatus.isDelegated ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <Shield className="h-6 w-6 text-yellow-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {delegationStatus.isDelegated ? 'SmartGuard Active' : 'Enable SmartGuard'}
              </h3>
              <p className="text-gray-300">
                {delegationStatus.isDelegated 
                  ? 'Real-time contract monitoring with Alchemy API'
                  : 'Activate to monitor contract interactions with real blockchain data'
                }
              </p>
            </div>
          </div>
          
          {!delegationStatus.isDelegated && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={enableSmartGuard}
              disabled={loading}
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              <span>{loading ? 'Activating...' : 'Activate Protection'}</span>
            </motion.button>
          )}
        </div>

        {delegationStatus.isDelegated && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm">Alchemy API Active</span>
              </div>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-blue-400" />
                <span className="text-blue-400 text-sm">Real-time Monitoring</span>
              </div>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm">Threshold: {settings.riskThreshold}/100</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Real Contract Interactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center space-x-2">
            <Eye className="h-5 w-5 text-blue-400" />
            <span>Real Contract Interactions</span>
          </h3>
          <div className="text-sm text-gray-400">
            {interactions.length} contracts • Powered by Alchemy
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading real blockchain data...</p>
            <p className="text-gray-500 text-sm mt-2">Querying Alchemy API for transactions</p>
          </div>
        ) : interactions.length > 0 ? (
          <div className="space-y-4">
            {interactions.map((interaction, index) => (
              <motion.div
                key={interaction.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl border border-gray-600 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`w-3 h-3 rounded-full ${
                    interaction.riskLevel === 'high' ? 'bg-red-400' :
                    interaction.riskLevel === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="font-semibold text-white truncate">
                        {interaction.name}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getRiskColor(interaction.riskLevel)}`}>
                        {interaction.riskLevel} risk
                      </span>
                      <span className="text-xs text-gray-400">
                        Score: {interaction.riskScore}/100
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="font-mono flex items-center space-x-2">
                        <span>{interaction.address}</span>
                        <button 
                          onClick={() => viewOnExplorer(interaction.address)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                      <div>
                        Interactions: {interaction.interactionCount} • 
                        Last: {new Date(interaction.lastInteraction).toLocaleDateString()} • 
                        Total: {parseFloat(interaction.totalValue).toFixed(4)} MON
                      </div>
                      {interaction.recommendations && interaction.recommendations.length > 0 && (
                        <div className="text-yellow-400">
                          💡 {interaction.recommendations[0]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => revokeContractAccess(interaction.address)}
                    disabled={revokeLoading === interaction.address}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{revokeLoading === interaction.address ? 'Revoking...' : 'Revoke'}</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => ignoreContract(interaction.address)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                  >
                    <EyeOff className="h-4 w-4" />
                    <span>Ignore</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-300 mb-2">No Contract Interactions</h4>
            <p className="text-gray-400">
              No contract interactions found for this wallet address.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Make some transactions on Monad testnet to see them here.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              <p>Using Alchemy API for real blockchain data</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Settings Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6"
      >
        <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-400" />
          <span>Protection Settings</span>
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div>
              <div className="font-medium text-white">Auto-Revoke Enabled</div>
              <div className="text-gray-400 text-sm">Automatically revoke high-risk contracts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoRevokeEnabled}
                onChange={(e) => setSettings({...settings, autoRevokeEnabled: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div>
              <div className="font-medium text-white">Risk Threshold</div>
              <div className="text-gray-400 text-sm">Auto-revoke trigger level</div>
            </div>
            <select
              value={settings.riskThreshold}
              onChange={(e) => setSettings({...settings, riskThreshold: parseInt(e.target.value)})}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value={50}>Low (50+)</option>
              <option value={70}>Medium (70+)</option>
              <option value={85}>High (85+)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div>
              <div className="font-medium text-white">Monitor All Contracts</div>
              <div className="text-gray-400 text-sm">Track interactions with all contracts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.monitorAllContracts}
                onChange={(e) => setSettings({...settings, monitorAllContracts: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </motion.div>
    </div>
  );
}