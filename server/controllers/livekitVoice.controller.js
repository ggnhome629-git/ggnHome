/**
 * LiveKit voice sessions for the AI Property Consultant.
 *
 * Public:  config (safe values only), token (consented, short-lived, one room)
 * Admin:   health (reachability of the LiveKit API; never returns secrets)
 *
 * The LiveKit API secret never leaves this module. Each visitor gets a fresh
 * random room that LiveKit closes on its own shortly after it empties, so no
 * room or agent job outlives the conversation.
 */
const crypto = require("crypto");
const voiceQueue = require("../services/voiceQueue.service");
const { reserveWindow } = require("../services/providerQuota");

const TOKEN_TTL_SECONDS = 10 * 60;
const ROOM_EMPTY_TIMEOUT_SECONDS = 60;
const ROOM_DEPARTURE_TIMEOUT_SECONDS = 20;
const API_TIMEOUT_MS = 6000;

function livekitSettings() {
  const url = String(process.env.LIVEKIT_URL || "").trim();
  const apiKey = String(process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = String(process.env.LIVEKIT_API_SECRET || "").trim();
  const agentName = String(process.env.LIVEKIT_AGENT_NAME || "ggnhome-property-voice").trim();
  const secure = /^wss:\/\//i.test(url) || /^ws:\/\/(localhost|127\.0\.0\.1)(:|$)/i.test(url);
  return { url, apiKey, apiSecret, agentName, secure, enabled: Boolean(url && apiKey && apiSecret && secure) };
}

const apiHost = (url) => url.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(`${label} timed out`), { code: "TIMEOUT" })), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Overridable in tests. */
exports._sdk = () => require("livekit-server-sdk");

exports.getConfig = (_req, res) => {
  const { url, enabled: livekitConfigured, secure } = livekitSettings();
  const queueEnabled = voiceQueue.available();
  const enabled = livekitConfigured && queueEnabled;
  res.set("Cache-Control", "no-store");
  res.json({
    success: true,
    enabled,
    queueEnabled,
    url: enabled ? url : null,
    provider: "self-hosted",
    message: enabled
      ? "Real-time voice is configured."
      : url && !secure
        ? "Real-time voice needs a secure wss:// address."
        : livekitConfigured && !queueEnabled
        ? "Real-time voice queue requires a connected Redis instance. Use the standard consultant meanwhile."
        : "Real-time voice has not been configured on this server yet.",
  });
};

