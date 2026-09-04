const mongoose = require("mongoose");

const FlatmateSchema = new mongoose.Schema(
  {
    // 👍 Linking to User model
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // must match your model name
      required: true,
      index: true,
    },

    // Basic Listing Information
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Location Info
    city: {
      type: String,
      required: true,
      trim: true,
    },

    area: {
      type: String,
      required: true,
      trim: true,
    },
    moveInDate: {
      type: Date,
      required: true,
    },

    // Budget
    budget: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },

    preferredGender: {
      type: String,
      enum: ["male", "female", "any"],
      default: "any",
    },

    occupancyWanted: {
      type: Number,
      default: 1,
    },

    currentOccupants: {
      type: Number,
      default: 1,
    },

    furnished: {
      type: Boolean,
      default: false,
    },

    amenities: [{ type: String }],

    photos: [
      {
        url: { type: String },
        provider: { type: String, default: "cloudinary" },
      },
    ],

    contactMethods: {
      phone: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
    },

    // Status & Engagement
    isActive: { type: Boolean, default: false },
    isPostedNew: { type: Boolean, default: true }, // true = new post awaiting admin approval (hidden from manage listings/searches until approved)

    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Flatmates", FlatmateSchema);
