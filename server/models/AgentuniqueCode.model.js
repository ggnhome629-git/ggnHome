const mongoose = require('mongoose');

const AgentCodeReservationSchema = new mongoose.Schema({
  agentCode: { type: String, required: true, unique: true },
  reservedAt: { type: Date, default: Date.now }
}, { timestamps: false });

// Auto-expire unused reservations after 24 hours (adjust seconds)
AgentCodeReservationSchema.index({ reservedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('AgentCodeReservation', AgentCodeReservationSchema);