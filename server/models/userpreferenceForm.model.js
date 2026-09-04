const mongoose = require("mongoose");

const UserPreferenceFormSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },

    preferredLocation: {
      type: String,
      trim: true,
    },

    budgetRange: {
      type: String,
      trim: true,
    },

    bhkSize: {
      type: String, // e.g., "2BHK", "3BHK"
      trim: true,
    },

    propertyType: {
      type: String,
      trim: true,
    },

    furnishingLevel: {
      type: String,
      enum: ["fully-furnished", "semi-furnished", "unfurnished"],
    },

    moveInDate: {
      type: String, // "immediate" or any date string
    },
    brokerageAmount: {
      type: Number,
      
      min: 1499,
      max: 5999,
      default: 1499
    },
    hasLoggedIn: {
  type: Boolean,
  default: false,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    agentAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: [] }],
    mobileViewedByAgents: [
      {
        agentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Agent',
          required: true
        },
        viewedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    mobileLock: {
      lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
      },
      lockedAt: {
        type: Date,
      },
      expiresAt: {
        type: Date,
      },
    },
    inactiveAt: {
      type: Date,
      default: null
    },
    
  },
  { timestamps: true }
);

// TTL index: auto-delete 30 days after inactiveAt
UserPreferenceFormSchema.index({ inactiveAt: 1 }, { expireAfterSeconds: 2592000 });

// Index for fast lookup of leads where an agent has viewed the mobile number
UserPreferenceFormSchema.index(
  { "mobileViewedByAgents.agentId": 1 }
);

module.exports = mongoose.model("UserPreferenceForm", UserPreferenceFormSchema);