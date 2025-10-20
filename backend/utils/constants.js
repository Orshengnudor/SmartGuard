// constants.js
// Shared constants for SmartGuard application

// Environment
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// SmartGuard Contract
export const SMARTGUARD_ADDRESS = process.env.SMARTGUARD_ADDRESS || "0x3677d80f2eA60973779185b5373c612B62e960aD";

// Network Configuration
export const DEFAULT_CHAIN_ID = 10143; // Monad Testnet
export const RPC_URL = process.env.RPC_URL || "https://testnet-rpc.monad.xyz";
export const EXPLORER_URL = "https://testnet.monadexplorer.com";

// API Configuration
export const BACKEND_PORT = process.env.PORT || 5000;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Security Constants
export const MAX_DELEGATION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
export const MIN_DELEGATION_DURATION = 1 * 60 * 60; // 1 hour in seconds
export const MAX_BATCH_OPERATIONS = 50;
export const DEFAULT_GAS_LIMIT = 100000n;

// Risk Scoring
export const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 70,
  HIGH: 90
};

export const RISK_WEIGHTS = {
  BALANCE: 0.2,
  TRANSACTION_COUNT: 0.15,
  CONTRACT_INTERACTIONS: 0.25,
  DELEGATIONS: 0.2,
  REPUTATION: 0.2
};

// Automation
export const AUTOMATION_TYPES = {
  BALANCE: 'balance',
  TIME: 'time',
  DELEGATION: 'delegation',
  TRANSACTION: 'transaction'
};

export const AUTOMATION_ACTIONS = {
  REVOKE: 'revoke',
  NOTIFY: 'notify',
  TRANSFER: 'transfer',
  ALERT: 'alert'
};

// API Rate Limiting
export const RATE_LIMITS = {
  WALLET_ANALYTICS: 60, // requests per minute
  RISK_SCORING: 30,
  TRANSACTION_SUBMISSION: 10,
  REPORT_GENERATION: 5
};

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_ADDRESS: "Invalid address provided",
  CONTRACT_NOT_INITIALIZED: "Smart contract not initialized",
  INSUFFICIENT_FUNDS: "Insufficient funds for transaction",
  TRANSACTION_FAILED: "Transaction failed",
  RATE_LIMITED: "Rate limit exceeded",
  NETWORK_ERROR: "Network connection error",
  UNAUTHORIZED: "Unauthorized access"
};

// Success Messages
export const SUCCESS_MESSAGES = {
  DELEGATION_ADDED: "Delegation added successfully",
  REVOKE_SUCCESS: "Token approval revoked successfully",
  REPORT_GENERATED: "Security report generated successfully",
  AUTOMATION_CREATED: "Automation rule created successfully"
};

// Default Values
export const DEFAULTS = {
  DELEGATION_DURATION: 24 * 60 * 60, // 24 hours
  GAS_PRICE_MULTIPLIER: 1.2,
  CONFIRMATION_BLOCKS: 1,
  TIMEOUT_MS: 30000
};

// Export everything as a single object for easy importing
export default {
  NODE_ENV,
  IS_PRODUCTION,
  SMARTGUARD_ADDRESS,
  DEFAULT_CHAIN_ID,
  RPC_URL,
  EXPLORER_URL,
  BACKEND_PORT,
  FRONTEND_URL,
  MAX_DELEGATION_DURATION,
  MIN_DELEGATION_DURATION,
  MAX_BATCH_OPERATIONS,
  DEFAULT_GAS_LIMIT,
  RISK_THRESHOLDS,
  RISK_WEIGHTS,
  AUTOMATION_TYPES,
  AUTOMATION_ACTIONS,
  RATE_LIMITS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEFAULTS
};