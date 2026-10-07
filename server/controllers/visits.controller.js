const Visit = require("../models/Visit.model");
const Availability = require("../models/Availability.model");
const User = require("../models/user.model");

function jsonError(res, status, message) {
  return res.status(status).json({ code: status >= 500 ? "SERVER_ERROR" : "ERROR", message });
}

// GET /api/properties/:type/:id/slots?from=&to=
exports.getSlots = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { from, to } = req.query;
    if (!["rental", "sale"].includes(type)) return jsonError(res, 400, "Invalid property type");
    if (!id) return jsonError(res, 400, "propertyId required");
    if (from || to) {
      const start = from ? new Date(from) : new Date();
      const end = to ? new Date(to) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return jsonError(res, 400, "Invalid date range");
      }
      const slots = await Visit.find({
        propertyId: id,
        propertyType: type,
        status: { $in: ["requested", "confirmed"] },
        slotStart: { $gte: start, $lt: end },
      })
        .sort({ slotStart: 1 })
        .limit(200);
      return res.json({ slots });
    }
    res.json({ slots: [] });
  } catch (err) {
    jsonError(res, 500, "Failed to load slots");
  }
};

// POST /api/visits — book a slot (locks it).
exports.bookVisit = async (req, res) => {
  try {
    const { propertyId, propertyType, ownerUserId, agentUserId, userId, name, mobile, slotStart, slotEnd, mode = "in_person", notes } = req.body;
    if (!propertyId || !propertyType || !userId || !slotStart || !slotEnd) {
      return jsonError(res, 400, "propertyId, propertyType, userId, slotStart and slotEnd are required");
    }
    const start = new Date(slotStart);
    const end = new Date(slotEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return jsonError(res, 400, "Invalid slotStart/slotEnd");
    }
    if (end.getTime() - start.getTime() < 60 * 60 * 1000) {
      return jsonError(res, 400, "Slot must be at least 60 minutes");
    }
    const existing = await Visit.findOne({
      propertyId,
      propertyType,
      status: { $in: ["requested", "confirmed"] },
      slotStart: { $gte: start, $lt: end },
    });
    if (existing) {
      return jsonError(res, 409, "This slot is already booked");
    }
    const visit = await Visit.create({
      propertyId,
      propertyType,
      ownerUserId,
      agentUserId,
      userId,
      name,
      mobile,
      slotStart: start,
      slotEnd: end,
      mode,
      notes,
    });
    return res.status(201).json({ success: true, visit });
  } catch (err) {
    if (err.code === 11000) return jsonError(res, 409, "This slot is already booked");
    jsonError(res, 500, "Failed to create visit");
  }
};

// GET /api/visits/mine — tabs: upcoming/completed/cancelled
exports.getMyVisits = async (req, res) => {
  try {
    const { tab = "upcoming" } = req.query;
    const valid = ["upcoming", "completed", "cancelled"];
    if (!valid.includes(tab)) return jsonError(res, 400, "Invalid tab");
    let filter = { userId: req.user._id };
    if (tab === "upcoming") filter = { ...filter, status: { $in: ["requested", "confirmed", "rescheduled"] } };
    else if (tab === "completed") filter.status = "completed";
    else if (tab === "cancelled") filter.status = "cancelled";
    const visits = await Visit.find(filter).sort({ slotStart: -1 });
    return res.json({ success: true, tab, visits });
  } catch (err) {
    jsonError(res, 500, "Failed to load visits");
  }
};

// PATCH /api/visits/:id — reschedule / cancel with reason
exports.updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancelReason, slotStart, slotEnd } = req.body;
    const visit = await Visit.findById(id);
    if (!visit) return jsonError(res, 404, "Visit not found");
    if (visit.userId.toString() !== req.user._id.toString()) {
      return jsonError(res, 403, "You can only manage your own visits");
    }
    if (status && visit.status !== status) {
      if (status === "cancelled" && !cancelReason) return jsonError(res, 400, "cancelReason required");
      visit.status = status;
      if (status !== "cancelled") visit.rescheduledFrom = visit._id;
      if (cancelReason) visit.cancelReason = cancelReason;
      await visit.save();
    }
    if (slotStart || slotEnd) {
      if ((!slotStart && !slotEnd) || (slotStart && !slotEnd) || (!slotStart && slotEnd)) {
        return jsonError(res, 400, "Provide both slotStart and slotEnd");
      }
      const start = new Date(slotStart);
      const end = new Date(slotEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return jsonError(res, 400, "Invalid slot window");
      }
      const existing = await Visit.findOne({
        _id: { $ne: id },
        propertyId: visit.propertyId,
        propertyType: visit.propertyType,
        status: { $in: ["requested", "confirmed"] },
        slotStart: { $gte: start, $lt: end },
      });
      if (existing) return jsonError(res, 409, "That slot is already booked");
      visit.slotStart = start;
      visit.slotEnd = end;
      await visit.save();
    }
    return res.json({ success: true, visit });
  } catch (err) {
    jsonError(res, 500, "Failed to update visit");
  }
};

