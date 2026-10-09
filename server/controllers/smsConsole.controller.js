// The hidden SMS Service console (client route /sms-service/app/manage). One owner password; the page then manages
// BOTH services: GGN Home (this server) and Shine One Estate (the We Three server on Render, called here with a
// shared key so the key never reaches a browser).
const crypto = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const SmsDevice = require("../models/SmsDevice.model");
const SmsLog = require("../models/SmsLog.model");
const SmsQueue = require("../models/SmsQueue.model");
const SmsSetting = require("../models/SmsSetting.model");
const { getLimits, effectiveLimits, dropLimitsCache, HARD_CAPS } = require("./smsGateway.controller");

const ONLINE_WINDOW_MS = 20 * 1000;
const SHINE_URL = () => (process.env.SHINE_API_URL || "https://we-three-api.onrender.com").replace(/\/+$/, "");
const tokenSecret = () => process.env.SMS_CONSOLE_JWT_SECRET || process.env.JWT_SECRET || "";
const todayKey = () => new Date().toISOString().slice(0, 10);

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// ------------------------------------------------------------------ auth ----

// POST /api/sms-console/login { password } -> { token }. Not set up (no SMS_CONSOLE_PASSWORD) = refuses everyone.
exports.login = async (req, res) => {
  const expected = process.env.SMS_CONSOLE_PASSWORD;
  if (!expected || !tokenSecret()) return res.status(404).json({ message: "Not found" });
  await new Promise((r) => setTimeout(r, 400)); // slows guessing
  if (!safeEqual(req.body && req.body.password, expected)) return res.status(401).json({ message: "Wrong password" });
  const token = jwt.sign({ scope: "sms-console" }, tokenSecret(), { expiresIn: "12h" });
  res.json({ token, expiresInHours: 12 });
};

exports.verifyConsole = (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token || !tokenSecret() || !process.env.SMS_CONSOLE_PASSWORD) throw new Error("no token");
    const payload = jwt.verify(token, tokenSecret());
    if (payload.scope !== "sms-console") throw new Error("wrong scope");
    next();
  } catch (e) {
    res.status(401).json({ message: "Please sign in again" });
  }
};

// ----------------------------------------------------------- Shine One ----

async function shine(method, path, data) {
  if (!process.env.SMS_CONSOLE_KEY) {
    const err = new Error("SMS_CONSOLE_KEY is not set on this server");
    err.status = 503;
    throw err;
  }
  try {
    const r = await axios({
      method,
      url: `${SHINE_URL()}/api/sms-console${path}`,
      data,
      headers: { "X-Console-Key": process.env.SMS_CONSOLE_KEY },
      timeout: 70 * 1000, // the free Render server can take a minute to wake up
    });
    return r.data;
  } catch (e) {
    const err = new Error((e.response && e.response.data && (e.response.data.message || (e.response.data.error && e.response.data.error.message))) || "Shine One server is not reachable");
    err.status = (e.response && e.response.status) || 502;
    throw err;
  }
}

// ------------------------------------------------------------- GGN Home ----

async function ggnhomeOverview() {
  const [doc, limits, devices, pending] = await Promise.all([
    SmsSetting.findOne({ key: "ggnhome" }).lean(),
    getLimits(),
    SmsDevice.find().sort({ createdAt: 1 }).lean(),
    SmsQueue.countDocuments({ status: { $in: ["pending", "sending"] } }),
  ]);
  const today = todayKey();
  return {
    settings: { mode: (doc && doc.mode) || "auto", dailyLimit: doc && doc.dailyLimit, hourlyLimit: doc && doc.hourlyLimit, gapMinSec: doc && doc.gapMinSec, gapMaxSec: doc && doc.gapMaxSec, effective: limits, hardCaps: HARD_CAPS },
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
  };
}

// GET /api/sms-console/overview — both services at once; a service that is down shows an error, not a blank page.
exports.overview = async (req, res) => {
  const [gg, sh] = await Promise.all([
    ggnhomeOverview(),
    shine("get", "/overview").then((d) => ({ ok: true, ...d })).catch((e) => ({ ok: false, error: e.message })),
  ]);
  // One row per phone, with a switch for each service (a phone the app has not yet contacted on a server has null there).
  const phones = new Map();
  const row = (id, name) => {
    if (!phones.has(id)) phones.set(id, { deviceId: id, name, online: false, lastSeen: null, appVersion: "", ggnhome: null, shine: null });
    return phones.get(id);
  };
  for (const d of gg.devices) {
    const r = row(d.deviceId, d.name);
    r.ggnhome = d;
    r.name = d.name || r.name;
    r.online = r.online || d.online;
    r.lastSeen = r.lastSeen || d.lastSeen;
    r.appVersion = d.appVersion || r.appVersion;
  }
  if (sh.ok) {
    for (const d of sh.devices || []) {
      const r = row(d.deviceId, d.name);
      r.shine = d;
      r.online = r.online || d.online;
      if (!r.lastSeen || (d.lastSeen && new Date(d.lastSeen) > new Date(r.lastSeen))) r.lastSeen = d.lastSeen;
      r.appVersion = r.appVersion || d.appVersion;
    }
  }
  res.json({ phones: [...phones.values()], ggnhome: { settings: gg.settings, pending: gg.pending }, shine: sh });
};

