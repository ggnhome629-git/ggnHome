/**
 * Advanced Search Routes
 * Handles full-text search, filtering, autocomplete, and related features
 */

const express = require("express");
const router = express.Router();
const {
  advancedSearch,
  autocomplete,
  getFilterMetadata,
  getSimilarProperties,
  clearSearchCache,
} = require("../controllers/advancedSearch.controller");
const { processBatchRequests } = require("../controllers/batchRequest.controller");
const { verifyTokenOptional, verifyToken, checkAdminEmail } = require("../middleware/verifyToken");

/**
 * Advanced Search with Filters
 * POST /api/search/advanced
 *
 * Body:
 * {
 *   type: 'rental' | 'sale',
 *   query: 'search query',
 *   sector: 'sector 22',
 *   minPrice: 10000,
 *   maxPrice: 50000,
 *   minBedrooms: 2,
 *   maxBedrooms: 4,
 *   minBathrooms: 1,
 *   maxBathrooms: 3,
 *   furnishing: ['furnished', 'semi-furnished'],
 *   propertyType: ['apartment', 'villa'],
 *   parking: ['covered', 'open'],
 *   petFriendly: true,
 *   amenities: ['gym', 'pool'],
 *   sortBy: 'relevance' | 'price-asc' | 'price-desc' | 'newest' | 'ranking',
 *   page: 1,
 *   limit: 20
 * }
 */
router.post("/search/advanced", verifyTokenOptional, advancedSearch);

/**
 * Autocomplete/Suggestions
 * GET /api/search/autocomplete?type=rental&query=2bhk&field=sector&limit=10
 *
 * Fields: sector, title, propertyType, furnishing
 */
router.get(
  "/search/autocomplete",
  verifyTokenOptional,
  autocomplete
);

/**
 * Get Filter Metadata
 * GET /api/search/filters?type=rental&sector=sector22
 *
 * Returns:
 * {
 *   priceRange: { minPrice, maxPrice },
 *   propertyTypes: [],
 *   furnishings: [],
 *   parkings: [],
 *   sectors: [],
 *   amenities: [],
 *   petPolicies: []
 * }
 */
router.get(
  "/search/filters",
  verifyTokenOptional,
  getFilterMetadata
);

/**
 * Similar Properties
 * GET /api/search/similar/:propertyId?type=rental&limit=10
 */
router.get(
  "/search/similar/:propertyId",
  verifyTokenOptional,
  getSimilarProperties
);

/**
 * Batch Request Processing
 * POST /api/batch
 *
 * Body:
 * {
 *   requests: [
 *     { method: 'GET', path: '/api/properties/123' },
 *     { method: 'GET', path: '/api/properties/456' },
 *     { method: 'POST', path: '/api/search', body: {...} }
 *   ]
 * }
 *
 * Returns array of results for each request
 * Reduces multiple API calls to single request - 50-70% fewer network calls
 */
router.post("/batch", verifyTokenOptional, processBatchRequests);

/**
 * Admin: Clear Search Cache
 * POST /api/admin/search/cache/clear
 */
router.post(
  "/admin/search/cache/clear",
  verifyToken,
  checkAdminEmail,
  clearSearchCache
);

module.exports = router;
