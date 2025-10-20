import express from "express";
import { isAddress, formatEther, formatUnits, parseUnits } from "viem";
import { getSmartGuardContract, getPublicClient } from "../services/contractService.js";

const router = express.Router();

// ✅ GET /api/wallet/:address/activities
router.get("/:address/activities", async (req, res) => {
  try {
    const { address } = req.params;
    const publicClient = getPublicClient();

    if (!isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    console.log(`🔍 Fetching transactions for: ${address}`);

    res.json({
      success: true,
      address,
      transactions: [],
      analytics: {
        riskScore: 0,
        transactionCount: 0,
        balance: "0",
        totalValue: "0",
        suspiciousInteractions: 0,
        threats: [],
      },
      nftActivity: [],
      note: "Transaction data temporarily unavailable",
    });
  } catch (err) {
    console.error("❌ Wallet activities error:", err);
    res.json({
      success: true,
      address: req.params.address,
      transactions: [],
      analytics: {
        riskScore: 0,
        transactionCount: 0,
        balance: "0",
        totalValue: "0",
        suspiciousInteractions: 0,
        threats: [],
      },
      nftActivity: [],
    });
  }
});

// ✅ GET /api/wallet/:address/tokens
router.get("/:address/tokens", async (req, res) => {
  try {
    const { address } = req.params;
    const publicClient = getPublicClient();

    if (!isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    console.log(`💰 Fetching balance for: ${address}`);

    const balance = await publicClient.getBalance({ address });
    const monBalance = formatEther(balance);

    console.log(`✅ MON Balance: ${monBalance} for ${address}`);

    const tokens = [
      {
        symbol: "MON",
        name: "Monad",
        balance: parseFloat(monBalance).toFixed(6),
        decimals: 18,
        value: (parseFloat(monBalance) * 0.1).toFixed(2),
        address: "native",
        price: "0.10",
      },
    ];

    res.json({
      success: true,
      address,
      tokens,
      totalValue: tokens
        .reduce((sum, token) => sum + parseFloat(token.value || 0), 0)
        .toFixed(2),
    });
  } catch (err) {
    console.error("❌ Tokens error:", err);
    res.json({
      success: true,
      address: req.params.address,
      tokens: [
        {
          symbol: "MON",
          name: "Monad",
          balance: "0.0000",
          decimals: 18,
          value: "0.00",
          address: "native",
          price: "0.10",
        },
      ],
      totalValue: "0.00",
    });
  }
});

// ✅ GET /api/wallet/:address/delegations
router.get("/:address/delegations", async (req, res) => {
  try {
    const { address } = req.params;
    const smartGuardContract = getSmartGuardContract();

    if (!isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    let delegations = [];
    let note = "";
    let source = "none";

    // Check if smartGuardContract is properly initialized
    if (!smartGuardContract) {
      console.log("⚠️ SmartGuard contract not available in wallet routes");
      return res.json({
        success: true,
        delegations: [],
        total: 0,
        active: 0,
        expired: 0,
        note: "Contract not available - please wait for initialization"
      });
    }

    try {
      console.log(`🔍 Fetching delegations from contract for: ${address}`);
      const realDelegations = await smartGuardContract.read.getActiveDelegations([address]);
      console.log(`📋 Raw delegations from contract:`, realDelegations);

      delegations = realDelegations
        .map((delegation) => {
          const expiresAt = Number(delegation.expiresAt);
          const now = Math.floor(Date.now() / 1000);
          const expiresIn = expiresAt - now;

          return {
            contractAddr: delegation.contractAddr,
            expiresAt,
            expiresIn:
              expiresIn > 0
                ? `${Math.floor(expiresIn / 3600)}h ${Math.floor((expiresIn % 3600) / 60)}m`
                : "Expired",
            status: expiresIn > 0 ? "Active" : "Expired",
            description: delegation.description || "No description",
            addedAt: Number(delegation.addedAt),
          };
        })
        .filter((d) => d.contractAddr !== "0x0000000000000000000000000000000000000000");
      
      note = `Found ${delegations.length} delegations from contract`;
      source = "contract";
      
    } catch (contractError) {
      console.log("❌ Contract call failed:", contractError.message);
      note = "Contract call failed: " + contractError.message;
      source = "error";
    }

    console.log(`📊 Wallet route returning ${delegations.length} delegations from ${source}`);

    res.json({
      success: true,
      delegations,
      total: delegations.length,
      active: delegations.filter((d) => d.status === "Active").length,
      expired: delegations.filter((d) => d.status === "Expired").length,
      note,
      source
    });
  } catch (err) {
    console.error("❌ Get delegations error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch delegations",
    });
  }
});

// ✅ GET /api/wallet/:address/gas
router.get("/:address/gas", async (req, res) => {
  try {
    const publicClient = getPublicClient();
    const feeData = await publicClient.getFeeHistory({ 
      blockCount: 1, 
      rewardPercentiles: [25, 50, 75] 
    });
    
    const gasPrice = feeData.baseFeePerGas?.[0] || parseUnits("2", "gwei");

    res.json({
      success: true,
      gasLimit: "21000",
      gasPrice: formatUnits(gasPrice, "gwei"),
      estimatedCost: formatEther(gasPrice * 21000n),
    });
  } catch (err) {
    console.error("❌ Gas info error:", err);
    res.json({
      success: true,
      gasLimit: "21000",
      gasPrice: "2.0",
      estimatedCost: "0.000042",
      note: "Using fallback gas data",
    });
  }
});

export default router;