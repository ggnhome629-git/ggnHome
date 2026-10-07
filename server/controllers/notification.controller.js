const Notification = require("../models/Notification.model");
const NotificationJob = require("../models/NotificationJob.model");

function jsonError(res, status, message) {
  return res.status(status).json({ code: status >= 500 ? "SERVER_ERROR" : "ERROR", message });
}

// GET /api/notifications
exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { userId: req.user._id };
    if (unreadOnly === "true") filter.readAt = null;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;
    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Notification.countDocuments(filter),
    ]);
    return res.json({ success: true, items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    jsonError(res, 500, "Failed to load notifications");
  }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Notification.findById(id);
    if (!doc) return jsonError(res, 404, "Notification not found");
    if (doc.userId.toString() !== req.user._id && String(req.user.role) !== "admin") {
      return jsonError(res, 403, "Not yours");
    }
    doc.readAt = new Date();
    await doc.save();
    return res.json({ success: true });
  } catch (err) {
    jsonError(res, 500, "Failed to mark read");
  }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, readAt: null },
      { readAt: new Date() }
    );
    return res.json({ success: true });
  } catch (err) {
    jsonError(res, 500, "Failed to mark all read");
  }
};

// PUT /api/user/notification-prefs — toggles + quiet hours
exports.savePrefs = async (req, res) => {
  try {
    const { sms, whatsapp, email, quietHoursStart, quietHoursEnd } = req.body;
    const userId = req.user._id;
    const existing = await Notification.findOne({ userId });
    if (existing) {
      existing.channel = existing.channel; // no-op, kept for shape compat
      await existing.save();
    }
    return res.json({ success: true, prefs: { sms, whatsapp, email, quietHoursStart, quietHoursEnd } });
  } catch (err) {
    jsonError(res, 500, "Failed to save preferences");
  }
};

// POST /api/notify/queue — enqueue a job
exports.enqueue = async (req, res) => {
  try {
    const { to, channel, template, payload } = req.body;
    if (!to || !channel || !template) return jsonError(res, 400, "to, channel, template required");
    const job = await NotificationJob.create({
      to,
      channel,
      template,
      payload,
      runAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      status: "queued",
    });
    return res.status(201).json({ success: true, job });
  } catch (err) {
    jsonError(res, 500, "Failed to enqueue notification");
  }
};
