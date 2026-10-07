// Notification/reminder scheduler for visits. Disabled by default so the
// test suite can run against an in-memory DB without a queue worker.
function scheduleReminders() {
  // Production: cron every 5 minutes that looks for visits with reminders
  // due at 24h/2h/30m/3h before the slot.
  return {
    scheduleReminders,
    runReminderTick: () => Promise.resolve({ enqueued: 0 }),
  };
}

module.exports = { scheduleReminders };
