// monadChain.js
import { createPublicClient, http, parseUnits } from "viem";
import { defineChain } from "viem/chains";

/**
 * Monad Testnet configuration for viem
 */

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",

  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },

  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
    public: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },

  blockExplorers: {
    default: {
      name: "MonadExplorer",
      url: "https://testnet.monadexplorer.com",
    },
  },

  testnet: true,
});

/**
 * ✅ Create viem public client for Monad Testnet
 */
export function createMonadClient(rpcUrl = null) {
  const url = rpcUrl || monadTestnet.rpcUrls.default.http[0];
  return createPublicClient({
    chain: monadTestnet,
    transport: http(url),
  });
}

/**
 * ✅ Get chain configuration for wallet connection (used in frontend)
 */
export function getChainConfig() {
  return {
    chainId: `0x${monadTestnet.id.toString(16)}`,
    chainName: monadTestnet.name,
    nativeCurrency: monadTestnet.nativeCurrency,
    rpcUrls: monadTestnet.rpcUrls.default.http,
    blockExplorerUrls: [monadTestnet.blockExplorers.default.url],
  };
}

/**
 * ✅ Validate if connected to Monad Testnet
 */
export function isMonadNetwork(chainId) {
  return parseInt(chainId) === monadTestnet.id;
}

/**
 * ✅ Get explorer URL for transactions, addresses, blocks, tokens
 */
export function getMonadExplorerUrl(type, value) {
  const baseUrl = monadTestnet.blockExplorers.default.url;

  switch (type) {
    case "transaction":
      return `${baseUrl}/tx/${value}`;
    case "address":
      return `${baseUrl}/address/${value}`;
    case "block":
      return `${baseUrl}/block/${value}`;
    case "token":
      return `${baseUrl}/token/${value}`;
    default:
      return baseUrl;
  }
}

/**
 * ✅ Network utilities & constants
 */
export const MONAD_UTILS = {
  // Gas configuration
  DEFAULT_GAS_LIMIT: 21000n,
  MAX_GAS_LIMIT: 3000000n,

  // Block time estimate
  BLOCK_TIME: 2, // seconds

  // Common contract addresses on Monad Testnet
  CONTRACTS: {
    MULTICALL: "0x0000000000000000000000000000000000000000", // Example placeholder
    WETH: "0x0000000000000000000000000000000000000000", // Example placeholder
  },

  // Token definitions
  TOKENS: {
    NATIVE: {
      symbol: "MON",
      name: "Monad",
      decimals: 18,
      address: "0x0000000000000000000000000000000000000000",
    },
  },

  // Helper to parse MON values to wei
  toWei(amount) {
    return parseUnits(amount.toString(), 18);
  },
};

export default {
  monadTestnet,
  createMonadClient,
  getChainConfig,
  isMonadNetwork,
  getMonadExplorerUrl,
  MONAD_UTILS,
};
