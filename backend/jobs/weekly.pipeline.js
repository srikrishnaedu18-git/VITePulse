// jobs/weekly.pipeline.js
import mongoose from "mongoose";
import { scrapeEvents } from "../scraper/scrape.js";
import { syncEvents } from "../services/sync.service.js";
import { buildUserDigest } from "../services/digest.service.js";
import { sendDigestEmail } from "../lib/email.js";
import User from "../models/User.js";

function weekBoundsIST(now = new Date()) {
  const monday9 = new Date(now);
  const day = monday9.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  monday9.setDate(monday9.getDate() + diffToMonday);
  monday9.setHours(9, 0, 0, 0);
  const weekStart = new Date(monday9);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return { weekStart, weekEnd };
}

export async function runWeeklyPipeline() {
  await mongoose.connect(process.env.MONGO_URI);

  const { weekStart, weekEnd } = weekBoundsIST(new Date());

  let syncStats;
  try {
    const scraped = await scrapeEvents();
    syncStats = await syncEvents(scraped, []);
  } catch (err) {
    console.error("[SCRAPE ERROR]", err);
    await sendDigestEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "ERROR: Scrape failure",
      html: `<pre>${String(err.stack || err)}</pre>`,
      text: String(err),
    });
    return; // stop pipeline if scrape fails
  }

  const users = await User.find({ optIn: true }).lean();

  for (const user of users) {
    const digest = await buildUserDigest(user, weekStart, weekEnd);
    await sendDigestEmail({
      to: user.email,
      subject: `Your VIT events digest — Week of ${weekStart.toDateString()}`,
      html: digest.html,
      text: digest.text,
    });
  }

  await mongoose.disconnect();
  return syncStats;
}
