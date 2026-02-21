// models/Event.js
import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },    // hash of all fields (your approach)
  type: { type: String, index: true },                // VAC, VAP, WORKSHOP, CONCLAVE, etc.
  school: { type: String, index: true },              // exact school name from your list
  title: String,
  startDate: Date,
  endDate: Date,
  url: String,
  tags: [{ type: String, index: true }],              // normalized tags: type, school short code, buzzwords
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Event", EventSchema);
