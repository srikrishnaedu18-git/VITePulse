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

function matchesPreferences(evt, prefs = [], schools = [], buzzwords = []) {
  const title = evt.title.toLowerCase();
  const schoolCode = evt.tags.find((t) => t !== evt.type.toUpperCase()); // includes school code
  const typeMatch = prefs.some(
    (p) => p.toUpperCase() === evt.type.toUpperCase(),
  );
  const schoolMatch =
    schools.length === 0 || schools.some((s) => s.toUpperCase() === schoolCode);
  const buzzMatch = buzzwords.some((b) => title.includes(b.toLowerCase()));
  // Include if any explicit match OR school filter allows and type matches
  return buzzMatch || (typeMatch && schoolMatch);
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
