// helpers.js
import { getAddress, isAddress, formatEther, parseEther } from "viem";
import constants from "./constants.js";

/**
 * Utility functions for SmartGuard backend (Monad network)
 */

// ✅ Normalize address to checksum format
export function normalizeAddr(address) {
  if (!address) return null;
  try {
    return getAddress(address.toLowerCase());
  } catch {
    return null;
  }
}

// ✅ Validate Monad address
export function isValidAddress(address) {
  return isAddress(address);
}

// ✅ Format MON (Ether equivalent) value with precision
export function formatMon(value, precision = 4) {
  try {
    if (!value) return "0";
    const formatted = formatEther(BigInt(value));
    return parseFloat(formatted).toFixed(precision);
  } catch {
    return "0";
  }
}

// ✅ Format large numbers with commas
export function formatNumber(number, decimals = 2) {
  if (!number) return "0";
  return parseFloat(number).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

// ✅ Calculate time until expiration
export function timeUntil(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (24 * 60 * 60));
  const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((diff % (60 * 60)) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ✅ Generate random hex string (for mock data)
export function randomHex(length = 64) {
  return (
    "0x" +
    Array.from({ length }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")
  );
}

// ✅ Sleep utility for async operations
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ Retry async function with exponential backoff
export async function retryAsync(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await sleep(delay);
    return retryAsync(fn, retries - 1, delay * 2);
  }
}

// ✅ Validate delegation parameters
export function validateDelegationParams(user, contract, expiresAt) {
  const errors = [];

  if (!isValidAddress(user)) {
    errors.push("Invalid user address");
  }

  if (!isValidAddress(contract)) {
    errors.push("Invalid contract address");
  }

  const now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now) {
    errors.push("Expiration must be in the future");
  }

  if (expiresAt > now + constants.MAX_DELEGATION_DURATION) {
    errors.push(
      `Delegation duration cannot exceed ${
        constants.MAX_DELEGATION_DURATION / (24 * 60 * 60)
      } days`
    );
  }

  return errors;
}

// ✅ Calculate risk level from score
export function getRiskLevel(score) {
  if (score >= constants.RISK_THRESHOLDS.HIGH) return "High";
  if (score >= constants.RISK_THRESHOLDS.MEDIUM) return "Medium";
  return "Low";
}

// ✅ Generate explorer URL for transaction (Monad testnet/mainnet)
export function getExplorerUrl(type, value) {
  const baseUrl = constants.EXPLORER_URL;

  switch (type) {
    case "transaction":
      return `${baseUrl}/tx/${value}`;
    case "address":
      return `${baseUrl}/address/${value}`;
    case "block":
      return `${baseUrl}/block/${value}`;
    default:
      return baseUrl;
  }
}

// ✅ Safe JSON parse with default
export function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

// ✅ Filter object properties
export function filterObject(obj, keys) {
  return keys.reduce((filtered, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      filtered[key] = obj[key];
    }
    return filtered;
  }, {});
}

// ✅ Generate unique ID
export function generateId(prefix = "") {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}${timestamp}_${random}`;
}

// ✅ Format bytes to human readable
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// ✅ Check if value is within range
export function isInRange(value, min, max) {
  return value >= min && value <= max;
}

// ✅ Debounce function for rate limiting
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default {
  normalizeAddr,
  isValidAddress,
  formatMon,
  formatNumber,
  timeUntil,
  randomHex,
  sleep,
  retryAsync,
  validateDelegationParams,
  getRiskLevel,
  getExplorerUrl,
  safeJsonParse,
  filterObject,
  generateId,
  formatBytes,
  isInRange,
  debounce,
};
