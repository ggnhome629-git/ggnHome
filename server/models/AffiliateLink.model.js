const mongoose = require('mongoose');

const affiliateLinkSchema = new mongoose.Schema({
  // Property Reference
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  propertyType: {
    type: String,
    enum: ['rental', 'sale'],
    required: true
  },

  // Affiliate Links for Each Platform
  affiliateLinks: {
    noBroker: {
      url: String,
      affiliateId: String,
      enabled: { type: Boolean, default: true },
      lastUpdated: Date
    },
    nineNineAcres: {
      url: String,
      affiliateId: String,
      enabled: { type: Boolean, default: true },
      lastUpdated: Date
    },
    housingCom: {
      url: String,
      affiliateId: String,
      enabled: { type: Boolean, default: true },
      lastUpdated: Date
    },
    magicbricks: {
      url: String,
      affiliateId: String,
      enabled: { type: Boolean, default: true },
      lastUpdated: Date
    },
    sulekha: {
      url: String,
      affiliateId: String,
      enabled: { type: Boolean, default: true },
      lastUpdated: Date
    }
  },

  // Tracking Stats
  clickStats: {
    noBroker: { type: Number, default: 0 },
    nineNineAcres: { type: Number, default: 0 },
    housingCom: { type: Number, default: 0 },
    magicbricks: { type: Number, default: 0 },
    sulekha: { type: Number, default: 0 }
  },

  conversionStats: {
    noBroker: { type: Number, default: 0 },
    nineNineAcres: { type: Number, default: 0 },
    housingCom: { type: Number, default: 0 },
    magicbricks: { type: Number, default: 0 },
    sulekha: { type: Number, default: 0 }
  },

  earningsStats: {
    noBroker: { type: Number, default: 0 },
    nineNineAcres: { type: Number, default: 0 },
    housingCom: { type: Number, default: 0 },
    magicbricks: { type: Number, default: 0 },
    sulekha: { type: Number, default: 0 }
  },

  totalClicks: { type: Number, default: 0 },
  totalConversions: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },

  // Sync Information
  lastSyncedAt: Date,
  sourceUrl: String,

  notes: String
}, { timestamps: true });

// Indexes
affiliateLinkSchema.index({ propertyId: 1 });
affiliateLinkSchema.index({ status: 1 });

module.exports = mongoose.model('AffiliateLink', affiliateLinkSchema);
