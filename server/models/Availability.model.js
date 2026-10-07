const mongoose = require("mongoose");

const weeklyItem = {
  day: {
    type: String,
    enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    required: true,
  },
  from: { type: String, required: true, trim: true }, // "09:00"
  to: { type: String, required: true, trim: true }, // "18:00"
};

const availabilitySchema = new mongoose.Schema(
  {
    userType: { type: String, enum: ["owner", "agent"], required: true, index: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    agentUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    timezone: { type: String, default: "Asia/Kolkata" },
    weekly: { type: [weeklyItem], default: () => [] },
    slotMinutes: { type: Number, default: 60, min: 15, max: 240 },
    blackoutDates: [{ type: Date }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One availability document per owner/agent.
availabilitySchema.index(
  { userType: 1, ownerUserId: 1, agentUserId: 1 },
  { unique: true, partialFilterExpression: { ownerUserId: { $ne: null } } }
);
availabilitySchema.index({ userType: 1, agentUserId: 1, createdAt: -1 });

const Availability = mongoose.model("Availability", availabilitySchema);

module.exports = Availability;
