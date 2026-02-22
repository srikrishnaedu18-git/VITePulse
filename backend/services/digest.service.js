// services/digest.service.js
import Event from "../models/Event.js";
import Digest from "../models/Digest.js";
import { schoolCode } from "../lib/tagging.js";

function groupByType(events) {
  return events.reduce((acc, e) => {
    const key = e.type.toUpperCase();
    acc[key] = acc[key] || [];
    acc[key].push(e);
    return acc;
  }, {});
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeSchoolName(value) {
  return normalizeToken(String(value || "").replace(/\s*\([^)]+\)\s*/g, " "));
}

function matchesPreferences(evt, prefs = [], schools = [], buzzwords = []) {
  const title = normalizeToken(evt.title);
  const schoolRaw = normalizeToken(evt.school);
  const schoolName = normalizeSchoolName(evt.school);
  const schoolTag = normalizeToken(schoolCode(evt.school || ""));

  // Schools are also treated as tags, so combine all user inputs.
  const allTags = Array.from(
    new Set(
      [...(prefs || []), ...(schools || []), ...(buzzwords || [])]
        .map(normalizeToken)
        .filter(Boolean),
    ),
  );

  if (allTags.length === 0) return true;

  return allTags.some((tag) => {
    return (
      title.includes(tag) ||
      schoolRaw.includes(tag) ||
      schoolName.includes(tag) ||
      schoolTag === tag
    );
  });
}

function renderText(user, grouped) {
  let lines = [
    `Hi ${user.email.split("@")[0]},`,
    "",
    "Here are your events this week:",
  ];
  for (const [type, events] of Object.entries(grouped)) {
    lines.push("", `• ${type}`);
    for (const e of events) {
      lines.push(
        `  - ${e.title} (${e.school}) – ${new Date(e.startDate).toDateString()} to ${new Date(e.endDate).toDateString()}`,
      );
    }
  }
  lines.push("", "— Sent by Event Digest");
  return lines.join("\n");
}

function renderHtml(user, grouped) {
  const sections = Object.entries(grouped)
    .map(([type, events]) => {
      const items = events
        .map(
          (e) =>
            `<li><strong>${e.title}</strong> <em>(${e.school})</em> — ${new Date(e.startDate).toDateString()} to ${new Date(e.endDate).toDateString()}</li>`,
        )
        .join("");
      return `<h3>${type}</h3><ul>${items}</ul>`;
    })
    .join("");
  return `<div>
    <p>Hi ${user.email.split("@")[0]},</p>
    <p>Here are your events this week:</p>
    ${sections}
    <p style="margin-top:16px;">— Sent by Event Digest</p>
  </div>`;
}

function buildUnsubscribeUrl(user) {
  return `${process.env.APP_URL}/api/unsubscribe?email=${encodeURIComponent(
    user.email,
  )}`;
}

export async function buildUserDigest(user, weekStart, weekEnd) {
  // Fetch events within week window
  const events = await Event.find({
    startDate: { $lte: weekEnd },
    endDate: { $gte: weekStart },
  }).lean();

  // Filter by preferences
  const matched = events.filter((e) =>
    matchesPreferences(
      e,
      user.preferences || [],
      user.schools || [],
      user.buzzwords || [],
    ),
  );

  // If an event matches multiple tags, keep it only once per user digest.
  const seen = new Set();
  const filtered = matched.filter((e) => {
    const key = e.id || `${e.title}|${e.school}|${e.startDate}|${e.endDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(
    `[digest] ${user.email} matched ${filtered.length}/${events.length} events (schools=${(user.schools || []).length}, tags=${(user.buzzwords || []).length})`,
  );

  // Group by event type
  const grouped = groupByType(filtered);

  // Flatten event IDs
  const eventIds = filtered.map((e) => e.id);

  const unsubscribeUrl = buildUnsubscribeUrl(user);
  const text = `${renderText(user, grouped)}\n\nUnsubscribe: ${unsubscribeUrl}`;
  const html = `${renderHtml(user, grouped)}
    <p style="font-size:12px;color:#666">
      If you prefer not to receive these emails,
      <a href="${unsubscribeUrl}">unsubscribe here</a>.
    </p>`;

  const digest = await Digest.create({
    userId: user._id,
    weekStart,
    weekEnd,
    eventIds,
    text,
    html,
  });

  return digest;
}
