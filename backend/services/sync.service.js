// services/sync.service.js
import crypto from "crypto";
import Event from "../models/Event.js";
import { buildTags } from "../lib/tagging.js";

/**
 * Create a stable hash for an event so we can dedupe/upsert.
 * Uses key fields that define an event uniquely.
 */
function makeEventId(evt) {
  const stable = [
    (evt.type || "").trim(),
    (evt.school || "").trim(),
    (evt.title || "").trim(),
    new Date(evt.startDate).toISOString(),
    new Date(evt.endDate).toISOString(),
    (evt.url || "").trim(),
  ].join("|");

  return crypto.createHash("sha256").update(stable).digest("hex");
}

/**
 * Normalize a scraped event to the shape expected by models/Event.js
 */
function normalizeEvent(evt) {
  const start = evt.startDate ? new Date(evt.startDate) : new Date();
  const end = evt.endDate ? new Date(evt.endDate) : new Date(start);

  return {
    type: (evt.type || "").trim(),
    school: (evt.school || "").trim(),
    title: (evt.title || "").trim(),
    startDate: start,
    endDate: end,
    url: (evt.url || "").trim(),
  };
}

/**
 * Upsert events into MongoDB.
 * @param {Array} scrapedEvents - events from scraper/scrape.js
 * @param {Array} buzzwords - optional buzzwords to derive tags
 * @returns stats: { inserted, updated, unchanged, totalScraped }
 */
export async function syncEvents(scrapedEvents = [], buzzwords = []) {
  const stats = {
    totalScraped: Array.isArray(scrapedEvents) ? scrapedEvents.length : 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
  };

  if (!Array.isArray(scrapedEvents) || scrapedEvents.length === 0) {
    return stats;
  }

  for (const raw of scrapedEvents) {
    const evt = normalizeEvent(raw);

    // Skip junk rows
    if (!evt.title || !evt.type || !evt.school) continue;

    const id = makeEventId(evt);
    const tags = buildTags(evt, buzzwords);

    // Find existing
    const existing = await Event.findOne({ id }).lean();

    if (!existing) {
      await Event.create({
        id,
        ...evt,
        tags,
      });
      stats.inserted += 1;
      continue;
    }

    // Compare fields to decide update vs unchanged
    const changed =
      existing.type !== evt.type ||
      existing.school !== evt.school ||
      existing.title !== evt.title ||
      new Date(existing.startDate).getTime() !== evt.startDate.getTime() ||
      new Date(existing.endDate).getTime() !== evt.endDate.getTime() ||
      (existing.url || "") !== evt.url;

    if (!changed) {
      stats.unchanged += 1;
      continue;
    }

    await Event.updateOne(
      { id },
      {
        $set: {
          ...evt,
          tags,
        },
      },
    );
    stats.updated += 1;
  }

  return stats;
}
