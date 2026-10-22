/**
 * Weekly smart push campaign for GgnHome.
 * Sends a database-backed property match when one exists; otherwise sends a
 * useful non-property update. Each device is rate-limited to one campaign per
 * week and all copy comes from data/notification-templates.json.
 */
const cron = require("node-cron");
const { runOnce } = require("../utils/jobLock");
const DeviceToken = require("../models/DeviceToken.model");
const Notification = require("../models/Notification.model");
const templates = require("../data/notification-templates.json").templates;
const push = require("./push");
const { getRecommendations } = require("./appRecommender");

const WEEK = 7 * 24 * 60 * 60 * 1000;
const clean = (value, fallback = "") => String(value ?? fallback).replace(/[\r\n]+/g, " ").trim();

function chooseTemplate(category, seed) {
  const choices = templates.filter((t) => t.category === category);
  if (!choices.length) throw new Error(`No notification templates for category: ${category}`);
  let hash = 0;
  for (const char of String(seed)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return choices[hash % choices.length];
}

function render(template, property) {
  const values = {
    propertyTitle: clean(property?.title, "A property on GgnHome"),
    priceLabel: clean(property?.priceLabel, "Price on request"),
    sector: clean(property?.sector || property?.location, "your preferred area"),
    location: clean(property?.location || property?.sector, "your search area"),
    bedrooms: clean(property?.bedrooms, "home"),
    propertyPath: clean(property?.path, "/search"),
  };
  const fill = (value) => String(value || "").replace(/{{(\w+)}}/g, (_, key) => values[key] ?? "");
  return {
    templateId: template.id,
    category: template.category,
    title: fill(template.title).slice(0, 100),
    body: fill(template.body).slice(0, 240),
    link: template.requiresProperty ? values.propertyPath : "/search",
  };
}

async function runSmartNotifications({ dryRun = false, max = 300 } = {}) {
  if (!push.isConfigured()) {
    return { ok: false, sent: 0, reason: "Firebase credentials are not configured" };
  }

  const cutoff = new Date(Date.now() - WEEK);
  const devices = await DeviceToken.find({
    $or: [{ generalPushes: true }, { generalPushes: { $exists: false } }, { personalPushes: true }],
    $and: [{ $or: [{ lastGeneralPushAt: null }, { lastGeneralPushAt: { $lt: cutoff } }] }],
  }).sort({ lastGeneralPushAt: 1, createdAt: 1 }).limit(Math.min(Math.max(Number(max) || 300, 1), 1000)).lean();

  if (dryRun) {
    const sample = devices[0];
    let property = null;
    if (sample?.userId && sample.personalPushes) {
      try {
        const rec = await getRecommendations({ userId: String(sample.userId), limit: 5 });
        if (rec.personalised) property = rec.sections?.[0]?.items?.[0] || null;
      } catch (_) {}
    }
    const template = chooseTemplate(property ? "property_match" : "general", sample?._id || "preview");
    return { ok: true, dryRun: true, eligibleDevices: devices.length, sample: sample ? render(template, property) : null };
  }

  let sent = 0;
  let failed = 0;
  let propertyMatches = 0;
  let general = 0;
  const inboxWritten = new Set();

  for (const device of devices) {
    try {
      let property = null;
      if (device.userId && device.personalPushes &&
          (!device.lastPersonalPushAt || new Date(device.lastPersonalPushAt) < cutoff)) {
        const rec = await getRecommendations({ userId: String(device.userId), limit: 5 });
        if (rec.personalised) property = rec.sections?.[0]?.items?.[0] || null;
      }

      if (!property && !device.generalPushes) continue;
      const template = chooseTemplate(property ? "property_match" : "general", `${device._id}:${new Date().toISOString().slice(0, 10)}`);
      const message = render(template, property);
      const result = await push.sendToTokens([device.token], {
        title: message.title,
        body: message.body,
        link: message.link,
        image: property?.image && /^https:\/\/\//i.test(property.image) ? property.image : undefined,
        data: {
          kind: property ? "personal" : "general",
          category: message.category,
          templateId: message.templateId,
          ...(property?.id ? { propertyId: property.id } : {}),
        },
      });

      if (result.sent > 0) {
        sent += result.sent;
        if (property) propertyMatches += 1;
        else general += 1;
        if (device.userId && !inboxWritten.has(String(device.userId))) {
          await Notification.create({
            userId: device.userId,
            type: property ? "property_match" : "general_update",
            title: message.title,
            body: message.body,
            link: message.link,
            channel: "push",
          });
          inboxWritten.add(String(device.userId));
        }
        await DeviceToken.updateOne({ _id: device._id }, {
          $set: {
            lastGeneralPushAt: new Date(),
            ...(property ? { lastPersonalPushAt: new Date() } : {}),
          },
        });
      } else if (!result.skipped) {
        failed += result.failed || 1;
      }
    } catch (err) {
      failed += 1;
      console.warn("[smart-push] device delivery failed:", err.message);
    }
  }

  return { ok: true, eligibleDevices: devices.length, sent, failed, propertyMatches, general };
}

function startSmartNotificationScheduler() {
  cron.schedule("45 18 * * *", async () => {
    try {
      // Several servers fire this schedule: only one of them sends.
      const slot = await runOnce("smartPush", 20 * 60 * 60 * 1000, async () => {
        const result = await runSmartNotifications();
        console.log("[smart-push] campaign:", JSON.stringify(result));
      });
      if (!slot.ran) console.log("[smart-push] another server is sending it");
    } catch (err) {
      console.error("[smart-push] scheduler failed:", err.message);
    }
  }, { timezone: "Asia/Kolkata" });
  console.log("[smart-push] weekly smart-notification scheduler armed (18:45 IST)");
}

module.exports = { runSmartNotifications, startSmartNotificationScheduler };
