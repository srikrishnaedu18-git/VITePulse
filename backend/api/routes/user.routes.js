import express from "express";
import User from "../../models/User.js";
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

export default router;
