const mongoose = require('mongoose');

const userWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  pendingCashback: {
    type: Number,
    default: 0
  },
  transactions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashbackTransaction'
    }
  ],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  withdrawalDetails: {
    bankAccount: String,
    ifscCode: String,
    accountHolder: String,
    verified: Boolean
  }
}, { timestamps: true });

module.exports = mongoose.model('UserWallet', userWalletSchema);
