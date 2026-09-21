// Model For renting the Property
const mongoose = require("mongoose");
const invalidatePropertyCache = require("./plugins/invalidatePropertyCache");

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
    Sector: { type: String , required: true},
    propertyType: {
      type: String,
      enum: ["house", "apartment", "condo", "townhouse", "villa"],
    },
    purpose: { type: String },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    totalArea: {
      sqft: { type: Number }, // Numeric area, e.g., 1200
      configuration: { type: String }, // e.g., "3 BHK"
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
    conditionAge: { type: String },
    renovations: { type: String },
    parking: { type: String },
    outdoorSpace: { type: String },

    // Section 2: Financial & Lease Terms
    monthlyRent: { type: Number , required: true},
    leaseTerm: { type: String },
    securityDeposit: { type: String },
    otherFees: { type: String },
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


    // Image upload
    images: [{ type: String }],
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

    defaultpropertytype: { type: String, default: "rental", immutable: true },

    // Cloudinary metadata (sticky account + stable folder)
    cloudinaryAccountIndex: { type: Number, default: null },
    cloudinaryFolder: { type: String },

    // Ownership info
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
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
    isPostedNew: { type: Boolean, default: true } ,// true = new post awaiting admin approval (hidden from manage listings/searches until approved)
    isEdited: { type: Boolean, default: false }, // true = edited post awaiting admin re-approval (original listing remains live until approved)

    agentUserId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: function () {
    return this.ownerType === "Agent" || this.ownerType === "admin";
  },
  index: true
}
  },
  { timestamps: true }
);

// Indexes
//
// The dashboard/listing feeds all filter on isActive and sort by createdAt,
// so the compound index serves the filter and the sort from one structure —
// without it every listing request is a full collection scan.
RentalpropertySchema.index({ isActive: 1, createdAt: -1 });
// Sector drives location search and the "similar properties" rail.
RentalpropertySchema.index({ isActive: 1, Sector: 1 });
// Admin queues filter on the approval flags.
RentalpropertySchema.index({ isPostedNew: 1, isEdited: 1 });
// Keeps the daily NoBroker sync from scanning the collection per listing.
RentalpropertySchema.index({ sourcePortal: 1, sourceListingId: 1 });

// Any write to a listing clears the cached listing feeds.
RentalpropertySchema.plugin(invalidatePropertyCache);

const RentalProperty = mongoose.model("RentalProperty", RentalpropertySchema);

module.exports = RentalProperty;
