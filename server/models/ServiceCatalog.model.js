const mongoose = require("mongoose");

/**
 * Home services offered to users (cleaning, painting, plumbing, …).
 * Admins add / edit / delete entries and switch each one on or off for users
 * with `active`. Service requests store the `key` (immutable once created)
 * plus a title snapshot, so editing or deleting a service never breaks
 * existing requests.
 */
const serviceCatalogSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, unique: true, match: /^[a-zA-Z][a-zA-Z0-9_-]{1,39}$/ },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    emoji: { type: String, trim: true, maxlength: 8, default: "🔧" },
    icon: { type: String, trim: true, default: "wrench" },
    color: { type: String, trim: true, match: /^#[0-9a-fA-F]{6}$/, default: "#00A79D" },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    startsFrom: { type: Number, min: 0, default: 0 }, // rupees; 0 = "on inspection"
    active: { type: Boolean, default: true }, // shown to users
    order: { type: Number, default: 100 },
  },
  { timestamps: true }
);

serviceCatalogSchema.index({ active: 1, order: 1 });

const ServiceCatalog = mongoose.models.ServiceCatalog || mongoose.model("ServiceCatalog", serviceCatalogSchema);

module.exports = ServiceCatalog;
