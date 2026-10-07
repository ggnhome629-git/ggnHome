const mongoose = require('mongoose');

const scraperLogSchema = new mongoose.Schema({
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: Date,

  status: {
    type: String,
    enum: ['running', 'success', 'failed', 'partial'],
    default: 'running'
  },

  totalDuration: Number, // milliseconds

  scrapers: {
    nobroker: {
      status: String,
      propertiesFound: Number,
      propertiesImported: Number,
      propertiesUpdated: Number,
      propertiesSkipped: Number,
      errors: [String],
      duration: Number
    },
    ninetyNineAcres: {
      status: String,
      propertiesFound: Number,
      propertiesImported: Number,
      propertiesUpdated: Number,
      propertiesSkipped: Number,
      errors: [String],
      duration: Number
    }
  },

  summary: {
    totalPropertiesFound: Number,
    totalPropertiesImported: Number,
    totalPropertiesUpdated: Number,
    totalPropertiesSkipped: Number,
    totalErrors: Number
  },

  error: String,

  logs: [
    {
      timestamp: { type: Date, default: Date.now },
      level: String, // 'info', 'warn', 'error'
      message: String,
      details: mongoose.Schema.Types.Mixed
    }
  ]
}, { timestamps: true });

// Index for querying recent runs
scraperLogSchema.index({ startedAt: -1 });
scraperLogSchema.index({ status: 1, startedAt: -1 });

module.exports = mongoose.model('ScraperLog', scraperLogSchema);
