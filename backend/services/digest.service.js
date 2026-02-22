// services/digest.service.js
import Event from "../models/Event.js";
import Digest from "../models/Digest.js";

function groupByType(events) {
  return events.reduce((acc, e) => {
    const key = e.type.toUpperCase();
    acc[key] = acc[key] || [];
    acc[key].push(e);
    return acc;
  }, {});
}

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function eventSearchText(evt) {
  const tagText = Array.isArray(evt.tags) ? evt.tags.join(" ") : "";
  return normalizeToken(
    [
      evt.title,
      evt.school,
      evt.type,
      evt.url,
      tagText,
      new Date(evt.startDate).toDateString(),
      new Date(evt.endDate).toDateString(),
    ].join(" "),
  );
}

function matchesPreferences(evt, prefs = [], schools = [], buzzwords = []) {
  const searchText = eventSearchText(evt);
  const normalizedTags = new Set((evt.tags || []).map((t) => normalizeToken(t)));
  const requested = [...(prefs || []), ...(schools || []), ...(buzzwords || [])]
    .map(normalizeToken)
    .filter(Boolean);

  // If user has no filters at all, include everything in the week.
  if (requested.length === 0) return true;

  return requested.some((token) => {
    if (normalizedTags.has(token)) return true;
    return searchText.includes(token);
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

export async function buildUserDigest(user, weekStart, weekEnd) {
  // Fetch events within week window
  const events = await Event.find({
    startDate: { $lte: weekEnd },
    endDate: { $gte: weekStart },
  }).lean();

  // Filter by preferences
  const filtered = events.filter((e) =>
    matchesPreferences(
      e,
      user.preferences || [],
      user.schools || [],
      user.buzzwords || [],
    ),
  );

  // Group by event type
  const grouped = groupByType(filtered);

  // Flatten event IDs
  const eventIds = filtered.map((e) => e.id);

  const text = renderText(user, grouped);
  const html = renderHtml(user, grouped);

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
