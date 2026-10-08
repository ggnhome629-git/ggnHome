/**
 * Firebase Cloud Messaging sender for the Android app.
 *
 * Credentials: set FIREBASE_SERVICE_ACCOUNT (the service-account JSON, raw or
 * base64) or GOOGLE_APPLICATION_CREDENTIALS (path to the JSON file). With
 * neither set, every send is a no-op and `isConfigured()` is false, so the
 * rest of the server runs unchanged.
 */
const DeviceToken = require("../models/DeviceToken.model");

let messaging = null;
let initTried = false;

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(text);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return require(require("path").resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
  }
  return null;
}

function getMessaging() {
  if (messaging || initTried) return messaging;
  initTried = true;
  try {
    const cred = loadCredential();
    if (!cred) return null;
    const admin = require("firebase-admin");
    const app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(cred) });
    messaging = admin.messaging(app);
  } catch (err) {
    console.warn("[push] Firebase init failed:", err.message);
  }
  return messaging;
}

const isConfigured = () => Boolean(getMessaging());

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/**
 * Send one notification to many tokens (batched by 500). Removes tokens FCM
 * reports as dead. Returns { sent, failed }.
 */
async function sendToTokens(tokens, { title, body, link = "/", image, data = {} }) {
  const fcm = getMessaging();
  if (!fcm || !tokens.length) return { sent: 0, failed: 0, skipped: true };

  let sent = 0;
  let failed = 0;
  const dead = [];

  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await fcm.sendEachForMulticast({
      tokens: batch,
      notification: { title, body, ...(image ? { imageUrl: image } : {}) },
      data: { link: String(link), ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) },
      android: {
        priority: "high",
        notification: { channelId: "ggnhome_updates", color: "#00A79D", clickAction: "FCM_PLUGIN_ACTIVITY" },
      },
    });
    sent += res.successCount;
    failed += res.failureCount;
    res.responses.forEach((r, idx) => {
      if (!r.success && INVALID_TOKEN_CODES.has(r.error?.code)) dead.push(batch[idx]);
    });
  }

  if (dead.length) await DeviceToken.deleteMany({ token: { $in: dead } });
  return { sent, failed };
}

module.exports = { isConfigured, sendToTokens };
