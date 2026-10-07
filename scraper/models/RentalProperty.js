const mongoose = require('mongoose');

const RentalpropertySchema = new mongoose.Schema(
  {
    // Section 1: Property Basics & Specifications
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    address: { type: String },
    Sector: { type: String, required: true },
    propertyType: {
      type: String,
      enum: ["house", "apartment", "condo", "townhouse", "villa", "1RK", "builder-floor", "studio"],
    },
    purpose: { type: String },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    totalArea: {
      sqft: { type: Number },
      configuration: { type: String },
    },
    totalFloors: {
      type: Number,
      min: 0
    },
    floorForRent: {
      type: Number,
      min: 0
    },
    layoutFeatures: { type: String },
    appliances: [{ type: String }],
    furnishing: { type: String, enum: ["unfurnished", "semi-furnished", "furnished"] },
    conditionAge: { type: String },
    renovations: { type: String },
    parking: { type: String },
    outdoorSpace: { type: String },

    // Section 2: Financial & Lease Terms
    monthlyRent: { type: Number, required: true },
    leaseTerm: { type: String },
    securityDeposit: { type: String },
    otherFees: { type: String },
    commission: { type: Number, min: 0 },
    commissionNote: { type: String, maxlength: 80 },
    utilities: [{ type: String }],
    tenantRequirements: { type: String },
    moveInDate: { type: Date },

    // Section 3: Location & Amenities
    neighborhoodVibe: { type: String },
    transportation: { type: String },
    localAmenities: { type: String },
    communityFeatures: [{ type: String }],

    // Section 4: Policies & Logistics
    petPolicy: { type: String },
    smokingPolicy: { type: String },
    maintenance: { type: String },
    insurance: { type: String },

    // Images
    images: [{ type: String }],
    panoramas: [
      {
        title: { type: String, required: true, trim: true, maxlength: 120 },
        url: { type: String, required: true, trim: true },
        yaw: { type: Number, default: 0 },
        pitch: { type: Number, default: 0 },
        notes: { type: String, trim: true, maxlength: 500 },
      },
    ],

    defaultpropertytype: { type: String, default: "rental", immutable: true },

    // Cloudinary metadata
    cloudinaryAccountIndex: { type: Number, default: null },
    cloudinaryFolder: { type: String },

    // Ownership info
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    ownernumber: { type: String },
    ownerType: {
      type: String,
      enum: ["Owner", "Agent", "Admin", "ggnHome"],
      default: "Owner"
    },

    // Scraped-source tracking
    sourcePortal: { type: String, enum: ["nobroker", "99acres"] },
    sourceListingId: { type: String },
    sourceUrl: { type: String },
    sourceStatus: { type: String, enum: ["active", "inactive", "removed"] },
    sourceCheckedAt: { type: Date },
    sourceRemovalFlaggedAt: { type: Date },

    // Visibility and status
    rankScore: { type: Number, default: 0 },
    isActive: { type: Boolean, default: false },
    isPostedNew: { type: Boolean, default: true },
    isEdited: { type: Boolean, default: false },

    agentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    }
  },
  { timestamps: true }
);

// Indexes for performance
RentalpropertySchema.index({ isActive: 1, createdAt: -1 });
RentalpropertySchema.index({ isActive: 1, rankScore: -1, createdAt: -1 });
RentalpropertySchema.index({ isActive: 1, Sector: 1 });
RentalpropertySchema.index({ isPostedNew: 1, isEdited: 1 });
RentalpropertySchema.index({ sourcePortal: 1, sourceListingId: 1 });

module.exports = mongoose.model("RentalProperty", RentalpropertySchema);
