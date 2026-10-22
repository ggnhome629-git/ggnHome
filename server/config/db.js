const mongoose = require("mongoose");
require("dotenv").config();

/**
 * MongoDB connection with failover.
 *
 * URIs, in order of preference: MONGO_URI, then MONGO_URI_2, MONGO_URI_3, ... (the same numbering as the
 * Cloudinary accounts). Every URI must point at the SAME data (a replica set, or a standby cluster that is
 * kept in sync), because the app switches to the next one when the current one stays down.
 *
 *  - Start-up: tries each URI in turn, a few rounds with a growing pause, then gives up (the host restarts us).
 *  - Running: the driver reconnects to the current URI by itself. If it stays down for MONGO_FAILOVER_AFTER_MS
 *    (default 30 s) and another URI exists, the app moves to the next URI.
 *
 * Tuning (all optional): MONGO_MAX_POOL_SIZE (10), MONGO_MIN_POOL_SIZE (2), MONGO_SERVER_SELECTION_MS (8000),
 * MONGO_SOCKET_TIMEOUT_MS (45000), MONGO_CONNECT_ROUNDS (4).
 * Keep (instances x MONGO_MAX_POOL_SIZE) below the connection limit of your Mongo plan.
 */

const num = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

function mongoUris(env = process.env) {
  const uris = [];
  if (env.MONGO_URI && env.MONGO_URI.trim()) uris.push(env.MONGO_URI.trim());
  Object.keys(env)
    .map((key) => key.match(/^MONGO_URI_(\d+)$/))
    .filter(Boolean)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .forEach((m) => { if (env[m[0]] && env[m[0]].trim()) uris.push(env[m[0]].trim()); });
  return [...new Set(uris)];
}

const connectOptions = () => ({
  maxPoolSize: num("MONGO_MAX_POOL_SIZE", 10),
  minPoolSize: num("MONGO_MIN_POOL_SIZE", 2),
  maxIdleTimeMS: 45000,
  serverSelectionTimeoutMS: num("MONGO_SERVER_SELECTION_MS", 8000),
  connectTimeoutMS: 10000,
  socketTimeoutMS: num("MONGO_SOCKET_TIMEOUT_MS", 45000),
});

// Never log credentials.
const mask = (text) => String(text || "").replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]*@/gi, "$1***@");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let activeIndex = -1;
let shuttingDown = false;
let switching = false;
let downTimer = null;
let listening = false;

async function connectInOrder(startAt = 0) {
  const uris = mongoUris();
  if (!uris.length) throw new Error("MONGO_URI is not set");
  const rounds = num("MONGO_CONNECT_ROUNDS", 4);
  let lastError;
  for (let round = 0; round < rounds; round += 1) {
    for (let step = 0; step < uris.length; step += 1) {
      const i = (startAt + step) % uris.length;
      try {
        await mongoose.connect(uris[i], connectOptions());
        activeIndex = i;
        console.log(`MongoDB connected (database ${i + 1} of ${uris.length}).`);
        return i;
      } catch (err) {
        lastError = err;
        console.warn(`MongoDB ${i + 1} of ${uris.length} is not reachable: ${mask(err.message)}`);
        try { await mongoose.disconnect(); } catch (_) { /* nothing to close */ }
      }
    }
    if (round < rounds - 1) await sleep(Math.min(2000 * 2 ** round, 15000));
  }
  throw lastError;
}

// While running: if the connection stays down, move to the next database.
function watchConnection() {
  if (listening) return;
  listening = true;
  const failoverAfter = num("MONGO_FAILOVER_AFTER_MS", 30000);

  mongoose.connection.on("connected", () => {
    clearTimeout(downTimer);
    downTimer = null;
  });
  mongoose.connection.on("disconnected", () => {
    if (shuttingDown || downTimer) return;
    console.warn("MongoDB disconnected. Waiting for the driver to reconnect.");
    downTimer = setTimeout(async () => {
      downTimer = null;
      if (shuttingDown || switching || mongoose.connection.readyState === 1) return;
      const uris = mongoUris();
      if (uris.length < 2) return; // nowhere else to go: keep retrying the same one
      switching = true;
      try {
        console.warn("MongoDB stayed down. Switching to the next database.");
        try { await mongoose.disconnect(); } catch (_) { /* already closed */ }
        await connectInOrder((activeIndex + 1) % uris.length);
      } catch (err) {
        console.error("MongoDB failover failed:", mask(err.message));
      } finally {
        switching = false;
      }
    }, failoverAfter);
    if (downTimer.unref) downTimer.unref();
  });
  mongoose.connection.on("error", (err) => console.error("MongoDB error:", mask(err.message)));
}

const connectDB = async () => {
  watchConnection();
  try {
    await connectInOrder(0);
  } catch (err) {
    console.error("MongoDB could not be reached:", mask(err.message));
    process.exit(1);
  }
};

async function closeDB() {
  shuttingDown = true;
  clearTimeout(downTimer);
  try { await mongoose.disconnect(); } catch (_) { /* already closed */ }
}

// For the readiness check: no addresses or credentials.
function dbStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const uris = mongoUris();
  return {
    state: states[mongoose.connection.readyState] || "unknown",
    connected: mongoose.connection.readyState === 1,
    database: activeIndex >= 0 ? activeIndex + 1 : null,
    configured: uris.length,
  };
}

module.exports = connectDB;
module.exports.closeDB = closeDB;
module.exports.dbStatus = dbStatus;
module.exports.mongoUris = mongoUris;
