/**
 * Push notifications for the Android app.
 *
 *  - runPopularPush(): broadcasts this week's hottest listing (not pushed in
 *    the last 14 days) to every device that has popular alerts on.
 *  - runPersonalPush(): once a week, nudges signed-in devices with the best
 *    "For You" match.
 *
 * Triggered daily at 6:30 PM IST by node-cron (startPopularPushScheduler) or
 * from outside via GET /api/cron/popular-push (Render free tier sleeps, so an
 * external pinger is the reliable trigger).
 */
const cron = require("node-cron");
const DeviceToken = require("../models/DeviceToken.model");
const PushLog = require("../models/PushLog.model");
const Notification = require("../models/Notification.model");
const push = require("../services/push");
const { getPopularProperties, getRecommendations, formatPrice } = require("../services/appRecommender");

const DAY = 24 * 60 * 60 * 1000;

function describe(p) {
  const bits = [p.configuration || (p.bedrooms ? `${p.bedrooms} BHK` : null), p.areaSqft ? `${p.areaSqft} sq.ft` : null, p.priceLabel || formatPrice(p.type, p.price)]
    .filter(Boolean)
    .join(" · ");
  return bits;
}

/** Keep a copy in each signed-in user's in-app notification inbox. */
async function inbox(userIds, { title, body, link }) {
  const ids = (userIds || []).filter(Boolean).slice(0, 1000);
  if (!ids.length) return;
  try {
    await Notification.insertMany(ids.map((userId) => ({ userId, type: "app_push", title, body, link, channel: "push" })));
  } catch (err) {
    console.warn("[push] inbox write failed:", err.message);
  }
}

async function runPopularPush({ dryRun = false } = {}) {
  if (!push.isConfigured()) return { ok: false, reason: "Firebase credentials not configured (FIREBASE_SERVICE_ACCOUNT)" };

  const recentlyPushed = await PushLog.find({ kind: "popular", sentAt: { $gte: new Date(Date.now() - 14 * DAY) } })
    .select("propertyId")
    .lean();
  const skip = new Set(recentlyPushed.map((r) => String(r.propertyId)));

  const popular = await getPopularProperties(15);
  const pick = popular.find((p) => !skip.has(p.id));
  if (!pick) return { ok: true, sent: 0, reason: "No new popular property to announce" };

  const devices = await DeviceToken.find({ popularPushes: true }).select("token").lean();
  const tokens = devices.map((d) => d.token);
  const message = {
    title: `🔥 Popular this week${pick.sector ? ` in ${pick.sector}` : ""}`,
    body: `${pick.title} — ${describe(pick)}`,
    link: pick.path,
    image: pick.image && /^https:/.test(pick.image) ? pick.image : undefined,
    data: { kind: "popular", propertyId: pick.id },
  };
  if (dryRun) return { ok: true, dryRun: true, property: pick.id, devices: tokens.length, message };

  const result = await push.sendToTokens(tokens, message);
  await PushLog.create({ propertyId: pick.id, propertyType: pick.type, kind: "popular", sent: result.sent, failed: result.failed });
  await inbox(devices.length ? await DeviceToken.distinct("userId", { popularPushes: true, userId: { $ne: null } }) : [], message);
  return { ok: true, property: pick.id, devices: tokens.length, ...result };
}

async function runPersonalPush({ max = 300 } = {}) {
  if (!push.isConfigured()) return { ok: false, reason: "Firebase credentials not configured" };
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const devices = await DeviceToken.find({
    userId: { $ne: null },
    personalPushes: true,
    $or: [{ lastPersonalPushAt: null }, { lastPersonalPushAt: { $lt: weekAgo } }],
  })
    .limit(max)
    .lean();

  let sent = 0;
  for (const d of devices) {
    try {
      const rec = await getRecommendations({ userId: String(d.userId), limit: 5 });
      if (!rec.personalised) continue; // only nudge people we actually know something about
      const top = rec.sections[0]?.items?.[0];
      if (!top) continue;
      const r = await push.sendToTokens([d.token], {
        title: "Picked for you 🏡",
        body: `${top.title} — ${describe(top)}`,
        link: top.path,
        image: top.image && /^https:/.test(top.image) ? top.image : undefined,
        data: { kind: "personal", propertyId: top.id },
      });
      sent += r.sent;
      await inbox([d.userId], { title: "Picked for you 🏡", body: `${top.title} — ${describe(top)}`, link: top.path });
      await DeviceToken.updateOne({ _id: d._id }, { lastPersonalPushAt: new Date() });
    } catch (err) {
      console.warn("[push] personal push failed:", err.message);
    }
  }
  return { ok: true, devices: devices.length, sent };
}

function startPopularPushScheduler() {
  cron.schedule(
    "30 18 * * *",
    async () => {
      try {
        console.log("[push] popular:", JSON.stringify(await runPopularPush()));
        console.log("[push] personal:", JSON.stringify(await runPersonalPush()));
      } catch (err) {
        console.error("[push] scheduler error:", err.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );
  console.log("[push] popular/personal push scheduler armed (18:30 IST)");
}

module.exports = { runPopularPush, runPersonalPush, startPopularPushScheduler };
