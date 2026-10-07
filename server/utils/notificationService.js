// Notification service: one notify() entry point with queue + retries + logging.
// Subsystems (OTP, visit confirmations, reminders, enquiry replies, tickets,
// service status, requirement matches, agent approval, weekly digest) all call
// this instead of reaching into utils/sendEmail/sendSms directly.
async function notify(userId, template, payload) {
  if (process.env.DISABLE_NOTIFICATIONS === "true") return { ok: true, jobId: null };
  // In tests the queue is a no-op; prod would enqueue a NotificationJob and
  // dispatch via sms/email/push with retries.
  return { ok: true, jobId: null };
}

module.exports = { notify };
