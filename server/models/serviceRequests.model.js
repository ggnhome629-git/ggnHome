const mongoose = require('mongoose');

const ServiceRequestSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  userRole: {
    type: String,
    enum: ['owner', 'renter'],
    required: true,
  },

  propertyType: {
    type: String,
    enum: ['RentalProperty', 'SaleProperty'], // Name of the models to reference
    required: function () {
      return this.userRole === 'owner';
    }
  },

  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'propertyType', // dynamic reference
    required: function () {
      return this.userRole === 'owner';
    }
  },

  address: {
    type: String,
    required: function () {
      return this.userRole === 'renter' || !this.propertyId;
    },
  },

  serviceType: {
    type: String,
    enum: ['cleaning', 'painting', 'termite', 'plumbing', 'acService' , "carpenter", "electrical" , "moving", "pestControl", "other"],
    required: true,
  },

  contactNumber: {
    type: String,
    required: true,
  },

  preferredDate: {
    type: Date,
  },

  notes: {
    type: String,
  },

  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
}, { timestamps: true });

// TTL index: automatically remove completed service requests after 30 days
ServiceRequestSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: 'completed' } }
);

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);