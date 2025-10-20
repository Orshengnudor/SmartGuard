// revokeLogic.js
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatUnits,
  http,
  isAddress,
  parseUnits,
  getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { provider, wallet } from "../server.js";

// ✅ Minimal ERC20 ABI
export const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
];

// ✅ Encode approve(spender, 0)
export function encodeErc20Revoke(spender) {
  try {
    return encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, 0n],
    });
  } catch (err) {
    console.error("encodeErc20Revoke error", err);
    throw err;
  }
}

// ✅ Execute revoke for a specific token and spender
export async function executeRevoke(tokenAddress, spender, userWallet) {
  try {
    if (!wallet) throw new Error("Backend wallet not configured");
    if (!isAddress(tokenAddress) || !isAddress(spender) || !isAddress(userWallet))
      throw new Error("Invalid address provided");

    const client = provider;

    const contract = getContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      client,
    });

    // Get current allowance
    const currentAllowance = await contract.read.allowance([userWallet, spender]);
    console.log(`🔍 Current allowance for ${tokenAddress}: ${formatUnits(currentAllowance, 18)}`);

    if (currentAllowance > 0n) {
      // Prepare backend wallet client
      const walletClient = createWalletClient({
        account: privateKeyToAccount(wallet.privateKey),
        transport: http(provider.transport.url),
      });

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, 0n],
      });

      console.log(`🔄 Revoking approval, tx: ${hash}`);

      const receipt = await client.waitForTransactionReceipt({ hash });

      console.log(`✅ Revoke confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: hash,
        token: tokenAddress,
        spender,
        user: userWallet,
        previousAllowance: formatUnits(currentAllowance, 18),
        newAllowance: "0",
        blockNumber: receipt.blockNumber,
      };
    } else {
      return {
        success: true,
        transactionHash: null,
        token: tokenAddress,
        spender,
        user: userWallet,
        previousAllowance: "0",
        newAllowance: "0",
        message: "No allowance to revoke",
      };
    }
  } catch (err) {
    console.error("❌ executeRevoke error:", err);
    throw new Error(err.shortMessage || err.message || "Failed to execute revoke");
  }
}

// ✅ Batch revoke multiple tokens
export async function executeBatchRevoke(revokeRequests) {
  if (!wallet) throw new Error("Backend wallet not configured");

  const results = [];

  for (const request of revokeRequests) {
    try {
      const result = await executeRevoke(request.tokenAddress, request.spender, request.userWallet);
      results.push({ ...result, requestId: request.id });
    } catch (error) {
      results.push({
        success: false,
        requestId: request.id,
        error: error.message,
        tokenAddress: request.tokenAddress,
        spender: request.spender,
      });
    }
  }

  return {
    success: true,
    results,
    total: revokeRequests.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  };
}

// ✅ Check token allowances for a wallet
export async function checkTokenAllowances(userWallet, tokenAddresses) {
  const allowances = [];

  for (const tokenAddress of tokenAddresses) {
    try {
      const contract = getContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        client: provider,
      });

      const [symbol, decimals, allowance] = await Promise.all([
        contract.read.symbol().catch(() => "UNKNOWN"),
        contract.read.decimals().catch(() => 18),
        contract.read.allowance([userWallet, wallet.address]).catch(() => 0n),
      ]);

      allowances.push({
        tokenAddress,
        symbol,
        decimals: Number(decimals),
        allowance: formatUnits(allowance, decimals),
        hasAllowance: allowance > 0n,
      });
    } catch (error) {
      console.warn(`Could not check allowance for ${tokenAddress}:`, error.message);
      allowances.push({
        tokenAddress,
        symbol: "UNKNOWN",
        decimals: 18,
        allowance: "0",
        hasAllowance: false,
        error: error.message,
      });
    }
  }

  return allowances;
}
