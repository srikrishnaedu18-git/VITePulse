// contentScript.js
console.log("✅ Content script loaded:", location.href);

//applying dark mode
const DARK_STYLE_ID = "vitepulse-dark-theme";

function applyDarkTheme(enabled, variant = "copilot") {
  document.getElementById(DARK_STYLE_ID)?.remove();
  if (!enabled) return;

  const isGpt = variant === "gpt";
  const colors = isGpt
    ? {
        captchaBg: "#262626",
        captchaText: "#f5f5f5",
        captchaBorder: "#3a3a3a",
        captchaGlow: "rgba(255,255,255,0.15)",
        headerBg: "#171717",
        headerBorder: "#2f2f2f",
        sidebarText: "#e5e5e5",
        sidebarHover: "#262626",
        bodyBg: "#212121",
        panelBg: "#171717",
        panelBorder: "#2f2f2f",
        thBg: "#1f1f1f",
        btnBg: "#2563eb",
        btnHover: "#1d4ed8",
        inputBg: "#0f0f0f",
        inputBorder: "#3a3a3a",
        link: "#d4d4d4",
      }
    : {
        captchaBg: "#1e293b",
        captchaText: "#e2e8f0",
        captchaBorder: "#334155",
        captchaGlow: "rgba(59,130,246,0.6)",
        headerBg: "#0f172a",
        headerBorder: "#1f2937",
        sidebarText: "#cbd5f5",
        sidebarHover: "#1e293b",
        bodyBg: "#0b1220",
        panelBg: "#0f172a",
        panelBorder: "#1f2937",
        thBg: "#111827",
        btnBg: "#2563eb",
        btnHover: "#1d4ed8",
        inputBg: "#020617",
        inputBorder: "#334155",
        link: "#93c5fd",
      };

  const style = document.createElement("style");
  style.id = DARK_STYLE_ID;
  style.textContent = `
    /* ---------- CAPTCHA BLOCK ---------- */
    .captcha-text {
      background: ${colors.captchaBg} !important;
      color: ${colors.captchaText} !important;
      border: 1px solid ${colors.captchaBorder} !important;
      border-radius: 8px !important;
      padding: 8px 12px !important;
      display: inline-block !important;
    }

    /* Actual captcha characters */
    #CaptchaDiv {
      color: #f8fafc !important;
      font-weight: 600 !important;
      letter-spacing: 2px !important;
      font-size: 16px !important;
      text-shadow: 0 0 6px ${colors.captchaGlow};
    }

    /* ---------- SIGNIN HEADER (Login page) ---------- */
    .signin-header {
      background: ${colors.headerBg} !important;
      color: #e5e7eb !important;
      border-bottom: 1px solid ${colors.headerBorder} !important;
    }

    /* Ensure all text inside header turns light */
    .signin-header h1,
    .signin-header h2,
    .signin-header h3,
    .signin-header strong,
    .signin-header p,
    .signin-header span,
    .signin-header div {
      color: #e5e7eb !important;
    }

    /* Optional: slightly dim logo glare on dark bg */
    .signin-header img {
      filter: brightness(0.95) contrast(1.1);
    }

    /* Sidebar wrapper */
    #sidebar-wrapper,
    #sidebar-wrapper.bg-light,
    #sidebar-wrapper .bg-light {
      background: ${colors.headerBg} !important;
      color: #e5e7eb !important;
      border-right: 1px solid ${colors.headerBorder} !important;
    }

    /* Sidebar links */
    #sidebar-wrapper .list-group-item,
    #sidebar-wrapper a.list-group-item,
    #sidebar-wrapper a.list-group-item.bg-light {
      background: transparent !important;
      color: ${colors.sidebarText} !important;
      border-color: ${colors.headerBorder} !important;
    }

    #sidebar-wrapper .list-group-item:hover,
    #sidebar-wrapper a.list-group-item:hover {
      background: #1e293b !important;
      background: ${colors.sidebarHover} !important;
      color: #ffffff !important;
    }

    /* ---------- GLOBAL ---------- */
    html, body {
      background: ${colors.bodyBg} !important;
      color: #e5e7eb !important;
    }

    /* ---------- NAVBAR / HEADER ---------- */
    header, .navbar, .topbar {
      background: ${colors.headerBg} !important;
      border-color: ${colors.headerBorder} !important;
    }

    /* ---------- LEFT MENU ---------- */
    .sidebar, .menu, .nav, .nav-pills {
      background: ${colors.headerBg} !important;
    }

    .nav a, .menu a {
      color: ${colors.sidebarText} !important;
    }

    .nav a:hover {
      background: ${colors.sidebarHover} !important;
    }

    /* ---------- CARDS / PANELS ---------- */
    .card, .panel, .box, .container, .well {
      background: ${colors.panelBg} !important;
      border-color: ${colors.panelBorder} !important;
      color: #e5e7eb !important;
    }

    /* ---------- TABLE ---------- */
    table {
      background: ${colors.panelBg} !important;
      color: #e5e7eb !important;
      border-color: ${colors.panelBorder} !important;
    }

    th {
      background: ${colors.thBg} !important;
      color: ${colors.sidebarText} !important;
      border-color: ${colors.panelBorder} !important;
    }

    td {
      border-color: ${colors.panelBorder} !important;
    }

    tr:hover {
      background: ${colors.sidebarHover} !important;
    }

    /* ---------- BUTTONS ---------- */
    button, .btn {
      background: ${colors.btnBg} !important;
      border-color: ${colors.btnBg} !important;
      color: #fff !important;
    }

    button:hover, .btn:hover {
      background: ${colors.btnHover} !important;
    }

    /* ---------- INPUTS ---------- */
    input, textarea, select {
      background: ${colors.inputBg} !important;
      color: #e5e7eb !important;
      border: 1px solid ${colors.inputBorder} !important;
    }

    /* ---------- LOGIN PANEL ---------- */
    .login, .login-panel, .panel-primary {
      background: ${colors.panelBg} !important;
      border-color: ${colors.panelBorder} !important;
    }

    /* ---------- LINKS ---------- */
    a {
      color: ${colors.link} !important;
    }

    /* ---------- SIDEBAR WRAPPER ---------- */
    #sidebar-wrapper {
      background: ${colors.headerBg} !important;
      border-right: 1px solid ${colors.headerBorder} !important;
    }

    /* Sidebar heading area */
    #sidebar-wrapper .sidebar-heading {
      background: ${colors.headerBg} !important;
      color: #e5e7eb !important;
      border-bottom: 1px solid ${colors.headerBorder} !important;
    }

    /* Remove forced Bootstrap bg-light in sidebar */
    #sidebar-wrapper.bg-light,
    #sidebar-wrapper .bg-light {
      background: ${colors.headerBg} !important;
      color: #e5e7eb !important;
    }

    /* ---------- SIDEBAR LINKS (list-group) ---------- */
    #sidebar-wrapper .list-group {
      background: ${colors.headerBg} !important;
    }

    #sidebar-wrapper .list-group-item {
      background: transparent !important;   /* important */
      color: ${colors.sidebarText} !important;
      border-color: ${colors.headerBorder} !important;
    }

    /* Because the anchors themselves have bg-light class */
    #sidebar-wrapper a.list-group-item.bg-light {
      background: transparent !important;
      color: ${colors.sidebarText} !important;
    }

    /* Hover + active state */
    #sidebar-wrapper .list-group-item:hover {
      background: ${colors.sidebarHover} !important;
      color: #ffffff !important;
    }

    #sidebar-wrapper .list-group-item.active,
    #sidebar-wrapper .list-group-item:focus {
      background: ${colors.btnBg} !important;
      color: #ffffff !important;
      border-color: ${colors.btnBg} !important;
    }

    /* Logo visibility tweak (optional, if logo looks too bright) */
    #sidebar-wrapper img {
      filter: brightness(0.95) contrast(1.1);
    }
  `;

  document.head.appendChild(style);
}

