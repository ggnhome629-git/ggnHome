const mongoose = require("mongoose");

const userRequirementSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, sparse: true },
    mobileNumber: { type: String, trim: true, sparse: true },
    userName: { type: String, trim: true },
    budgetMin: { type: Number, min: 0 },
    budgetMax: { type: Number, min: 0 },
    bhk: [{ type: String, trim: true }], // ["1BHK","2BHK","3BHK"]
    sectors: [{ type: String, trim: true }],
    propertyType: { type: String, trim: true }, // rental | sale
    furnishing: { type: String, trim: true },
    moveInFrom: { type: Date, default: null },
    pauseUntil: { type: Date, default: null },
    consentSms: { type: Boolean, default: false },
    consentWhatsApp: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "paused", "archived"],
      default: "active",
    },
    matchCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Match candidates: active requirements with budget/sector/BHK overlap.
userRequirementSchema.index({ status: 1, budgetMin: 1, budgetMax: 1, sectors: 1, bhk: 1 });
userRequirementSchema.index({ createdAt: -1 });

const UserRequirement = mongoose.model("UserRequirement", userRequirementSchema);

module.exports = UserRequirement;
