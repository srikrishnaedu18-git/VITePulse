// models/User.js
import mongoose from "mongoose";

// models/User.js (add fields)
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true },
  preferences: [String],
  schools: [String],
  buzzwords: [String],
  optIn: { type: Boolean, default: true }, // must be true to receive emails
  unsubscribedAt: { type: Date, default: null }, // record timestamp of unsubscribe
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
