import fs from 'fs';
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { createPublicClient, createWalletClient, http, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { alchemy, AlchemyService } from "./services/alchemyClient.js"; // Import Alchemy SDK
import { setContracts } from "./services/contractService.js";

// ✅ Load environment variables early
dotenv.config();

const app = express();

// ✅ Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ✅ Viem client setup - Use RPC for core blockchain operations
const RPC_URL = process.env.RPC_URL;

// Create public client with RPC (for wallet operations, contract calls)
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL)
});

let walletClient;
let account;
let smartGuardContract;

// Test Alchemy SDK connection
async function testAlchemyConnection() {
  try {
    console.log(`🔗 Testing Alchemy SDK connection...`);
    if (!alchemy) {
      console.log("❌ Alchemy SDK not configured");
      return false;
    }
    
    // Test Alchemy connection by getting latest block
    const latestBlock = await alchemy.core.getBlockNumber();
    console.log(`✅ Alchemy SDK connected - Current block: ${latestBlock}`);
    return true;
  } catch (error) {
    console.log("❌ Alchemy SDK connection failed:", error.message);
    return false;
  }
}

// Load ABI from JSON file
function loadABI() {
  try {
    const contractPath = join(__dirname, 'contracts', 'SmartGuardV2.json');
    console.log(`📁 Loading ABI from: ${contractPath}`);
    
    const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    // Handle different ABI formats
    if (contractData.abi) {
      console.log(`✅ Loaded ABI with ${contractData.abi.length} items`);
      return contractData.abi;
    } else if (Array.isArray(contractData)) {
      console.log(`✅ Loaded ABI array with ${contractData.length} items`);
      return contractData;
    } else {
      throw new Error('Invalid ABI format in JSON file');
    }
  } catch (error) {
    console.error('❌ Failed to load ABI from file:', error.message);
    
    // Fallback to minimal ABI if file loading fails
    console.log('🔄 Using fallback minimal ABI');
    return [
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "contractAddr",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "duration",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          }
        ],
        "name": "addDelegation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "contractAddr",
            "type": "address"
          }
        ],
        "name": "removeDelegation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "name": "getActiveDelegations",
        "outputs": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "contractAddr",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "expiresAt",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "addedAt",
                "type": "uint256"
              },
              {
                "internalType": "string",
                "name": "description",
                "type": "string"
              },
              {
                "internalType": "bool",
                "name": "isActive",
                "type": "bool"
              }
            ],
            "internalType": "struct SmartGuardV2.Delegation[]",
            "name": "",
            "type": "tuple[]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];
  }
}

// Initialize wallet and contract if private key is available
async function initializeWalletAndContract() {
  if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== 'your_private_key_here') {
    try {
      // Test Alchemy SDK connection
      const alchemyConnected = await testAlchemyConnection();
      
      // Create account from private key
      account = privateKeyToAccount(process.env.PRIVATE_KEY);
      
      // Create wallet client with RPC
      walletClient = createWalletClient({
        account,
        chain: monadTestnet,
        transport: http(RPC_URL)
      });
      
      console.log(`✅ Wallet initialized:`, account.address);
      console.log(`🌐 Alchemy SDK: ${alchemyConnected ? 'Connected' : 'Not available'}`);
      
      // Load ABI from JSON file
      const contractABI = loadABI();
      
      // Create contract instance with viem
      smartGuardContract = getContract({
        address: process.env.SMARTGUARD_ADDRESS,
        abi: contractABI,
        client: { public: publicClient, wallet: walletClient }
      });
      
      console.log("✅ SmartGuardV2 contract initialized:", process.env.SMARTGUARD_ADDRESS);
      
      // ✅ CRUCIAL: Initialize the contract service with all clients
      setContracts(smartGuardContract, publicClient, walletClient, alchemy);
      console.log("✅ Contract service initialized with all clients");
      
    } catch (error) {
      console.error("❌ Wallet/contract initialization failed:", error.message);
    }
  } else {
    console.warn("⚠️ No private key configured - transaction features will be limited");
    // Still initialize contract service with public client and alchemy for read-only operations
    setContracts(null, publicClient, null, alchemy);
    console.log("✅ Contract service initialized in read-only mode");
  }
}

// ✅ Import and use routes
import delegationRoutes from "./routes/delegation.js";
import automationRoutes from "./routes/automation.js";
import riskRoutes from "./routes/risk.js";
import analyticsRoutes from "./routes/analytics.js";
import walletRoutes from "./routes/wallet.js";
import revokeRoutes from "./routes/revoke.js";
import reportRoutes from "./routes/report.js";
import threatRoutes from "./routes/threat.js";
import interactionRoutes from "./routes/interactions.js";
import alchemyRoutes from "./routes/alchemy.js";
import dcaRoutes from "./routes/dca.js";

