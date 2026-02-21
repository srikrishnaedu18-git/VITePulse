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

  // --- Schools (short label shown in UI, full name stored as keyword) ---
  const SCHOOL_OPTIONS = useMemo(
    () => [
      { short: "SAS", full: "School of Advanced Sciences" },
      { short: "SBST", full: "School of Bio Sciences & Technology" },
      { short: "SCE", full: "School of Civil Engineering" },
      { short: "SCHEME", full: "School of Chemical Engineering" },
      {
        short: "SCOPE",
        full: "School of Computer Science and Engineering",
      },
      {
        short: "SCORE",
        full: "School of Computer Science Engineering and Information Systems",
      },
      { short: "SELECT", full: "School of Electrical Engineering" },
      { short: "SENSE", full: "School of Electronics Engineering" },
      {
        short: "SHINE",
        full: "School of Healthcare Science and Engineering",
      },
      { short: "SMEC", full: "School of Mechanical Engineering" },
      {
        short: "SSL",
        full: "School of Social Sciences and Languages",
      },
      {
        short: "HOT",
        full: "School of Hotel & Tourism Management",
      },
      {
        short: "VAIAL",
        full: "VIT School of Agricultural Innovations And Advanced Learning",
      },
      { short: "VIT BS", full: "VIT Business School" },
      { short: "V-SIGN", full: "VIT School of Design" },
      {
        short: "V-SMART",
        full: "VIT School of Media, Arts and Technology",
      },
      { short: "V-SPARC", full: "School of Architecture" },
    ],
    [],
  );

  //detect first time user
  const isFirstTimeUser = !emailLocked && !email;

  //email verification for client side
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
    // selected = any school full name already present in keywords
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

  //implementing dark mode
  const toggleDarkMode = (enabled) => {
    console.log("🌙 Popup toggle clicked:", enabled);

    setDarkMode(enabled);

    chrome.storage.sync.set({ darkMode: enabled }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "❌ storage.set error:",
          chrome.runtime.lastError.message,
        );
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error(
            "❌ tabs.query error:",
            chrome.runtime.lastError.message,
          );
          return;
        }

        const tabId = tabs?.[0]?.id;
        console.log("🧭 Active tabId:", tabId, "URL:", tabs?.[0]?.url);

        if (!tabId) return;

        chrome.tabs.sendMessage(
          tabId,
          { action: "toggleDarkMode", enabled },
          (resp) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "⚠️ sendMessage failed (usually means contentScript not injected on this page):",
                chrome.runtime.lastError.message,
              );
              return;
            }
            console.log("✅ contentScript responded:", resp);
          },
        );
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
        if (result.highlightColor) {
          setHighlightColor(result.highlightColor);
        }
        if (typeof result.darkMode === "boolean") {
          setDarkMode(result.darkMode);
        }
      },
    );
  }, []);

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      const updated = [...keywords, trimmed];
      setKeywords(updated);
      setNewKeyword("");
      chrome.storage.sync.set({ keywords: updated }, () => {
        refreshHighlight(updated);
      });
    }
  };

  const removeKeyword = (idx) => {
    const updated = keywords.filter((_, i) => i !== idx);
    setKeywords(updated);
    chrome.storage.sync.set({ keywords: updated }, () => {
      refreshHighlight(updated);
    });
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

    // ✅ client-side verification
    if (!isValidVitStudentEmail(cleanedEmail)) {
      alert(
        "Please enter a valid VIT student email ending with @vitstudent.ac.in",
      );
      return;
    }

    // Save locally in extension storage
    chrome.storage.sync.set(
      { keywords, email: cleanedEmail, highlightColor },
      () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "refreshHighlight",
            highlightColor,
            keywords,
          });
        });
      },
    );

    try {
      if (!emailLocked) {
        // ✅ First-time register (or email changed)
        await axios.post("http://127.0.0.1:4000/api/user/register", {
          email: cleanedEmail,
          preferences: keywords,
        });
        alert("Registered successfully.");
        setEmailLocked(true);
      } else {
        // ✅ Update preferences only
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

  // --- Settings View ---
  if (view === "settings") {
    return (
      <div style={{ width: 300, padding: 20, fontFamily: "sans-serif" }}>
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
            }}
          >
            ⬅️ Back
          </button>
          <h3>Settings</h3>
        </div>

        <p>Select highlight color:</p>
        <div style={{ display: "flex", gap: "10px", marginBottom: 20 }}>
          {["red", "blue", "green", "yellow"].map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              style={{
                flex: 1,
                padding: "8px",
                background: highlightColor === color ? color : "#f0f0f0",
                color: highlightColor === color ? "white" : "black",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {color}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 18 }}>
          <p style={{ marginBottom: 6 }}>Dark mode:</p>

          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => toggleDarkMode(e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>
              {darkMode ? "Enabled" : "Disabled"}
            </span>
          </label>

          <p style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            Option 1 (invert filter). If it looks odd, we’ll switch to a custom
            theme.
          </p>
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
            <span style={{ color: "#16a34a", fontSize: 12 }}>
              ✓ Email saved
            </span>
          )}
          {emailStatus === "error" && (
            <span style={{ color: "#dc2626", fontSize: 12 }}>
              Enter correct format
            </span>
          )}
        </p>

        <input
          type="email"
          style={{
            width: "100%",
            marginBottom: 8,
            padding: "6px",
            border:
              emailStatus === "error" ? "1px solid #dc2626" : "1px solid #ccc",
            borderRadius: "4px",
          }}
          placeholder="yourname.initial20xx@vitstudent.ac.in"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailLocked(false);
            setEmailStatus(null); // reset message while typing
          }}
        />

        <button
          onClick={() => {
            if (isValidVitStudentEmail(email)) {
              chrome.storage.sync.set({ email }, () => {
                setEmailStatus("success");
                setEmailLocked(true);

                // message disappears after 2 seconds
                setTimeout(() => setEmailStatus(null), 2000);
              });
            } else {
              setEmailStatus("error");
            }
          }}
          style={{
            width: "100%",
            padding: "8px",
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "4px",
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          Save Email
        </button>
      </div>
    );
  }

  // --- Main View ---
  return (
    <div style={{ width: 300, padding: 20, fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <h2 style={{ color: "#4f46e5" }}>🎓 VITePulse</h2>
        <button
          onClick={() => setView("settings")}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          ⚙️
        </button>
      </div>

      {/* Email */}
      {isFirstTimeUser && (
        <div
          style={{
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: "#3730a3" }}>
            👋 Welcome to VITePulse
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#4b5563" }}>
            Enter your VIT email to receive a personalised weekly summary of
            events.
          </p>
        </div>
      )}

      {emailLocked ? (
        <p style={{ margin: "6px 0 10px 0", fontSize: 13 }}>
          <strong>Email:</strong> {email}
        </p>
      ) : (
        <input
          type="email"
          style={{ width: "94%", marginBottom: 6, padding: "6px" }}
          placeholder="yourname.initial20xx@vitstudent.ac.in"
          value={email}
          onChange={(e) => {
            const val = e.target.value;
            setEmail(val);

            // ✅ Auto-lock when the email becomes valid
            if (isValidVitStudentEmail(val)) {
              const saved = val.trim().toLowerCase();
              chrome.storage.sync.set({ email: saved }, () => {
                setEmail(saved);
                setEmailLocked(true);
              });
            } else {
              setEmailLocked(false);
            }
          }}
        />
      )}

      {/* Schools multi-select (scrollable) */}
      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <strong>Schools</strong>
          <button
            onClick={clearSchools}
            style={{
              border: "none",
              background: "transparent",
              color: "#dc2626",
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
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 8,
            background: "#fafafa",
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
                  borderRadius: 6,
                  cursor: "pointer",
                }}
                title={s.full} // full name shows on hover
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleSchool(s.full, e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>{s.short}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {checked ? "selected" : ""}
                </span>
              </label>
            );
          })}
        </div>

        {/* Tiny helper line */}
        <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
          Selected:{" "}
          {selectedSchools.length ? selectedSchools.join(", ") : "None"}
        </div>
      </div>

      {/* Manual keyword input */}
      <div style={{ display: "flex", gap: "5px", marginBottom: 10 }}>
        <input
          type="text"
          style={{ flex: 1, padding: "6px" }}
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
          style={{
            padding: "6px 10px",
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      {/* Keyword chips */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginBottom: 10,
        }}
      >
        {keywords.map((word, idx) => (
          <span
            key={`${word}-${idx}`}
            style={{
              background: "#e0e7ff",
              color: "#3730a3",
              padding: "4px 8px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
            }}
            title={schoolFullNames.has(word) ? "School keyword" : "Keyword"}
          >
            {word}
            <button
              onClick={() => removeKeyword(idx)}
              style={{
                marginLeft: "6px",
                background: "transparent",
                border: "none",
                color: "red",
                cursor: "pointer",
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
        style={{
          marginTop: 15,
          width: "100%",
          padding: "8px",
          background: "#4f46e5",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Save Preferences
      </button>
    </div>
  );
}
