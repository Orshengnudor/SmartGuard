import express from "express";
import { isAddress } from "viem";
import { getPublicClient, getSmartGuardContract, getWalletClient } from "../services/contractService.js";

const router = express.Router();

// ✅ POST /api/threat/report - Report a malicious contract
router.post("/report", async (req, res) => {
  try {
    const { contractAddress, reason, severity = "high" } = req.body;
    const publicClient = getPublicClient();
    const smartGuardContract = getSmartGuardContract();
    const walletClient = getWalletClient();

    if (!contractAddress || !reason) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: contractAddress and reason"
      });
    }

    if (!isAddress(contractAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid contract address"
      });
    }

    if (!smartGuardContract || !walletClient) {
      return res.status(500).json({
        success: false,
        error: "SmartGuard contract not initialized"
      });
    }

    console.log(`🚨 Reporting threat: ${contractAddress} - ${reason}`);

    const hash = await smartGuardContract.write.reportThreat([contractAddress, reason]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    res.json({
      success: true,
      message: "Threat reported successfully",
      contract: contractAddress,
      reason: reason,
      severity: severity,
      transactionHash: hash,
      blockNumber: Number(receipt.blockNumber),
      action: "Added to threat database"
    });

  } catch (err) {
    console.error("❌ Threat report error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to report threat",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ POST /api/threat/auto-revoke - Auto revoke for detected threat
router.post("/auto-revoke", async (req, res) => {
  try {
    const { userAddress, contractAddress, reason } = req.body;
    const publicClient = getPublicClient();
    const smartGuardContract = getSmartGuardContract();
    const walletClient = getWalletClient();

    if (!userAddress || !contractAddress || !reason) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userAddress, contractAddress, and reason"
      });
    }

    if (!isAddress(userAddress) || !isAddress(contractAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid address provided"
      });
    }

    if (!smartGuardContract || !walletClient) {
      return res.status(500).json({
        success: false,
        error: "SmartGuard contract not initialized"
      });
    }

    console.log(`🛡️ Auto-revoking threat: ${userAddress} -> ${contractAddress}`);

    const hash = await smartGuardContract.write.autoRevokeThreat([userAddress, contractAddress, reason]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    res.json({
      success: true,
      message: "Auto-revoke executed successfully",
      user: userAddress,
      contract: contractAddress,
      reason: reason,
      transactionHash: hash,
      blockNumber: Number(receipt.blockNumber),
      action: "Contract access revoked automatically"
    });

  } catch (err) {
    console.error("❌ Auto-revoke error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to execute auto-revoke"
    });
  }
});

// ✅ GET /api/threat/check/:contractAddress - Check if contract is known threat
router.get("/check/:contractAddress", async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const smartGuardContract = getSmartGuardContract();

    if (!isAddress(contractAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid contract address"
      });
    }

    if (!smartGuardContract) {
      return res.json({
        success: true,
        isThreat: false,
        message: "Contract not initialized - assuming safe"
      });
    }

    const isThreat = await smartGuardContract.read.knownThreats([contractAddress]);
    
    let reason = "";
    if (isThreat) {
      try {
        reason = await smartGuardContract.read.threatReasons([contractAddress]);
      } catch (error) {
        console.warn("Could not fetch threat reason:", error.message);
      }
    }

    res.json({
      success: true,
      contract: contractAddress,
      isThreat: isThreat,
      reason: reason,
      recommendation: isThreat ? "AVOID - Known malicious contract" : "Appears safe"
    });

  } catch (err) {
    console.error("❌ Threat check error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to check threat status"
    });
  }
});

export default router;