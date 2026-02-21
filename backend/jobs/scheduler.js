// jobs/scheduler.js
import cron from "node-cron";
import { runWeeklyPipeline } from "./weekly.pipeline.js";

cron.schedule("0 9 * * 1", async () => {
  await runWeeklyPipeline();
}, {
  scheduled: true,
  timezone: "Asia/Kolkata",
});
