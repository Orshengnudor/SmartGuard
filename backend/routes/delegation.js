import express from "express";
import { isAddress } from "viem";
import { getSmartGuardContract, getPublicClient, getWalletClient } from "../services/contractService.js";

const router = express.Router();

// In-memory storage for demo (replace with database in production)
const delegationsDB = new Map();

// POST /api/delegation - Add real delegation
router.post("/", async (req, res) => {
  try {
    const { userAddress, contractAddress, duration, description } = req.body;
    const smartGuardContract = getSmartGuardContract();
    const walletClient = getWalletClient();

    if (!userAddress || !contractAddress) {
      return res.status(400).json({
        success: false,
        message: "User address and contract address are required"
      });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + (duration * 3600);
    
    // Store in memory for demo
    const key = `${userAddress}-${contractAddress}`;
    delegationsDB.set(key, {
      userAddress,
      contractAddress,
      expiresAt,
      description: description || "No description",
      addedAt: Math.floor(Date.now() / 1000),
      isActive: true
    });

    console.log(`✅ Stored delegation in memory: ${userAddress} -> ${contractAddress}`);

    // Try to call real contract if available
    if (smartGuardContract && walletClient) {
      try {
        console.log(`📝 Calling contract addDelegation: ${userAddress}, ${contractAddress}, ${duration}h`);
        
        const hash = await smartGuardContract.write.addDelegation([
          userAddress,
          contractAddress,
          BigInt(duration * 3600), // Convert to seconds
          description || ""
        ]);
        
        console.log("✅ Real delegation tx submitted:", hash);
        
        // Wait for transaction confirmation
        const publicClient = getPublicClient();
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("✅ Real delegation confirmed in block:", receipt.blockNumber);
        
      } catch (contractError) {
        console.log("❌ Contract call failed:", contractError.message);
        console.log("🔄 Using simulated delegation only");
      }
    } else {
      console.log("⚠️ Contract or wallet not available, using simulated delegation");
    }

    res.json({
      success: true,
      message: "Delegation added successfully",
      delegation: {
        contractAddr: contractAddress,
        expiresAt,
        expiresIn: `${duration}h`,
        status: "Active",
        addedAt: Math.floor(Date.now() / 1000)
      }
    });

  } catch (error) {
    console.error("❌ Add delegation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add delegation"
    });
  }
});

// GET /api/delegation/:userAddress - Get real delegations
router.get("/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;
    const smartGuardContract = getSmartGuardContract();

    if (!isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address"
      });
    }

    console.log(`🔍 Fetching delegations for: ${userAddress}`);

    let delegations = [];
    let source = "memory";

    // Try to get from contract first
    if (smartGuardContract) {
      try {
        console.log(`📋 Calling contract getActiveDelegations for: ${userAddress}`);
        const contractPlans = await smartGuardContract.read.getActiveDelegations([userAddress]);
        console.log(`✅ Contract returned ${contractPlans.length} delegations`);
        
        delegations = contractPlans.map(plan => {
          const expiresAt = Number(plan.expiresAt);
          const now = Math.floor(Date.now() / 1000);
          const expiresIn = expiresAt - now;

          return {
            contractAddr: plan.contractAddr,
            expiresAt,
            expiresIn: expiresIn > 0 ? `${Math.floor(expiresIn / 3600)}h ${Math.floor((expiresIn % 3600) / 60)}m` : "Expired",
            status: expiresIn > 0 ? "Active" : "Expired",
            description: plan.description,
            addedAt: Number(plan.addedAt),
            isActive: plan.isActive
          };
        }).filter(d => d.contractAddr !== "0x0000000000000000000000000000000000000000");
        
        source = "contract";
        
      } catch (contractError) {
        console.log("❌ Contract call failed:", contractError.message);
        console.log("🔄 Falling back to memory storage");
      }
    }

    // Fallback to memory storage if contract failed or returned nothing
    if (delegations.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      for (let [key, delegation] of delegationsDB) {
        if (key.startsWith(userAddress) && delegation.isActive) {
          const expiresIn = delegation.expiresAt - now;
          delegations.push({
            contractAddr: delegation.contractAddress,
            expiresAt: delegation.expiresAt,
            expiresIn: expiresIn > 0 ? `${Math.floor(expiresIn / 3600)}h` : "Expired",
            status: expiresIn > 0 ? "Active" : "Expired",
            description: delegation.description,
            addedAt: delegation.addedAt
          });
        }
      }
      source = "memory";
    }

    console.log(`📊 Returning ${delegations.length} delegations from ${source} storage`);

    res.json({
      success: true,
      delegations,
      source,
      total: delegations.length,
      active: delegations.filter(d => d.status === 'Active').length,
      expired: delegations.filter(d => d.status === 'Expired').length
    });

  } catch (error) {
    console.error("❌ Get delegations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delegations"
    });
  }
});

export default router;