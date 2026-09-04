const mongoose = require('mongoose');

const AiSchema = new mongoose.Schema({
  userEmail: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sendType: { type: String, enum: ['email', 'whatsapp', 'call'], required: true },
  responses: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true }
    }
  ]
}, { timestamps: true });

const AiModel = mongoose.model('AiModel', AiSchema);

module.exports = AiModel;
