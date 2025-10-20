// backend/services/alchemyClient.js
import { Alchemy, Network } from "alchemy-sdk";
import dotenv from "dotenv";

dotenv.config();

// Load environment variables
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

if (!ALCHEMY_API_KEY) {
  console.warn("⚠️ Missing Alchemy API key - features may be limited");
}

// ✅ CORRECT Alchemy configuration for Monad Testnet
const config = {
  apiKey: ALCHEMY_API_KEY,
  network: Network.MONAD_TESTNET,
  // Add timeout settings
  requestTimeout: 10000,
  maxRetries: 2
};

export const alchemy = ALCHEMY_API_KEY ? new Alchemy(config) : null;

// Enhanced Alchemy service with Monad-specific fixes
export class AlchemyService {
  static async getTokenBalances(address) {
    if (!alchemy) {
      console.warn("Alchemy not configured, returning mock data");
      return this.getMockTokenBalances();
    }

    try {
      const balances = await alchemy.core.getTokenBalances(address);
      return balances;
    } catch (error) {
      console.error("Alchemy token balances error:", error);
      return this.getMockTokenBalances();
    }
  }

  static async getTransactions(address) {
    if (!alchemy) {
      return this.getMockTransactions(address);
    }

    try {
      // Use Monad-compatible categories (no "internal")
      const transactions = await alchemy.core.getAssetTransfers({
        fromAddress: address,
        category: ["external", "erc20", "erc721", "erc1155"], // No "internal" for Monad
        maxCount: 50
      });
      return transactions;
    } catch (error) {
      console.error("Alchemy transactions error:", error);
      return this.getMockTransactions(address);
    }
  }

  // ... rest of your existing mock methods ...
}

export default alchemy;