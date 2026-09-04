const cron = require("node-cron");
const { syncNoBrokerListings } = require("../scripts/nobrokerSync");

// Runs once a day at 3:30 AM IST — off-peak, and gives every listing a
// same-day chance to recover from a transient block before the 12h
// removal-confirmation window in nobrokerSync.js would act on it.
function startNoBrokerSyncCron() {
  cron.schedule(
    "30 3 * * *",
    async () => {
      console.log("[nobrokerSync] starting scheduled run...");
      try {
        const summary = await syncNoBrokerListings();
        console.log("[nobrokerSync] finished:", JSON.stringify(summary));
      } catch (err) {
        console.error("[nobrokerSync] run failed:", err);
      }
    },
    { timezone: "Asia/Kolkata" }
  );
}

module.exports = { startNoBrokerSyncCron };
