import express from "express";
import { triggerWeeklyPipeline } from "../../jobs/scheduler.js";

const router = express.Router();

router.post("/run-pipeline", async (req, res) => {
  const configuredToken = process.env.ADMIN_TRIGGER_TOKEN;
  const providedToken =
    req.get("x-admin-token") || req.body?.token || req.query?.token;

  if (configuredToken && providedToken !== configuredToken) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  try {
    const out = await triggerWeeklyPipeline("manual API trigger");

    if (out?.skipped) {
      return res.status(409).json({
        success: false,
        message: "Pipeline is already running",
        ...out,
      });
    }

    return res.json({
      success: true,
      message: "Pipeline run completed",
      ...out,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