// POST /api/visits/:id/confirm — owner / agent confirms
exports.confirmVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = "confirmed" } = req.body;
    const visit = await Visit.findById(id);
    if (!visit) return jsonError(res, 404, "Visit not found");
    if (visit.userId.toString() !== req.user._id.toString()) {
      const owner = await User.findById(visit.ownerUserId);
      if (!owner || String(owner._id) !== String(req.user._id)) {
        return jsonError(res, 403, "You can only confirm this visit");
      }
    }
    visit.status = status;
    await visit.save();
    return res.json({ success: true, visit });
  } catch (err) {
    jsonError(res, 500, "Failed to confirm visit");
  }
};

// POST /api/visits/:id/complete — mark done / no_show
exports.completeVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = "completed" } = req.body;
    const visit = await Visit.findById(id);
    if (!visit) return jsonError(res, 404, "Visit not found");
    visit.status = status;
    await visit.save();
    return res.json({ success: true, visit });
  } catch (err) {
    jsonError(res, 500, "Failed to complete visit");
  }
};

// GET /api/visits/:id/ics — calendar file
exports.getIcs = async (req, res) => {
  try {
    const { id } = req.params;
    const visit = await Visit.findById(id);
    if (!visit) return jsonError(res, 404, "Visit not found");
    if (visit.userId.toString() !== req.user._id.toString()) {
      const owner = await User.findById(visit.ownerUserId);
      if (!owner || String(owner._id) !== String(req.user._id)) {
        return jsonError(res, 403, "Not your visit");
      }
    }
    const title = `Visit: ${visit.propertyId}`;
    const start = visit.slotStart.toISOString();
    const end = visit.slotEnd.toISOString();
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ggnHome//Visit//EN",
      `SUMMARY:${title}`,
      `DTSTART:${start.replace("T", "").replace("Z", "").replace(/-/g, "").replace(/:/g, "")}`,
      `DTEND:${end.replace("T", "").replace("Z", "").replace(/-/g, "").replace(/:/g, "")}`,
      "END:VCALENDAR",
    ];
    return res.set("Content-Type", "text/calendar; charset=utf-8").send(lines.join("\r\n"));
  } catch (err) {
    jsonError(res, 500, "Failed to build calendar file");
  }
};

// GET /api/owner/visits — owner/agent inbox
exports.getOwnerVisits = async (req, res) => {
  try {
    const { tab = "requested" } = req.query;
    let filter = { ownerUserId: req.user._id };
    if (tab !== "all") filter.status = tab;
    const visits = await Visit.find(filter).sort({ slotStart: -1 });
    return res.json({ success: true, visits });
  } catch (err) {
    jsonError(res, 500, "Failed to load owner visits");
  }
};

// PUT /api/owner/availability — save weekly availability + blackouts
exports.saveAvailability = async (req, res) => {
  try {
    const { userType, ownerUserId, agentUserId, timezone = "Asia/Kolkata", weekly, slotMinutes, blackoutDates } = req.body;
    if (!userType || (!ownerUserId && !agentUserId)) {
      return jsonError(res, 400, "userType and ownerUserId/agentUserId required");
    }
    const doc = await Availability.findOneAndUpdate(
      { userType, ownerUserId, agentUserId },
      { timezone, weekly, slotMinutes, blackoutDates, ownerUserId: ownerUserId || null, agentUserId: agentUserId || null },
      { upsert: true, new: true }
    );
    return res.json({ success: true, availability: doc });
  } catch (err) {
    jsonError(res, 500, "Failed to save availability");
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const { userType, ownerUserId, agentUserId } = req.query;
    const filter = { userType };
    if (ownerUserId) filter.ownerUserId = ownerUserId;
    if (agentUserId) filter.agentUserId = agentUserId;
    const doc = await Availability.findOne(filter);
    return res.json({ success: true, availability: doc || null });
  } catch (err) {
    jsonError(res, 500, "Failed to load availability");
  }
};
