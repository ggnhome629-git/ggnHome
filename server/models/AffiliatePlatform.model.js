const mongoose = require('mongoose');

const affiliatePlatformSchema = new mongoose.Schema({
  // Platform Identification
  name: {
    type: String,
    enum: ['nobroker', '99acres', 'housing.com', 'magicbricks', 'sulekha'],
    required: true,
    unique: true,
    index: true
  },
  displayName: String,
  logo: String,
  description: String,
  website: String,

  // Affiliate Configuration
  affiliateId: {
    type: String,
    required: true,
    select: false // Don't return by default for security
  },
  affiliateUrl: String,
  affiliateContactEmail: String,

  // Commission Rates
  commissionStructure: {
    type: String,
    enum: ['transaction', 'referral', 'mixed'],
    required: true
  },
  commissionPercentage: {
    type: Number,
    required: true // e.g., 12 for 12%
  },

  // Cashback to Users (what we give back)
  userCashbackPercentage: {
    type: Number,
    required: true // e.g., 1.5 for 1.5%
  },

  // Payout Details
  payoutFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'on-demand'],
    default: 'monthly'
  },
  minimumPayout: {
    type: Number,
    default: 0
  },

  // Status & Activity
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'active'
  },

  isEnabled: {
    type: Boolean,
    default: true
  },

  // Performance Metrics
  metrics: {
    totalLinks: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    avgCommissionPerConversion: { type: Number, default: 0 }
  },

  // Tracking Configuration
  trackingMethod: {
    type: String,
    enum: ['url_parameter', 'cookie', 'api', 'manual'],
    default: 'url_parameter'
  },
  trackingParameter: String, // e.g., 'ref' or 'utm_source'

  // API & Integration Details
  hasApi: Boolean,
  apiEndpoint: String,
  apiKey: {
    type: String,
    select: false
  },

  // Support & Documentation
  supportEmail: String,
  documentationUrl: String,
  dashboardUrl: String,

  // Settings
  settings: {
    autoSync: { type: Boolean, default: false },
    syncFrequency: { type: String, default: 'daily' },
    maxTrackingDays: { type: Number, default: 30 },
    requiresVerification: { type: Boolean, default: false }
  },

  // Audit
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  notes: String
}, { timestamps: true });

module.exports = mongoose.model('AffiliatePlatform', affiliatePlatformSchema);
