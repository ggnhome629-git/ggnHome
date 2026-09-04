const mongoose = require('mongoose');
const ServiceRequest = require('../models/serviceRequests.model');
const RentalProperty = require('../models/Rentalproperty.model');
const SaleProperty = require('../models/SaleProperty.model');

// -----------------------------
// helpers
// -----------------------------
function getPagination(req) {
  const MAX_LIMIT = 50;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitRaw = parseInt(req.query.limit, 10) || 10;
  const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\s|\-/g, '');
}

// -----------------------------
// Create a new service request
// -----------------------------
exports.createServiceRequest = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: Please log in.' });
    }

    const {
      userRole: userRoleRaw,
      propertyType,
      propertyId,
      address,
      serviceType,
      contactNumber,
      preferredDate,
      notes,
    } = req.body || {};

    // infer role: if property provided, assume owner; else renter (unless explicitly provided)
    let userRole = userRoleRaw || (propertyId ? 'owner' : 'renter');
    if (!['owner', 'renter'].includes(userRole)) {
      return res.status(400).json({ message: "userRole must be 'owner' or 'renter'" });
    }

    // validate contact
    const phone = normalizePhone(contactNumber);
    if (!phone) {
      return res.status(400).json({ message: 'contactNumber is required' });
    }

    // validate serviceType against schema enum
    const allowedServices = ServiceRequest.schema.path('serviceType').enumValues;
    if (!allowedServices.includes(serviceType)) {
      return res.status(400).json({ message: `Invalid serviceType. Allowed: ${allowedServices.join(', ')}` });
    }

    let resolvedPropertyId = null;
    let resolvedPropertyType = null;
    let resolvedAddress = address;

    if (userRole === 'owner') {
      // owner flow requires both propertyType and propertyId
      if (!propertyType || !['RentalProperty', 'SaleProperty'].includes(propertyType)) {
        return res.status(400).json({ message: "propertyType must be 'RentalProperty' or 'SaleProperty' for owner requests." });
      }
      if (!propertyId || !mongoose.isValidObjectId(propertyId)) {
        return res.status(400).json({ message: 'Valid propertyId is required for owner requests.' });
      }

      // fetch property and verify ownership
      let propDoc = null;
      if (propertyType === 'RentalProperty') {
        propDoc = await RentalProperty.findById(propertyId).lean();
        if (!propDoc) return res.status(404).json({ message: 'Rental property not found.' });
        // rental model uses 'owner'
        if (String(propDoc.owner) !== String(req.user._id)) {
          return res.status(403).json({ message: 'You do not own this rental property.' });
        }
        // fallback address if not provided
        resolvedAddress = resolvedAddress || propDoc.address || propDoc.Sector || 'Address not specified';
      } else {
        propDoc = await SaleProperty.findById(propertyId).lean();
        if (!propDoc) return res.status(404).json({ message: 'Sale property not found.' });
        // sale model uses 'ownerId'
        if (String(propDoc.ownerId) !== String(req.user._id)) {
          return res.status(403).json({ message: 'You do not own this sale property.' });
        }
        resolvedAddress = resolvedAddress || propDoc.location || propDoc.Sector || 'Address not specified';
      }

      resolvedPropertyId = propertyId;
      resolvedPropertyType = propertyType;
    } else {
      // renter flow requires a plain address when no property link
      if (!resolvedAddress || !resolvedAddress.trim()) {
        return res.status(400).json({ message: 'address is required for renter requests.' });
      }
    }

    const doc = await ServiceRequest.create({
      createdBy: req.user._id,
      userRole,
      propertyType: resolvedPropertyType,
      propertyId: resolvedPropertyId,
      address: resolvedAddress,
      serviceType,
      contactNumber: phone,
      preferredDate: preferredDate ? new Date(preferredDate) : undefined,
      notes,
      status: 'pending',
    });

    // return minimal document; admin will populate when needed
    return res.status(201).json({ message: 'Service request created', request: doc });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while creating service request', error: error.message });
  }
};

// --------------------------------------------------
// Get service requests (paginated)
// - If admin (req.user.role === 'admin'): can view all, with optional filters
// - Else: only the current user's requests
// Query params: page, limit, status, serviceType, userRole, propertyType
// --------------------------------------------------
exports.getServiceRequests = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: Please log in.' });
    }

    const { page, limit, skip } = getPagination(req);
    const { status, serviceType, userRole, propertyType, createdBy } = req.query;

    const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;

    const filter = {};

    if (isAdmin) {
      // Admin may optionally filter by creator
      if (createdBy && mongoose.isValidObjectId(createdBy)) {
        filter.createdBy = createdBy;
      }
    } else {
      filter.createdBy = req.user._id;
    }

    if (status) filter.status = status; // validate optionally

    if (serviceType) {
      const allowedServices = ServiceRequest.schema.path('serviceType').enumValues;
      if (!allowedServices.includes(serviceType)) {
        return res.status(400).json({ message: `Invalid serviceType. Allowed: ${allowedServices.join(', ')}` });
      }
      filter.serviceType = serviceType;
    }

    if (userRole && ['owner', 'renter'].includes(userRole)) {
      filter.userRole = userRole;
    }

    if (propertyType && ['RentalProperty', 'SaleProperty'].includes(propertyType)) {
      filter.propertyType = propertyType;
    }

    const [items, total] = await Promise.all([
      ServiceRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'createdBy', select: 'name email mobileNumber' })
        .populate({
          path: 'propertyId',
          select: 'title address Sector location defaultpropertytype images',
          strictPopulate: false,
        })
        .lean(),
      ServiceRequest.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages,
      items,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching service requests', error: error.message });
  }
};

// --------------------------------------------------
// Optional: update status (admin/owner-only)
// --------------------------------------------------
exports.updateServiceRequestStatus = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: Please log in.' });
    }

    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid request id' });
    }
    if (!['pending', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ message: "status must be one of 'pending', 'in-progress', 'completed'" });
    }

    // Only creator or admin can update, adjust if needed
    const reqDoc = await ServiceRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: 'Service request not found' });

    const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;
    if (!isAdmin && String(reqDoc.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to update this request' });
    }

    reqDoc.status = status;
    await reqDoc.save();

    return res.status(200).json({ message: 'Status updated', request: reqDoc });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while updating status', error: error.message });
  }
};