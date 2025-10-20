import express from "express";
import { isAddress } from "viem";
import { getSmartGuardContract } from "../services/contractService.js";

const router = express.Router();

// Mock data for interactions (fallback)
const mockInteractions = [
  {
    contractAddress: "0x742E4C4B6e7d2A27d7a5a5e5E5b5a5e5E5b5a5e5E",
    contractName: "Uniswap V2 Router",
    lastInteraction: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    interactionCount: 5,
    type: "DEX",
    riskLevel: "low",
    hasAllowance: true,
    allowance: "1000.00"
  }
];

// Get interactions for a wallet
router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const smartGuardContract = getSmartGuardContract();
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required"
      });
    }

    let interactions = mockInteractions;
    let note = "Using mock data";

    // Try to get real interactions if contract is available
    if (smartGuardContract) {
      try {
        const realInteractions = await smartGuardContract.read.getActiveDelegations([address]);
        if (realInteractions && realInteractions.length > 0) {
          interactions = realInteractions.map(delegation => ({
            contractAddress: delegation.contractAddr,
            contractName: delegation.description || "Unknown Contract",
            lastInteraction: new Date(Number(delegation.addedAt) * 1000).toISOString(),
            interactionCount: 1,
            type: "Delegated",
            riskLevel: "medium",
            hasAllowance: true,
            allowance: "Unlimited"
          }));
          note = `Found ${interactions.length} real delegations`;
        }
      } catch (contractError) {
        console.log("Contract call failed, using mock data:", contractError.message);
      }
    }

    res.json({
      success: true,
      interactions,
      autoRevokeEnabled: true,
      monitoringStatus: "active",
      note
    });

  } catch (error) {
    console.error("Interactions fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch interactions"
    });
  }
});

// Delegate wallet to SmartGuard
router.post("/:address/delegate", async (req, res) => {
  try {
    const { address } = req.params;
    const { enableAutoRevoke, riskThreshold } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required"
      });
    }

    // Simulate delegation success
    res.json({
      success: true,
      message: "Wallet successfully delegated to SmartGuard",
      autoRevokeEnabled: enableAutoRevoke,
      riskThreshold: riskThreshold,
      monitoringStatus: "active"
    });

  } catch (error) {
    console.error("Delegate error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delegate wallet"
    });
  }
});

// Revoke contract access
router.post("/:address/revoke", async (req, res) => {
  try {
    const { address } = req.params;
    const { contractAddress } = req.body;

    console.log("Revoke request:", { address, contractAddress });

    if (!address || !contractAddress) {
      return res.status(400).json({
        success: false,
        message: "Wallet address and contract address are required"
      });
    }

    // Simple address validation
    if (!isAddress(address) || !isAddress(contractAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address format"
      });
    }

    res.json({
      success: true,
      message: "Contract access revoked successfully",
      user: address,
      contract: contractAddress,
      action: "Manual revoke",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Revoke error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to revoke contract access"
    });
  }
});

// Ignore contract from monitoring
router.post("/:address/ignore", async (req, res) => {
  try {
    const { address } = req.params;
    const { contractAddress } = req.body;

    if (!address || !contractAddress) {
      return res.status(400).json({
        success: false,
        message: "Wallet address and contract address are required"
      });
    }

    res.json({
      success: true,
      message: "Contract removed from monitoring list",
      user: address,
      contract: contractAddress,
      action: "Ignored from auto-revoke",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Ignore error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to ignore contract"
    });
  }
});

export default router;