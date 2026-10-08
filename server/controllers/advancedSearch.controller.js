/**
 * Advanced Search Controller
 * Handles:
 * - Full-text search with ranking
 * - Advanced property filters
 * - Autocomplete suggestions
 * - Search result caching
 * - Performance optimization
 */

const RentalProperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");
const cache = require("../utils/cache");
const { logger } = require("../config/logger");
const { escapeRegex } = require("../utils/escapeRegex");

/**
 * Advanced Search with Filters
 * GET /api/search/advanced?type=rental&query=2bhk&sector=sector22&minPrice=10000&maxPrice=50000&...
 */
const advancedSearch = async (req, res) => {
  try {
    const {
      type = "rental", // rental or sale
      query = "", // search query
      sector = "",
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      furnishing,
      propertyType,
      parking,
      petFriendly,
      amenities, // array of amenities
      sortBy = "relevance", // relevance, price-asc, price-desc, newest, ranking
      page = 1,
      limit = 20,
    } = req.body;

    // Validate input
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key
    const cacheKey = `search:${type}:${JSON.stringify({
      query,
      sector,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      furnishing,
      propertyType,
      parking,
      petFriendly,
      amenities,
      sortBy,
      page: pageNum,
    })}`;

    // Check cache
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      logger.debug("[search] cache hit:", cacheKey);
      return res.status(200).json({
        success: true,
        cached: true,
        ...cachedResult,
      });
    }

    // Select model
    const Model = type === "rental" ? RentalProperty : SaleProperty;
    const priceField = type === "rental" ? "monthlyRent" : "price";

    // Build filter query
    const filter = {
      isActive: true,
    };

    // Text search
    if (query && query.trim()) {
      filter.$text = { $search: query };
    }

    // Sector filter
    if (sector && sector.trim()) {
      filter.Sector = { $regex: escapeRegex(sector), $options: "i" };
    }

    // Price range
    if (minPrice || maxPrice) {
      filter[priceField] = {};
      if (minPrice) filter[priceField].$gte = parseFloat(minPrice);
      if (maxPrice) filter[priceField].$lte = parseFloat(maxPrice);
    }

    // Bedroom filter
    if (minBedrooms || maxBedrooms) {
      filter.bedrooms = {};
      if (minBedrooms) filter.bedrooms.$gte = parseInt(minBedrooms);
      if (maxBedrooms) filter.bedrooms.$lte = parseInt(maxBedrooms);
    }

    // Bathroom filter
    if (minBathrooms || maxBathrooms) {
      filter.bathrooms = {};
      if (minBathrooms) filter.bathrooms.$gte = parseInt(minBathrooms);
      if (maxBathrooms) filter.bathrooms.$lte = parseInt(maxBathrooms);
    }

    // Furnishing filter
    if (furnishing) {
      const furnishingArray = Array.isArray(furnishing) ? furnishing : [furnishing];
      filter.furnishing = { $in: furnishingArray };
    }

    // Property type filter
    if (propertyType) {
      const typeArray = Array.isArray(propertyType) ? propertyType : [propertyType];
      filter.propertyType = { $in: typeArray };
    }

    // Parking filter
    if (parking) {
      const parkingArray = Array.isArray(parking) ? parking : [parking];
      filter.parking = { $in: parkingArray };
    }

    // Pet friendly filter
    if (petFriendly === true || petFriendly === "true") {
      filter.petPolicy = "allowed";
    }

    // Amenities filter (all specified amenities must exist)
    if (amenities && Array.isArray(amenities) && amenities.length > 0) {
      filter.communityFeatures = { $in: amenities };
    }

    // Build sort
    let sortOptions = {};
    switch (sortBy) {
      case "price-asc":
        sortOptions[priceField] = 1;
        break;
      case "price-desc":
        sortOptions[priceField] = -1;
        break;
      case "newest":
        sortOptions.createdAt = -1;
        break;
      case "ranking":
        sortOptions["ranking.score"] = -1;
        sortOptions.createdAt = -1;
        break;
      case "relevance":
      default:
        if (query && query.trim()) {
          sortOptions.score = { $meta: "textScore" };
        } else {
          sortOptions["ranking.score"] = -1;
        }
        break;
    }

    // Execute query with text search scoring
    let query_obj = Model.find(filter);

    if (query && query.trim()) {
      query_obj = query_obj.select({
        score: { $meta: "textScore" },
      });
    }

    // Get total count
    const total = await Model.countDocuments(filter);

    // Execute paginated query
    const properties = await query_obj
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance

    // Enrich with ranking if not already included
    const enrichedProperties = properties.map((prop) => ({
      ...prop,
      rankingScore: prop.ranking?.score || 0,
    }));

    const result = {
      success: true,
      data: enrichedProperties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + limitNum < total,
      },
      meta: {
        query,
        filters: {
          sector,
          minPrice,
          maxPrice,
          minBedrooms,
          maxBedrooms,
          furnishing,
          propertyType,
          parking,
          petFriendly,
        },
        sortedBy: sortBy,
      },
    };

    // Cache result (10 minutes for search results)
    await cache.set(cacheKey, result, 600);

    return res.status(200).json(result);
  } catch (error) {
    logger.error("[search] Advanced search error:", error);
    return res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

/**
 * Autocomplete/Suggestions
 * GET /api/search/autocomplete?type=rental&query=2bhk&field=sector
 */
const autocomplete = async (req, res) => {
  try {
    const {
      type = "rental",
      query = "",
      field = "sector", // sector, title, propertyType, furnishing
      limit = 10,
    } = req.query;

    if (!query || query.length < 2) {
      return res.status(200).json({
        success: true,
        suggestions: [],
      });
    }

    const Model = type === "rental" ? RentalProperty : SaleProperty;
    const cacheKey = `autocomplete:${type}:${field}:${query}`;

    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        suggestions: cached,
      });
    }

    let suggestions = [];

    switch (field.toLowerCase()) {
      case "sector":
      case "location":
        suggestions = await Model.distinct("Sector", {
          isActive: true,
          Sector: { $regex: escapeRegex(query), $options: "i" },
        }).limit(parseInt(limit));
        break;

      case "title":
        // Full-text search on title
        const titleResults = await Model.find(
          { $text: { $search: query }, isActive: true },
          { score: { $meta: "textScore" } }
        )
          .sort({ score: { $meta: "textScore" } })
          .select("title")
          .limit(parseInt(limit))
          .lean();
        suggestions = titleResults.map((p) => p.title);
        break;

      case "propertytype":
        suggestions = await Model.distinct("propertyType", {
          isActive: true,
          propertyType: { $regex: escapeRegex(query), $options: "i" },
        }).limit(parseInt(limit));
        break;

      case "furnishing":
        suggestions = await Model.distinct("furnishing", {
          isActive: true,
          furnishing: { $regex: escapeRegex(query), $options: "i" },
        }).limit(parseInt(limit));
        break;

      default:
        suggestions = await Model.distinct("Sector", {
          isActive: true,
          Sector: { $regex: escapeRegex(query), $options: "i" },
        }).limit(parseInt(limit));
    }

    // Cache suggestions (30 minutes)
    await cache.set(cacheKey, suggestions, 1800);

    return res.status(200).json({
      success: true,
      suggestions: suggestions.filter(Boolean),
    });
  } catch (error) {
    logger.error("[autocomplete] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Autocomplete failed",
      error: error.message,
    });
  }
};

