// models/User.js
import mongoose from "mongoose";

// models/User.js (add fields)
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true },
  preferences: [String],
  schools: [String],
  buzzwords: [String],
  pendingEmail: { type: String, default: null },
  emailChangeToken: { type: String, index: true, default: null },
  emailChangeTokenExpiresAt: { type: Date, default: null },
  optIn: { type: Boolean, default: true }, // must be true to receive emails
  unsubscribedAt: { type: Date, default: null }, // record timestamp of unsubscribe
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
