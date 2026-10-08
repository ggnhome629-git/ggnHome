const cron = require("node-cron");
const { syncNoBrokerListings } = require("../scripts/nobrokerSync");
const AppSetting = require("../models/AppSetting.model");

const SETTING_KEY = "nobrokerSync";

// Admin-panel toggle (DB) wins; ENABLE_NOBROKER_CRON=true is only the default before the admin sets it.
async function isSyncEnabled() {
  const s = await AppSetting.findOne({ key: SETTING_KEY }).lean();
  if (s && typeof s.value?.enabled === "boolean") return s.value.enabled;
  return process.env.ENABLE_NOBROKER_CRON === "true";
}

async function runAndRecord(trigger) {
  const startedAt = new Date();
  const summary = await syncNoBrokerListings();
  await AppSetting.updateOne(
    { key: SETTING_KEY },
    { $set: { "value.lastRun": { at: startedAt, trigger, summary } } },
    { upsert: true }
  );
  return summary;
}

// Reminders, confirmations and nudges run on their own schedule (see
// utils/reminderJobs). Kept disabled by default in test mode.
async function startReminderCron() {
  if (process.env.REMINDERS_DISABLED === "true") return;
  try {
    const { scheduleReminders } = require("../utils/reminderJobs");
    scheduleReminders();
    console.log("[reminders] scheduled");
  } catch (err) {
    console.error("[reminders] start failed:", err);
  }
}

module.exports = { startNoBrokerSyncCron, startReminderCron, isSyncEnabled, runAndRecord, SETTING_KEY };

// Runs once a day at 3:30 AM IST — off-peak, and gives every listing a
// same-day chance to recover from a transient block before the 12h
// removal-confirmation window in nobrokerSync.js would act on it.
function startNoBrokerSyncCron() {
  cron.schedule(
    "30 3 * * *",
    async () => {
      try {
        if (!(await isSyncEnabled())) return;
        console.log("[nobrokerSync] starting scheduled run...");
        const summary = await runAndRecord("schedule");
        console.log("[nobrokerSync] finished:", JSON.stringify(summary));
      } catch (err) {
        console.error("[nobrokerSync] run failed:", err);
      }
    },
    { timezone: "Asia/Kolkata" }
  );
}
