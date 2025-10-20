import express from "express";
import { formatEther, isAddress } from "viem";
import { getPublicClient, getSmartGuardContract } from "../services/contractService.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// ✅ GET /api/report/:address - Generate security report
router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const publicClient = getPublicClient();
    const smartGuardContract = getSmartGuardContract();

    if (!isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address"
      });
    }

    // Collect comprehensive wallet data
    const balance = await publicClient.getBalance({ address });
    const txCount = await publicClient.getTransactionCount({ address });
    
    // Get delegations if contract is available
    let delegations = [];
    let delegationNote = "";
    if (smartGuardContract) {
      try {
        delegations = await smartGuardContract.read.getActiveDelegations([address]);
        delegationNote = `Found ${delegations.length} active delegations`;
      } catch (err) {
        console.warn("Could not fetch delegations:", err.message);
        delegationNote = "Delegations unavailable";
      }
    } else {
      delegationNote = "Contract not initialized";
    }

    // Risk calculation
    const baseRisk = Math.min(100, Math.max(0, 50 - txCount));
    const balanceRisk = parseFloat(formatEther(balance)) > 10 ? 10 : 0;
    const delegationRisk = delegations.length * 5;
    
    const totalRiskScore = Math.min(100, baseRisk + balanceRisk + delegationRisk);

    // Generate report
    const reportData = {
      address,
      generatedAt: new Date().toISOString(),
      summary: {
        riskScore: totalRiskScore,
        riskLevel: totalRiskScore > 70 ? "High" : totalRiskScore > 30 ? "Medium" : "Low",
        transactionCount: txCount,
        balance: formatEther(balance),
        activeDelegations: delegations.length,
        status: totalRiskScore > 70 ? "Needs Attention" : "Secure",
        note: delegationNote
      },
      details: {
        walletInfo: {
          address,
          balance: formatEther(balance),
          transactionCount: txCount,
          isContract: await isContract(address)
        },
        riskFactors: [
          {
            factor: "Transaction History",
            score: Math.max(0, 50 - txCount),
            description: txCount < 5 ? "Low transaction count may indicate new wallet" : "Healthy transaction history"
          },
          {
            factor: "Balance",
            score: balanceRisk,
            description: parseFloat(formatEther(balance)) > 10 ? "High balance - increased risk" : "Reasonable balance"
          },
          {
            factor: "Active Delegations",
            score: delegationRisk,
            description: `${delegations.length} active contract delegations`
          }
        ],
        recommendations: totalRiskScore > 70 ? [
          "Review active delegations regularly",
          "Consider using hardware wallet for large balances",
          "Enable transaction signing confirmations"
        ] : [
          "Continue monitoring wallet activities",
          "Review delegations monthly",
          "Keep software updated"
        ]
      }
    };

    // Save report to file system
    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const fileName = `report_${address}_${Date.now()}.json`;
    const filePath = path.join(reportsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));

    res.json({
      success: true,
      ...reportData,
      downloadUrl: `/api/report/download/${fileName}`
    });

  } catch (err) {
    console.error("❌ Report generation error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to generate security report",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ GET /api/report/download/:filename - Download report
router.get("/download/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), "reports", filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Report not found"
      });
    }

    res.download(filePath, `smartguard-report-${Date.now()}.json`);
  } catch (err) {
    console.error("❌ Report download error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to download report"
    });
  }
});

// Helper function to check if address is a contract
async function isContract(address) {
  try {
    const publicClient = getPublicClient();
    const code = await publicClient.getCode({ address });
    return code !== "0x";
  } catch {
    return false;
  }
}

export default router;