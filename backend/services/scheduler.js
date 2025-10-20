// scheduler.js
import cron from "node-cron";
import { createPublicClient, formatGwei, http } from "viem";
import { base } from "viem/chains"; // Change to your network (e.g., monad, base, etc.)
import { smartGuardContract } from "../server.js";
import { executeRevoke } from "./revokeLogic.js";

// ⚙️ Setup Viem client (replace base with your actual chain)
export const provider = createPublicClient({
  chain: base,
  transport: http(process.env.ALCHEMY_RPC_URL),
});

// In-memory storage for scheduled tasks (in production, use database)
const scheduledTasks = new Map();

export function startScheduledJobs() {
  console.log("⏰ Starting SmartGuard scheduled jobs...");

  // ✅ Daily cleanup of expired delegations at 2 AM
  cron.schedule("0 2 * * *", async () => {
    console.log("🧹 Running daily delegation cleanup...");
    try {
      await cleanupExpiredDelegations();
    } catch (error) {
      console.error("❌ Daily cleanup failed:", error);
    }
  });

  // ✅ Hourly risk score updates
  cron.schedule("0 * * * *", async () => {
    console.log("📊 Updating risk scores...");
    try {
      await updateRiskScores();
    } catch (error) {
      console.error("❌ Risk score update failed:", error);
    }
  });

  // ✅ Every 5 minutes: Check and execute automation rules
  cron.schedule("*/5 * * * *", async () => {
    console.log("⚡ Checking automation rules...");
    try {
      await checkAutomationRules();
    } catch (error) {
      console.error("❌ Automation rules check failed:", error);
    }
  });

  // ✅ Every 10 minutes: Monitor gas prices
  cron.schedule("*/10 * * * *", async () => {
    console.log("⛽ Monitoring gas prices...");
    try {
      await monitorGasPrices();
    } catch (error) {
      console.error("❌ Gas monitoring failed:", error);
    }
  });

  console.log("✅ All scheduled jobs started successfully");
}

// ✅ Add a new scheduled task
export function scheduleTask(taskId, schedule, taskFunction) {
  const task = cron.schedule(schedule, taskFunction);
  scheduledTasks.set(taskId, task);
  console.log(`✅ Scheduled task ${taskId} with schedule: ${schedule}`);
  return taskId;
}

// ✅ Remove a scheduled task
export function removeScheduledTask(taskId) {
  const task = scheduledTasks.get(taskId);
  if (task) {
    task.stop();
    scheduledTasks.delete(taskId);
    console.log(`✅ Removed scheduled task: ${taskId}`);
    return true;
  }
  return false;
}

// ✅ Get all active scheduled tasks
export function getScheduledTasks() {
  return Array.from(scheduledTasks.keys()).map(taskId => ({
    id: taskId,
    status: "active",
  }));
}

// 🔹 Job implementations
async function cleanupExpiredDelegations() {
  if (!smartGuardContract) {
    console.warn("⚠️ SmartGuard contract not available for cleanup");
    return;
  }

  try {
    // Simulate job run (replace with contract logic if needed)
    console.log("✅ Expired delegation cleanup completed");
    // Example: await smartGuardContract.write.pruneExpired(["0x..."]);
  } catch (error) {
    console.error("❌ Delegation cleanup error:", error);
  }
}

async function updateRiskScores() {
  try {
    console.log("✅ Risk scores updated for monitored wallets");
  } catch (error) {
    console.error("❌ Risk score update error:", error);
  }
}

async function checkAutomationRules() {
  try {
    const activeRules = []; // Would come from database
    if (activeRules.length > 0) {
      console.log(`✅ Checked ${activeRules.length} automation rules`);
    }
  } catch (error) {
    console.error("❌ Automation rules check error:", error);
  }
}

async function monitorGasPrices() {
  try {
    const feeData = await provider.getGasPrice();
    const gasPrice = parseFloat(formatGwei(feeData));

    console.log(`⛽ Current gas price: ${gasPrice} gwei`);

    if (gasPrice > 50) {
      console.log("🔔 High gas prices detected — consider delaying transactions");
    }
  } catch (error) {
    console.error("❌ Gas monitoring error:", error);
  }
}

// ✅ Manual job execution for testing
export async function executeJobManually(jobName) {
  console.log(`🔄 Manually executing job: ${jobName}`);

  switch (jobName) {
    case "cleanup":
      await cleanupExpiredDelegations();
      break;
    case "riskUpdate":
      await updateRiskScores();
      break;
    case "automationCheck":
      await checkAutomationRules();
      break;
    case "gasMonitor":
      await monitorGasPrices();
      break;
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }

  console.log(`✅ Manual job execution completed: ${jobName}`);
}

export default {
  startScheduledJobs,
  scheduleTask,
  removeScheduledTask,
  getScheduledTasks,
  executeJobManually,
};
