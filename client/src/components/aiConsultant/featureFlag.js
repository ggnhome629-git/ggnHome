import { API_BASE } from "../../utils/apiBase";
import { useEffect, useState } from "react";

/**
 * Master switch for the AI Consultant (chat + voice) on the public site.
 * An admin turns it on or off from the top of the admin panel; the site reads it from /api/features.
 * Off = hidden everywhere: no auto-open, no launch buttons, no wake-up call.
 *
 * The last answer is remembered on the phone so the first paint already matches, and any failure to
 * reach the server leaves the previous answer (default: off) in place.
 */
const STORAGE_KEY = "ggn:aiAssistant";
const listeners = new Set();
let started = false;

const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

let value = readSaved();

const set = (next) => {
  if (next === value) return;
  value = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* storage can be blocked; the switch still works for this visit */
  }
  listeners.forEach((listener) => listener(next));
};

export async function refreshAiConsultantFlag() {
  try {
    const response = await fetch(`${API_BASE || ""}/api/features`, { credentials: "include" });
    if (!response.ok) return;
    const data = await response.json();
    set(data.aiAssistant === true);
  } catch {
    /* keep the last known answer */
  }
}

if (typeof window !== "undefined") {
  // The admin switch announces itself so the open admin tab updates at once.
  window.addEventListener("featureTogglesUpdated", (event) => {
    if (typeof event.detail?.aiAssistant === "boolean") set(event.detail.aiAssistant);
  });
}

export function useAiConsultantEnabled() {
  const [enabled, setEnabled] = useState(value);
  useEffect(() => {
    listeners.add(setEnabled);
    setEnabled(value);
    if (!started) {
      started = true;
      refreshAiConsultantFlag();
    }
    return () => listeners.delete(setEnabled);
  }, []);
  return enabled;
}
