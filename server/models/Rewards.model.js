const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    default: "🎉 Congratulations! You’ve been selected to receive exclusive gifts worth ₹2,000 from ggnRentalDeals. Please share your details using the form below to claim your reward: https://docs.google.com/forms/d/e/1FAIpQLSfuvkHne8LTq9BOf3DMyZpPg7wVpZe4ON576a9HRG-6Du6S7w/viewform?usp=publish-editor",
  },
  distributedAt: {
    type: Date,
    default: Date.now,
  },
  viewed: {
    type: Boolean,
    default: false, // track if user has seen the message
  },
  isActive: {
    type: Boolean,
    default: true, // active by default
  },
});

rewardSchema.pre("save", function (next) {
  if (this.distributedAt) {
    const expiryDate = new Date(this.distributedAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    if (new Date() > expiryDate) {
      this.isActive = false;
    }
  }
  next();
});

module.exports = mongoose.model("Reward", rewardSchema);