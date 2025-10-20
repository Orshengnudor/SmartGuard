// riskScoring.js
import {
  isAddress,
  formatEther,
  createPublicClient,
  http,
} from "viem";
import { provider } from "../server.js";

// 🧩 Known risky contract addresses (static or fetched from threat intel)
const KNOWN_RISKY_CONTRACTS = [
  "0x000000000000000000000000000000000000dead",
  "0xffffffffffffffffffffffffffffffffffffffff",
  "0x1234567890123456789012345678901234567890",
];

// 🧩 Contract reputation (mock data)
const CONTRACT_REPUTATION = {
  "0x742e4c4b6e7d2a27d7a5a5e5e5b5a5e5e5b5a5e5e": { risk: 20, category: "DeFi" },
  "0x852e4c4b6e7d2a27d7a5a5e5e5b5a5e5e5b5a5e5e": { risk: 60, category: "Gambling" },
  "0x962e4c4b6e7d2a27d7a5a5e5e5b5a5e5e5b5a5e5e": { risk: 80, category: "High-Risk" },
};

// ✅ Wallet risk scoring
export async function scoreWallet(address) {
  try {
    if (!isAddress(address)) throw new Error("Invalid wallet address");

    const [balance, txCount, isContract, code] = await Promise.all([
      provider.getBalance({ address }),
      provider.getTransactionCount({ address }),
      isContractAddress(address),
      provider.getCode({ address }),
    ]);

    let riskScore = 50;
    const riskFactors = [];
    const warnings = [];

    // 💰 Balance analysis
    const balanceEth = parseFloat(formatEther(balance));
    if (balanceEth === 0) {
      riskScore += 10;
      riskFactors.push("Zero balance");
    } else if (balanceEth > 10) {
      riskScore += 15;
      riskFactors.push("High balance");
    }

    // 🧾 Transaction history
    if (txCount === 0) {
      riskScore += 20;
      riskFactors.push("No transaction history");
      warnings.push("Wallet appears to be new or inactive");
    } else if (txCount < 3) {
      riskScore += 10;
      riskFactors.push("Low transaction count");
    }

    // 🧱 Contract check
    if (isContract) {
      riskScore -= 10;
      riskFactors.push("Contract address");
    }

    // ⚙️ Contract code risk
    if (isContract && code !== "0x") {
      const codeRisk = analyzeContractCode(code);
      riskScore += codeRisk.score;
      if (codeRisk.factors.length > 0) riskFactors.push(...codeRisk.factors);
    }

    // ⚠️ Risky interactions
    const interactions = await checkRiskyInteractions(address);
    if (interactions.length > 0) {
      riskScore += interactions.length * 15;
      riskFactors.push(`Interacted with ${interactions.length} risky contracts`);
      warnings.push(`Found interactions with risky contracts: ${interactions.join(", ")}`);
    }

    // 🧮 Normalize 0–100
    riskScore = Math.max(0, Math.min(100, riskScore));

    return {
      riskScore: Math.round(riskScore),
      riskLevel: getRiskLevel(riskScore),
      factors: riskFactors,
      warnings,
      details: {
        balance: balanceEth,
        transactionCount: txCount,
        isContract,
        riskyInteractions: interactions.length,
        codeComplexity: isContract ? analyzeCodeComplexity(code) : null,
      },
      recommendations: generateRecommendations(riskScore, riskFactors),
    };
  } catch (err) {
    console.error("❌ Wallet risk scoring error:", err);
    throw new Error(`Failed to score wallet: ${err.message}`);
  }
}

// ✅ Contract scoring
export async function scoreContract(contractAddress) {
  try {
    if (!isAddress(contractAddress)) throw new Error("Invalid contract address");

    const [code, isContract] = await Promise.all([
      provider.getCode({ address: contractAddress }),
      isContractAddress(contractAddress),
    ]);

    if (!isContract || code === "0x") {
      return {
        contract: contractAddress,
        score: 0,
        riskLevel: "Unknown",
        reasons: ["Not a contract or no code"],
        verified: false,
      };
    }

    let riskScore = 50;
    const reasons = [];
    const analysis = analyzeContractCode(code);

    riskScore += analysis.score;
    reasons.push(...analysis.factors);

    const lowerAddress = contractAddress.toLowerCase();

    // Known risky or reputational contract
    if (KNOWN_RISKY_CONTRACTS.includes(lowerAddress)) {
      riskScore = 100;
      reasons.push("Flagged as known risky contract");
    } else if (CONTRACT_REPUTATION[lowerAddress]) {
      const reputation = CONTRACT_REPUTATION[lowerAddress];
      riskScore = Math.max(riskScore, reputation.risk);
      reasons.push(`Categorized as ${reputation.category}`);
    }

    riskScore = Math.max(0, Math.min(100, riskScore));

    return {
      contract: contractAddress,
      score: Math.round(riskScore),
      riskLevel: getRiskLevel(riskScore),
      reasons,
      verified: false,
      analysis: {
        codeSize: code.length,
        hasComplexLogic: analysis.hasComplexLogic,
        potentialRisks: analysis.potentialRisks,
      },
    };
  } catch (err) {
    console.error("❌ Contract risk scoring error:", err);
    throw new Error(`Failed to score contract: ${err.message}`);
  }
}

