const crypto = require("crypto");
const SmsQueue = require("../models/SmsQueue.model");
const SmsDevice = require("../models/SmsDevice.model");

// Messages older than this are not worth sending (OTP valid for 5 minutes).
const MAX_AGE_MS = 4 * 60 * 1000;
// A phone polls every ~3s, so anything quieter than this is offline.
const ONLINE_WINDOW_MS = 20 * 1000;
// If the phone a message was assigned to doesn't pick it up in this long,
// any other phone may take it (covers a phone dying mid-queue).
const FAILOVER_AFTER_MS = 15 * 1000;
// Soft cap per SIM per day, to stay clear of carrier spam limits.
const DAILY_LIMIT = Number(process.env.SMS_DEVICE_DAILY_LIMIT) || 90;

// TEMPORARY, FOR TESTING ONLY: falls back to a well-known key when
// SMS_DEVICE_KEY is not set in the environment. Anyone who knows it can read
// queued OTPs, so set a real SMS_DEVICE_KEY on Render before real users.
const DEFAULT_TEST_KEY = "test123";
exports.getDeviceKey = () => process.env.SMS_DEVICE_KEY || DEFAULT_TEST_KEY;

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const todayKey = () => new Date().toISOString().slice(0, 10);

// Auth for the Android app: "Authorization: Bearer <SMS_DEVICE_KEY>"
exports.verifyGatewayDevice = (req, res, next) => {
  const key = exports.getDeviceKey();
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(token, key)) return res.status(401).json({ message: "Unauthorized" });
  next();
};

// Picks the phone that will send a new message: random among phones that are
// enabled, online and under their daily cap. Returns null when none qualify
// (the message is then open to whichever phone comes online first).
exports.pickDevice = async () => {
  const online = await SmsDevice.find({
    enabled: true,
    lastSeen: { $gt: new Date(Date.now() - ONLINE_WINDOW_MS) },
  });
  if (!online.length) return null;
  const today = todayKey();
  const underCap = online.filter((d) => d.dayKey !== today || d.sentToday < DAILY_LIMIT);
  const pool = underCap.length ? underCap : online;
  return pool[crypto.randomInt(pool.length)].deviceId;
};

exports.hasOnlineDevice = async () =>
  (await SmsDevice.countDocuments({
    enabled: true,
    lastSeen: { $gt: new Date(Date.now() - ONLINE_WINDOW_MS) },
  })) > 0;

// Phone polls this. Registers/refreshes the device, then atomically claims
// the oldest pending message that is assigned to it (or open to anyone).
exports.claimNext = async (req, res) => {
  try {
    const deviceId = String(req.headers["x-device-id"] || "").slice(0, 64);
    if (!deviceId) return res.status(400).json({ message: "X-Device-Id header required" });

    const device = await SmsDevice.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          lastSeen: new Date(),
          appVersion: String(req.headers["x-app-version"] || "").slice(0, 20),
        },
        // Name only on first sight, so an admin's rename sticks.
        $setOnInsert: { name: String(req.headers["x-device-name"] || "Android phone").slice(0, 60) },
      },
      { upsert: true, new: true }
    );
    if (!device.enabled) return res.status(204).end();

    const now = Date.now();
    const msg = await SmsQueue.findOneAndUpdate(
      {
        status: "pending",
        createdAt: { $gt: new Date(now - MAX_AGE_MS) },
        $or: [
          { assignedDevice: deviceId },
          { assignedDevice: null },
          { createdAt: { $lt: new Date(now - FAILOVER_AFTER_MS) } },
        ],
      },
      { status: "sending", sentBy: deviceId },
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
    const deviceId = String(req.headers["x-device-id"] || "");

    // Once sent, blank the text — it may contain the OTP. The record stays
    // (until its TTL expiry) so the admin can see delivery state.
    if (status === "sent") await SmsQueue.updateOne({ _id: req.params.id }, { status, message: "[sent]" });
    else await SmsQueue.updateOne({ _id: req.params.id }, { status, error: String(error || "").slice(0, 200) });

    if (deviceId) {
      const device = await SmsDevice.findOne({ deviceId });
      if (device) {
        const today = todayKey();
        if (device.dayKey !== today) {
          device.dayKey = today;
          device.sentToday = 0;
        }
        if (status === "sent") {
          device.sentToday += 1;
          device.sentTotal += 1;
          device.lastSentAt = new Date();
        } else {
          device.failedTotal += 1;
          device.lastError = String(error || "").slice(0, 200);
        }
        await device.save();
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------------------- admin ----

// GET /api/admin/sms-devices
exports.adminListDevices = async (req, res) => {
  try {
    const today = todayKey();
    const devices = await SmsDevice.find().sort({ createdAt: 1 }).lean();
    const pending = await SmsQueue.countDocuments({ status: { $in: ["pending", "sending"] } });
    res.json({
      dailyLimit: DAILY_LIMIT,
      pending,
      devices: devices.map((d) => ({
        deviceId: d.deviceId,
        name: d.name,
        enabled: d.enabled,
        online: !!d.lastSeen && Date.now() - new Date(d.lastSeen).getTime() < ONLINE_WINDOW_MS,
        lastSeen: d.lastSeen,
        appVersion: d.appVersion,
        sentToday: d.dayKey === today ? d.sentToday : 0,
        sentTotal: d.sentTotal,
        failedTotal: d.failedTotal,
        lastSentAt: d.lastSentAt,
        lastError: d.lastError,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin/sms-devices/:deviceId { enabled?, name? }
exports.adminUpdateDevice = async (req, res) => {
  try {
    const update = {};
    if (typeof req.body.enabled === "boolean") update.enabled = req.body.enabled;
    if (typeof req.body.name === "string" && req.body.name.trim()) update.name = req.body.name.trim().slice(0, 60);
    const device = await SmsDevice.findOneAndUpdate({ deviceId: req.params.deviceId }, update, { new: true });
    if (!device) return res.status(404).json({ message: "Device not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/admin/sms-devices/:deviceId (it re-registers if it polls again)
exports.adminDeleteDevice = async (req, res) => {
  try {
    await SmsDevice.deleteOne({ deviceId: req.params.deviceId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/sms-devices/test { phoneNumber, message? } — goes through the
// normal queue, so it also exercises the random device choice.
exports.adminTestSend = async (req, res) => {
  try {
    const { phoneNumber } = req.body || {};
    if (!/^\d{10}$/.test(String(phoneNumber || ""))) return res.status(400).json({ message: "Enter a 10-digit mobile number" });
    const { sendSms } = require("../utils/sendSms");
    const message = String(req.body.message || "Hello from ggnhome-sms-service").slice(0, 300);
    await sendSms(phoneNumber, message);
    res.json({ ok: true, message: "Queued — the SMS should arrive in a few seconds" });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};
