const mongoose = require("mongoose");

const propertyReviewStatusSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "propertyType", // dynamically refers to the property model (RentalProperty or SaleProperty)
  },
  propertyType: {
  type: String,
  enum: ['rental', 'sale'],  // 👈 Add both values here
  required: true
},
  isReviewed: {
    type: Boolean,
    default: false,
  },
  reviewedAt: {
    type: Date,
  },
  reviewedBy: {
    type: String, // admin email or userId who reviewed
  },
});

module.exports = mongoose.model("PropertyReviewStatus", propertyReviewStatusSchema);
