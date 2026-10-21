const mongoose = require("mongoose");

// Suggestions left on the public /doc page (portals overview for co-founder review).
const DocSuggestionSchema = new mongoose.Schema(
  {
    section: { type: String, required: true, index: true, maxlength: 40 },
    text: { type: String, required: true, trim: true, minlength: 3, maxlength: 600 },
    name: { type: String, default: "", trim: true, maxlength: 60 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.DocSuggestion || mongoose.model("DocSuggestion", DocSuggestionSchema);