/**
 * Get Search Filters Metadata
 * GET /api/search/filters?type=rental&sector=sector22
 * Returns: available values for all filter fields
 */
const getFilterMetadata = async (req, res) => {
  try {
    const { type = "rental", sector = "" } = req.query;

    const cacheKey = `filters:${type}:${sector}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        filters: cached,
      });
    }

    const Model = type === "rental" ? RentalProperty : SaleProperty;
    const priceField = type === "rental" ? "monthlyRent" : "price";

    const filter = { isActive: true };
    if (sector) {
      filter.Sector = { $regex: escapeRegex(sector), $options: "i" };
    }

    // Aggregate statistics
    const stats = await Model.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          minPrice: { $min: `$${priceField}` },
          maxPrice: { $max: `$${priceField}` },
          minBedrooms: { $min: "$bedrooms" },
          maxBedrooms: { $max: "$bedrooms" },
          minBathrooms: { $min: "$bathrooms" },
          maxBathrooms: { $max: "$bathrooms" },
        },
      },
    ]);

    // Get distinct values
    const [
      propertyTypes,
      furnishings,
      parkings,
      sectors,
      amenities,
      petPolicies,
    ] = await Promise.all([
      Model.distinct("propertyType", filter),
      Model.distinct("furnishing", filter),
      Model.distinct("parking", filter),
      Model.distinct("Sector", filter),
      Model.distinct("communityFeatures", filter),
      Model.distinct("petPolicy", filter),
    ]);

    const filters = {
      priceRange: stats[0] || {
        minPrice: 0,
        maxPrice: 0,
      },
      propertyTypes: propertyTypes.filter(Boolean),
      furnishings: furnishings.filter(Boolean),
      parkings: parkings.filter(Boolean),
      sectors: sectors.sort().filter(Boolean),
      amenities: amenities.filter(Boolean),
      petPolicies: petPolicies.filter(Boolean),
    };

    // Cache filters (1 hour)
    await cache.set(cacheKey, filters, 3600);

    return res.status(200).json({
      success: true,
      filters,
    });
  } catch (error) {
    logger.error("[getFilterMetadata] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get filter metadata",
      error: error.message,
    });
  }
};

/**
 * Similar Properties
 * GET /api/search/similar/:propertyId?type=rental
 * Find properties similar to given property
 */
const getSimilarProperties = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { type = "rental", limit = 10 } = req.query;

    const Model = type === "rental" ? RentalProperty : SaleProperty;

    // Check cache
    const cacheKey = `similar:${type}:${propertyId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        cached: true,
        properties: cached,
      });
    }

    // Get source property
    const sourceProperty = await Model.findById(propertyId);
    if (!sourceProperty || !sourceProperty.isActive) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    const priceField = type === "rental" ? "monthlyRent" : "price";
    const price = sourceProperty[priceField];
    const priceTolerance = price * 0.2; // ±20%

    // Find similar properties
    const similar = await Model.find({
      _id: { $ne: sourceProperty._id },
      isActive: true,
      Sector: sourceProperty.Sector,
      bedrooms: sourceProperty.bedrooms,
      [priceField]: {
        $gte: price - priceTolerance,
        $lte: price + priceTolerance,
      },
    })
      .sort({ "ranking.score": -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Cache (30 minutes)
    await cache.set(cacheKey, similar, 1800);

    return res.status(200).json({
      success: true,
      properties: similar,
    });
  } catch (error) {
    logger.error("[getSimilarProperties] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get similar properties",
      error: error.message,
    });
  }
};

/**
 * Clear Search Cache
 * POST /api/admin/search/cache/clear
 */
const clearSearchCache = async (req, res) => {
  try {
    // Clear all search-related cache keys
    const keys = ["search:*", "filters:*", "autocomplete:*", "similar:*"];

    for (const pattern of keys) {
      await cache.invalidatePattern ?
        cache.invalidatePattern(pattern) :
        cache.clear();
    }

    logger.info("[search] Cache cleared");
    return res.status(200).json({
      success: true,
      message: "Search cache cleared",
    });
  } catch (error) {
    logger.error("[clearSearchCache] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear cache",
      error: error.message,
    });
  }
};

module.exports = {
  advancedSearch,
  autocomplete,
  getFilterMetadata,
  getSimilarProperties,
  clearSearchCache,
};
