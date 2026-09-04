const mongoose = require('mongoose');

const PropertyAnalysisSchema = new mongoose.Schema({
  property: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property', 
    required: true,
    unique: true
  },
  views: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      viewedAt: { type: Date, default: Date.now }
    }
  ],
  saves: [
    { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, savedAt: { type: Date, default: Date.now } }
  ],
  engagementTime: [
    { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, seconds: Number, date: { type: Date, default: Date.now } }
  ],
  ratings: [
    { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, rating: Number, comment: String, date: { type: Date, default: Date.now } }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PropertyAnalysis', PropertyAnalysisSchema);
