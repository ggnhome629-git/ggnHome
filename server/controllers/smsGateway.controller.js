const crypto = require("crypto");
const SmsQueue = require("../models/SmsQueue.model");

// Messages older than this are not worth sending (OTP valid for 5 minutes).
const MAX_AGE_MS = 4 * 60 * 1000;

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Auth for the Android app: "Authorization: Bearer <SMS_DEVICE_KEY>"
exports.verifyGatewayDevice = (req, res, next) => {
  const key = process.env.SMS_DEVICE_KEY;
  if (!key) return res.status(503).json({ message: "SMS gateway not configured" });
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(token, key)) return res.status(401).json({ message: "Unauthorized" });
  next();
};

// Phone polls this. Atomically claims the oldest pending message.
exports.claimNext = async (req, res) => {
  try {
    const msg = await SmsQueue.findOneAndUpdate(
      { status: "pending", createdAt: { $gt: new Date(Date.now() - MAX_AGE_MS) } },
      { status: "sending" },
      { sort: { createdAt: 1 }, new: true }
    );
    if (!msg) return res.status(204).end();
    res.json({ id: msg._id, phoneNumber: msg.phoneNumber, message: msg.message });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// Phone reports the result: { status: "sent" | "failed", error? }
exports.reportResult = async (req, res) => {
  try {
    const { status, error } = req.body || {};
    if (!["sent", "failed"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    // Once sent, drop the text immediately — it contains the OTP.
    if (status === "sent") await SmsQueue.deleteOne({ _id: req.params.id });
    else await SmsQueue.updateOne({ _id: req.params.id }, { status, error: String(error || "").slice(0, 200) });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};
