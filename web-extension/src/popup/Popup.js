/* global chrome */
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Popup() {
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);
  const [view, setView] = useState("main"); // "main" or "settings"
  const [highlightColor, setHighlightColor] = useState("yellow");

  const handleColorChange = (color) => {
    setHighlightColor(color);
    chrome.storage.sync.set({ highlightColor: color }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "refreshHighlight",
          highlightColor: color,
          keywords,
        });
      });
    });
  };

  // Load saved values from chrome storage
  useEffect(() => {
    chrome.storage.sync.get(
      ["keywords", "email", "highlightColor"],
      (result) => {
        if (result.keywords) {
          setKeywords(
            Array.isArray(result.keywords)
              ? result.keywords
              : result.keywords.split(",").map((k) => k.trim())
          );
        }
        if (result.email) {
          setEmail(result.email);
          setEmailLocked(true);
        }
        if (result.highlightColor) {
          setHighlightColor(result.highlightColor);
        }
      }
    );
  }, []);

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      const updated = [...keywords, newKeyword.trim()];
      setKeywords(updated);
      setNewKeyword("");
      chrome.storage.sync.set({ keywords: updated }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "refreshHighlight",
            highlightColor,
            keywords: updated,
          });
        });
      });
    }
  };

  const removeKeyword = (idx) => {
    const updated = keywords.filter((_, i) => i !== idx);
    setKeywords(updated);
    chrome.storage.sync.set({ keywords: updated }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "refreshHighlight",
          highlightColor,
          keywords: updated,
        });
      });
    });
  };

  const savePreferences = async () => {
    // Save locally in extension storage
    chrome.storage.sync.set({ keywords, email, highlightColor }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "refreshHighlight",
          highlightColor,
          keywords,
        });
      });
    });

    try {
      if (!emailLocked) {
        // First-time registration → backend will send verification email
        await axios.post("http://127.0.0.1:4000/api/user/register", {
          email,
          preferences: keywords,
        });
        alert("Verification email sent. Please check your inbox.");
        setEmailLocked(true);
      } else {
        // Updating preferences
        await axios.post("http://127.0.0.1:4000/api/preferences/update", {
          email,
          preferences: keywords,
        });
        alert("Preferences updated successfully.");
      }
    } catch (err) {
      console.error("Error saving to backend:", err);
      alert("Error saving to backend");
    }
  };

  const requestEmailChange = async () => {
    try {
      await axios.post("http://127.0.0.1:4000/api/user/request-email-change", {
        oldEmail: email,
        newEmail: email,
      });
      alert(
        "Verification email sent to new address. Please confirm to complete change."
      );
    } catch (err) {
      console.error("Error requesting email change:", err);
      alert("Error requesting email change");
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

        <p style={{ marginBottom: 6 }}>Edit email:</p>
        <input
          type="email"
          style={{
            width: "100%",
            marginBottom: 20,
            padding: "6px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          placeholder="Enter your VIT email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailLocked(false); // unlock email when editing
          }}
        />

        <button
          onClick={requestEmailChange}
          style={{
            width: "100%",
            padding: "8px",
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Change Email
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

      {!emailLocked ? (
        <input
          type="email"
          style={{ width: "100%", marginBottom: 10, padding: "6px" }}
          placeholder="Enter your VIT email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      ) : (
        <p>
          <strong>Email:</strong> {email}
        </p>
      )}

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
          }}
        >
          Add
        </button>
      </div>

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
            key={idx}
            style={{
              background: "#e0e7ff",
              color: "#3730a3",
              padding: "4px 8px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
            }}
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
        }}
      >
        Save Preferences
      </button>
    </div>
  );
}
