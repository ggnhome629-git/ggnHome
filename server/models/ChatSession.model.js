const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, unique: true, trim: true, sparse: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    mode: { type: String, enum: ["rental", "sale"], required: true },
    filters: {
      sector: { type: String, trim: true },
      bhk: [{ type: String }],
      budgetMin: { type: Number, min: 0 },
      budgetMax: { type: Number, min: 0 },
      propertyType: { type: String, trim: true },
      size: { type: Number },
      furnishing: { type: String },
    },
    messages: {
      type: [
        {
          role: { type: String, enum: ["user", "assistant"], required: true },
          text: { type: String, required: true },
          cards: [{ type: mongoose.Schema.Types.Mixed }],
          timestap: { type: Date, default: Date.now },
        },
      ],
      default: () => [],
    },
    handoff: {
      requested: { type: Boolean, default: false },
      at: { type: Date, default: null },
      ticketId: { type: String, trim: true, default: null },
    },
    lastActive: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

chatSessionSchema.index({ lastActive: -1 });
chatSessionSchema.index({ userId: 1, createdAt: -1 });

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);

module.exports = ChatSession;
