import express from "express";
import crypto from "crypto";
import User from "../../models/User.js";
import { sendVerificationEmail } from "../../lib/email.js";
const router = express.Router();

// routes/user.routes.js (simplified)
router.post("/register", async (req, res) => {
  const { email, preferences = [], schools = [], buzzwords = [] } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { email, preferences, schools, buzzwords, optIn: true },
      { new: true, upsert: true }
    );

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/request-email-change", async (req, res) => {
  const currentEmail = (req.body?.currentEmail || "").trim().toLowerCase();
  const newEmail = (req.body?.newEmail || "").trim().toLowerCase();

  if (!currentEmail || !newEmail) {
    return res
      .status(400)
      .json({ success: false, error: "currentEmail and newEmail are required" });
  }

  if (!newEmail.endsWith("@vitstudent.ac.in")) {
    return res
      .status(400)
      .json({ success: false, error: "New email must be a VIT student email" });
  }

  if (currentEmail === newEmail) {
    return res.json({
      success: true,
      message: "Email is unchanged",
      unchanged: true,
    });
  }

  try {
    const user = await User.findOne({ email: currentEmail });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const existingNewEmail = await User.findOne({ email: newEmail }).lean();
    if (existingNewEmail) {
      return res
        .status(409)
        .json({ success: false, error: "New email is already registered" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    user.pendingEmail = newEmail;
    user.emailChangeToken = token;
    user.emailChangeTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    await sendVerificationEmail({ to: newEmail, token });

    return res.json({
      success: true,
      message: "Verification email sent to new address",
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/confirm-email-change", async (req, res) => {
  const token = String(req.query?.token || "").trim();
  if (!token) {
    return res.status(400).send("Missing token");
  }

  try {
    const user = await User.findOne({
      emailChangeToken: token,
      emailChangeTokenExpiresAt: { $gt: new Date() },
    });

    if (!user || !user.pendingEmail) {
      return res.status(400).send("Invalid or expired email change token.");
    }

    const targetEmail = user.pendingEmail.trim().toLowerCase();

    const existing = await User.findOne({ email: targetEmail, _id: { $ne: user._id } }).lean();
    if (existing) {
      return res.status(409).send("That email is already used by another account.");
    }

    user.email = targetEmail;
    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.emailChangeTokenExpiresAt = null;
    await user.save();

    return res.send("Email updated successfully. You can close this tab.");
  } catch (err) {
    return res.status(500).send(`Failed to confirm email change: ${err.message}`);
  }
});

export default router;
