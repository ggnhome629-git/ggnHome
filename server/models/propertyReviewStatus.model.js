const mongoose = require("mongoose");
const invalidatePropertyCache = require("./plugins/invalidatePropertyCache");

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

// Listing endpoints look review flags up by the page's property ids
// ($in over a dozen ids). Not unique: rows are created with a findOne-then-
// insert, so existing data may already hold duplicates and a unique index
// would simply fail to build.
propertyReviewStatusSchema.index({ propertyId: 1 });

// Any write to a listing clears the cached listing feeds.
propertyReviewStatusSchema.plugin(invalidatePropertyCache);

module.exports = mongoose.model("PropertyReviewStatus", propertyReviewStatusSchema);
