import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./components/dashboard/Dashboard";
import RiskAnalysis from "./components/risk/RiskAnalysis";
import DelegationManager from "./components/delegation/DelegationManager";
import SecurityReport from "./components/reports/SecurityReport";
import TokenManager from "./components/tokens/TokenManager";
import Settings from "./components/settings/Settings";
import AutoRevokeManager from "./components/AutoRevokeManager";

// Context
import { AppProvider, useApp } from "./context/AppContext";

const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Main App Component
function AppContent() {
  const { 
    activeView, 
    walletAddress, 
    connected,
    setWalletData,
    loading,
    setLoading 
  } = useApp();

  // Fetch all wallet data
  const fetchAllData = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    setLoading(true);
    
    try {
      console.log(`🔍 Fetching comprehensive data for: ${walletAddress}`);

      const [
        activitiesRes, 
        tokensRes, 
        gasRes, 
        delegationRes,
        riskRes,
        analyticsRes
      ] = await Promise.allSettled([
        axios.get(`${backendURL}/api/wallet/${walletAddress}/activities`),
        axios.get(`${backendURL}/api/wallet/${walletAddress}/tokens`),
        axios.get(`${backendURL}/api/wallet/${walletAddress}/gas`),
        axios.get(`${backendURL}/api/wallet/${walletAddress}/delegations`),
        axios.get(`${backendURL}/api/risk/score/${walletAddress}`),
        axios.get(`${backendURL}/api/analytics/overview`)
      ]);

      // Process all responses
      const walletData = {
        activities: activitiesRes.status === 'fulfilled' ? activitiesRes.value.data : {},
        tokens: tokensRes.status === 'fulfilled' ? tokensRes.value.data : { tokens: [] },
        gas: gasRes.status === 'fulfilled' ? gasRes.value.data : {},
        delegations: delegationRes.status === 'fulfilled' ? delegationRes.value.data : { delegations: [] },
        risk: riskRes.status === 'fulfilled' ? riskRes.value.data : {},
        analytics: analyticsRes.status === 'fulfilled' ? analyticsRes.value.data : {}
      };

      setWalletData(walletData);
      toast.success("Wallet data loaded successfully");

    } catch (err) {
      console.error("❌ Comprehensive data fetch error:", err);
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when wallet connects
  useEffect(() => {
    if (connected && walletAddress) {
      fetchAllData();
    }
  }, [connected, walletAddress]);

  // Render active view
  const renderActiveView = () => {
    const views = {
      dashboard: <Dashboard onRefresh={fetchAllData} />,
      risk: <RiskAnalysis />,
      delegation: <DelegationManager />,
      autorevoke: <AutoRevokeManager />,
      tokens: <TokenManager />,
      reports: <SecurityReport />,
      settings: <Settings />
    };

    return views[activeView] || <Dashboard onRefresh={fetchAllData} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      
      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-20 pointer-events-none"></div>
      
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onRefresh={fetchAllData} />
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {renderActiveView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

// App Wrapper with Context
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}