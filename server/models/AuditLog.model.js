const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, trim: true }, // admin | owner | agent | user
    action: { type: String, required: true, trim: true }, // property:approved | agent:registered ...
    entity: { type: String, trim: true }, // Property | Agent | User | ServiceRequest | Visit ...
    entityId: { type: mongoose.Schema.Types.ObjectId, refPath: "entity", default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, trim: true },
    ua: { type: String, trim: true },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
