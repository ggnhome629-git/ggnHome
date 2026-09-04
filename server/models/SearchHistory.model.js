const mongoose = require("mongoose");

const SearchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  query: { type: String, required: true }, // e.g. "sector 9"
  
  createdAt: { type: Date, default: Date.now },
});

// TTL index: automatically remove search history documents older than 60 days
SearchHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model("SearchHistory", SearchHistorySchema);