function readThemeStateAndApply() {
  chrome.storage.sync.get(["darkMode", "gptDarkTheme"], (res) => {
    const variant = res.gptDarkTheme ? "gpt" : "copilot";
    applyDarkTheme(!!res.darkMode, variant);
  });
}

chrome.storage.sync.get(["darkMode", "gptDarkTheme"], (res) => {
  const variant = res.gptDarkTheme ? "gpt" : "copilot";
  applyDarkTheme(!!res.darkMode, variant);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.darkMode || changes.gptDarkTheme)) {
    readThemeStateAndApply();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === "toggleDarkMode") {
    readThemeStateAndApply();
    sendResponse({ ok: true });
  }
});

/** ---------- Helpers ---------- */
function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === "toggleDarkMode") {
    console.log("🌙 Received toggleDarkMode:", msg.enabled);
    readThemeStateAndApply();
    sendResponse({ ok: true });
  }
});

function normalizeKeywords(keywords) {
  if (!keywords) return [];
  const arr = Array.isArray(keywords) ? keywords : String(keywords).split(",");
  return arr
    .map((k) => (k ?? "").toString().trim().toLowerCase())
    .filter(Boolean);
}

/** ---------- Highlighting ---------- */
function applyHighlights() {
  chrome.storage.sync.get(
    ["keywords", "highlightColor", "darkMode", "gptDarkTheme"],
    (result) => {
      const list = normalizeKeywords(result.keywords);
      if (list.length === 0) return;

      const color = result.highlightColor || "blue";
      const isDark = !!result.darkMode;
      const isGptDark = isDark && !!result.gptDarkTheme;

      const lightPalette = {
        red: { bg: "#FCA5A5", border: "#DC2626", text: "#7F1D1D" },
        blue: { bg: "#BFDBFE", border: "#2563EB", text: "#1E3A8A" },
        green: { bg: "#BBF7D0", border: "#16A34A", text: "#064E3B" },
        yellow: { bg: "#FEF3C7", border: "#F59E0B", text: "#78350F" },
      };

      const darkPalette = {
        red: { bg: "#3f1d1d", border: "#ef4444", text: "#fecaca" },
        blue: { bg: "#172554", border: "#3b82f6", text: "#bfdbfe" },
        green: { bg: "#052e16", border: "#22c55e", text: "#bbf7d0" },
        yellow: { bg: "#422006", border: "#facc15", text: "#fde68a" },
      };

      const gptDarkPalette = {
        red: { bg: "#2a1515", border: "#ef4444", text: "#f5d0d0" },
        blue: { bg: "#162033", border: "#60a5fa", text: "#dbeafe" },
        green: { bg: "#0f241f", border: "#10a37f", text: "#d1fae5" },
        yellow: { bg: "#2a220f", border: "#eab308", text: "#fef3c7" },
      };

      const palette = isDark
        ? isGptDark
          ? gptDarkPalette
          : darkPalette
        : lightPalette;
      const chosen = palette[color] || palette.yellow;

      const rows = document.querySelectorAll("table tr");

      // Clear previous styles
      rows.forEach((row) => {
        row.style.backgroundColor = "";
        row.style.borderLeft = "";
        row.style.transition = "";
        row.style.color = "";
        row.style.boxShadow = "";
      });

      // Apply new highlights
      rows.forEach((row) => {
        const rowText = row.innerText ? row.innerText.toLowerCase() : "";
        if (!rowText) return;

        if (list.some((keyword) => keyword && rowText.includes(keyword))) {
          row.style.backgroundColor = chosen.bg;
          row.style.borderLeft = `4px solid ${chosen.border}`;
          row.style.color = chosen.text; // ✅ important for dark mode readability
          row.style.transition = "background-color 0.25s ease";

          // optional premium look (works in both themes)
          row.style.boxShadow = `inset 3px 0 0 ${chosen.border}`;
        }
      });
    },
  );
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
  currentUrl == "https://events.vit.ac.in/Users";

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
    if (area === "sync" && (changes.keywords || changes.highlightColor || changes.darkMode)) {
      applyHighlights();
    }
  });



  // Watch for table updates
  const observer = new MutationObserver(() => applyHighlights());
  observer.observe(document.body, { childList: true, subtree: true });
}
