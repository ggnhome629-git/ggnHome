const mongoose = require("mongoose");

const customerSupportSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  preferredTime: { type: String, required: true },
  issue: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const CustomerSupport = mongoose.model("CustomerSupport", customerSupportSchema);

module.exports = CustomerSupport;