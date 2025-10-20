import express from "express";
import { isAddress, formatEther, parseEther, formatUnits, parseUnits } from "viem";
import { getSmartGuardContract, getPublicClient, getWalletClient } from "../services/contractService.js";

const router = express.Router();

// In-memory storage for DCA plans (in production, use database)
const dcaPlansDB = new Map();
let dcaIdCounter = 1;

// Known DEX routers on Monad
const KNOWN_DEX_ROUTERS = {
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Protocol'
};

// Common tokens on Monad
const KNOWN_TOKENS = {
  '0x0000000000000000000000000000000000000000': { symbol: 'MON', name: 'Monad', decimals: 18 },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { symbol: 'UNI', name: 'Uniswap', decimals: 18 },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', name: 'USD Coin', decimals: 6 }
};

// ✅ POST /api/dca/create - Create a new DCA plan
router.post("/create", async (req, res) => {
  try {
    const { 
      userAddress, 
      tokenAddress, 
      amountPerInterval, 
      interval, 
      maxTotalAmount, 
      description,
      dexRouter 
    } = req.body;

    const smartGuardContract = getSmartGuardContract();
    const walletClient = getWalletClient();

    if (!userAddress || !tokenAddress || !amountPerInterval || !interval || !maxTotalAmount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userAddress, tokenAddress, amountPerInterval, interval, maxTotalAmount"
      });
    }

    if (!isAddress(userAddress) || !isAddress(tokenAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address format"
      });
    }

    const dcaId = dcaIdCounter++;
    const nextExecution = Math.floor(Date.now() / 1000) + parseInt(interval);
    
    // Store in memory
    const dcaPlan = {
      id: dcaId,
      userAddress,
      tokenAddress: tokenAddress.toLowerCase(),
      amountPerInterval: parseEther(amountPerInterval.toString()),
      interval: parseInt(interval),
      maxTotalAmount: parseEther(maxTotalAmount.toString()),
      totalSpent: 0n,
      nextExecution,
      createdAt: Math.floor(Date.now() / 1000),
      isActive: true,
      description: description || `DCA for ${getTokenSymbol(tokenAddress)}`,
      dexRouter: dexRouter || '0x7a250d5630b4cf539739df2c5dacb4c659f2488d' // Default Uniswap V2
    };

    dcaPlansDB.set(dcaId, dcaPlan);

    // Try to call real contract if available
    if (smartGuardContract && walletClient) {
      try {
        const hash = await smartGuardContract.write.createDCAPlan([
          userAddress,
          tokenAddress,
          parseEther(amountPerInterval.toString()),
          BigInt(interval),
          parseEther(maxTotalAmount.toString()),
          description || `DCA for ${getTokenSymbol(tokenAddress)}`
        ]);
        console.log("✅ DCA plan created on contract, TX:", hash);
      } catch (contractError) {
        console.log("Contract call failed, using simulated DCA:", contractError.message);
      }
    }

    res.json({
      success: true,
      message: "DCA plan created successfully",
      dcaPlan: {
        id: dcaId,
        tokenAddress,
        tokenSymbol: getTokenSymbol(tokenAddress),
        amountPerInterval: formatEther(dcaPlan.amountPerInterval),
        interval: formatInterval(interval),
        maxTotalAmount: formatEther(dcaPlan.maxTotalAmount),
        nextExecution: new Date(nextExecution * 1000).toISOString(),
        description: dcaPlan.description,
        dex: getDexName(dcaPlan.dexRouter)
      }
    });

  } catch (error) {
    console.error("Create DCA error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create DCA plan"
    });
  }
});

