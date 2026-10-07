const mongoose = require("mongoose");

const serviceCatalogSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, unique: true }, // cleaning, painting, plumbing, ...
    title: { type: String, required: true, trim: true },
    icon: { type: String, trim: true, default: "wrench" },
    description: { type: String, trim: true },
    startsFrom: { type: Number, min: 0, default: 0 }, // rupee
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceCatalogSchema.index({ key: 1 });
serviceCatalogSchema.index({ active: 1, createdAt: -1 });

const ServiceCatalog = mongoose.model("ServiceCatalog", serviceCatalogSchema);

module.exports = ServiceCatalog;
