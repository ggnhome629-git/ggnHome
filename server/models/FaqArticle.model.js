const mongoose = require("mongoose");

const faqArticleSchema = new mongoose.Schema(
  {
    category: { type: String, trim: true }, // Account & login, Buying, Renting, Posting, Payments & refunds, Rewards, Safety
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    helpfulYes: { type: Number, default: 0 },
    helpfulNo: { type: Number, default: 0 },
  },
  { timestamps: true }
);

faqArticleSchema.index({ category: 1, order: 1 });
// Full-text search on question, answer and tags.
faqArticleSchema.index({ question: "text", answer: "text", tags: "text" });

const FaqArticle = mongoose.model("FaqArticle", faqArticleSchema);

module.exports = FaqArticle;
