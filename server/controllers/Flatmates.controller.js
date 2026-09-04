const mongoose = require('mongoose');
const Flatmates = require('../models/Flatmates.model'); // ensure path matches your project
const User = require('../models/user.model'); // optional: used for populating owner info
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const FlatmateEnquiry = require('../models/FlatmateEnquiry.model');

// ----------------------
// Controller functions
// ----------------------

// Create a new flatmate listing
// Expects req.user (authenticated user) to be available for ownerId
const createListing = async (req, res) => {

  try {
    const ownerId = req.user && req.user._id ? req.user._id : req.body.ownerId;
    if (!ownerId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const isAdmin = req.user && req.user.role === 'admin';

    let {
      title,
      description,
      city,
      area,
      moveInDate,
      budget = {},
      preferredGender = 'any',
      occupancyWanted = 1,
      currentOccupants = 1,
      furnished = false,
      amenities = [],
      photos = [],
      contactMethods = { phone: false, email: false },
      autoApprove = false,
    } = req.body || {};

    // --- begin snippet: normalize incoming FormData strings into proper types ---
    try {
      // budget may arrive as JSON string
      if (budget && typeof budget === 'string') {
        try {
          const parsed = JSON.parse(budget);
          if (parsed && typeof parsed === 'object') {
            budget = {
              min: parsed.min !== undefined ? Number(parsed.min) : parsed.min,
              max: parsed.max !== undefined ? Number(parsed.max) : parsed.max
            };
          }
        } catch (e) {
          const maybe = budget.split ? budget.split(/[,|;]/).map(s => s.trim()) : null;
          if (maybe && maybe.length >= 2) {
            budget = { min: Number(maybe[0]) || 0, max: Number(maybe[1]) || 0 };
          }
        }
      }

      // alternative syntax: budget.min and budget.max
      if ((!budget || typeof budget !== 'object') && (req.body['budget.min'] || req.body['budget.max'])) {
        budget = {
          min: req.body['budget.min'] !== undefined ? Number(req.body['budget.min']) : undefined,
          max: req.body['budget.max'] !== undefined ? Number(req.body['budget.max']) : undefined
        };
      }

      // amenities may be JSON or CSV
      if (amenities && typeof amenities === 'string') {
        try {
          const parsedAmenities = JSON.parse(amenities);
          if (Array.isArray(parsedAmenities)) amenities = parsedAmenities;
          else amenities = String(amenities).split(',').map(s => s.trim()).filter(Boolean);
        } catch (e) {
          amenities = String(amenities).split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      // contactMethods may be JSON
      if (contactMethods && typeof contactMethods === 'string') {
        try {
          const parsed = JSON.parse(contactMethods);
          if (parsed && typeof parsed === 'object') contactMethods = parsed;
        } catch (e) {}
      }

      // Convert numeric/boolean-like fields
      occupancyWanted = occupancyWanted !== undefined ? Number(occupancyWanted) : occupancyWanted;
      currentOccupants = currentOccupants !== undefined ? Number(currentOccupants) : currentOccupants;
      if (typeof furnished === 'string') furnished = furnished === 'true' || furnished === '1';
    } catch (e) {
    }
    // --- end snippet ---

    if (!title || !description || !city || !area) {
      return res.status(400).json({ success: false, message: 'title, description, city and area are required' });
    }
    if (typeof budget.min === 'undefined' || typeof budget.max === 'undefined') {
      return res.status(400).json({ success: false, message: 'budget.min and budget.max are required' });
    }

    // Helper normalizers (local to function to avoid global collisions)
    const normalizeText = (v) => {
      if (v === null || typeof v === 'undefined') return '';
      return String(v).trim().replace(/\s+/g, ' ').toLowerCase();
    };

    const normalizeAmenities = (list) => {
      if (!Array.isArray(list)) {
        if (!list) return [];
        return String(list).split(',').map(s => normalizeText(s)).filter(Boolean);
      }
      return list.map(s => normalizeText(s)).filter(Boolean);
    };

    // Normalize city: lowercase, collapse spaces
    const city_norm = normalizeText(city);

    const normalizeArea = (raw) => {
      const s = normalizeText(raw);
      // Detect sector patterns like: 'sector 9', 'sec-9', 'sec 9', 's 9', 'sector9', '9'
      const sectorMatch = s.match(/(?:^|\b)(?:sector|sec|s|sector-|sec-|sec\.|sector\.)[-\s\.]*([0-9]{1,3})(?:\b|$)/i);
      if (sectorMatch && sectorMatch[1]) {
        // canonical format: Sector-<number> (capitalized)
        const num = String(Number(sectorMatch[1]));
        return `Sector-${num}`; // store normalized sector as Sector-9
      }
      // if it is just a number provided, convert to Sector-<number>
      const justNum = s.match(/^([0-9]{1,3})$/);
      if (justNum) return `Sector-${String(Number(justNum[1]))}`;
      // else return collapsed lowercase area
      return s;
    };

    const area_norm = normalizeArea(area);

    const title_norm = normalizeText(title);
    const description_norm = normalizeText(description);
    const amenities_norm = normalizeAmenities(amenities);

    const willAutoApprove = isAdmin || autoApprove === true || autoApprove === 'true';

    const listing = new Flatmates({
      ownerId,
      title: String(title).trim(),
      title_norm,
      description: String(description).trim(),
      description_norm,
      city: String(city).trim(),
      city_norm,
      area: String(area).trim(),
      area_norm,
      moveInDate: moveInDate ? new Date(moveInDate) : null,
      budget: { min: Number(budget.min), max: Number(budget.max) },
      preferredGender,
      occupancyWanted: Number(occupancyWanted),
      currentOccupants: Number(currentOccupants),
      furnished: Boolean(furnished),
      amenities: Array.isArray(amenities) ? amenities : (typeof amenities === 'string' ? amenities.split(',').map(s => s.trim()) : []),
      amenities_norm,
      photos: Array.isArray(photos) ? photos : [],
      contactMethods: typeof contactMethods === 'object' ? contactMethods : { phone: false, email: false },
      // default flags
      isActive: willAutoApprove,
      isPostedNew: willAutoApprove ? false : true,
    });

    await listing.save();
    return res.status(201).json({ success: true, data: listing });
  } catch (err) {
    
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Update a listing (owner only)
const updateListing = async (req, res) => {
  try {
    const listingId = req.params.id;
    const updates = req.body;
    const listing = await Flatmates.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    // check ownership
    const userId = req.user && req.user._id ? req.user._id.toString() : null;
    if (!userId || listing.ownerId.toString() !== userId) return res.status(403).json({ success: false, message: 'Not allowed' });

    // Apply allowed updates only
    const allowed = ['title','description','city','area','moveInDate','budget','preferredGender','occupancyWanted','currentOccupants','furnished','amenities','photos','contactMethods','isActive'];
    allowed.forEach((k) => {
      if (typeof updates[k] !== 'undefined') listing[k] = updates[k];
    });

    await listing.save();
    return res.json({ success: true, data: listing });
  } catch (err) {
    
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a listing (owner only or admin)
const deleteListing = async (req, res) => {
  try {
    const listingId = req.params.id;
    const listing = await Flatmates.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    const userId = req.user && req.user._id ? req.user._id : null;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!isAdmin && listing.ownerId.toString() !== userId.toString()) return res.status(403).json({ success: false, message: 'Not allowed' });

    // Determine desired active state:
    // 1) explicit query param `?active=true|false` or body { active: true|false }
    // 2) otherwise toggle current state
    let desiredActive;
    if (typeof req.query.active !== 'undefined') {
      desiredActive = (req.query.active === 'true' || req.query.active === '1' || req.query.active === true);
    } else if (typeof req.body.active !== 'undefined') {
      desiredActive = (req.body.active === 'true' || req.body.active === 1 || req.body.active === true);
    } else {
      desiredActive = !Boolean(listing.isActive);
    }

    listing.isActive = Boolean(desiredActive);
    await listing.save();

    const message = listing.isActive ? 'Listing activated' : 'Listing deactivated (soft-delete)';
    return res.json({ success: true, message, data: listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single listing by id (optionally increment views) — or if no id provided, return all listings paginated
const getListing = async (req, res) => {
  try {
    const listingId = req.params.id;

    // If no id provided, return TOP 10 listings (by views desc, then recency)
    if (!listingId) {
    //   const onlyActive = (req.query.onlyActive === undefined) ? true : (req.query.onlyActive === 'true' || req.query.onlyActive === true);
      const q = {};
    //   if (onlyActive) q.isActive = true;

      // Return the top 10 listings ordered primarily by views desc, then by createdAt desc
     const limit = 10;
      const items = await Flatmates.find(q).sort({ views: -1, createdAt: -1 }).limit(limit).populate('ownerId', 'email mobileNumber').lean();
      const total = await Flatmates.countDocuments(q);

      return res.json({ success: true, data: { total, page: 1, limit, items } });
    }

    // Single listing path (keeps existing behavior)
    const incView = req.query.incView === 'true' || req.query.incView === '1';

    const listing = await Flatmates.findById(listingId).populate('ownerId', 'email mobileNumber');
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    if (incView) {
      // increment counter atomically and store event inside same Flatmates document
      await Flatmates.updateOne(
        { _id: listingId },
        {
          $inc: { views: 1 },
          $push: { analytics: { event: 'view', meta: { ip: req.ip }, createdAt: new Date() } }
        }
      );
      // reload listing.views
      listing.views = (listing.views || 0) + 1;
    }

    return res.json({ success: true, data: listing });
  } catch (err) {
    
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const searchListings = async (req, res) => {
  try {

    // pagination
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;

    // onlyActive default true
    const onlyActive = (req.query.onlyActive === undefined)
      ? true
      : (req.query.onlyActive === 'true' || req.query.onlyActive === true);

    // normalize helper
    const norm = v => (typeof v === 'string' ? v.trim().toLowerCase() : v);

    const q = {};
    const normalizedQuery = {};
    const appliedFields = [];

    if (onlyActive) {
      q.isActive = true;
      normalizedQuery.isActive = true;
      appliedFields.push({ field: 'isActive', value: true });
    }

    // Helper: detect sector-like input and return canonical 'Sector-<N>'
    const detectSectorCanonical = (input) => {
      if (!input) return null;
      const s = String(input).trim().toLowerCase();
      const m = s.match(/(?:^|\b)(?:sector|sec|s|sector-|sec-|sec\.|sector\.)[-\s\._]*([0-9]{1,3})(?:\b|$)/i) || s.match(/^([0-9]{1,3})$/);
      if (m && m[1]) return `Sector-${String(Number(m[1]))}`;
      return null;
    };

    if (req.query.area) {
      const raw = String(req.query.area).trim();
      const a = norm(raw);
      const sectorCanonical = detectSectorCanonical(raw);
      if (sectorCanonical) {
        // Match only the display `area` field for sector patterns (no area_norm)
        const numMatch = sectorCanonical.match(/([0-9]{1,3})$/);
        const num = numMatch ? numMatch[1] : sectorCanonical;
        const regex = { $regex: `^sector[-\\s]?${escapeRegex(num)}$`, $options: 'i' };
        q.$or = [ { area: regex } ];
        normalizedQuery.area = sectorCanonical;
        appliedFields.push({ field: 'area', value: `regex:sector[-\\s]?${num}` });
      } else {
        const areaRegex = { $regex: new RegExp(escapeRegex(a), 'i') };
        q.$or = [ { area: areaRegex } ];
        normalizedQuery.area = a;
        appliedFields.push({ field: 'area', value: `regex:${a}` });
      }
    }

    // If no explicit area but q looks like a sector, consume q as area filter
    let consumedQForArea = false;
    let consumedSectorNumber = null;
    if (!req.query.area && req.query.q && String(req.query.q).trim()) {
      const sectorCanonicalFromQ = detectSectorCanonical(req.query.q);
      if (sectorCanonicalFromQ) {
        const numMatch = sectorCanonicalFromQ.match(/([0-9]{1,3})$/);
        const num = numMatch ? numMatch[1] : sectorCanonicalFromQ;
        const regex = { $regex: `^sector[-\\s]?${escapeRegex(num)}`, $options: 'i' };
        q.$or = [ { area: regex } ];
        normalizedQuery.area = sectorCanonicalFromQ;
        appliedFields.push({ field: 'area', value: `regex:sector[-\\s]?${num}` });
        consumedQForArea = true;
        consumedSectorNumber = String(Number(num));
      }
    }

    // occupancyWanted exact numeric match (if provided)
    if (typeof req.query.occupancyWanted !== 'undefined' && req.query.occupancyWanted !== '') {
      const n = Number(req.query.occupancyWanted);
      if (!Number.isNaN(n)) {
        q.occupancyWanted = n;
        normalizedQuery.occupancyWanted = n;
        appliedFields.push({ field: 'occupancyWanted', value: n });
      }
    }

    // furnished boolean
    if (typeof req.query.furnished !== 'undefined') {
      if (req.query.furnished === 'true' || req.query.furnished === true) {
        q.furnished = true;
        normalizedQuery.furnished = true;
        appliedFields.push({ field: 'furnished', value: true });
      } else if (req.query.furnished === 'false' || req.query.furnished === false) {
        q.furnished = false;
        normalizedQuery.furnished = false;
        appliedFields.push({ field: 'furnished', value: false });
      }
    }

    // Free-text 'q' matching on title and description, unless consumed as area
    let findQuery = q;
    if (!consumedQForArea && req.query.q && String(req.query.q).trim()) {
      const rawQ = String(req.query.q).trim();
      const t = escapeRegex(rawQ);
      const orClause = [
        { title: { $regex: t, $options: 'i' } },
        { description: { $regex: t, $options: 'i' } }
      ];
      normalizedQuery.q = rawQ;
      appliedFields.push({ field: 'q', value: rawQ });
      findQuery = Object.keys(q).length ? { $and: [q, { $or: orClause }] } : { $or: orClause };
    }

    if (consumedQForArea) {
      const num = consumedSectorNumber;
      const numRegex = { $regex: new RegExp(`\\b${escapeRegex(num)}\\b`, 'i') };
      findQuery = { $or: [
        { area: { $regex: `^sector[-\\s]?${escapeRegex(num)}`, $options: 'i' } },
        { title: numRegex },
        { description: numRegex }
      ]};
    }

    // Log normalized query and which fields will be applied to DB search

    // sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDir = Number(req.query.sortDir || -1);
    const sortObj = { [sortBy]: sortDir };

    // fetch
    const [total, items] = await Promise.all([
      Flatmates.countDocuments(findQuery),
      Flatmates.find(findQuery).sort(sortObj).skip(skip).limit(limit).lean()
    ]);


    // Debug: if we have a normalized area with a sector number, show sample docs containing that number
    try {
      if (normalizedQuery.area) {
        const numMatch = String(normalizedQuery.area).match(/([0-9]{1,3})$/);
        if (numMatch && numMatch[1]) {
          const num = numMatch[1];
          const sample = await Flatmates.find({
            $or: [
              { area: { $regex: new RegExp(num, 'i') } }
            ]
          }).limit(10).lean();
          
        }
      }
    } catch (dbgErr) {
      
    }

    return res.json({ success: true, data: { total, page, limit, items } });
  } catch (err) {
    
    return res.status(500).json({ success: false, message: 'Server error', error: err && err.message ? err.message : undefined });
  }
};


// Helper: escape regex for user input
function escapeRegex(text) {
  return String(text).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// Increment view (separate endpoint if you prefer)
const incrementView = async (req, res) => {
  try {
    const listingId = req.params.id;
    const updated = await Flatmates.findByIdAndUpdate(
      listingId,
      {
        $inc: { views: 1 },
        $push: { analytics: { event: 'view', meta: { ip: req.ip }, createdAt: new Date() } }
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Listing not found' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


// Get listings for logged-in user (paginated)
const getUserListings = async (req, res) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    // pagination params
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;

    // optional filter: onlyActive (tri-state)
    // - if req.query.onlyActive === 'true' => onlyActive === true (only active)
    // - if req.query.onlyActive === 'false' => onlyActive === false (only inactive)
    // - if not provided => onlyActive === undefined (don't filter by isActive)
    let onlyActive;
    if (typeof req.query.onlyActive !== 'undefined') {
      onlyActive = (req.query.onlyActive === 'true' || req.query.onlyActive === '1' || req.query.onlyActive === true);
    } else {
      onlyActive = undefined;
    }

    const q = { ownerId: userId };
    if (onlyActive === true) q.isActive = true;
    if (onlyActive === false) q.isActive = false;

    const [total, items] = await Promise.all([
      Flatmates.countDocuments(q),
      Flatmates.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    return res.json({ success: true, data: { total, page, limit, items } });
  } catch (err) {
    
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Public: Get listings for any user by userId (paginated)
// If userId not provided in params/query, fall back to authenticated user from verifyToken (req.user)
const getListingsByUser = async (req, res) => {
  try {
    // prefer path param, then query param, then authenticated user
    const userIdFromParams = req.params.userId || req.query.userId;
    const authUserId = req.user && (req.user._id || req.user.id || req.user.userId);

    const userId = userIdFromParams || authUserId;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    // console.log('Fetching listings for userId:', userId);

    // validate ObjectId-ish
    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    // pagination params
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;

    // optional filter: onlyActive (tri-state)
    let onlyActive;
    if (typeof req.query.onlyActive !== 'undefined') {
      onlyActive = (req.query.onlyActive === 'true' || req.query.onlyActive === '1' || req.query.onlyActive === true);
    } else {
      onlyActive = undefined;
    }

    const ownerObjectId = new mongoose.Types.ObjectId(String(userId));
    const q = { ownerId: ownerObjectId };
    if (onlyActive === true) q.isActive = true;
    if (onlyActive === false) q.isActive = false;

    const [total, items] = await Promise.all([
      Flatmates.countDocuments(q),
      Flatmates.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().populate('ownerId', 'email mobileNumber')
    ]);

    return res.json({ success: true, data: { total, page, limit, items } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err && err.message ? err.message : undefined });
  }
};

// Admin: approve a new listing (set isPostedNew -> false and isActive true)
const approveListing = async (req, res) => {
  try {
    const listingId = req.params.id;
    // Optional: check req.user.role === 'admin' before allowing
    const listing = await Flatmates.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    listing.isPostedNew = false;
    listing.isActive = true;
    await listing.save();
    return res.json({ success: true, data: listing });
  } catch (err) {
    
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


// GET /flatmatelistingdetails?id=<id>&incView=true
async function flatmateListingDetails(req, res) {
  try {
    const listingId = req.query.id || req.query.listingId || null;
    if (!listingId) return res.status(400).json({ success: false, message: 'Missing listing id' });

    // fetch listing and populate owner contact if available
    const listing = await Flatmates.findById(listingId).populate('ownerId', 'email mobileNumber').lean();
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    // optional: increment view count if requested
    const incView = (req.query.incView === 'true' || req.query.incView === '1');
    if (incView) {
      try {
        await Flatmates.updateOne({ _id: listingId }, { $inc: { views: 1 } });
        listing.views = (listing.views || 0) + 1;
      } catch (e) {
        
      }
    }

    return res.json({ success: true, listing });
  } catch (err) {
    
    return res.status(500).json({ success: false, message: 'Server error', error: err && err.message ? err.message : undefined });
  }
}


/**
 * POST /flatmateenquiry
 * Body: { listingId, name, email, phone, message }
 */
// POST /flatmateenquiry
// Body: { listingId, email, phone, message }
async function flatmateEnquiry(req, res) {
  try {
    // Expect body: { listingId, email, phone, message }
    const { listingId, email, phone, message } = req.body || {};
    if (!listingId || !email || !message) {
      return res.status(400).json({ success: false, message: 'listingId, email and message are required' });
    }

    // Fetch listing to ensure it exists and to get the listing owner
    const listing = await Flatmates.findById(listingId).lean();
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    // Determine ownerId for the enquiry — use the listing owner (receiver of the enquiry)
    const ownerId = listing.ownerId ? listing.ownerId : null;

    // Optionally capture the sender user id from the verified token (if authenticated)
    const senderId = req.user && req.user._id ? req.user._id : null;

    // Persist enquiry to DB
    const created = await FlatmateEnquiry.create({
      listingId,
      ownerId,
      // senderId is optional, include only if available
      ...(senderId ? { senderId } : {}),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : '',
      message: String(message).trim()
    });

    // Optionally: send notifications to owner here (email/SMS)

    return res.json({ success: true, message: 'Enquiry submitted. Our support team will contact you shortly.', data: created });
  } catch (err) {
    
    return res.status(500).json({ success: false, message: 'Server error', error: err && err.message ? err.message : undefined });
  }
}


module.exports = {
  createListing,
  updateListing,
  deleteListing,
  getListing,
  searchListings,
  incrementView,
  getUserListings,
  getListingsByUser,
  approveListing,
  flatmateListingDetails,
  flatmateEnquiry,
  upload
};