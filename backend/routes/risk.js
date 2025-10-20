import express from "express";
import { formatEther, isAddress } from "viem";
import { getPublicClient, getSmartGuardContract } from "../services/contractService.js";

const router = express.Router();

// Known risky addresses (in production, use external threat intelligence)
const RISKY_ADDRESSES = [
  "0x000000000000000000000000000000000000dead",
  "0xffffffffffffffffffffffffffffffffffffffff",
  "0x1234567890123456789012345678901234567890" // Example
];

// ✅ GET /api/risk/score/:address - Get risk score for wallet
router.get("/score/:address", async (req, res) => {
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

    const [balance, txCount, isContract] = await Promise.all([
      publicClient.getBalance({ address }),
      publicClient.getTransactionCount({ address }),
      isContractAddress(address)
    ]);

    // Get delegations if contract is available
    let delegations = [];
    if (smartGuardContract) {
      try {
        delegations = await smartGuardContract.read.getActiveDelegations([address]);
      } catch (err) {
        console.warn("Could not fetch delegations for risk assessment:", err.message);
      }
    }

    // Calculate risk score (0-100, higher = more risky)
    let riskScore = 0;
    const reasons = [];

    // Balance-based risk
    const balanceEth = parseFloat(formatEther(balance));
    if (balanceEth > 10) {
      riskScore += 20;
      reasons.push("High balance increases attack motivation");
    }

    // Activity-based risk
    if (txCount < 3) {
      riskScore += 15;
      reasons.push("Low transaction count - may be new or inactive");
    }

    // Contract check
    if (isContract) {
      riskScore += 10;
      reasons.push("Address is a contract - different risk profile");
    }

    // Delegation risk
    if (delegations.length > 0) {
      riskScore += delegations.length * 5;
      reasons.push(`${delegations.length} active delegations increase exposure`);
    }

    // Check against known risky addresses (simplified)
    const interactions = await checkRiskyInteractions(address);
    if (interactions.length > 0) {
      riskScore += interactions.length * 10;
      reasons.push(`Interacted with ${interactions.length} potentially risky addresses`);
    }

    riskScore = Math.min(100, riskScore);

    res.json({
      success: true,
      address,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      factors: {
        balance: balanceEth,
        transactionCount: txCount,
        isContract,
        activeDelegations: delegations.length,
        riskyInteractions: interactions.length
      },
      reasons,
      recommendations: getRiskRecommendations(riskScore)
    });

  } catch (err) {
    console.error("❌ Risk scoring error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to calculate risk score"
    });
  }
});

// ✅ POST /api/risk/analyze-transaction - Analyze transaction risk
router.post("/analyze-transaction", async (req, res) => {
  try {
    const { from, to, value, data } = req.body;
    const publicClient = getPublicClient();

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: "Missing from or to address"
      });
    }

    let riskScore = 0;
    const warnings = [];

    // Check if recipient is risky
    if (RISKY_ADDRESSES.includes(to.toLowerCase())) {
      riskScore += 80;
      warnings.push("Recipient address is flagged as potentially risky");
    }

    // Check value (if provided)
    if (value) {
      const valueEth = parseFloat(formatEther(BigInt(value)));
      if (valueEth > 1) {
        riskScore += 20;
        warnings.push("High value transaction");
      }
    }

    // Check if it's a contract interaction
    const toIsContract = await isContractAddress(to);
    if (toIsContract && data && data !== "0x") {
      riskScore += 15;
      warnings.push("Contract interaction detected");
    }

    riskScore = Math.min(100, riskScore);

    res.json({
      success: true,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      warnings,
      shouldProceed: riskScore < 70,
      analysis: {
        from,
        to,
        toIsContract,
        value: value ? formatEther(BigInt(value)) : "0",
        isContractInteraction: toIsContract && data && data !== "0x"
      }
    });

  } catch (err) {
    console.error("❌ Transaction analysis error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to analyze transaction"
    });
  }
});

// Helper functions
async function isContractAddress(address) {
  try {
    const publicClient = getPublicClient();
    const code = await publicClient.getCode({ address });
    return code !== "0x";
  } catch {
    return false;
  }
}

async function checkRiskyInteractions(address) {
  // Simplified check - in production, query transaction history
  const interactions = [];
  
  // Mock: 20% chance of having interacted with a risky address
  if (Math.random() < 0.2) {
    interactions.push(RISKY_ADDRESSES[0]);
  }
  
  return interactions;
}

function getRiskLevel(score) {
  if (score >= 70) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function getRiskRecommendations(score) {
  if (score >= 70) {
    return [
      "Review transaction carefully before proceeding",
      "Consider using a different recipient address",
      "Verify contract address on block explorer"
    ];
  } else if (score >= 30) {
    return [
      "Proceed with caution",
      "Double-check recipient address",
      "Consider splitting large transactions"
    ];
  } else {
    return [
      "Transaction appears safe",
      "Always verify addresses before sending"
    ];
  }
}

// ✅ ADD THIS - Default export
export default router;