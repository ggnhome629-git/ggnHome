const mongoose = require('mongoose');

const affiliateTrackingSchema = new mongoose.Schema({
  // Tracking Identification
  trackingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // User & Property Info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  propertyType: {
    type: String,
    enum: ['rental', 'sale'],
    required: true
  },

  // Affiliate Platform Details
  source: {
    type: String,
    enum: ['nobroker', '99acres', 'housing.com', 'magicbricks', 'sulekha'],
    required: true,
    index: true
  },
  sourcePropertyId: String, // ID from the source platform
  affiliateLink: {
    type: String,
    required: true
  },

  // Commission & Cashback Rates
  commissionPercentage: {
    type: Number,
    required: true
  },
  cashbackPercentage: {
    type: Number,
    required: true
  },

  // Transaction Status & Dates
  status: {
    type: String,
    enum: ['clicked', 'viewed', 'pending', 'completed', 'failed', 'expired'],
    default: 'clicked',
    index: true
  },
  clickedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  viewedAt: Date,
  completedAt: Date,

  // Transaction Amount Details
  propertyAmount: {
    type: Number,
    default: 0
  },
  monthlyRent: Number,
  userCashback: {
    type: Number,
    default: 0
  },
  ggnHomeCommission: {
    type: Number,
    default: 0
  },

  // Click Tracking
  clickCount: {
    type: Number,
    default: 1
  },
  ipAddress: String,
  userAgent: String,
  referer: String,

  // Conversion Details
  conversionDetails: {
    bookingId: String,
    transactionId: String,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending'
    },
    verifiedAt: Date,
    verificationNotes: String
  },

  // Additional Metadata
  notes: String,
  tags: [String],
  campaign: String,

  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  }
}, { timestamps: true });

// Index for performance
affiliateTrackingSchema.index({ userId: 1, createdAt: -1 });
affiliateTrackingSchema.index({ source: 1, status: 1 });
affiliateTrackingSchema.index({ clickedAt: 1 });

module.exports = mongoose.model('AffiliateTracking', affiliateTrackingSchema);