// ✅ GET /api/dca/plans/:userAddress - Get all DCA plans for a user
router.get("/plans/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;
    const smartGuardContract = getSmartGuardContract();

    if (!isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address"
      });
    }

    let dcaPlans = [];

    // Try to get from contract first
    if (smartGuardContract) {
      try {
        const contractPlans = await smartGuardContract.read.getActiveDCAPlans([userAddress]);
        dcaPlans = contractPlans.map(plan => ({
          id: Number(plan.id),
          tokenAddress: plan.tokenAddress,
          tokenSymbol: getTokenSymbol(plan.tokenAddress),
          amountPerInterval: formatEther(plan.amountPerInterval),
          interval: formatInterval(Number(plan.interval)),
          maxTotalAmount: formatEther(plan.maxTotalAmount),
          totalSpent: formatEther(plan.totalSpent),
          nextExecution: new Date(Number(plan.nextExecution) * 1000).toISOString(),
          createdAt: new Date(Number(plan.createdAt) * 1000).toISOString(),
          isActive: plan.isActive,
          description: plan.description,
          progress: calculateProgress(plan.totalSpent, plan.maxTotalAmount)
        }));
      } catch (contractError) {
        console.log("Contract call failed, using memory storage:", contractError.message);
      }
    }

    // Fallback to memory storage
    if (dcaPlans.length === 0) {
      for (let [id, plan] of dcaPlansDB) {
        if (plan.userAddress.toLowerCase() === userAddress.toLowerCase() && plan.isActive) {
          dcaPlans.push({
            id: plan.id,
            tokenAddress: plan.tokenAddress,
            tokenSymbol: getTokenSymbol(plan.tokenAddress),
            amountPerInterval: formatEther(plan.amountPerInterval),
            interval: formatInterval(plan.interval),
            maxTotalAmount: formatEther(plan.maxTotalAmount),
            totalSpent: formatEther(plan.totalSpent),
            nextExecution: new Date(plan.nextExecution * 1000).toISOString(),
            createdAt: new Date(plan.createdAt * 1000).toISOString(),
            isActive: plan.isActive,
            description: plan.description,
            progress: calculateProgress(plan.totalSpent, plan.maxTotalAmount),
            dex: getDexName(plan.dexRouter)
          });
        }
      }
    }

    // Simulate some execution history
    const plansWithHistory = dcaPlans.map(plan => ({
      ...plan,
      executionHistory: generateMockExecutionHistory(plan),
      nextBuyIn: calculateTimeUntilNextExecution(plan.nextExecution)
    }));

    res.json({
      success: true,
      dcaPlans: plansWithHistory,
      total: plansWithHistory.length,
      active: plansWithHistory.filter(p => p.isActive).length,
      totalValue: plansWithHistory.reduce((sum, plan) => sum + parseFloat(plan.totalSpent), 0).toFixed(4)
    });

  } catch (error) {
    console.error("Get DCA plans error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch DCA plans"
    });
  }
});

