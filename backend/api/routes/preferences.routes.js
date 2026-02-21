// routes/preferences.routes.js
import express from "express";
import User from "../../models/User.js";

const router = express.Router();

// Update user preferences immediately when Save is pressed
router.post("/update", async (req, res) => {
  const { email, preferences, schools, buzzwords } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { email }, // identify user by email
      { preferences, schools, buzzwords },
      { new: true, upsert: false } // create if not exists
    );

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
