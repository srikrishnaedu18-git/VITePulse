import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import { sendVerificationEmail } from "../lib/email.js";

const router = express.Router();

// Register new user
router.post("/register", async (req, res) => {
  const { email, preferences, schools, buzzwords } = req.body;
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const user = await User.findOneAndUpdate(
      { email },
      {
        email,
        preferences,
        schools,
        buzzwords,
        optIn: false,
        verificationToken: token,
      },
      { new: true, upsert: true }
    );
    await sendVerificationEmail({ to: email, token });
    res.json({ success: true, message: "Verification email sent" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Confirm registration
router.get("/confirm-registration", async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).send("Invalid or expired token");
    user.optIn = true;
    user.verificationToken = null;
    await user.save();
    res.send(
      "✅ Email verified successfully. You will now receive weekly digests."
    );
  } catch (err) {
    res.status(500).send("❌ Error confirming registration");
  }
});

// Request email change
router.post("/request-email-change", async (req, res) => {
  const { oldEmail, newEmail } = req.body;

  try {
    const user = await User.findOne({ email: oldEmail });
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");

    user.pendingEmail = newEmail;
    user.verificationToken = token;
    await user.save();

    await sendVerificationEmail(newEmail, token);

    res.json({ success: true, message: "Verification email sent" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Confirm email change
router.get("/confirm-email-change", async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).send("Invalid or expired token");

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.verificationToken = null;
    await user.save();

    res.send("✅ Email verified and updated successfully");
  } catch (err) {
    res.status(500).send("❌ Error confirming email change");
  }
});

export default router;
