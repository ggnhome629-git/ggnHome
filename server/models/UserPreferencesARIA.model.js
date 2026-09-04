const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
  email: { type: String, required: true },
  assistantType: { type: String, enum: ['rental', 'sale'], required: true },
  preferences: {
    location: String,
    sector: String,
    budget: String,
    size: String,
    furnishing: String,
    propertyType: String,
    amenities: [String],
    purchasePurpose: { type: String, enum: ['personal', 'investment'] },
    timeline: String
  }
}, { timestamps: true }); // 👈 enables createdAt and updatedAt automatically

module.exports = mongoose.model('UserPreferencesARIA', userPreferencesSchema);