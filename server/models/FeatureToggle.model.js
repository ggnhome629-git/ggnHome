const mongoose = require("mongoose");

const FeatureToggleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "platform" },
    flatmates: { type: Boolean, default: false },
    agentPortal: { type: Boolean, default: false },
    // The AI assistant (chat and voice) on the public site. Off until an admin turns it on.
    aiAssistant: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FeatureToggle || mongoose.model("FeatureToggle", FeatureToggleSchema);
