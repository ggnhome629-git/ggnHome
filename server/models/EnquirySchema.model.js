const mongoose = require("mongoose");

const EnquirySchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, required: true }, // reference
  propertyType: { type: String, enum: ["rental", "sale"], required: true }, // track which model
  propertyAddress: { type: String, required: true }, // store essential info
  propertyPrice: { type: Number, required: true },   // store essential info
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  userEmail: { type: String, default: "" },
  userMobile: { type: String, required: true },
  customerName: { type: String, trim: true, default: "Customer" },
  ownerName: { type: String, trim: true, default: "" },
  sourcePortal: { type: String, trim: true },
  sourceUrl: { type: String, trim: true },
  enquiryFor: { type: String, enum: ["Owner", "Agent", "Partner", "Admin"], default: "Admin" },
  message: { type: String, default: "" },
  brokerage: {
    type: Number,
    required: true,
    min: 1499,
    max: 5999,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 45 * 24 * 60 * 60 } // 45 days TTL
  },
  ownerUserId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},
  agentUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  },
  contactUnlockedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User", // agent user
  default: null,
  index: true
},
contactUnlockedAt: {
  type: Date
}
  
});

module.exports = mongoose.model("Enquiry", EnquirySchema);