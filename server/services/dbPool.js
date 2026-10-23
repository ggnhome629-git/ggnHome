const mongoose = require("mongoose");
const { mongoUris } = require("../config/db");

/**
 * Database pool: every configured MongoDB URI (MONGO_URI, MONGO_URI_2, ...) is a "slot".
 * Slot 1 is the main connection the whole app uses. Extra slots only receive overflow data
 * (log-style collections, see models/overflow.js), so the core data never leaves slot 1.
 *
 *  - active : the first slot that is below the full threshold. New overflow writes go here.
 *  - saved  : holds data, below the threshold, not the active one.
 *  - full   : at or above MONGO_FULL_PERCENT (default 90) of MONGO_QUOTA_MB (default 512).
 *  - waiting: configured but still empty and not active.
 *  - offline: could not be reached.
 * A slot that was full stays full until it drops under the threshold minus 5 points.
 */
const FULL_PERCENT = () => Number(process.env.MONGO_FULL_PERCENT) || 90;
const QUOTA_MB = () => Number(process.env.MONGO_QUOTA_MB) || 512;
const REFRESH_MS = 5 * 60 * 1000;
const MB = 1024 * 1024;

const conns = new Map(); // slot index -> mongoose connection
const wasFull = new Set();
let snapshot = { at: 0, slots: [], activeIndex: 0 };
let inflight = null;

function connectionFor(i) {
  if (i === 0) return mongoose.connection;
  if (!conns.has(i)) {
    const uri = mongoUris()[i];
    const c = mongoose.createConnection(uri, { maxPoolSize: 3, serverSelectionTimeoutMS: 6000, connectTimeoutMS: 8000 });
    c.on("error", () => {});
    conns.set(i, c);
  }
  return conns.get(i);
}

async function measure(i) {
  try {
    const conn = connectionFor(i);
    await conn.asPromise();
    const s = await conn.db.stats();
    const usedBytes = (s.storageSize || 0) + (s.indexSize || 0);
    const percent = Math.round((usedBytes / (QUOTA_MB() * MB)) * 1000) / 10;
    return { ok: true, usedMB: Math.round((usedBytes / MB) * 10) / 10, percent, objects: s.objects || 0, collections: s.collections || 0 };
  } catch (err) {
    return { ok: false };
  }
}

async function refresh() {
  if (inflight) return inflight;
  inflight = (async () => {
    const n = mongoUris().length;
    const rows = [];
    for (let i = 0; i < n; i += 1) rows.push({ slot: i + 1, ...(await measure(i)) });
    const limit = FULL_PERCENT();
    rows.forEach((r, idx) => {
      if (!r.ok) return;
      if (r.percent >= limit) wasFull.add(idx);
      else if (r.percent < limit - 5) wasFull.delete(idx);
      r.full = wasFull.has(idx);
    });
    let activeIndex = rows.findIndex((r) => r.ok && !r.full);
    if (activeIndex < 0) activeIndex = Math.max(0, snapshot.activeIndex || 0); // all full: stay put, admin is warned
    const slots = rows.map((r, idx) => ({
      ...r,
      state: !r.ok ? "offline" : r.full ? "full" : idx === activeIndex ? "active" : r.objects > 0 ? "saved" : "waiting",
    }));
    snapshot = { at: Date.now(), slots, activeIndex, limit, quotaMB: QUOTA_MB(), allFull: slots.length > 0 && slots.every((s) => s.state === "full" || s.state === "offline") };
    return snapshot;
  })().finally(() => { inflight = null; });
  return inflight;
}

const getSnapshot = async (force = false) => (force || Date.now() - snapshot.at > REFRESH_MS ? refresh() : snapshot);

function start() {
  if (mongoUris().length < 2) return;
  refresh().catch(() => {});
  setInterval(() => refresh().catch(() => {}), REFRESH_MS).unref();
}

const activeConnection = () => connectionFor(snapshot.activeIndex || 0);
const allConnections = () => mongoUris().map((_, i) => connectionFor(i));

module.exports = { start, getSnapshot, refresh, activeConnection, allConnections, connectionFor };
