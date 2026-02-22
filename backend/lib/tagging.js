// lib/tagging.js
export const SCHOOLS = [
  "School of Advanced Sciences (SAS)",
  "School of Bio Sciences & Technology (SBST)",
  "School of Civil Engineering (SCE)",
  "School of Chemical Engineering (SCHEME)",
  "School of Computer Science and Engineering (SCOPE)",
  "School of Computer Science Engineering and Information Systems (SCORE)",
  "School of Electrical Engineering (SELECT)",
  "School of Electronics Engineering (SENSE)",
  "School of Healthcare Science and Engineering (SHINE)",
  "School of Mechanical Engineering (SMEC)",
  "School of Social Sciences and Languages (SSL)",
  "School of Hotel & Tourism Management (HOT)",
  "VIT School of Agricultural Innovations And Advanced Learning (VAIAL)",
  "VIT Business School (VIT BS)",
  "VIT School of Design (V-SIGN)",
  "VIT School of Media, Arts and Technology (V-SMART)",
  "School of Architecture (V-SPARC)",
];

// Extract short code inside parentheses for tagging (e.g., SELECT)
export function schoolCode(schoolName) {
  const match = schoolName.match(/\(([^)]+)\)/);
  return match ? match[1].trim().toUpperCase() : schoolName.trim().toUpperCase();
}

// Normalize event tags: type + school code + derived buzzwords
export function buildTags(evt, buzzwords = []) {
  const typeTag = (evt.type || "").trim().toUpperCase(); // e.g., WORKSHOP
  const schoolTag = schoolCode(evt.school || ""); // e.g., SELECT
  const titleWords = (evt.title || "").toLowerCase().split(/\W+/).filter(Boolean);
  const schoolWords = (evt.school || "")
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean);
  const typeWords = (evt.type || "")
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean);
  const bwMatches = buzzwords
    .map((b) => b.toLowerCase().trim())
    .filter(Boolean)
    .filter((b) =>
      [evt.title || "", evt.school || "", evt.type || ""]
        .join(" ")
        .toLowerCase()
        .includes(b),
    );
  const unique = new Set([
    typeTag,
    schoolTag,
    ...bwMatches,
    ...titleWords,
    ...schoolWords,
    ...typeWords,
  ]);
  return Array.from(unique);
}