// ✅ POST /api/dca/execute/:dcaId - Execute a DCA purchase
router.post("/execute/:dcaId", async (req, res) => {
  try {
    const { dcaId } = req.params;
    const smartGuardContract = getSmartGuardContract();
    const publicClient = getPublicClient();

    const dcaPlan = dcaPlansDB.get(parseInt(dcaId));
    
    if (!dcaPlan) {
      return res.status(404).json({
        success: false,
        message: "DCA plan not found"
      });
    }

    if (!dcaPlan.isActive) {
      return res.status(400).json({
        success: false,
        message: "DCA plan is not active"
      });
    }

    // Simulate DCA execution (swap MON for target token)
    const swapResult = await simulateDCAExecution(dcaPlan);

    // Update plan in memory
    dcaPlan.totalSpent += dcaPlan.amountPerInterval;
    dcaPlan.nextExecution = Math.floor(Date.now() / 1000) + dcaPlan.interval;
    
    // Check if max total amount reached
    if (dcaPlan.totalSpent >= dcaPlan.maxTotalAmount) {
      dcaPlan.isActive = false;
    }

    dcaPlansDB.set(parseInt(dcaId), dcaPlan);

    // Try to execute on contract
    if (smartGuardContract) {
      try {
        const hash = await smartGuardContract.write.executeDCA([BigInt(dcaId)]);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("✅ DCA executed on contract, TX:", hash);
      } catch (contractError) {
        console.log("Contract execution failed:", contractError.message);
      }
    }

    res.json({
      success: true,
      message: "DCA executed successfully",
      execution: {
        dcaId: parseInt(dcaId),
        tokenBought: swapResult.tokenBought,
        amountSpent: formatEther(dcaPlan.amountPerInterval),
        tokenAmount: swapResult.amount,
        price: swapResult.price,
        timestamp: new Date().toISOString(),
        nextExecution: new Date(dcaPlan.nextExecution * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error("Execute DCA error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to execute DCA"
    });
  }
});

// ✅ POST /api/dca/cancel/:dcaId - Cancel a DCA plan
router.post("/cancel/:dcaId", async (req, res) => {
  try {
    const { dcaId } = req.params;
    const smartGuardContract = getSmartGuardContract();

    const dcaPlan = dcaPlansDB.get(parseInt(dcaId));
    
    if (!dcaPlan) {
      return res.status(404).json({
        success: false,
        message: "DCA plan not found"
      });
    }

    dcaPlan.isActive = false;
    dcaPlansDB.set(parseInt(dcaId), dcaPlan);

    // Try to cancel on contract
    if (smartGuardContract) {
      try {
        const hash = await smartGuardContract.write.cancelDCAPlan([BigInt(dcaId)]);
        console.log("✅ DCA cancelled on contract, TX:", hash);
      } catch (contractError) {
        console.log("Contract cancellation failed:", contractError.message);
      }
    }

    res.json({
      success: true,
      message: "DCA plan cancelled successfully",
      dcaId: parseInt(dcaId)
    });

  } catch (error) {
    console.error("Cancel DCA error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel DCA plan"
    });
  }
});

// ✅ GET /api/dca/tokens - Get list of supported tokens for DCA
router.get("/tokens", async (req, res) => {
  try {
    const tokens = Object.entries(KNOWN_TOKENS).map(([address, info]) => ({
      address,
      symbol: info.symbol,
      name: info.name,
      decimals: info.decimals
    }));

    res.json({
      success: true,
      tokens,
      dexRouters: Object.entries(KNOWN_DEX_ROUTERS).map(([address, name]) => ({
        address,
        name
      }))
    });
  } catch (error) {
    console.error("Get tokens error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch token list"
    });
  }
});

// Helper functions
function getTokenSymbol(tokenAddress) {
  const token = KNOWN_TOKENS[tokenAddress.toLowerCase()];
  return token ? token.symbol : 'UNKNOWN';
}

function getDexName(dexRouter) {
  return KNOWN_DEX_ROUTERS[dexRouter.toLowerCase()] || 'Unknown DEX';
}

function formatInterval(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}

function calculateProgress(totalSpent, maxTotalAmount) {
  if (typeof totalSpent === 'string') {
    totalSpent = parseFloat(totalSpent);
  }
  if (typeof maxTotalAmount === 'string') {
    maxTotalAmount = parseFloat(maxTotalAmount);
  }
  
  if (maxTotalAmount === 0) return 0;
  return Math.min(100, (totalSpent / maxTotalAmount) * 100);
}

function calculateTimeUntilNextExecution(nextExecution) {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = nextExecution - now;
  
  if (timeLeft <= 0) return "Now";
  
  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else {
    return `${hours}h`;
  }
}

function generateMockExecutionHistory(plan) {
  const history = [];
  const now = Math.floor(Date.now() / 1000);
  let timestamp = plan.createdAt;
  
  while (timestamp < now && history.length < 5) {
    history.push({
      timestamp: new Date(timestamp * 1000).toISOString(),
      amount: plan.amountPerInterval,
      price: (Math.random() * 0.1 + 0.01).toFixed(6), // Mock price
      tokensBought: (parseFloat(plan.amountPerInterval) / (Math.random() * 0.1 + 0.01)).toFixed(4)
    });
    timestamp += plan.interval;
  }
  
  return history;
}

async function simulateDCAExecution(dcaPlan) {
  // Simulate a DEX swap
  const mockPrice = Math.random() * 0.1 + 0.01; // Random price between 0.01 and 0.11
  const amountBought = parseFloat(formatEther(dcaPlan.amountPerInterval)) / mockPrice;
  
  return {
    tokenBought: getTokenSymbol(dcaPlan.tokenAddress),
    amount: amountBought.toFixed(6),
    price: mockPrice.toFixed(6)
  };
}

export default router;