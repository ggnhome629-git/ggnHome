const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    services: [{ type: String, trim: true }], // cleaning, painting, ...
    sectors: [{ type: String, trim: true }],
    rating: { type: Number, min: 0, max: 5, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

vendorSchema.index({ active: 1, rating: -1 });

const Vendor = mongoose.model("Vendor", vendorSchema);

module.exports = Vendor;
