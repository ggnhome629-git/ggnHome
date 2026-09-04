const mongoose = require("mongoose");

const EnquirySchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, required: true }, // reference
  propertyType: { type: String, enum: ["rental", "sale"], required: true }, // track which model
  propertyAddress: { type: String, required: true }, // store essential info
  propertyPrice: { type: Number, required: true },   // store essential info
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userEmail: { type: String, required: true },
  userMobile: { type: String, required: true },
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