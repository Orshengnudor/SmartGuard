import express from "express";
import { formatEther } from "viem";
import { getPublicClient } from "../services/contractService.js";
import { isAddress } from "viem";

const router = express.Router();

// ✅ GET /api/analytics/overview - Platform analytics overview
router.get("/overview", async (req, res) => {
  try {
    const publicClient = getPublicClient();
    const currentBlock = await publicClient.getBlockNumber();
    const block = await publicClient.getBlock({ blockNumber: currentBlock });
    
    // Mock analytics data (in production, use database or indexer)
    const analytics = {
      platform: {
        totalUsers: 150,
        activeUsers: 47,
        totalDelegations: 89,
        revocationsToday: 12
      },
      network: {
        currentBlock: Number(currentBlock),
        blockTime: "2s",
        gasPrice: await getAverageGasPrice(),
        transactionsToday: 1250
      },
      security: {
        highRiskWallets: 8,
        mediumRiskWallets: 23,
        lowRiskWallets: 119,
        avgRiskScore: 34
      }
    };

    res.json({
      success: true,
      analytics,
      generatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Analytics error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics"
    });
  }
});

// ✅ GET /api/analytics/wallet/:address - Detailed wallet analytics
router.get("/wallet/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const publicClient = getPublicClient();

    if (!isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address"
      });
    }

    const balance = await publicClient.getBalance({ address });
    const txCount = await publicClient.getTransactionCount({ address });

    const walletAnalytics = {
      address,
      behavior: {
        transactionFrequency: txCount > 50 ? "High" : txCount > 10 ? "Medium" : "Low",
        balanceStability: "Stable", // Would need historical data
        interactionPattern: "Normal"
      },
      metrics: {
        totalTransactions: txCount,
        avgTransactionValue: "0.5 MON", // Mock data
        mostActiveHours: ["14:00-16:00", "20:00-22:00"], // Mock data
        commonInteractions: ["DeFi", "NFTs"] // Mock data
      },
      recommendations: [
        "Consider diversifying across multiple wallets",
        "Review token approvals monthly",
        "Use hardware wallet for large holdings"
      ]
    };

    res.json({
      success: true,
      ...walletAnalytics
    });

  } catch (err) {
    console.error("❌ Wallet analytics error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch wallet analytics"
    });
  }
});

async function getAverageGasPrice() {
  try {
    const publicClient = getPublicClient();
    const gasPrice = await publicClient.getGasPrice();
    return formatEther(gasPrice);
  } catch {
    return "2.0";
  }
}

export default router;