const SupportTicket = require("../models/SupportTicket.model");
const FaqArticle = require("../models/FaqArticle.model");
const User = require("../models/user.model");

function jsonError(res, status, message) {
  return res.status(status).json({ code: status >= 500 ? "SERVER_ERROR" : "ERROR", message });
}

// GET /api/faq — public search + list
exports.getFaq = async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;
    const [items, total] = await Promise.all([
      FaqArticle.find(filter)
        .sort({ category: 1, order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      FaqArticle.countDocuments(filter),
    ]);
    return res.json({ success: true, items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    jsonError(res, 500, "Failed to load FAQ");
  }
};

// GET /api/faq/suggest?q= — autocomplete titles
exports.getFaqSuggest = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });
    const suggestions = await FaqArticle.find(
      { isPublished: true, question: new RegExp(q, "i") },
      { question: 1, category: 1 },
      { limit: 8, sort: { question: 1 } }
    );
    return res.json({ success: true, suggestions });
  } catch (err) {
    jsonError(res, 500, "Failed to load suggestions");
  }
};

// POST /api/faq/:id/feedback
exports.feedbackFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;
    if (!["yes", "no"].includes(helpful)) return jsonError(res, 400, "helpful must be yes or no");
    const doc = await FaqArticle.findById(id);
    if (!doc) return jsonError(res, 404, "FAQ article not found");
    doc[helpful === "yes" ? "helpfulYes" : "helpfulNo"] += 1;
    await doc.save();
    return res.json({ success: true });
  } catch (err) {
    jsonError(res, 500, "Failed to record feedback");
  }
};

// POST /api/support/tickets — public (guest ok), rate-limited
exports.createTicket = async (req, res) => {
  try {
    const { userId, name, phone, email, topic, message, preferredTime, channel = "callback" } = req.body;
    if (!message || !message.trim()) return jsonError(res, 400, "message required");
    if (!userId && !(name && name.trim()) && !(phone && phone.trim()) && !(email && email.trim())) {
      return jsonError(res, 400, "name, phone or email required for guest tickets");
    }
    const ticket = await SupportTicket.create({
      userId: userId || null,
      name: name || null,
      phone: phone || null,
      email: email ? email.trim().toLowerCase() : null,
      topic,
      message: message.trim(),
      preferredTime,
      channel,
    });
    return res.status(201).json({ success: true, ticketId: ticket.ticketId, ticket });
  } catch (err) {
    if (err.code === 11000) return jsonError(res, 409, "Duplicate request");
    jsonError(res, 500, "Failed to create ticket");
  }
};

// GET /api/support/tickets/mine
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, tickets });
  } catch (err) {
    jsonError(res, 500, "Failed to load tickets");
  }
};

// POST /api/support/tickets/:id/reply
exports.replyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) return jsonError(res, 400, "text required");
    const ticket = await SupportTicket.findById(id);
    if (!ticket) return jsonError(res, 404, "Ticket not found");
    if (ticket.userId.toString() !== req.user._id.toString() && String(req.user.role) !== "admin") {
      return jsonError(res, 403, "You can only reply to your own tickets");
    }
    ticket.replies.push({ by: req.user._id, text: text.trim() });
    await ticket.save();
    return res.json({ success: true, ticket });
  } catch (err) {
    jsonError(res, 500, "Failed to reply");
  }
};

// PATCH /api/admin/support/tickets/:id
exports.adminUpdateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, reply, rating } = req.body;
    if (!["open", "in_progress", "resolved", "closed"].includes(status) && status) {
      return jsonError(res, 400, "Invalid status");
    }
    const ticket = await SupportTicket.findById(id);
    if (!ticket) return jsonError(res, 404, "Ticket not found");
    if (String(ticket.userId) !== req.user._id && String(req.user.role) !== "admin") {
      return jsonError(res, 403, "Admins only");
    }
    if (status) ticket.status = status;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) return jsonError(res, 400, "rating must be 1-5");
      ticket.rating = rating;
      if (status === "resolved" || status === "closed") ticket.resolvedAt = new Date();
    }
    if (reply !== undefined && typeof reply === "string" && reply.trim()) {
      ticket.replies.push({ by: req.user._id, text: reply.trim() });
    }
    await ticket.save();
    return res.json({ success: true, ticket });
  } catch (err) {
    jsonError(res, 500, "Failed to update ticket");
  }
};

// GET /api/admin/support/tickets
exports.adminListTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;
    const [items, total] = await Promise.all([
      SupportTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      SupportTicket.countDocuments(filter),
    ]);
    return res.json({ success: true, items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    jsonError(res, 500, "Failed to load tickets");
  }
};
