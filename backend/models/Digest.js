// models/Digest.js
import mongoose from "mongoose";

const DigestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    weekStart: { type: Date, index: true },
    weekEnd: { type: Date },

    eventIds: [{ type: String }], // list of Event.id hashes included in this digest

    text: { type: String }, // plain text email body
    html: { type: String }, // html email body
  },
  { timestamps: true },
);

export default mongoose.model("Digest", DigestSchema);
