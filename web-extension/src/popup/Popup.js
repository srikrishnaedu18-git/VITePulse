/* global chrome */
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

export default function Popup() {
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailLocked, setEmailLocked] = useState(false);
  const [view, setView] = useState("main"); // "main" or "settings"
  const [highlightColor, setHighlightColor] = useState("yellow");
  const [darkMode, setDarkMode] = useState(false);
  const [inlineEmailStatus, setInlineEmailStatus] = useState(null); 


  const registerEmail = async () => {
    const cleaned = (email || "").trim().toLowerCase();

    if (!isValidVitStudentEmail(cleaned)) {
      setInlineEmailStatus("error");
      return;
    }

    setInlineEmailStatus("loading");

    try {
      await axios.post("http://127.0.0.1:4000/api/user/register", {
        email: cleaned,
        preferences: keywords, // optional, but good to store current prefs
      });

      chrome.storage.sync.set({ email: cleaned }, () => {
        setEmail(cleaned);
        setEmailLocked(true);
        setInlineEmailStatus("success");
        setTimeout(() => setInlineEmailStatus(null), 2000);
      });
    } catch (err) {
      console.error("Register email failed:", err);
      setInlineEmailStatus("error");
    }
  };

  // ---------- THEME (Popup UI) ----------
  const theme = useMemo(() => {
    const accent = "#4f46e5";
    return {
      accent,
      bg: darkMode ? "#0b1220" : "#ffffff",
      card: darkMode ? "#0f172a" : "#f8fafc",
      border: darkMode ? "#1f2937" : "#e5e7eb",
      text: darkMode ? "#e5e7eb" : "#111827",
      subtext: darkMode ? "#94a3b8" : "#6b7280",
      inputBg: darkMode ? "#020617" : "#ffffff",
      inputBorder: darkMode ? "#334155" : "#d1d5db",
      chipBg: darkMode ? "#111827" : "#e0e7ff",
      chipText: darkMode ? "#c7d2fe" : "#3730a3",
      danger: "#dc2626",
      success: "#16a34a",
      welcomeBg: darkMode ? "#111827" : "#eef2ff",
      welcomeBorder: darkMode ? "#1f2937" : "#c7d2fe",
      welcomeTitle: darkMode ? "#c7d2fe" : "#3730a3",
      welcomeText: darkMode ? "#94a3b8" : "#4b5563",
    };
  }, [darkMode]);

  // --- Schools (short label shown in UI, full name stored as keyword) ---
  const SCHOOL_OPTIONS = useMemo(
    () => [
      { short: "SAS", full: "School of Advanced Sciences" },
      { short: "SBST", full: "School of Bio Sciences & Technology" },
      { short: "SCE", full: "School of Civil Engineering" },
      { short: "SCHEME", full: "School of Chemical Engineering" },
      { short: "SCOPE", full: "School of Computer Science and Engineering" },
      {
        short: "SCORE",
        full: "School of Computer Science Engineering and Information Systems",
      },
      { short: "SELECT", full: "School of Electrical Engineering" },
      { short: "SENSE", full: "School of Electronics Engineering" },
      { short: "SHINE", full: "School of Healthcare Science and Engineering" },
      { short: "SMEC", full: "School of Mechanical Engineering" },
      { short: "SSL", full: "School of Social Sciences and Languages" },
      { short: "HOT", full: "School of Hotel & Tourism Management" },
      {
        short: "VAIAL",
        full: "VIT School of Agricultural Innovations And Advanced Learning",
      },
      { short: "VIT BS", full: "VIT Business School" },
      { short: "V-SIGN", full: "VIT School of Design" },
      { short: "V-SMART", full: "VIT School of Media, Arts and Technology" },
      { short: "V-SPARC", full: "School of Architecture" },
    ],
    [],
  );

  // detect first time user
  const isFirstTimeUser = !emailLocked && !email;

  // email verification for client side
  const isValidVitStudentEmail = (value) => {
    const v = (value || "").trim().toLowerCase();
    return v.endsWith("@vitstudent.ac.in");
  };

  // quick lookup for "is selected?"
  const schoolFullNames = useMemo(
    () => new Set(SCHOOL_OPTIONS.map((s) => s.full)),
    [SCHOOL_OPTIONS],
  );

  const selectedSchools = useMemo(() => {
    const set = new Set(keywords);
    return SCHOOL_OPTIONS.filter((s) => set.has(s.full)).map((s) => s.short);
  }, [keywords, SCHOOL_OPTIONS]);

  const refreshHighlight = (updatedKeywords, updatedColor = highlightColor) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.[0]?.id) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "refreshHighlight",
        highlightColor: updatedColor,
        keywords: updatedKeywords,
      });
    });
  };

  const handleColorChange = (color) => {
    setHighlightColor(color);
    chrome.storage.sync.set({ highlightColor: color }, () => {
      refreshHighlight(keywords, color);
    });
  };

  // implementing dark mode (page + popup)
  const toggleDarkMode = (enabled) => {
    setDarkMode(enabled);
    chrome.storage.sync.set({ darkMode: enabled }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs?.[0]?.id;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { action: "toggleDarkMode", enabled });
      });
    });
  };

  // Load saved values from chrome storage
  useEffect(() => {
    chrome.storage.sync.get(
      ["keywords", "email", "highlightColor", "darkMode"],
      (result) => {
        if (result.keywords) {
          setKeywords(
            Array.isArray(result.keywords)
              ? result.keywords
              : result.keywords.split(",").map((k) => k.trim()),
          );
        }
        if (result.email) {
          setEmail(result.email);
          setEmailLocked(true);
        }
        if (result.highlightColor) setHighlightColor(result.highlightColor);
        if (typeof result.darkMode === "boolean") setDarkMode(result.darkMode);
      },
    );
  }, []);

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      const updated = [...keywords, trimmed];
      setKeywords(updated);
      setNewKeyword("");
      chrome.storage.sync.set({ keywords: updated }, () =>
        refreshHighlight(updated),
      );
    }
  };

  const removeKeyword = (idx) => {
    const updated = keywords.filter((_, i) => i !== idx);
    setKeywords(updated);
    chrome.storage.sync.set({ keywords: updated }, () =>
      refreshHighlight(updated),
    );
  };

  // --- School selection handlers ---
  const toggleSchool = (schoolFullName, checked) => {
    setKeywords((prev) => {
      const set = new Set(prev);
      if (checked) set.add(schoolFullName);
      else set.delete(schoolFullName);

      const updated = Array.from(set);
      chrome.storage.sync.set({ keywords: updated }, () =>
        refreshHighlight(updated),
      );
      return updated;
    });
  };

  const clearSchools = () => {
    setKeywords((prev) => {
      const updated = prev.filter((k) => !schoolFullNames.has(k));
      chrome.storage.sync.set({ keywords: updated }, () =>
        refreshHighlight(updated),
      );
      return updated;
    });
  };

  const savePreferences = async () => {
    const cleanedEmail = (email || "").trim().toLowerCase();

    if (!isValidVitStudentEmail(cleanedEmail)) {
      // You said you prefer no alerts; keeping as-is from your code.
      alert(
        "Please enter a valid VIT student email ending with @vitstudent.ac.in",
      );
      return;
    }

    chrome.storage.sync.set(
      { keywords, email: cleanedEmail, highlightColor },
      () => {
        refreshHighlight(keywords, highlightColor);
      },
    );

    try {
      if (!emailLocked) {
        await axios.post("http://127.0.0.1:4000/api/user/register", {
          email: cleanedEmail,
          preferences: keywords,
        });
        alert("Registered successfully.");
        setEmailLocked(true);
      } else {
        await axios.post("http://127.0.0.1:4000/api/preferences/update", {
          email: cleanedEmail,
          preferences: keywords,
        });
        alert("Preferences updated successfully.");
      }
    } catch (err) {
      console.error("Error saving to backend:", err);
      alert("Error saving to backend");
    }
  };

  const rootStyle = {
    width: 300,
    padding: 20,
    fontFamily: "sans-serif",
    background: theme.bg,
    color: theme.text,
  };

  const inputStyle = (isError = false) => ({
    width: "100%",
    marginBottom: 8,
    padding: "6px",
    border: `1px solid ${isError ? theme.danger : theme.inputBorder}`,
    borderRadius: "6px",
    background: theme.inputBg,
    color: theme.text,
    outline: "none",
  });

  const buttonStyle = {
    background: theme.accent,
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  };

  // --- Settings View ---
  if (view === "settings") {
    return (
      <div style={rootStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 15,
          }}
        >
          <button
            onClick={() => setView("main")}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: theme.text,
            }}
          >
            ⬅️ Back
          </button>
          <h3 style={{ margin: 0, color: theme.text }}>Settings</h3>
        </div>

        <p style={{ marginTop: 0, color: theme.subtext }}>
          Select highlight color:
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {["red", "blue", "green", "yellow"].map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              style={{
                flex: 1,
                padding: "8px",
                background:
                  highlightColor === color ? theme.accent : theme.card,
                color: highlightColor === color ? "white" : theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {color}
            </button>
          ))}
        </div>

        {/* Dark mode card */}
        <div
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: 13,
                  color: theme.text,
                }}
              >
                Dark mode
              </p>
              <span style={{ fontSize: 11, color: theme.subtext }}>
                Applies to website + popup
              </span>
            </div>

            {/* Toggle switch */}
            <label
              style={{
                position: "relative",
                display: "inline-block",
                width: 36,
                height: 20,
              }}
            >
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => toggleDarkMode(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: "absolute",
                  cursor: "pointer",
                  inset: 0,
                  backgroundColor: darkMode
                    ? theme.accent
                    : darkMode
                      ? "#334155"
                      : "#d1d5db",
                  borderRadius: 20,
                  transition: "0.25s",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  height: 16,
                  width: 16,
                  left: darkMode ? 18 : 2,
                  top: 2,
                  backgroundColor: "white",
                  borderRadius: "50%",
                  transition: "0.25s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            </label>
          </div>
        </div>

        <p
          style={{
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Edit email:
          {emailStatus === "success" && (
            <span style={{ color: theme.success, fontSize: 12 }}>
              ✓ Email saved
            </span>
          )}
          {emailStatus === "error" && (
            <span style={{ color: theme.danger, fontSize: 12 }}>
              Enter correct format
            </span>
          )}
        </p>

        <input
          type="email"
          style={inputStyle(emailStatus === "error")}
          placeholder="yourname.initial20xx@vitstudent.ac.in"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailLocked(false);
            setEmailStatus(null);
          }}
        />

        <button
          onClick={async () => {
            const cleaned = (email || "").trim().toLowerCase();

            if (!isValidVitStudentEmail(cleaned)) {
              setEmailStatus("error");
              return;
            }

            try {
              // 🔹 Save locally first (instant UI feedback)
              chrome.storage.sync.set({ email: cleaned }, () => {
                setEmail(cleaned);
                setEmailLocked(true);
                setEmailStatus("success");
                setTimeout(() => setEmailStatus(null), 2000);
              });

              // 🔹 Sync with backend (upsert user)
              await axios.post("http://127.0.0.1:4000/api/user/register", {
                email: cleaned,
                preferences: keywords,
              });
            } catch (err) {
              console.error("❌ Failed to save email:", err);
              setEmailStatus("error");
            }
          }}
          style={{
            ...buttonStyle,
            width: "100%",
            padding: 10,
            opacity: emailStatus === "loading" ? 0.7 : 1,
          }}
        >
          {emailStatus === "loading" ? "Saving…" : "Save Email"}
        </button>
      </div>
    );
  }

  // --- Main View ---
  return (
    <div style={rootStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <h2 style={{ color: theme.accent, margin: 0 }}>🎓 VITePulse</h2>
        <button
          onClick={() => setView("settings")}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: theme.text,
          }}
        >
          ⚙️
        </button>
      </div>
      {/* Welcome */}
      {isFirstTimeUser && (
        <div
          style={{
            background: theme.welcomeBg,
            border: `1px solid ${theme.welcomeBorder}`,
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: theme.welcomeTitle }}>
            👋 Welcome to VITePulse
          </p>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: 12,
              color: theme.welcomeText,
            }}
          >
            Enter your VIT email to receive a personalised weekly summary of
            events.
          </p>
        </div>
      )}

      {/* Email */}
      {emailLocked ? (
        <p style={{ margin: "6px 0 10px 0", fontSize: 13, color: theme.text }}>
          <strong>Email:</strong> {email}
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <input
            type="email"
            style={{ ...inputStyle(false), flex: 1, marginBottom: 0 }}
            placeholder="yourname.initial20xx@vitstudent.ac.in"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailLocked(false);
              setInlineEmailStatus(null); // ✅ reset inline status while typing
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                registerEmail(); // ✅ allow Enter to submit
              }
            }}
          />

          {/* ✅ Compact Tick button */}
          <button
            onClick={registerEmail}
            title="Save email"
            disabled={inlineEmailStatus === "loading"}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: `1px solid ${
                inlineEmailStatus === "error" ? theme.danger : theme.border
              }`,
              background:
                inlineEmailStatus === "success"
                  ? theme.success
                  : inlineEmailStatus === "error"
                    ? theme.card
                    : theme.accent,
              color: inlineEmailStatus === "error" ? theme.danger : "#ffffff",
              cursor:
                inlineEmailStatus === "loading" ? "not-allowed" : "pointer",
              display: "grid",
              placeItems: "center",
              padding: 0,
              lineHeight: 1,
            }}
          >
            {inlineEmailStatus === "loading" ? "…" : "✓"}
          </button>
        </div>
      )}

      /* Inline status (compact, theme-aware) */
      {!emailLocked && inlineEmailStatus === "error" && (
        <div style={{ fontSize: 12, color: theme.danger, marginBottom: 8 }}>
          Enter email in correct format
        </div>
      )}
      {!emailLocked && inlineEmailStatus === "success" && (
        <div style={{ fontSize: 12, color: theme.success, marginBottom: 8 }}>
          Email saved ✓
        </div>
      )}
      {/* Schools */}
      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <strong style={{ color: theme.text }}>Schools</strong>
          <button
            onClick={clearSchools}
            style={{
              border: "none",
              background: "transparent",
              color: theme.danger,
              cursor: "pointer",
              fontSize: 12,
            }}
            title="Remove all school filters"
          >
            Clear
          </button>
        </div>

        <div
          style={{
            maxHeight: 85,
            overflowY: "auto",
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: 8,
            background: theme.card,
          }}
        >
          {SCHOOL_OPTIONS.map((s) => {
            const checked = keywords.includes(s.full);
            return (
              <label
                key={s.full}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 4px",
                  borderRadius: 8,
                  cursor: "pointer",
                  color: theme.text,
                }}
                title={s.full}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleSchool(s.full, e.target.checked)}
                />
                <span style={{ fontWeight: 700 }}>{s.short}</span>
                <span style={{ fontSize: 12, color: theme.subtext }}>
                  {checked ? "selected" : ""}
                </span>
              </label>
            );
          })}
        </div>

        <div style={{ marginTop: 6, fontSize: 12, color: theme.subtext }}>
          Selected:{" "}
          {selectedSchools.length ? selectedSchools.join(", ") : "None"}
        </div>
      </div>
      {/* Manual keyword input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="text"
          style={{ ...inputStyle(false), flex: 1, marginBottom: 0 }}
          placeholder="Add a keyword"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              addKeyword();
            }
          }}
        />
        <button
          onClick={addKeyword}
          style={{ ...buttonStyle, padding: "6px 12px" }}
        >
          Add
        </button>
      </div>
      {/* Keyword chips */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
      >
        {keywords.map((word, idx) => (
          <span
            key={`${word}-${idx}`}
            style={{
              background: theme.chipBg,
              color: theme.chipText,
              border: `1px solid ${theme.border}`,
              padding: "5px 9px",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
            }}
            title={schoolFullNames.has(word) ? "School keyword" : "Keyword"}
          >
            {word}
            <button
              onClick={() => removeKeyword(idx)}
              style={{
                marginLeft: 8,
                background: "transparent",
                border: "none",
                color: theme.danger,
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
              }}
              aria-label={`Remove ${word}`}
              title="Remove"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <button
        onClick={savePreferences}
        style={{ ...buttonStyle, marginTop: 12, width: "100%", padding: 10 }}
      >
        Save Preferences
      </button>
    </div>
  );
}
