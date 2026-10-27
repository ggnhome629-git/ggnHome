import { API_BASE } from "../../utils/apiBase";
/** Thin client for /api/ai-consultant/*. Every call degrades to a readable error. */
const BASE = API_BASE || "";

async function post(path, body, { auth = false, timeoutMs = 20000, keepalive = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch (_) {
      // storage unavailable
    }
  }
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers,
      credentials: "include",
      keepalive,
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });
    if (res.status === 204) return { ok: true };
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && data.message) || "Something went wrong. Please try again.");
      err.status = res.status;
      err.code = data && data.code;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error("The connection is slow — please try again.");
      e.status = 0;
      throw e;
    }
    if (!err.status && err.status !== 0) err.message = "You seem to be offline. Check your connection and try again.";
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function get(path, { timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { credentials: "omit", signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.message || "This is unavailable right now."); err.status = res.status; err.code = data.code; throw err; }
    return data;
  } finally { clearTimeout(timer); }
}

export const consultantApi = {
  joinVoiceQueue: () => post("/api/ai-consultant/voice-queue/join", {}),
  voiceQueueStatus: (ticket) => get(`/api/ai-consultant/voice-queue/status?ticket=${encodeURIComponent(ticket)}`),
  voiceQueueHeartbeat: (ticket) => post("/api/ai-consultant/voice-queue/heartbeat", { ticket }),
  leaveVoiceQueue: (ticket, options) => post("/api/ai-consultant/voice-queue/leave", { ticket }, options),
  turn: (state, message, action, disableLLM = false) => post("/api/ai-consultant/turn", { state, message, action, disableLLM }),
  search: (state, more = false) => post("/api/ai-consultant/search", { state, more }, { timeoutMs: 25000 }),
  lead: (payload) => post("/api/ai-consultant/lead", payload, { auth: true }),
  enquiry: (payload) => post("/api/ai-consultant/enquiry", payload, { auth: true }),
  preview: (state) => post("/api/ai-consultant/preview", { state }, { timeoutMs: 15000 }),
  nearbyAreas: async (lat, lng) => {
    const res = await fetch(`${BASE}/api/ai-consultant/nearby-areas?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`, { credentials: "omit" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Couldn't find nearby areas right now.");
    return data;
  },
  mapConfig: () => get("/api/ai-consultant/map/config"),
  lane: (mode, q) => get(`/api/ai-consultant/map/lane?mode=${mode === "sale" ? "sale" : "rent"}&q=${encodeURIComponent(q)}`, { timeoutMs: 15000 }),
  areaAmenities: (lat, lng) => get(`/api/ai-consultant/map/amenities?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`, { timeoutMs: 12000 }),
  metric: (name) => post("/api/ai-consultant/metric", { name }).catch(() => {}),
};

export function newIdempotencyKey() {
  try {
    if (window.crypto && window.crypto.randomUUID) return `ai_${window.crypto.randomUUID().replace(/-/g, "")}`;
  } catch (_) {
    // fall through
  }
  return `ai_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}
