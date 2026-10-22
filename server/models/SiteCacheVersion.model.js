const mongoose = require("mongoose");

// One document (key "site") holding the version every visitor's browser compares against.
// An admin cache clear bumps it; browsers that see a new number wipe their own caches.
const SiteCacheVersionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    version: { type: Number, required: true, default: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // The deployed build (commit) that last cleared everything, so a restart of the same build does not clear again.
    buildId: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.SiteCacheVersion || mongoose.model("SiteCacheVersion", SiteCacheVersionSchema);
