import express from "express";
import { formatEther } from "viem";
import { isAddress } from "viem";
import { getPublicClient, getSmartGuardContract, getWalletClient } from "../services/contractService.js";

const router = express.Router();

// In-memory storage for automation rules (in production, use database)
const automationRules = new Map();

// ✅ POST /api/automation/rule - Create automation rule
router.post("/rule", async (req, res) => {
  try {
    const { wallet: userWallet, type, condition, action, parameters } = req.body;

    if (!userWallet || !type || !condition || !action) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: wallet, type, condition, action"
      });
    }

    if (!isAddress(userWallet)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address"
      });
    }

    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const rule = {
      id: ruleId,
      wallet: userWallet,
      type, // "balance", "time", "delegation"
      condition, // "below", "above", "after"
      action, // "revoke", "notify", "transfer"
      parameters,
      enabled: true,
      createdAt: new Date().toISOString(),
      lastTriggered: null
    };

    automationRules.set(ruleId, rule);

    console.log(`✅ Automation rule created: ${ruleId} for ${userWallet}`);

    res.json({
      success: true,
      ruleId,
      message: "Automation rule created successfully",
      rule
    });

  } catch (err) {
    console.error("❌ Automation rule creation error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create automation rule"
    });
  }
});

// ✅ GET /api/automation/rules/:address - Get automation rules for wallet
router.get("/rules/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address"
      });
    }

    const userRules = Array.from(automationRules.values())
      .filter(rule => rule.wallet.toLowerCase() === address.toLowerCase());

    res.json({
      success: true,
      rules: userRules,
      total: userRules.length
    });

  } catch (err) {
    console.error("❌ Get automation rules error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch automation rules"
    });
  }
});

// ✅ POST /api/automation/execute/:ruleId - Execute automation rule
router.post("/execute/:ruleId", async (req, res) => {
  try {
    const { ruleId } = req.params;
    const publicClient = getPublicClient();
    const smartGuardContract = getSmartGuardContract();

    const rule = automationRules.get(ruleId);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: "Automation rule not found"
      });
    }

    if (!rule.enabled) {
      return res.status(400).json({
        success: false,
        error: "Automation rule is disabled"
      });
    }

    console.log(`⚡ Executing automation rule: ${ruleId}`);

    // Check condition
    const conditionMet = await checkCondition(rule);
    
    if (conditionMet) {
      // Execute action
      const result = await executeAction(rule);
      
      rule.lastTriggered = new Date().toISOString();
      automationRules.set(ruleId, rule);

      res.json({
        success: true,
        message: "Automation rule executed successfully",
        ruleId,
        conditionMet: true,
        actionResult: result
      });
    } else {
      res.json({
        success: true,
        message: "Automation condition not met",
        ruleId,
        conditionMet: false
      });
    }

  } catch (err) {
    console.error("❌ Automation execution error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to execute automation rule"
    });
  }
});

// ✅ POST /api/automation/revoke-expired - Revoke expired delegations (batch)
router.post("/revoke-expired", async (req, res) => {
  try {
    const { wallets = [] } = req.body;
    const publicClient = getPublicClient();
    const smartGuardContract = getSmartGuardContract();
    const walletClient = getWalletClient();

    if (!walletClient) {
      return res.status(500).json({
        success: false,
        error: "Backend wallet not configured"
      });
    }

    const results = [];

    for (const userWallet of wallets) {
      if (isAddress(userWallet) && smartGuardContract) {
        try {
          const hash = await smartGuardContract.write.cleanupExpired([userWallet]);
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          
          results.push({
            wallet: userWallet,
            success: true,
            transactionHash: hash
          });
        } catch (err) {
          results.push({
            wallet: userWallet,
            success: false,
            error: err.message
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Processed ${wallets.length} wallets`,
      results
    });

  } catch (err) {
    console.error("❌ Batch revoke error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to revoke expired delegations"
    });
  }
});

// Helper functions
async function checkCondition(rule) {
  const publicClient = getPublicClient();
  const smartGuardContract = getSmartGuardContract();

  switch (rule.type) {
    case "balance":
      const balance = await publicClient.getBalance({ address: rule.wallet });
      const balanceEth = parseFloat(formatEther(balance));
      const threshold = parseFloat(rule.parameters.threshold || 0);
      
      if (rule.condition === "below") {
        return balanceEth < threshold;
      } else if (rule.condition === "above") {
        return balanceEth > threshold;
      }
      break;

    case "time":
      const targetTime = new Date(rule.parameters.targetTime);
      return new Date() > targetTime;

    case "delegation":
      // Check if any delegations are expired
      if (smartGuardContract) {
        try {
          const delegations = await smartGuardContract.read.getActiveDelegations([rule.wallet]);
          const now = Math.floor(Date.now() / 1000);
          return delegations.some(d => Number(d.expiresAt) <= now);
        } catch (error) {
          console.error("Error checking delegations:", error);
          return false;
        }
      }
      break;
  }

  return false;
}

async function executeAction(rule) {
  switch (rule.action) {
    case "revoke":
      // Revoke token approvals (simplified)
      console.log(`🔧 Would revoke approvals for ${rule.wallet}`);
      return { action: "revoke", executed: true };

    case "notify":
      // Send notification (simplified)
      console.log(`🔔 Would send notification for ${rule.wallet}`);
      return { action: "notify", executed: true };

    case "transfer":
      // Execute transfer (simplified)
      console.log(`💸 Would transfer funds for ${rule.wallet}`);
      return { action: "transfer", executed: true };

    default:
      return { action: rule.action, executed: false, error: "Unknown action" };
  }
}

export default router;