/** Redis-backed, privacy-minimal queue for scarce real-time voice sessions. */
const crypto = require("crypto");
const queue = require("../services/voiceQueue.service");

const validTicket = (value) => typeof value === "string" && /^[a-f0-9]{48}$/.test(value);
const unavailable = (res) => res.status(503).json({
  success: false,
  code: "VOICE_QUEUE_UNAVAILABLE",
  message: "Real-time voice queue is temporarily unavailable. You can continue with the standard consultant.",
});

exports.join = async (_req, res) => {
  const livekitUrl = String(process.env.LIVEKIT_URL || "").trim();
  const secureLivekitUrl = /^wss:\/\//i.test(livekitUrl) || /^ws:\/\/(localhost|127\\.0\\.0\\.1)(:|$)/i.test(livekitUrl);
  const livekitReady = secureLivekitUrl && Boolean(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
  if (!livekitReady) return res.status(503).json({ success: false, code: "LIVEKIT_NOT_CONFIGURED", message: "Real-time voice is not available yet. You can continue with the standard consultant." });
  if (!queue.available()) return unavailable(res);
  const ticket = crypto.randomBytes(24).toString("hex");
  try {
    const result = await queue.join(ticket);
    if (result.available === false) return unavailable(res);
    if (result.full) return res.status(429).json({ success: false, code: "VOICE_QUEUE_FULL", message: "The voice queue is full right now. Please use the standard consultant and try again later.", waiting: result.waiting });
    res.set("Cache-Control", "no-store");
    return res.status(201).json({ success: true, ticket, ...result });
  } catch (error) {
    console.error("[voice-queue] join failed:", error?.message || "unknown");
    return unavailable(res);
  }
};

exports.status = async (req, res) => {
  const ticket = req.query?.ticket;
  if (!validTicket(ticket)) return res.status(400).json({ success: false, code: "INVALID_QUEUE_TICKET", message: "Invalid queue ticket." });
  try {
    const result = await queue.status(ticket);
    if (!result.available) return unavailable(res);
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("[voice-queue] status failed:", error?.message || "unknown");
    return unavailable(res);
  }
};

exports.heartbeat = async (req, res) => {
  const ticket = req.body?.ticket;
  if (!validTicket(ticket)) return res.status(400).json({ success: false, code: "INVALID_QUEUE_TICKET", message: "Invalid queue ticket." });
  try {
    const ok = await queue.heartbeat(ticket);
    if (!ok) return res.status(409).json({ success: false, code: "VOICE_QUEUE_LEASE_EXPIRED", message: "Your voice reservation expired. Please rejoin the queue." });
    return res.json({ success: true });
  } catch (error) {
    console.error("[voice-queue] heartbeat failed:", error?.message || "unknown");
    return unavailable(res);
  }
};

exports.leave = async (req, res) => {
  const ticket = req.body?.ticket;
  if (!validTicket(ticket)) return res.status(400).json({ success: false, code: "INVALID_QUEUE_TICKET", message: "Invalid queue ticket." });
  try {
    await queue.leave(ticket);
    return res.json({ success: true });
  } catch (error) {
    console.error("[voice-queue] leave failed:", error?.message || "unknown");
    return unavailable(res);
  }
};
