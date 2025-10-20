import React from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, DollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function TokenManager() {
  const { walletData } = useApp();
  const { tokens } = walletData;

  const tokenList = tokens?.tokens || [];

  const totalValue = tokenList.reduce((sum, token) => sum + parseFloat(token.value || 0), 0);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Token Manager
          </h1>
          <p className="text-gray-400 mt-1">
            Overview of your token holdings and balances
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">${totalValue.toFixed(2)}</div>
          <div className="text-gray-400 text-sm">Total Value</div>
        </div>
      </motion.div>

      {/* Token List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden"
      >
        {tokenList.length > 0 ? (
          <div className="divide-y divide-gray-700">
            {tokenList.map((token, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <Coins className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{token.symbol}</div>
                      <div className="text-gray-400 text-sm">{token.name}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-white">{token.balance}</div>
                    {token.value && (
                      <div className="text-yellow-400 text-sm">${token.value}</div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Coins className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No Tokens Found
            </h3>
            <p className="text-gray-400">
              No token holdings detected for this wallet
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}