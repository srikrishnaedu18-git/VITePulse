// api/routes/unsubscribe.routes.js
import express from "express";
import User from "../../models/User.js";

const router = express.Router();

// GET /unsubscribe?email=...
router.get("/unsubscribe", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send("Email is required to unsubscribe.");
  }

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { optIn: false, unsubscribedAt: new Date() } },
    { new: true }
  );

  if (!user) {
    return res.status(404).send("No user found with that email.");
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Unsubscribed</title>
  </head>
  <body style="margin:0;font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;">
    <div style="max-width:560px;margin:48px auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
        <h2 style="margin:0 0 12px 0;font-size:22px;">Unsubscribed Successfully</h2>
        <p style="margin:0 0 10px 0;line-height:1.5;">
          You have been unsubscribed from VIT event digest emails for
          <strong>${String(email)}</strong>.
        </p>
        <p style="margin:0 0 10px 0;line-height:1.5;color:#334155;">
          If you want to receive emails again later, open the extension and click
          <strong>Save Preferences</strong> or <strong>Save Email</strong>.
        </p>
        <p style="margin:0;color:#475569;">You can close this window now.</p>
      </div>
    </div>
  </body>
</html>`);
});

export default router;
