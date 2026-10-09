const crypto = require("crypto");
const SmsQueue = require("../models/SmsQueue.model");
const SmsDevice = require("../models/SmsDevice.model");
const SmsLog = require("../models/SmsLog.model");
const SmsSetting = require("../models/SmsSetting.model");

// Messages older than this are not worth sending (OTP valid for 5 minutes).
const MAX_AGE_MS = 4 * 60 * 1000;
// A phone polls every ~3s, so anything quieter than this is offline.
const ONLINE_WINDOW_MS = 20 * 1000;
// If the phone a message was assigned to doesn't pick it up in this long,
// any other phone may take it (covers a phone dying mid-queue).
const FAILOVER_AFTER_MS = 15 * 1000;
// A message a phone claimed but never reported on (phone died mid-send) goes
// back to the pool after this long.
const RECLAIM_AFTER_MS = 30 * 1000;
// Total send attempts (each on a different phone) before giving up.
const MAX_ATTEMPTS = 3;
// Limits (gap between two SMS from a phone, per-hour and per-day caps) are managed on the SMS console and read from
// SmsSetting; "auto" mode uses these built-in defaults. Hard caps stop a typo from flooding a SIM.
const HARD_CAPS = { hourly: 60, daily: 200 };
const AUTO_LIMITS = {
  dailyLimit: Number(process.env.SMS_DEVICE_DAILY_LIMIT) || 90,
  hourlyLimit: 30,
  gapMinSec: 8,
  gapMaxSec: 14,
};
const clampInt = (v, lo, hi, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
};
function effectiveLimits(doc) {
  if (!doc || doc.mode !== "custom") return { mode: "auto", ...AUTO_LIMITS };
  const gapMin = clampInt(doc.gapMinSec, 1, 600, AUTO_LIMITS.gapMinSec);
  return {
    mode: "custom",
    dailyLimit: clampInt(doc.dailyLimit, 1, HARD_CAPS.daily, AUTO_LIMITS.dailyLimit),
    hourlyLimit: clampInt(doc.hourlyLimit, 1, HARD_CAPS.hourly, AUTO_LIMITS.hourlyLimit),
    gapMinSec: gapMin,
    gapMaxSec: Math.max(gapMin, clampInt(doc.gapMaxSec, 1, 900, AUTO_LIMITS.gapMaxSec)),
  };
}
let limitsCache = { at: 0, value: null };
async function getLimits() {
  if (limitsCache.value && Date.now() - limitsCache.at < 10 * 1000) return limitsCache.value;
  const doc = await SmsSetting.findOne({ key: "ggnhome" }).lean();
  limitsCache = { at: Date.now(), value: effectiveLimits(doc) };
  return limitsCache.value;
}
const dropLimitsCache = () => (limitsCache = { at: 0, value: null });
exports.getLimits = getLimits;
exports.effectiveLimits = effectiveLimits;
exports.dropLimitsCache = dropLimitsCache;
exports.HARD_CAPS = HARD_CAPS;