// PUT /api/sms-console/ggnhome/settings { mode, dailyLimit, hourlyLimit, gapMinSec, gapMaxSec }
exports.saveGgnhomeSettings = async (req, res) => {
  const b = req.body || {};
  const update = {};
  if (b.mode === "auto" || b.mode === "custom") update.mode = b.mode;
  for (const k of ["dailyLimit", "hourlyLimit", "gapMinSec", "gapMaxSec"]) {
    if (b[k] === undefined) continue;
    const n = Number(b[k]);
    if (!Number.isFinite(n) || n < 1) return res.status(400).json({ message: `${k} must be a positive number` });
    update[k] = Math.round(n);
  }
  const doc = await SmsSetting.findOneAndUpdate({ key: "ggnhome" }, { $set: update, $setOnInsert: { key: "ggnhome" } }, { upsert: true, new: true });
  dropLimitsCache();
  res.json({ settings: { mode: doc.mode, dailyLimit: doc.dailyLimit, hourlyLimit: doc.hourlyLimit, gapMinSec: doc.gapMinSec, gapMaxSec: doc.gapMaxSec, effective: effectiveLimits(doc), hardCaps: HARD_CAPS } });
};

// PATCH /api/sms-console/phones/:deviceId { name?, ggnhome?: bool, shine?: bool }
exports.updatePhone = async (req, res) => {
  const { deviceId } = req.params;
  const b = req.body || {};
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 60) : null;
  const local = {};
  if (name) local.name = name;
  if (typeof b.ggnhome === "boolean") local.enabled = b.ggnhome;
  let changed = false;
  if (Object.keys(local).length) {
    const d = await SmsDevice.findOneAndUpdate({ deviceId }, local, { new: true });
    changed = changed || !!d;
  }
  const remote = {};
  if (name) remote.name = name;
  if (typeof b.shine === "boolean") remote.enabled = b.shine;
  if (Object.keys(remote).length) {
    try {
      await shine("patch", `/devices/${encodeURIComponent(deviceId)}`, remote);
      changed = true;
    } catch (e) {
      if (e.status !== 404 && !changed) return res.status(e.status || 502).json({ message: e.message });
    }
  }
  if (!changed) return res.status(404).json({ message: "Phone not found" });
  res.json({ ok: true });
};

// DELETE /api/sms-console/phones/:deviceId (it shows up again if the app keeps polling)
exports.deletePhone = async (req, res) => {
  await SmsDevice.deleteOne({ deviceId: req.params.deviceId });
  await shine("delete", `/devices/${encodeURIComponent(req.params.deviceId)}`).catch(() => {});
  res.json({ ok: true });
};

// GET /api/sms-console/log?service=ggnhome|shine
exports.log = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  if (req.query.service === "shine") return res.json(await shine("get", `/log?limit=${limit}`));
  const rows = await SmsLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  const stale = Date.now() - 10 * 60 * 1000;
  res.json({
    rows: rows.map((r) => ({
      id: r._id,
      phone: r.phoneNumber,
      kind: r.kind,
      status: ["queued", "sending"].includes(r.status) && new Date(r.createdAt).getTime() < stale ? "expired" : r.status,
      deviceName: r.deviceName,
      error: r.error,
      delivery: r.delivery,
      createdAt: r.createdAt,
      sentAt: r.sentAt,
    })),
  });
};

// POST /api/sms-console/test { service, phoneNumber, message? }
exports.test = async (req, res) => {
  const { service, phoneNumber, message } = req.body || {};
  if (service === "shine") return res.json(await shine("post", "/test", { phoneNumber, message }));
  if (!/^\d{10}$/.test(String(phoneNumber || ""))) return res.status(400).json({ message: "Enter a 10-digit mobile number" });
  const { sendSms } = require("../utils/sendSms");
  await sendSms(phoneNumber, String(message || "Hello from SMS Service").slice(0, 300), "test");
  res.json({ ok: true });
};

// Shine One: settings and per-sheet message / Auto-send switch (the We Three server holds these).
exports.saveShineSettings = async (req, res) => res.json(await shine("put", "/settings", req.body || {}));
exports.saveShineSheet = async (req, res) => res.json(await shine("put", "/sheets", req.body || {}));

// Turns a thrown Shine One error into a clean JSON reply instead of a 500 page.
exports.wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => res.status(e.status && e.status < 600 ? e.status : 500).json({ message: e.message || "Server error" }));
