const mongoose = require("mongoose");

const chatGapSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    count: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
    answers: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

chatGapSchema.index({ count: -1, question: 1 });

const ChatGap = mongoose.model("ChatGap", chatGapSchema);

module.exports = ChatGap;
