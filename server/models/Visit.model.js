const mongoose = require("mongoose");

const slotMinutes = { type: Number, default: 60 };

const weeklyDay = {
  type: String,
  enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  required: true,
};

const reminderItem = {
  type: { type: String, enum: ["requested", "confirmed", "cancelled", "completed", "no_show"] },
  sentAt: { type: Date, default: null },
  status: { type: String, enum: ["pending", "sent", "failed", "resent"], default: "pending" },
  channel: { type: String, enum: ["sms", "whatsapp", "email"], default: "email" },
};

const visitSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    propertyType: { type: String, enum: ["rental", "sale"], required: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    agentUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, trim: true },
    mobile: { type: String, trim: true },
    slotStart: { type: Date, required: true, index: true },
    slotEnd: { type: Date, required: true },
    mode: { type: String, enum: ["in_person", "video"], default: "in_person" },
    status: {
      type: String,
      enum: ["requested", "confirmed", "rescheduled", "cancelled", "completed", "no_show"],
      default: "requested",
    },
    cancelReason: { type: String, trim: true },
    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Visit", default: null },
    notes: { type: String, trim: true, maxlength: 2000 },
    reminders: { type: [reminderItem], default: () => [] },
    ics: { type: String, trim: true },
  },
  { timestamps: true }
);

// Prevent double booking: only one active slot per property.
visitSchema.index(
  { propertyId: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["requested", "confirmed"] },
    },
  }
);

// Fast lookup of a user's upcoming visits.
visitSchema.index({ userId: 1, slotStart: 1 });

const Visit = mongoose.model("Visit", visitSchema);

module.exports = Visit;
