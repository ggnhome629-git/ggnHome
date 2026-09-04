const mongoose = require('mongoose');

const SalePropertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
totalArea: {
      sqft: { type: Number }, // Numeric area, e.g., 1200
      configuration: { type: String }, // e.g., "3 BHK"
    },
  bedrooms: {
    type: Number
  },
  bathrooms: {
    type: Number
  },
  location: {
    type: String
  },
  Sector: { type: String , required: true},
  images: [String],
  // 360° panoramic scenes for this property
    panoramas: [
      {
        title: { type: String, required: true, trim: true, maxlength: 120 }, // e.g., "Living Room"
        url: { type: String, required: true, trim: true }, // Cloudinary secure_url
        yaw: { type: Number, default: 0 },
        pitch: { type: Number, default: 0 },
        notes: { type: String, trim: true, maxlength: 500 },
      },
    ],
  // Cloudinary metadata (sticky account + stable folder)
  cloudinaryAccountIndex: { type: Number, default: null },
  cloudinaryFolder: { type: String },
  defaultpropertytype: { type: String, default: "sale", immutable: true },
  ownernumber: { type: String },
  ownerType: { type: String, enum: ["Owner", "Agent" , "Admin"], default: "Owner" },

  // Scraped-source tracking (only set for scraped listings)
  sourcePortal: { type: String, enum: ["nobroker", "99acres"] },
  sourceListingId: { type: String },
  sourceUrl: { type: String },
  sourceStatus: { type: String, enum: ["active", "inactive", "removed"] },
  sourceCheckedAt: { type: Date },
  sourceRemovalFlaggedAt: { type: Date },

    isActive: { type: Boolean, default: false },
    isPostedNew: { type: Boolean, default: true }, // true = new post awaiting admin approval (hidden from manage listings/searches until approved)
     isEdited: { type: Boolean, default: false }, // true = edited post awaiting admin re-approval (original listing remains live until approved)
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  agentUserId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: function () {
    return this.ownerType === "Agent" || this.ownerType === "admin";
  },
  index: true
},
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const SaleProperty = mongoose.model('SaleProperty', SalePropertySchema);

module.exports = SaleProperty;