// test/test-digest.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");

const eventSchema = new mongoose.Schema({
  type: String,
  school: String,
  title: String,
  startDate: String,
  endDate: String,
  url: String,
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);

function parseDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  try {
    const [datePart, timePart] = dateStr.trim().split(" ");
    const [day, month, year] = datePart.split("-");
    const [hours, minutes] = (timePart || "00:00").split(":");
    return new Date(year, month - 1, day, hours, minutes);
  } catch {
    return null;
  }
}

function safeDate(dateStr) {
  const d = parseDDMMYYYY(dateStr);
  return d ? d.toDateString() : "Unknown";
}

function renderTextDigest(events, keyword) {
  let lines = ["Hi Student,", "", `Here are your ${keyword} events this week:`];
  for (const e of events) {
    const start = safeDate(e.startDate);
    const end   = safeDate(e.endDate);
    lines.push(`- ${e.title} (${e.school}) — ${start} to ${end}`);
  }
  lines.push("", "— Sent by Event Digest");
  return lines.join("\n");
}

function renderHtmlDigest(events, keyword) {
  const items = events.map(e => {
    const start = safeDate(e.startDate);
    const end   = safeDate(e.endDate);
    return `<li><strong>${e.title}</strong> <em>(${e.school})</em> — ${start} to ${end}</li>`;
  }).join("");
  return `<div>
    <p>Hi Student,</p>
    <p>Here are your ${keyword} events this week:</p>
    <ul>${items}</ul>
    <p style="margin-top:16px;">— Sent by Event Digest</p>
  </div>`;
}

async function buildDigest() {
  // Change keyword here to filter by school or topic
  const keyword = "Computer Science"; // or "Electrical Engineering"
  const events = await Event.find({ school: new RegExp(keyword, "i") }).lean();

  if (events.length === 0) {
    console.log(`⚠️ No ${keyword} events found in DB`);
    return;
  }

  const textDigest = renderTextDigest(events, keyword);
  const htmlDigest = renderHtmlDigest(events, keyword);

  console.log("📧 TEXT DIGEST:\n");
  console.log(textDigest);

  console.log("\n\n🌐 HTML DIGEST:\n");
  console.log(htmlDigest);
}

await buildDigest();
await mongoose.disconnect();
