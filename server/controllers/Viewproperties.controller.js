/**************************************************************
 * Viewproperties.controller.js
 * 
 * Controller for handling property retrieval operations.
 * Supports fetching rental properties, sale properties,
 * and generic property lookup by ID, with detailed response
 * handling and error management.
 **************************************************************/

const RentalProperty = require("../models/Rentalproperty.model.js");
const SaleProperty = require("../models/SaleProperty.model.js");
const PropertyReviewStatus = require("../models/propertyReviewStatus.model.js");
const cache = require("../config/cache.js");


// ==============================
// Fetch RentalProperty by ID
// ==============================
const getRentalPropertyById = async (req, res) => {
  try {
    // Extract property ID from request parameters
    const propertyId = req.params.id;

    // Served from cache when warm; `lean()` skips hydrating a full Mongoose
    // document we only ever serialize to JSON.
    const property = await cache.remember(
      cache.key(`properties:rental:${propertyId}`),
      cache.ttl.propertyDetail,
      () => RentalProperty.findById(propertyId).populate("owner", "name email").lean()
    );

    // Check if property exists
    if (!property) {
      return res.status(404).json({ message: "Rental property not found" });
    }

    // Send successful response with property data
    res.status(200).json(property);
  } catch (error) {
    // Handle server errors during fetch operation
    res.status(500).json({
      message: "Server error while fetching rental property",
      error: error.message,
    });
  }
};


// ==============================
// Fetch SaleProperty by ID
// ==============================
const getSalePropertyById = async (req, res) => {
  try {
    // Extract property ID from request parameters
    const propertyId = req.params.id;

    // Served from cache when warm; see getRentalPropertyById.
    const property = await cache.remember(
      cache.key(`properties:sale:${propertyId}`),
      cache.ttl.propertyDetail,
      () => SaleProperty.findById(propertyId).populate("ownerId", "name email").lean()
    );

    // Check if property exists
    if (!property) {
      return res.status(404).json({ message: "Sale property not found" });
    }

    // Send successful response with property data
    res.status(200).json(property);
  } catch (error) {
    // Handle server errors during fetch operation
    res.status(500).json({
      message: "Server error while fetching sale property",
      error: error.message,
    });
  }
};


// ==============================
// Fetch Property by ID (Rental or Sale)
// ==============================
const getPropertyById = async (req, res) => {
  try {
    // Extract property ID from request parameters
    const { id } = req.params;

    // One cache entry per id covers both collections, so a hit costs a single
    // lookup instead of the rental-then-sale probe below.
    const cacheKey = cache.key(`properties:any:${id}`);
    const cached = await cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    // Both collections are probed in parallel — the rental-first sequence
    // made every sale property pay for a failed rental lookup first.
    const [rental, sale] = await Promise.all([
      RentalProperty.findById(id).populate("owner", "name email").lean(),
      SaleProperty.findById(id).populate("ownerId", "name email").lean(),
    ]);

    const property = rental
      ? { ...rental, propertyCategory: "rental" }
      : sale
      ? { ...sale, propertyCategory: "sale" }
      : null;

    // If property not found in either collection, respond with 404
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    await cache.set(cacheKey, property, cache.ttl.propertyDetail);
    return res.status(200).json(property);
  } catch (error) {
    // Handle server errors during fetch operation
    res.status(500).json({
      message: "Server error while fetching property",
      error: error.message,
    });
  }
};

// ==============================
// Fetch all active properties (rental + sale), paginated
//
// Both collections are queried with a projection limited to the fields the
// property cards actually render, and with the page window pushed down into
// MongoDB — previously this loaded every active document (plus every review
// status row) into memory on every request just to hand back twelve of them.
//
// To interleave two collections by recency we need `skip + limit` from each
// before merging, which is still bounded work rather than a full scan.
// ==============================

// Everything a PropertyCard renders, and nothing else: the heavy prose
// fields (description, amenities, panoramas) stay out of list payloads.
const RENTAL_CARD_FIELDS =
  "title Sector address images bedrooms bathrooms parking totalArea propertyType purpose monthlyRent defaultpropertytype ownerType isActive createdAt updatedAt";
const SALE_CARD_FIELDS =
  "title Sector location images bedrooms bathrooms totalArea price defaultpropertytype ownerType isActive createdAt updatedAt";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 60;

// Cards render one image and a count badge, so shipping all ten Cloudinary
// URLs per card was ~700 of the ~880 bytes each row cost. The rest are only
// needed on the detail page, which fetches the full document anyway.
const CARD_IMAGES = 1;

const toCardPayload = (property, type, isReviewed) => {
  const images = Array.isArray(property.images) ? property.images : [];
  return {
    ...property,
    images: images.slice(0, CARD_IMAGES),
    imageCount: images.length,
    defaultpropertytype: type,
    isReviewed,
  };
};

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const getAllActiveProperties = async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const page = parsePositiveInt(req.query.page, 1);
    const skip = (page - 1) * limit;
    // How far into each collection we must read to fill this page after the
    // two are merged by recency.
    const window = skip + limit;

    const cacheKey = cache.key("properties:active", { page, limit });
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const [rentalProperties, saleProperties] = await Promise.all([
      RentalProperty.find({ isActive: true })
        .select(RENTAL_CARD_FIELDS)
        .sort({ createdAt: -1, _id: -1 })
        .limit(window)
        .lean(),
      SaleProperty.find({ isActive: true })
        .select(SALE_CARD_FIELDS)
        .sort({ createdAt: -1, _id: -1 })
        .limit(window)
        .lean(),
    ]);

    // Merge both collections into one recency-ordered feed, then take the
    // requested slice.
    const merged = [
      ...rentalProperties.map((prop) => ({ ...prop, defaultpropertytype: "rental" })),
      ...saleProperties.map((prop) => ({ ...prop, defaultpropertytype: "sale" })),
    ]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(skip, skip + limit);

    // Review flags for just this page, not the whole collection.
    const pageIds = merged.map((prop) => prop._id);
    const reviewStatuses = pageIds.length
      ? await PropertyReviewStatus.find({ propertyId: { $in: pageIds } })
          .select("propertyId isReviewed")
          .lean()
      : [];
    const reviewedById = new Map(
      reviewStatuses.map((review) => [String(review.propertyId), review.isReviewed])
    );

    const properties = merged.map((prop) =>
      toCardPayload(prop, prop.defaultpropertytype, reviewedById.get(String(prop._id)) || false)
    );

    await cache.set(cacheKey, properties, cache.ttl.propertyList);
    res.set("X-Cache", "MISS");
    res.status(200).json(properties);
  } catch (error) {
    console.error("Error fetching all properties:", error);
    res.status(500).json({
      message: "Server error while fetching all properties",
      error: error.message,
    });
  }
};


module.exports = {
  getRentalPropertyById,
  getSalePropertyById,
  getPropertyById,
  getAllActiveProperties,
};