import express from "express";
import { getPublicClient, getAlchemy } from '../services/contractService.js';
import { isAddress, formatEther } from "viem";

const router = express.Router();

// ✅ GET /api/alchemy/transactions/:address - Get real transactions using Alchemy SDK
router.get("/transactions/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const publicClient = getPublicClient();
    const alchemy = getAlchemy();

    if (!isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    console.log(`🔍 Fetching transactions for: ${address}`);

    if (!alchemy) {
      // Fallback to basic RPC data
      const balance = await publicClient.getBalance({ address });
      const blockNumber = await publicClient.getBlockNumber();
      
      return res.json({
        success: true,
        address,
        balance: formatEther(balance),
        currentBlock: Number(blockNumber),
        transactions: [],
        note: "Alchemy not configured - using basic RPC data"
      });
    }

    try {
      // Use Alchemy SDK to get real transaction data - FIXED CATEGORIES for Monad
      const transactions = await alchemy.core.getAssetTransfers({
        fromAddress: address,
        category: ["external", "erc20", "erc721", "erc1155"], // REMOVED "internal" for Monad
        maxCount: 100
      });
      
      const balance = await publicClient.getBalance({ address });
      
      res.json({
        success: true,
        address,
        balance: formatEther(balance),
        transactions: transactions.transfers || [],
        total: transactions.transfers ? transactions.transfers.length : 0,
        note: "Real transaction data from Alchemy SDK"
      });
    } catch (alchemyError) {
      console.log("Alchemy specific error, using fallback:", alchemyError.message);
      // Fallback to basic RPC data
      const balance = await publicClient.getBalance({ address });
      const blockNumber = await publicClient.getBlockNumber();
      
      res.json({
        success: true,
        address,
        balance: formatEther(balance),
        currentBlock: Number(blockNumber),
        transactions: [],
        note: "Alchemy error - using basic RPC data"
      });
    }

  } catch (error) {
    console.error("❌ Transactions error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transactions",
      message: error.message
    });
  }
});

// ✅ GET /api/alchemy/contract-interactions/:address - Get contract interactions using Alchemy SDK
router.get("/contract-interactions/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const alchemy = getAlchemy();

    if (!isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    console.log(`🔍 Fetching contract interactions for: ${address}`);

    if (!alchemy) {
      return res.json({
        success: true,
        address,
        interactions: [],
        total: 0,
        note: "Alchemy not configured - contract interactions not available"
      });
    }

    try {
      // Use Alchemy SDK to get asset transfers (contract interactions) - FIXED CATEGORIES
      const assetTransfers = await alchemy.core.getAssetTransfers({
        fromAddress: address,
        category: ["external", "erc20", "erc721", "erc1155"], // REMOVED "internal" for Monad
        maxCount: 100
      });

      // Process transfers to find contract interactions
      const contractInteractions = processAlchemyTransfers(assetTransfers, address);
      
      res.json({
        success: true,
        address,
        interactions: contractInteractions,
        total: contractInteractions.length,
        note: "Contract interaction data from Alchemy SDK"
      });
    } catch (alchemyError) {
      console.log("Alchemy contract interactions error:", alchemyError.message);
      res.json({
        success: true,
        address,
        interactions: [],
        total: 0,
        note: "Alchemy error - contract interactions not available"
      });
    }

  } catch (error) {
    console.error("❌ Contract interactions error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch contract interactions",
      message: error.message
    });
  }
});

// Process Alchemy transfers to extract contract interactions
function processAlchemyTransfers(assetTransfers, userAddress) {
  const interactions = {};
  
  if (!assetTransfers.transfers) return [];
  
  assetTransfers.transfers.forEach(transfer => {
    // Look for contract interactions (not simple ETH transfers)
    if (transfer.to && transfer.to !== userAddress) {
      const contractAddress = transfer.to.toLowerCase();
      
      if (!interactions[contractAddress]) {
        interactions[contractAddress] = {
          address: contractAddress,
          name: getContractName(contractAddress),
          type: transfer.category || 'unknown',
          interactionCount: 0,
          lastInteraction: transfer.timeStamp ? parseInt(transfer.timeStamp) * 1000 : Date.now(),
          totalValue: '0',
          transactions: []
        };
      }
      
      const interaction = interactions[contractAddress];
      interaction.interactionCount += 1;
      interaction.transactions.push(transfer);
      
      // Update timestamp if this is more recent
      const txTimestamp = transfer.timeStamp ? parseInt(transfer.timeStamp) * 1000 : Date.now();
      if (txTimestamp > interaction.lastInteraction) {
        interaction.lastInteraction = txTimestamp;
      }
      
      // Add value
      if (transfer.value) {
        const value = parseFloat(transfer.value);
        interaction.totalValue = (parseFloat(interaction.totalValue) + value).toString();
      }
    }
  });
  
  return Object.values(interactions);
}

// Helper function to get contract names
function getContractName(address) {
  const knownContracts = {
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router',
    '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Permit2',
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
  };
  
  return knownContracts[address.toLowerCase()] || `Contract ${address.slice(0, 8)}...`;
}

export default router;