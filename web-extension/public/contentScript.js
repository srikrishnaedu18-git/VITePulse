function applyHighlights() {
  chrome.storage.sync.get(["keywords", "highlightColor"], (result) => {
    if (!result.keywords) return;

    const list = Array.isArray(result.keywords)
      ? result.keywords.map((k) => k.trim().toLowerCase())
      : result.keywords.split(",").map((k) => k.trim().toLowerCase());

    const color = result.highlightColor || "yellow";
    const colorMap = {
      red: { bg: "#FCA5A5", border: "#DC2626" },
      blue: { bg: "#BFDBFE", border: "#2563EB" },
      green: { bg: "#BBF7D0", border: "#16A34A" },
      yellow: { bg: "#FEF3C7", border: "#F59E0B" },
    };
    const chosen = colorMap[color];

    const rows = document.querySelectorAll("table tr");

    // Clear previous styles
    rows.forEach((row) => {
      row.style.backgroundColor = "";
      row.style.borderLeft = "";
      row.style.transition = "";
    });

    // Apply new highlights
    rows.forEach((row) => {
      const text = row.innerText?.toLowerCase();
      if (!text) return;

      if (list.some((keyword) => keyword && text.includes(keyword))) {
        row.style.backgroundColor = chosen.bg;
        row.style.borderLeft = `4px solid ${chosen.border}`;
        row.style.transition = "background-color 0.3s ease";
      }
    });
  });
}

function fillCaptchaAndSignIn() {
  console.log("Extracting captcha field values !!");
  const captchaDiv = document.querySelector("#CaptchaDiv");
  const captchaInput = document.querySelector("#captchaInput");

  if (captchaDiv && captchaInput) {
    const captchaText = captchaDiv.innerText.trim();
    if (captchaText.length > 0) {
      captchaInput.value = captchaText;
      captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("✅ Captcha auto-filled:", captchaText);
    } else {
      console.log("⚠️ Captcha text not ready yet.");
    }
  }
}

// ✅ Route-based triggers
const currentUrl = window.location.href;

// Captcha routes
if (
  currentUrl === "https://events.vit.ac.in/" ||
  currentUrl.startsWith("https://events.vit.ac.in/Users")
) {
  document.addEventListener("DOMContentLoaded", () => {
    // Poll every 500ms until captcha is ready
    const interval = setInterval(() => {
      fillCaptchaAndSignIn();
    }, 500);
  });
}

// Highlight route
if (currentUrl.startsWith("https://events.vit.ac.in/Home/index")) {
  document.addEventListener("DOMContentLoaded", () => {
    applyHighlights();
  });

  window.addEventListener("load", () => {
    setTimeout(applyHighlights, 500);
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "refreshHighlight") {
      applyHighlights();
      sendResponse?.({ ok: true });
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && (changes.keywords || changes.highlightColor)) {
      applyHighlights();
    }
  });

  const observer = new MutationObserver(() => applyHighlights());
  observer.observe(document.body, { childList: true, subtree: true });
}
