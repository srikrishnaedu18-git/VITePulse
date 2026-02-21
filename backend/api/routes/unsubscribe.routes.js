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

  res.send(`You have been unsubscribed from event digests, ${email}.`);
});

export default router;