// Dev-only fallback so a local checkout works without extra setup. Never
// used in production: claimNext() hands back queued OTP text verbatim, so a
// guessable key here would let anyone read live OTPs and take over accounts.
const DEFAULT_TEST_KEY = "test123";
exports.getDeviceKey = () => {
  if (process.env.SMS_DEVICE_KEY) return process.env.SMS_DEVICE_KEY;
  if (process.env.NODE_ENV !== "production") return DEFAULT_TEST_KEY;
  return null; // production with no key configured: reject every request below
};

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
  if (!key || !safeEqual(token, key)) return res.status(401).json({ message: "Unauthorized" });
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
  const { dailyLimit } = await getLimits();
  const underCap = online.filter((d) => d.dayKey !== today || d.sentToday < dailyLimit);
  const ready = underCap.filter((d) => d.ready !== false);
  // Every phone busy/capped: leave it open, the first phone that frees up takes it.
  if (!ready.length) return null;
  const pool = ready;
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
          ready: req.headers["x-device-ready"] !== "0",
          appVersion: String(req.headers["x-app-version"] || "").slice(0, 20),
        },
        // Name only on first sight, so an admin's rename sticks.
        $setOnInsert: { name: String(req.headers["x-device-name"] || "Android phone").slice(0, 60) },
      },
      { upsert: true, new: true }
    );
    // Lets every phone show how much is waiting.
    const pending = await SmsQueue.countDocuments({
      status: "pending",
      createdAt: { $gt: new Date(Date.now() - MAX_AGE_MS) },
    });
    res.set("X-Queue-Pending", String(pending));

    if (!device.enabled || !device.ready) return res.status(204).end();
    const limits = await getLimits();
    // The server paces every phone itself: a random gap after each message, and an hourly cap.
    if (device.nextAllowedAt && device.nextAllowedAt.getTime() > Date.now()) return res.status(204).end();
    const lastHour = await SmsLog.countDocuments({
      deviceId,
      $or: [{ status: "sent", sentAt: { $gt: new Date(Date.now() - 3600 * 1000) } }, { status: "sending" }],
    });
    if (lastHour >= limits.hourlyLimit) return res.status(204).end();

    const now = Date.now();
    const fresh = { createdAt: { $gt: new Date(now - MAX_AGE_MS) }, failedBy: { $ne: deviceId } };
    const msg = await SmsQueue.findOneAndUpdate(
      {
        ...fresh,
        $or: [
          // New message meant for this phone, for anyone, or abandoned by its phone.
          {
            status: "pending",
            $or: [
              { assignedDevice: deviceId },
              { assignedDevice: null },
              { createdAt: { $lt: new Date(now - FAILOVER_AFTER_MS) } },
            ],
          },
          // Claimed by a phone that went quiet: put it back in play.
          { status: "sending", claimedAt: { $lt: new Date(now - RECLAIM_AFTER_MS) } },
        ],
      },
      { status: "sending", sentBy: deviceId, claimedAt: new Date(now) },
      { sort: { createdAt: 1 }, new: true }
    );
    if (!msg) return res.status(204).end();
    const gapMs = (limits.gapMinSec + Math.random() * (limits.gapMaxSec - limits.gapMinSec)) * 1000;
    await SmsDevice.updateOne({ deviceId }, { nextAllowedAt: new Date(now + gapMs) }).catch(() => {});
    // Only ever moves queued -> sending, so a slow write can't overwrite "sent".
    await SmsLog.updateOne(
      { queueId: String(msg._id), status: "queued" },
      { status: "sending", deviceId, deviceName: device.name }
    ).catch(() => {});
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

    const errText = String(error || "").slice(0, 200);
    let finalStatus = status;

    if (status === "sent") {
      // Blank the text — it contains the OTP. The record stays (until its TTL
      // expiry) so delivery state is visible.
      await SmsQueue.updateOne({ _id: req.params.id }, { status: "sent", message: "[sent]" });
    } else {
      // Failed on this phone: hand it to a different phone (up to 3 tries).
      const q = await SmsQueue.findById(req.params.id);
      if (q && (q.attempts || 0) + 1 < MAX_ATTEMPTS) {
        await SmsQueue.updateOne(
          { _id: q._id },
          { status: "pending", assignedDevice: null, error: errText, $inc: { attempts: 1 }, $push: { failedBy: deviceId } }
        );
        finalStatus = "queued";
      } else {
        await SmsQueue.updateOne({ _id: req.params.id }, { status: "failed", error: errText });
      }
    }

    const logUpdate = { status: finalStatus };
    if (status === "sent") logUpdate.sentAt = new Date();
    if (status === "failed") logUpdate.error = errText;
    if (deviceId) logUpdate.deviceId = deviceId;
    await SmsLog.updateOne({ queueId: String(req.params.id) }, logUpdate).catch(() => {});

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
          device.lastError = errText;
        }
        await device.save();
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// Phone reports the carrier's delivery report: { status: "delivered" | "undelivered", detail? }
exports.reportDelivery = async (req, res) => {
  try {
    const { status, detail } = req.body || {};
    if (!["delivered", "undelivered"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const update = { delivery: status, deliveryDetail: String(detail || "").slice(0, 100) };
    if (status === "delivered") update.deliveredAt = new Date();
    await SmsLog.updateOne({ queueId: String(req.params.id) }, update);
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
      dailyLimit: (await getLimits()).dailyLimit,
      pending,
      devices: devices.map((d) => ({
        deviceId: d.deviceId,
        name: d.name,
        enabled: d.enabled,
        ready: d.ready !== false,
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
    await sendSms(phoneNumber, message, "test");
    res.json({ ok: true, message: "Queued — the SMS should arrive in a few seconds" });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/sms-log?limit=100 — newest first
exports.adminSmsLog = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const rows = await SmsLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    // Anything still "queued"/"sending" after the queue's lifetime never went out.
    const stale = Date.now() - 10 * 60 * 1000;
    res.json({
      rows: rows.map((r) => ({
        id: r._id,
        phoneNumber: r.phoneNumber,
        kind: r.kind,
        status:
          ["queued", "sending"].includes(r.status) && new Date(r.createdAt).getTime() < stale ? "expired" : r.status,
        deviceName: r.deviceName,
        error: r.error,
        delivery: r.delivery,
        deliveryDetail: r.deliveryDetail,
        createdAt: r.createdAt,
        sentAt: r.sentAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};
