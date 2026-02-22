// jobs/weekly.pipeline.js
import mongoose from "mongoose";
import { scrapeEvents } from "../scraper/scrape.js";
import { syncEvents } from "../services/sync.service.js";
import { buildUserDigest } from "../services/digest.service.js";
import { sendDigestEmail } from "../lib/email.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Digest from "../models/Digest.js";

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
  const shouldDisconnect = mongoose.connection.readyState === 0;
  if (shouldDisconnect) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const { weekStart, weekEnd } = weekBoundsIST(new Date());

  try {
    // Fresh weekly run: clear previous events/digests before scraping.
    const [eventPurge, digestPurge] = await Promise.all([
      Event.deleteMany({}),
      Digest.deleteMany({}),
    ]);
    console.log(
      `[pipeline] Purged events=${eventPurge.deletedCount} digests=${digestPurge.deletedCount}`,
    );

    let syncStats;
    try {
      const scraped = await scrapeEvents();
      syncStats = await syncEvents(scraped, []);
    } catch (err) {
      console.error("[SCRAPE ERROR]", err);
      try {
        await sendDigestEmail({
          to: process.env.ADMIN_EMAIL,
          subject: "ERROR: Scrape failure",
          html: `<pre>${String(err.stack || err)}</pre>`,
          text: String(err),
        });
      } catch (emailErr) {
        console.error("[ALERT EMAIL ERROR]", emailErr);
      }
      return;
    }

    const users = await User.find({ optIn: true }).lean();
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const user of users) {
      const digest = await buildUserDigest(user, weekStart, weekEnd);
      try {
        await sendDigestEmail({
          to: user.email,
          subject: `Your VIT events digest — Week of ${weekStart.toDateString()}`,
          html: digest.html,
          text: digest.text,
          user,
        });
        emailsSent += 1;
      } catch (emailErr) {
        emailsFailed += 1;
        console.error(`[DIGEST EMAIL ERROR] ${user.email}`, emailErr);
      }
    }

    return {
      ...syncStats,
      purgedEvents: eventPurge.deletedCount,
      purgedDigests: digestPurge.deletedCount,
      emailsSent,
      emailsFailed,
    };
  } finally {
    if (shouldDisconnect) {
      await mongoose.disconnect();
    }
  }
}
