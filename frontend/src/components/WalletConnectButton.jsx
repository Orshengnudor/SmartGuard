import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, LogOut, Copy, CheckCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function WalletConnectButton() {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { walletAddress, connected, setWallet, disconnectWallet } = useApp();

  // ✅ Properly detect MetaMask
  function getEthereumProvider() {
    if (typeof window === "undefined") return null;
    const { ethereum } = window;

    if (!ethereum) return null;

    if (ethereum.providers && ethereum.providers.length) {
      const metamaskProvider = ethereum.providers.find((p) => p.isMetaMask);
      if (metamaskProvider) return metamaskProvider;
      return ethereum.providers[0];
    }

    return ethereum;
  }

  // ✅ Monad Testnet configuration
  const MONAD_TESTNET_CONFIG = {
    chainId: "0x279F",
    chainName: "Monad Testnet",
    rpcUrls: ["https://testnet-rpc.monad.xyz/"],
    nativeCurrency: {
      name: "MON",
      symbol: "MON", 
      decimals: 18,
    },
    blockExplorerUrls: ["https://testnet.monadexplorer.com/"],
  };

  async function switchToMonadNetwork(ethProvider) {
    try {
      await ethProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MONAD_TESTNET_CONFIG.chainId }],
      });
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await ethProvider.request({
            method: "wallet_addEthereumChain",
            params: [MONAD_TESTNET_CONFIG],
          });
          return true;
        } catch (addError) {
          console.error("Failed to add Monad Testnet:", addError);
          throw new Error("Please add Monad Testnet to MetaMask manually");
        }
      } else {
        console.error("Failed to switch to Monad Testnet:", switchError);
        throw new Error("Please switch to Monad Testnet manually");
      }
    }
  }

  async function connectWallet() {
    try {
      setLoading(true);
      const ethProvider = getEthereumProvider();

      if (!ethProvider) {
        alert("Please install or enable MetaMask.");
        return;
      }

      // Request accounts
      await ethProvider.request({ method: "eth_requestAccounts" });
      
      // Switch to Monad Testnet
      await switchToMonadNetwork(ethProvider);
      
      // Get address
      const accounts = await ethProvider.request({ method: "eth_accounts" });
      const userAddress = accounts[0];

      if (userAddress) {
        setWallet(userAddress);
      }
      
    } catch (err) {
      console.error("❌ Wallet connection error:", err);
      alert(err.message || "Failed to connect wallet.");
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    disconnectWallet();
  }

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {connected ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-3"
          >
            {/* Connected Wallet Info */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl px-4 py-2"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              
              <button
                onClick={copyAddress}
                className="flex items-center space-x-2 group"
              >
                <span className="font-mono text-sm text-green-400">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDisconnect}
                className="p-1 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Disconnect"
              >
                <LogOut className="h-4 w-4 text-red-400" />
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={connectWallet}
            disabled={loading}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-4 py-2 rounded-xl font-medium text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Copy Success Tooltip */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded-lg whitespace-nowrap"
          >
            Address copied!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}