exports.createToken = async (req, res) => {
  if (req.body?.accepted !== true) {
    return res.status(400).json({ success: false, code: "VOICE_CONSENT_REQUIRED", message: "Confirm that you want to start a microphone session first." });
  }

  const { url, apiKey, apiSecret, agentName, enabled } = livekitSettings();
  if (!enabled) {
    return res.status(503).json({
      success: false,
      code: "LIVEKIT_NOT_CONFIGURED",
      message: "Real-time voice isn't set up yet. You can keep going by typing, or use your browser's voice.",
    });
  }

  const queueTicket = req.body?.queueTicket;
  if (!voiceQueue.available()) return res.status(503).json({ success: false, code: "VOICE_QUEUE_UNAVAILABLE", message: "Real-time voice queue is unavailable. Please use the standard consultant." });
  if (typeof queueTicket !== "string" || !/^[a-f0-9]{48}$/.test(queueTicket) || !(await voiceQueue.claimToken(queueTicket))) {
    return res.status(409).json({ success: false, code: "VOICE_QUEUE_RESERVATION_REQUIRED", message: "Join the voice queue and wait until your turn before starting real-time voice. A reservation can only start one session." });
  }
  // Two sessions per six-hour bucket keeps the worst case below ten sessions
  // in any rolling 24-hour period, leaving headroom for free-tier speech quotas.
  // Count only actual token claims; fail closed when shared quota storage is down.
  if (process.env.NODE_ENV !== "test") {
    const configuredLimit = Math.min(2, Math.max(1, Number.parseInt(process.env.VOICE_SESSIONS_PER_6H_LIMIT || "2", 10) || 2));
    const quota = await reserveWindow({ provider: "voice-session", windowMs: 6 * 60 * 60 * 1000, limit: configuredLimit });
    if (!quota.allowed) {
      await voiceQueue.leave(queueTicket).catch(() => {});
      const quotaStoreDown = quota.reason !== "quota_exceeded";
      return res.status(quotaStoreDown ? 503 : 429).json({
        success: false,
        code: quotaStoreDown ? "VOICE_QUOTA_GUARD_UNAVAILABLE" : "VOICE_DAILY_LIMIT",
        message: quotaStoreDown
          ? "Voice quota protection is unavailable. Please use the standard consultant for now."
          : "The free real-time voice allowance is temporarily used up. Please use the standard consultant and try again later.",
      });
    }
  }

  if (!(await voiceQueue.heartbeat(queueTicket))) {
    await voiceQueue.leave(queueTicket).catch(() => {});
    return res.status(409).json({ success: false, code: "VOICE_QUEUE_LEASE_EXPIRED", message: "Your voice reservation expired. Please rejoin the queue." });
  }

  const { AccessToken, RoomServiceClient, AgentDispatchClient } = exports._sdk();
  const host = apiHost(url);
  const identity = `visitor_${crypto.randomBytes(10).toString("hex")}`;
  const roomName = `ggnhome-ai-${crypto.randomBytes(10).toString("hex")}`;
  const lang = ["en", "hi", "hinglish"].includes(req.body?.lang) ? req.body.lang : "en";
  const metadata = JSON.stringify({ app: "ggnhome", role: "visitor", lang });

  // 1. A dedicated room that closes itself once the visitor leaves.
  try {
    const rooms = new RoomServiceClient(host, apiKey, apiSecret);
    await withTimeout(
      rooms.createRoom({
        name: roomName,
        emptyTimeout: ROOM_EMPTY_TIMEOUT_SECONDS,
        departureTimeout: ROOM_DEPARTURE_TIMEOUT_SECONDS,
        maxParticipants: 3,
        metadata,
      }),
      API_TIMEOUT_MS,
      "createRoom"
    );
  } catch (error) {
    await voiceQueue.leave(queueTicket).catch(() => {});
    console.error("LiveKit room creation failed:", error?.code || error?.name || "error");
    return res.status(503).json({ success: false, code: "LIVEKIT_UNREACHABLE", message: "The voice server isn't responding right now. Please type instead, or try again in a minute." });
  }

  // 2. Ask the GgnHome voice worker to join. Without it nobody would listen.
  try {
    const dispatch = new AgentDispatchClient(host, apiKey, apiSecret);
    await withTimeout(dispatch.createDispatch(roomName, agentName, { metadata }), API_TIMEOUT_MS, "createDispatch");
  } catch (error) {
    try { await new RoomServiceClient(host, apiKey, apiSecret).deleteRoom(roomName); } catch (_) {}
    await voiceQueue.leave(queueTicket).catch(() => {});
    console.error("LiveKit agent dispatch failed:", error?.code || error?.name || "error");
    return res.status(503).json({ success: false, code: "VOICE_AGENT_UNAVAILABLE", message: "The voice assistant is busy or offline. Please type instead, or try again in a minute." });
  }

  // 3. A short-lived visitor token for this room only, with no admin grants.
  try {
    const token = new AccessToken(apiKey, apiSecret, { identity, ttl: TOKEN_TTL_SECONDS, metadata });
    token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
    const jwt = await token.toJwt();
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, url, token: jwt, identity, roomName, expiresIn: TOKEN_TTL_SECONDS });
  } catch (error) {
    try { await new RoomServiceClient(host, apiKey, apiSecret).deleteRoom(roomName); } catch (_) {}
    await voiceQueue.leave(queueTicket).catch(() => {});
    console.error("LiveKit token signing failed:", error?.name || "error");
    return res.status(503).json({ success: false, code: "LIVEKIT_TOKEN_UNAVAILABLE", message: "The voice session couldn't start. Please type instead." });
  }
};

/** Admin: is the LiveKit API reachable with these credentials, and how busy is it? */
exports.health = async (_req, res) => {
  const { url, apiKey, apiSecret, agentName, enabled, secure } = livekitSettings();
  res.set("Cache-Control", "no-store");
  const base = { configured: enabled, secureUrl: secure, url: url || null, agentName };
  if (!enabled) return res.json({ success: true, ...base, reachable: false, reason: "not_configured" });
  const started = Date.now();
  try {
    const { RoomServiceClient } = exports._sdk();
    const rooms = await withTimeout(new RoomServiceClient(apiHost(url), apiKey, apiSecret).listRooms(), API_TIMEOUT_MS, "listRooms");
    const queueStats = await voiceQueue.stats().catch(() => ({ available: false }));
    const voiceRooms = (rooms || []).filter((r) => String(r.name || "").startsWith("ggnhome-ai-"));
    return res.json({
      success: true,
      ...base,
      reachable: true,
      latencyMs: Date.now() - started,
      activeVoiceRooms: voiceRooms.length,
      activeParticipants: voiceRooms.reduce((n, r) => n + Number(r.numParticipants || 0), 0),
      queue: queueStats,
      note: "Agent worker health is visible in the worker logs; a dispatch failure on /token means no worker is registered.",
    });
  } catch (error) {
    return res.json({ success: true, ...base, reachable: false, latencyMs: Date.now() - started, reason: error?.code === "TIMEOUT" ? "timeout" : "unreachable" });
  }
};
