// jobs/scheduler.js
import cron from "node-cron";
import { runWeeklyPipeline } from "./weekly.pipeline.js";

let isRunning = false;

async function runPipeline(reason, { throwOnError = false } = {}) {
  if (isRunning) {
    console.log(`[scheduler] Skipping ${reason}; pipeline already running.`);
    return {
      ok: false,
      skipped: true,
      reason: "already_running",
    };
  }

  isRunning = true;
  try {
    console.log(`⏱️ ${reason} -> running pipeline`);
    const result = await runWeeklyPipeline();
    return {
      ok: true,
      skipped: false,
      result,
    };
  } catch (err) {
    console.error("[scheduler] Pipeline failed:", err);
    if (throwOnError) {
      throw err;
    }
    return {
      ok: false,
      skipped: false,
      reason: "pipeline_failed",
      error: err.message,
    };
  } finally {
    isRunning = false;
  }
}

export async function triggerWeeklyPipeline(reason = "manual trigger") {
  return runPipeline(reason, { throwOnError: true });
}

cron.schedule(
  "*/10 * * * *",
  async () => {
    await runPipeline("cron fired");
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  },
);

// Run once when server boots so scraping does not wait for the next cron tick.
setTimeout(() => {
  runPipeline("startup");
}, 1000);
