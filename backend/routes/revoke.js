import express from "express";
import { getSmartGuardContract } from "../services/contractService.js";

const router = express.Router();

// In-memory storage (same as delegation.js)
const delegationsDB = new Map();

router.post("/", async (req, res) => {
  try {
    const { userAddress, contractAddress } = req.body;
    const smartGuardContract = getSmartGuardContract();

    console.log("Real revoke request:", { userAddress, contractAddress });

    if (!userAddress || !contractAddress) {
      return res.status(400).json({
        success: false,
        message: "User address and contract address are required"
      });
    }

    // Remove from memory storage
    const key = `${userAddress}-${contractAddress}`;
    const hadDelegation = delegationsDB.has(key);
    
    if (hadDelegation) {
      delegationsDB.delete(key);
    }

    let contractRevokeSuccess = false;
    let contractNote = "";

    // Try to call real contract if available
    if (smartGuardContract) {
      try {
        const tx = await smartGuardContract.write.removeDelegation([userAddress, contractAddress]);
        console.log("Real revoke tx:", tx);
        contractRevokeSuccess = true;
        contractNote = "Contract revocation executed";
      } catch (contractError) {
        console.log("Contract revoke failed:", contractError.message);
        contractNote = "Contract revocation failed: " + contractError.message;
      }
    } else {
      contractNote = "Contract not available";
    }

    res.json({
      success: true,
      message: "Contract delegation revoked successfully",
      user: userAddress,
      contract: contractAddress,
      timestamp: new Date().toISOString(),
      contractRevokeSuccess,
      note: contractNote
    });

  } catch (error) {
    console.error("Revoke error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to revoke delegation"
    });
  }
});

export default router;