const mongoose = require("mongoose");

// One document per scheduled job. The instance that writes lockedUntil first owns that slot, so when several
// servers run the same schedule, only one of them does the work.
const JobLockSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    lockedUntil: { type: Date, default: null },
    owner: { type: String, default: "" },
    lastStartedAt: { type: Date, default: null },
    lastFinishedAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.JobLock || mongoose.model("JobLock", JobLockSchema);