// ✅ Register Routes
app.use("/api/delegation", delegationRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/revoke", revokeRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/threat", threatRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/alchemy", alchemyRoutes);
app.use("/api/dca", dcaRoutes);

// ✅ Health check with network status
app.get("/", async (req, res) => {
  try {
    const blockNumber = await publicClient.getBlockNumber();
    const chainId = await publicClient.getChainId();
    const alchemyConnected = !!alchemy;
    
    res.json({
      message: "🚀 SmartGuard Backend is Live and Healthy!",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      network: {
        name: "Monad Testnet",
        chainId: Number(chainId),
        blockNumber: Number(blockNumber),
        provider: "RPC + Alchemy SDK"
      },
      contracts: {
        smartGuardV2: process.env.SMARTGUARD_ADDRESS
      },
      status: walletClient ? "full" : "read-only",
      features: {
        alchemy: alchemyConnected,
        fastTransactions: alchemyConnected,
        tokenBalances: alchemyConnected,
        nftSupport: alchemyConnected
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Backend is live but cannot connect to blockchain",
      error: error.message
    });
  }
});

// ✅ Test endpoint for Alchemy SDK
app.get("/test-alchemy", async (req, res) => {
  try {
    if (!alchemy) {
      return res.json({
        status: 'not_configured',
        message: 'Alchemy SDK not configured - check ALCHEMY_API_KEY'
      });
    }

    const latestBlock = await alchemy.core.getBlockNumber();
    const alchemyConfig = alchemy.config;
    
    res.json({
      status: 'connected',
      alchemyNetwork: alchemyConfig.network,
      latestBlock: latestBlock,
      message: 'Alchemy SDK is working correctly'
    });
  } catch (error) {
    res.json({
      status: 'error',
      message: 'Alchemy SDK connection failed',
      error: error.message
    });
  }
});

// Add this debug endpoint to server.js
app.get("/debug/contract-status", async (req, res) => {
  try {
    const status = {
      contractAddress: process.env.SMARTGUARD_ADDRESS,
      contractInitialized: !!smartGuardContract,
      walletInitialized: !!walletClient,
      publicClientInitialized: !!publicClient,
      alchemyInitialized: !!alchemy
    };

    // Test contract call if initialized
    if (smartGuardContract) {
      try {
        const testAddress = "0x831bc1fea38edc8c191b5f696ee7dfb590527c58";
        const testDelegations = await smartGuardContract.read.getActiveDelegations([testAddress]);
        status.contractCallTest = "success";
        status.testDelegationsCount = testDelegations.length;
      } catch (error) {
        status.contractCallTest = "failed";
        status.contractError = error.message;
      }
    }

    res.json(status);
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Add a debug endpoint for contract service status
app.get("/debug/contract-service-status", async (req, res) => {
  try {
    const { getSmartGuardContract, getPublicClient, getWalletClient, getAlchemy, isContractInitialized } = await import('./services/contractService.js');
    
    const status = {
      contractService: {
        contractAvailable: !!getSmartGuardContract(),
        publicClientAvailable: !!getPublicClient(),
        walletClientAvailable: !!getWalletClient(),
        alchemyAvailable: !!getAlchemy(),
        contractInitialized: isContractInitialized()
      },
      serverState: {
        contractInitialized: !!smartGuardContract,
        walletInitialized: !!walletClient,
        publicClientInitialized: !!publicClient,
        alchemyInitialized: !!alchemy
      }
    };

    res.json(status);
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Debug endpoint to test contract calls directly
app.get("/debug/test-delegations/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const smartGuardContract = getSmartGuardContract();
    
    if (!smartGuardContract) {
      return res.json({ error: "Contract not available" });
    }
    
    console.log(`🔍 Testing contract call for: ${address}`);
    const delegations = await smartGuardContract.read.getActiveDelegations([address]);
    
    res.json({
      address,
      contractAvailable: true,
      delegationsCount: delegations.length,
      rawDelegations: delegations,
      processedDelegations: delegations.map(d => ({
        contractAddr: d.contractAddr,
        expiresAt: Number(d.expiresAt),
        addedAt: Number(d.addedAt),
        description: d.description,
        isActive: d.isActive
      }))
    });
  } catch (error) {
    res.json({ 
      error: error.message,
      contractAvailable: false 
    });
  }
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    availableEndpoints: [
      "GET  /",
      "GET  /test-alchemy",
      "GET  /debug/contract-status",
      "GET  /debug/contract-service-status",
      "GET  /api/wallet/:address/activities",
      "GET  /api/wallet/:address/tokens",
      "GET  /api/wallet/:address/gas",
      "GET  /api/wallet/:address/delegations",
      "GET  /api/alchemy/transactions/:address",
      "GET  /api/alchemy/contract-interactions/:address",
      "GET  /api/interactions/:address",
      "POST /api/delegation",
      "POST /api/revoke",
      "POST /api/threat/report",
      "POST /api/interactions/:address/delegate",
      "POST /api/interactions/:address/revoke",
      "POST /api/interactions/:address/ignore",
      "GET  /api/report/:address"
    ]
  });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Backend Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ✅ Start Server with async initialization
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Initialize wallet and contract before starting server
    await initializeWalletAndContract();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ SmartGuard backend running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}`);
      console.log(`🌐 Connected to: ${RPC_URL}`);
      console.log(`📝 SmartGuard V2 Contract: ${process.env.SMARTGUARD_ADDRESS}`);
      console.log(`🔐 Wallet Status: ${walletClient ? 'Connected' : 'Read-only mode'}`);
      console.log(`🔧 Alchemy SDK: ${alchemy ? 'Available' : 'Not configured'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// ✅ Export clients and contract (keep for backward compatibility)
export { 
  publicClient, 
  walletClient, 
  account, 
  smartGuardContract,
  alchemy  // Export Alchemy SDK for use in routes
};