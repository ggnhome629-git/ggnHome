const mongoose = require('mongoose');

const cashbackTransactionSchema = new mongoose.Schema({
  // Transaction Identification
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // User & Wallet
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserWallet',
    required: true
  },

  // Transaction Type
  type: {
    type: String,
    enum: ['earned', 'spent', 'withdrawn', 'refunded', 'bonus', 'admin_adjustment'],
    required: true,
    index: true
  },

  // Amount Details
  amount: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },

  // Related Records
  affiliateTrackingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AffiliateTracking'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  withdrawalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Withdrawal'
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },

  // Description & Metadata
  description: String,
  reason: {
    type: String,
    enum: ['affiliate_commission', 'property_booking', 'referral_bonus', 'withdrawal', 'refund', 'cancellation', 'admin'],
    required: true
  },

  // Additional Details
  details: {
    propertyId: mongoose.Schema.Types.ObjectId,
    propertyName: String,
    platform: String,
    bookingReference: String
  },

  notes: String,

  // Audit Trail
  createdBy: {
    type: String,
    default: 'system'
  },
  processedAt: Date
}, { timestamps: true });

// Indexes for efficient queries
cashbackTransactionSchema.index({ userId: 1, createdAt: -1 });
cashbackTransactionSchema.index({ type: 1, status: 1 });
cashbackTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CashbackTransaction', cashbackTransactionSchema);