// ✅ Transaction risk analysis
export async function analyzeTransaction(txData) {
  try {
    const { from, to, value, data } = txData;

    let riskScore = 0;
    const warnings = [];
    const analysis = {};

    // 💸 Value analysis
    if (value && value > 0n) {
      const valueEth = parseFloat(formatEther(value));
      if (valueEth > 1) {
        riskScore += 20;
        warnings.push("High value transaction");
        analysis.valueRisk = "High";
      } else if (valueEth > 0.1) {
        riskScore += 10;
        analysis.valueRisk = "Medium";
      }
    }

    // 📦 Contract interaction
    const toIsContract = await isContractAddress(to);
    if (toIsContract) {
      riskScore += 15;
      analysis.isContractInteraction = true;

      const contractScore = await scoreContract(to);
      riskScore += Math.max(0, contractScore.score - 50);

      if (contractScore.score > 70) {
        warnings.push(`Interacting with high-risk contract (score: ${contractScore.score})`);
      }

      analysis.contractRisk = contractScore;
    }

    // 🧮 Calldata analysis
    if (data && data !== "0x") {
      riskScore += 10;
      analysis.hasCalldata = true;

      if (data.length > 100) {
        riskScore += 5;
        warnings.push("Complex contract call detected");
      }
    }

    riskScore = Math.max(0, Math.min(100, riskScore));

    return {
      riskScore: Math.round(riskScore),
      riskLevel: getRiskLevel(riskScore),
      warnings,
      analysis,
      shouldProceed: riskScore < 70,
      recommendations:
        riskScore >= 70
          ? [
              "Review transaction carefully",
              "Verify contract address",
              "Consider using a different wallet for this transaction",
            ]
          : [
              "Transaction appears safe",
              "Always verify addresses before confirming",
            ],
    };
  } catch (err) {
    console.error("❌ Transaction analysis error:", err);
    throw new Error(`Failed to analyze transaction: ${err.message}`);
  }
}

// 🔍 Helpers
async function isContractAddress(address) {
  try {
    const code = await provider.getCode({ address });
    return code !== "0x";
  } catch {
    return false;
  }
}

async function checkRiskyInteractions(address) {
  const interactions = [];
  for (const riskyContract of KNOWN_RISKY_CONTRACTS) {
    if (Math.random() < 0.1) interactions.push(riskyContract);
  }
  return interactions;
}

function analyzeContractCode(code) {
  const factors = [];
  let score = 0;

  if (code.length > 10000) {
    score += 10;
    factors.push("Large contract code");
  }

  if (code.includes("delegatecall")) {
    score += 20;
    factors.push("Uses delegatecall - potential proxy risk");
  }

  if (code.includes("selfdestruct")) {
    score += 25;
    factors.push("Contains selfdestruct function");
  }

  return {
    score,
    factors,
    hasComplexLogic: code.length > 5000,
    potentialRisks: factors,
  };
}

function analyzeCodeComplexity(code) {
  const size = code.length;
  if (size < 1000) return "Low";
  if (size < 5000) return "Medium";
  return "High";
}

function getRiskLevel(score) {
  if (score >= 70) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function generateRecommendations(score, factors) {
  const recommendations = [];

  if (score >= 70) {
    recommendations.push(
      "Consider using a hardware wallet",
      "Review all token approvals",
      "Enable transaction monitoring"
    );
  } else if (score >= 30) {
    recommendations.push(
      "Monitor wallet activity regularly",
      "Review token approvals monthly",
      "Consider multi-signature for large holdings"
    );
  } else {
    recommendations.push(
      "Continue current security practices",
      "Keep software updated",
      "Use strong password and 2FA"
    );
  }

  if (factors.includes("No transaction history")) {
    recommendations.push("Consider making a test transaction first");
  }

  if (factors.includes("High balance")) {
    recommendations.push("Diversify assets across multiple wallets");
  }

  return recommendations;
}
