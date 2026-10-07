const mongoose = require("mongoose");

const statusOrder = { open: 0, in_progress: 1, resolved: 2, closed: 3 };

const replyItem = {
  by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true },
  at: { type: Date, default: Date.now },
};

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true, trim: true, uppercase: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    topic: { type: String, trim: true },
    message: { type: String, required: true, trim: true },
    preferredTime: { type: String, trim: true },
    channel: {
      type: String,
      enum: ["callback", "whatsapp", "email", "chat"],
      default: "callback",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    replies: { type: [replyItem], default: () => [] },
    rating: { type: Number, min: 1, max: 5, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Admin inbox: recent by status then createdAt.
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ userId: 1, createdAt: -1 });

supportTicketSchema.pre("save", async function (next) {
  if (this.isNew && !this.ticketId) {
    const last = await mongoose.models.SupportTicket
      .findOne({}, { ticketId: 1 }, { sort: { ticketId: -1 } })
      .lean();
    const n = last ? parseInt(last.ticketId.slice(3)) : 0;
    this.ticketId = `GH-${String(n + 1).padStart(6, "0")}`;
  }
  next();
});

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

module.exports = SupportTicket;
