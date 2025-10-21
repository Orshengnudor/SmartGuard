import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Filter, Shield, ExternalLink, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import axios from 'axios';
import { createPublicClient, createWalletClient, custom, http, parseEther, formatEther } from 'viem';
import { monadTestnet } from 'viem/chains'; // or whichever chain you're using

const backendURL = import.meta.env.VITE_BACKEND_URL || "https://smartguard-backend.vercel.app";

// SmartGuard Contract ABI
const SMARTGUARD_ABI = [
  {
    name: 'removeDelegation',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'contractAddr', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'addDelegation',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'contractAddr', type: 'address' },
      { name: 'duration', type: 'uint256' },
      { name: 'description', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'cleanupExpired',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'getActiveDelegations',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address' }
    ],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'contractAddr', type: 'address' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'addedAt', type: 'uint256' },
          { name: 'description', type: 'string' },
          { name: 'isActive', type: 'bool' }
        ]
      }
    ],
    stateMutability: 'view'
  }
];

// Use environment variable for contract address
const SMARTGUARD_ADDRESS = import.meta.env.VITE_SMARTGUARD_ADDRESS;

// Validate contract address on import
if (!SMARTGUARD_ADDRESS) {
  console.error('❌ SmartGuard contract address not configured in environment variables');
}

export default function DelegationManager() {
  const { walletData, walletAddress, signer, addNotification } = useApp();
  const { delegations } = walletData;
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showThreatCheck, setShowThreatCheck] = useState(false);
  const [contractToCheck, setContractToCheck] = useState('');
  const [threatResult, setThreatResult] = useState(null);
  const [newDelegation, setNewDelegation] = useState({
    contract: '',
    expiresInHours: 24,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [checkingThreat, setCheckingThreat] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(null);

  const delegationList = delegations?.delegations || [];

  const filteredDelegations = delegationList.filter(delegation => {
    const matchesSearch = delegation.contractAddr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delegation.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'active' && delegation.status === 'Active') ||
      (filter === 'expired' && delegation.status === 'Expired');
    
    return matchesSearch && matchesFilter;
  });

  // Get wallet client for transactions
  const getWalletClient = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return createWalletClient({
        chain: monadTestnet, // Replace with your chain
        transport: custom(window.ethereum)
      });
    }
    return null;
  };

  // Get public client for read operations
  const getPublicClient = () => {
    return createPublicClient({
      chain: monadTestnet, // Replace with your chain
      transport: http()
    });
  };

  const checkContractSafety = async (contractAddress) => {
    if (!contractAddress) return;
    
    setCheckingThreat(true);
    try {
      const response = await axios.get(`${backendURL}/api/threat/check/${contractAddress}`);
      setThreatResult(response.data);
    } catch (error) {
      console.error('Threat check error:', error);
      setThreatResult({
        success: false,
        isThreat: false,
        reason: 'Unable to check contract safety'
      });
    } finally {
      setCheckingThreat(false);
    }
  };

  const handleAddDelegation = async () => {
    if (!newDelegation.contract) {
      alert('Please enter a contract address');
      return;
    }

    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    // Validate contract address
    if (!SMARTGUARD_ADDRESS) {
      addNotification({
        type: 'error',
        title: 'Configuration Error',
        message: 'SmartGuard contract address not configured'
      });
      return;
    }

    // Check contract safety first
    await checkContractSafety(newDelegation.contract);
    
    if (threatResult?.isThreat) {
      const proceed = confirm(`⚠️ WARNING: This contract is flagged as malicious!\n\nReason: ${threatResult.reason}\n\nAre you sure you want to proceed?`);
      if (!proceed) return;
    }

    setLoading(true);
    try {
      const walletClient = getWalletClient();
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      const [account] = await walletClient.getAddresses();
      if (!account) {
        throw new Error('No accounts available');
      }

      const durationInSeconds = parseInt(newDelegation.expiresInHours) * 3600;
      const description = newDelegation.description || `Delegation to ${newDelegation.contract.slice(0, 8)}...`;

      addNotification({
        type: 'info',
        title: 'Transaction Pending',
        message: 'Sending delegation transaction...'
      });

      // Viem transaction
      const hash = await walletClient.writeContract({
        address: SMARTGUARD_ADDRESS,
        abi: SMARTGUARD_ABI,
        functionName: 'addDelegation',
        args: [
          walletAddress,
          newDelegation.contract,
          BigInt(durationInSeconds),
          description
        ],
        account
      });

      addNotification({
        type: 'info',
        title: 'Transaction Sent',
        message: `Delegation transaction submitted: ${hash.slice(0, 10)}...`
      });

      // Wait for confirmation
      const publicClient = getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      addNotification({
        type: 'success',
        title: 'Delegation Added',
        message: `Delegation to ${newDelegation.contract.slice(0, 8)}... confirmed!`
      });

      // Reset form and close modal
      setShowAddModal(false);
      setNewDelegation({ contract: '', expiresInHours: 24, description: '' });
      setThreatResult(null);

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Add delegation error:', error);
      
      if (error.message.includes('User rejected')) {
        addNotification({
          type: 'error',
          title: 'Transaction Rejected',
          message: 'You rejected the delegation transaction'
        });
      } else if (error.message.includes('contract address')) {
        addNotification({
          type: 'error',
          title: 'Contract Error',
          message: 'Invalid SmartGuard contract configuration'
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Delegation Failed',
          message: error.message || 'Failed to add delegation'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRealRevoke = async (contractAddress) => {
    if (!walletAddress || !contractAddress) return;

    if (!confirm('This will send a blockchain transaction to revoke the delegation. Are you sure?')) {
      return;
    }

    // Validate contract address
    if (!SMARTGUARD_ADDRESS) {
      addNotification({
        type: 'error',
        title: 'Configuration Error',
        message: 'SmartGuard contract address not configured'
      });
      return;
    }

    setRevokeLoading(contractAddress);
    
    try {
      const walletClient = getWalletClient();
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      const [account] = await walletClient.getAddresses();
      if (!account) {
        throw new Error('No accounts available');
      }

      addNotification({
        type: 'info',
        title: 'Transaction Pending',
        message: 'Sending revoke transaction...'
      });

      // Viem transaction
      const hash = await walletClient.writeContract({
        address: SMARTGUARD_ADDRESS,
        abi: SMARTGUARD_ABI,
        functionName: 'removeDelegation',
        args: [walletAddress, contractAddress],
        account
      });

      addNotification({
        type: 'info',
        title: 'Transaction Sent',
        message: `Revoke transaction submitted: ${hash.slice(0, 10)}...`
      });

      // Wait for confirmation
      const publicClient = getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      addNotification({
        type: 'success',
        title: 'Delegation Revoked',
        message: `Contract access revoked successfully!`
      });

      // Refresh the page to show updated state
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Real revoke error:', error);
      
      if (error.message.includes('User rejected')) {
        addNotification({
          type: 'error',
          title: 'Transaction Rejected',
          message: 'You rejected the revoke transaction in MetaMask'
        });
      } else if (error.message.includes('insufficient funds')) {
        addNotification({
          type: 'error',
          title: 'Insufficient Funds',
          message: 'You need MON for gas fees to revoke'
        });
      } else if (error.message.includes('contract address')) {
        addNotification({
          type: 'error',
          title: 'Contract Error',
          message: 'Invalid SmartGuard contract configuration'
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Revoke Failed',
          message: error.message || 'Failed to revoke delegation'
        });
      }
    } finally {
      setRevokeLoading(null);
    }
  };

  const handleCleanupExpired = async () => {
    if (!confirm('This will send a blockchain transaction to clean up all expired delegations. Continue?')) return;

    // Validate contract address
    if (!SMARTGUARD_ADDRESS) {
      addNotification({
        type: 'error',
        title: 'Configuration Error',
        message: 'SmartGuard contract address not configured'
      });
      return;
    }

    setLoading(true);
    try {
      const walletClient = getWalletClient();
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      const [account] = await walletClient.getAddresses();
      if (!account) {
        throw new Error('No accounts available');
      }

      addNotification({
        type: 'info',
        title: 'Transaction Pending',
        message: 'Cleaning up expired delegations...'
      });

      // Viem transaction
      const hash = await walletClient.writeContract({
        address: SMARTGUARD_ADDRESS,
        abi: SMARTGUARD_ABI,
        functionName: 'cleanupExpired',
        args: [walletAddress],
        account
      });

      addNotification({
        type: 'info',
        title: 'Transaction Sent',
        message: `Cleanup transaction submitted: ${hash.slice(0, 10)}...`
      });

      // Wait for confirmation
      const publicClient = getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      addNotification({
        type: 'success',
        title: 'Cleanup Complete',
        message: 'Expired delegations cleaned up successfully!'
      });

      // Refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Cleanup error:', error);
      
      if (error.message.includes('User rejected')) {
        addNotification({
          type: 'error',
          title: 'Transaction Rejected',
          message: 'You rejected the cleanup transaction'
        });
      } else if (error.message.includes('contract address')) {
        addNotification({
          type: 'error',
          title: 'Contract Error',
          message: 'Invalid SmartGuard contract configuration'
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Cleanup Failed',
          message: error.message || 'Failed to clean up expired delegations'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Delegation Manager
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your contract delegations with real blockchain transactions
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowThreatCheck(true)}
            className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>Check Contract</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Delegation</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
          <div className="text-2xl font-bold text-white">{delegationList.length}</div>
          <div className="text-gray-400 text-sm">Total Delegations</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
          <div className="text-2xl font-bold text-green-400">
            {delegationList.filter(d => d.status === 'Active').length}
          </div>
          <div className="text-gray-400 text-sm">Active</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
          <div className="text-2xl font-bold text-red-400">
            {delegationList.filter(d => d.status === 'Expired').length}
          </div>
          <div className="text-gray-400 text-sm">Expired</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
          <div className="text-2xl font-bold text-purple-400">
            {delegations?.riskScore || 0}/100
          </div>
          <div className="text-gray-400 text-sm">Risk Score</div>
        </div>
      </div>

      {/* Action Buttons */}
      {delegationList.filter(d => d.status === 'Expired').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <button
            onClick={handleCleanupExpired}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Cleaning...' : '🧹 Cleanup Expired Delegations'}
          </button>
        </motion.div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by contract address or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Delegations</option>
          <option value="active">Active Only</option>
          <option value="expired">Expired Only</option>
        </select>
      </div>

      {/* Delegations List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden"
      >
        {filteredDelegations.length > 0 ? (
          <div className="divide-y divide-gray-700">
            {filteredDelegations.map((delegation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-3 h-3 rounded-full ${
                      delegation.status === 'Active' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-white flex items-center space-x-2 mb-1">
                        <span className="truncate">{delegation.contractAddr}</span>
                        <a 
                          href={`https://testnet.monadexplorer.com/address/${delegation.contractAddr}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      {delegation.description && (
                        <div className="text-xs text-gray-300 mb-1">
                          {delegation.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Added: {new Date(delegation.addedAt * 1000).toLocaleDateString()} • 
                        Expires: {delegation.expiresIn}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      delegation.status === 'Active' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {delegation.status}
                    </span>
                    
                    {delegation.status === 'Active' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRealRevoke(delegation.contractAddr)}
                        disabled={revokeLoading === delegation.contractAddr}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {revokeLoading === delegation.contractAddr ? 'Revoking...' : 'Revoke'}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No Delegations Found
            </h3>
            <p className="text-gray-400">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No delegations found for this wallet'
              }
            </p>
          </div>
        )}
      </motion.div>

      {/* Add Delegation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-bold mb-4">Add New Delegation</h3>
            
            {/* Threat Warning */}
            {threatResult?.isThreat && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">Security Warning</span>
                </div>
                <p className="text-red-300 text-sm mt-1">{threatResult.reason}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contract Address *
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={newDelegation.contract}
                  onChange={(e) => {
                    setNewDelegation({...newDelegation, contract: e.target.value});
                    setThreatResult(null);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => checkContractSafety(newDelegation.contract)}
                  disabled={!newDelegation.contract || checkingThreat}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  {checkingThreat ? 'Checking...' : '🔍 Check Contract Safety'}
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., DEX approval, NFT marketplace, etc."
                  value={newDelegation.description}
                  onChange={(e) => setNewDelegation({...newDelegation, description: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration (Hours) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={newDelegation.expiresInHours}
                  onChange={(e) => setNewDelegation({...newDelegation, expiresInHours: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Maximum: 30 days (720 hours)
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setThreatResult(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDelegation}
                disabled={loading || !newDelegation.contract}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Delegation'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Threat Check Modal */}
      {showThreatCheck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Shield className="h-5 w-5 text-yellow-400" />
              <span>Check Contract Safety</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contract Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={contractToCheck}
                  onChange={(e) => setContractToCheck(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {threatResult && (
                <div className={`p-3 rounded-lg border ${
                  threatResult.isThreat 
                    ? 'bg-red-500/20 border-red-500/30' 
                    : 'bg-green-500/20 border-green-500/30'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {threatResult.isThreat ? (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    ) : (
                      <Shield className="h-4 w-4 text-green-400" />
                    )}
                    <span className={`font-semibold ${
                      threatResult.isThreat ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {threatResult.isThreat ? 'Malicious Contract' : 'Contract Appears Safe'}
                    </span>
                  </div>
                  {threatResult.reason && (
                    <p className="text-sm text-gray-300">{threatResult.reason}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {threatResult.recommendation}
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowThreatCheck(false);
                  setThreatResult(null);
                  setContractToCheck('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => checkContractSafety(contractToCheck)}
                disabled={!contractToCheck || checkingThreat}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {checkingThreat ? 'Checking...' : 'Check Safety'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}