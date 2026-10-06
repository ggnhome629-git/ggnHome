const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  // Withdrawal ID
  withdrawalId: {
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

  // Amount & Status
  amount: {
    type: Number,
    required: true,
    min: 100 // Minimum withdrawal amount
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Bank Details
  bankAccount: {
    accountNumber: {
      type: String,
      required: true
    },
    accountHolder: {
      type: String,
      required: true
    },
    ifscCode: {
      type: String,
      required: true
    },
    bankName: String,
    branch: String
  },

  // Processing Details
  utr: String, // Unique Transaction Reference
  processedAt: Date,
  failureReason: String,

  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,

  // Audit Trail
  requestedAt: {
    type: Date,
    default: Date.now
  },
  notes: String,

  // Retry Information
  retryCount: { type: Number, default: 0 },
  lastRetryAt: Date
}, { timestamps: true });

// Indexes
withdrawalSchema.index({ userId: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
