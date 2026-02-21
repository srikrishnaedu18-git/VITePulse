// contentScript.js
console.log("✅ Content script loaded:", location.href);

/** ---------- Helpers ---------- */
function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

function normalizeKeywords(keywords) {
  if (!keywords) return [];
  const arr = Array.isArray(keywords) ? keywords : String(keywords).split(",");
  return arr
    .map((k) => (k ?? "").toString().trim().toLowerCase())
    .filter(Boolean);
}

/** ---------- Highlighting ---------- */
function applyHighlights() {
  chrome.storage.sync.get(["keywords", "highlightColor"], (result) => {
    const list = normalizeKeywords(result.keywords);
    if (list.length === 0) return;

    const color = result.highlightColor || "yellow";
    const colorMap = {
      red: { bg: "#FCA5A5", border: "#DC2626" },
      blue: { bg: "#BFDBFE", border: "#2563EB" },
      green: { bg: "#BBF7D0", border: "#16A34A" },
      yellow: { bg: "#FEF3C7", border: "#F59E0B" },
    };
    const chosen = colorMap[color] || colorMap.yellow;

    const rows = document.querySelectorAll("table tr");

    // Clear previous styles
    rows.forEach((row) => {
      row.style.backgroundColor = "";
      row.style.borderLeft = "";
      row.style.transition = "";
    });

    // Apply new highlights
    rows.forEach((row) => {
      const text = row.innerText ? row.innerText.toLowerCase() : "";
      if (!text) return;

      if (list.some((keyword) => text.includes(keyword))) {
        row.style.backgroundColor = chosen.bg;
        row.style.borderLeft = `4px solid ${chosen.border}`;
        row.style.transition = "background-color 0.3s ease";
      }
    });
  });
}

/** ---------- Captcha Auto-fill (text-based captcha only) ---------- */
let captchaIntervalId = null;

function fillCaptchaAndSignIn() {
  const captchaDiv = document.querySelector("#CaptchaDiv");
  const captchaInput = document.querySelector("#captchaInput");

  // Debug logs (helps identify selector / type mismatch)
  if (!captchaDiv) console.log("❌ CaptchaDiv not found (#CaptchaDiv)");
  if (!captchaInput) console.log("❌ captcha input not found (#captchaInput)");

  if (!captchaDiv || !captchaInput) return;

  const captchaText = (captchaDiv.innerText || "").trim();
  console.log("🔎 CaptchaDiv text:", captchaText);

  // If captcha is not plain text (image/canvas), this will stay empty.
  if (captchaText.length === 0) return;

  captchaInput.value = captchaText;

  // Trigger typical listeners
  captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
  captchaInput.dispatchEvent(new Event("change", { bubbles: true }));

  console.log("✅ Captcha auto-filled:", captchaText);

  // stop polling once filled
  if (captchaIntervalId) {
    clearInterval(captchaIntervalId);
    captchaIntervalId = null;
  }
}

/** ---------- Route logic ---------- */
const currentUrl = location.href;

// Captcha routes (login pages)
const isCaptchaRoute =
  currentUrl == "https://events.vit.ac.in/" ||
  currentUrl == "https://events.vit.ac.in/Users" ;

// Highlight route (home index)
const isHighlightRoute = currentUrl.startsWith(
  "https://events.vit.ac.in/Home/index",
);

/** ---------- Boot ---------- */
if (isCaptchaRoute) {
  onReady(() => {
    console.log("📌 Ready fired for captcha route:", location.href);

    // Try immediately and then poll until captcha appears / becomes readable
    fillCaptchaAndSignIn();
    captchaIntervalId = setInterval(fillCaptchaAndSignIn, 500);
  });

  // Also re-try on full load (sometimes captcha renders late)
  window.addEventListener("load", () => {
    console.log("📌 window.load fired for captcha route");
    fillCaptchaAndSignIn();
  });
}

if (isHighlightRoute) {
  onReady(() => {
    console.log("📌 Ready fired for highlight route");
    applyHighlights();
  });

  window.addEventListener("load", () => {
    setTimeout(applyHighlights, 500);
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.action === "refreshHighlight") {
      applyHighlights();
      sendResponse?.({ ok: true });
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && (changes.keywords || changes.highlightColor)) {
      applyHighlights();
    }
  });

  // Watch for table updates
  const observer = new MutationObserver(() => applyHighlights());
  observer.observe(document.body, { childList: true, subtree: true });
}
