/**
 * Property Recommendations Engine
 * Lightweight, integrated into main server
 * Uses smart caching & batching for 512MB server
 */

const NodeCache = require("node-cache");
const Rentalproperty = require("../../models/Rentalproperty.model");
const SaleProperty = require("../../models/SaleProperty.model");
const User = require("../../models/user.model");
const Enquiry = require("../../models/EnquirySchema.model");

class RecommendationEngine {
  constructor() {
    // In-memory cache: 1 hour TTL for recommendations
    this.cache = new NodeCache({ stdTTL: 3600 });
  }

  /**
   * Get recommendations for a user based on:
   * 1. View history
   * 2. Enquiry patterns
   * 3. Similar users
   */
  async getUserRecommendations(userId, limit = 10) {
    const cacheKey = `user_recs:${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const user = await User.findById(userId).lean();
      if (!user) throw new Error("User not found");

      // Build user profile (lightweight aggregation)
      const userProfile = await this.buildUserProfile(userId);

      // Score and rank properties
      const recommendations = await this.scoreCandidateProperties(
        userProfile,
        limit,
        "rental"
      );

      this.cache.set(cacheKey, recommendations);
      return recommendations;
    } catch (error) {
      console.error("Error getting user recommendations:", error);
      throw error;
    }
  }

  /**
   * Similar properties to a given property
   * Matches: sector, bedrooms, price range (±20%)
   */
  async getSimilarProperties(propertyId, propertyType = "rental", limit = 8) {
    const cacheKey = `similar:${propertyId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const PropertyModel = propertyType === "rental" ? Rentalproperty : SaleProperty;

      const property = await PropertyModel.findById(propertyId)
        .select("Sector bedrooms monthlyRent price ranking isActive createdAt")
        .lean();

      if (!property) throw new Error("Property not found");

      const priceField = propertyType === "rental" ? "monthlyRent" : "price";
      const basePrice = property[priceField];
      const priceRange = {
        min: basePrice * 0.8,
        max: basePrice * 1.2
      };

      const similar = await PropertyModel.find({
        _id: { $ne: propertyId },
        Sector: property.Sector,
        bedrooms: property.bedrooms,
        [priceField]: { $gte: priceRange.min, $lte: priceRange.max },
        isActive: true,
        "ranking.status": "ACTIVE"
      })
        .select("title description images monthlyRent price bedrooms bathrooms ranking createdAt")
        .sort({ "ranking.score": -1 })
        .limit(limit)
        .lean();

      this.cache.set(cacheKey, similar);
      return similar;
    } catch (error) {
      console.error("Error getting similar properties:", error);
      throw error;
    }
  }

  /**
   * Build user engagement profile (lightweight)
   */
  async buildUserProfile(userId) {
    try {
      const user = await User.findById(userId)
        .select("email preferences savedSearches")
        .lean();

      // Enquiries carry no sector; resolve it from the enquired properties
      const enquiries = await Enquiry.find({ userId })
        .select("propertyId propertyType")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const idsByType = { rental: [], sale: [] };
      enquiries.forEach(e => idsByType[e.propertyType]?.push(e.propertyId));

      const [rentals, sales] = await Promise.all([
        idsByType.rental.length
          ? Rentalproperty.find({ _id: { $in: idsByType.rental } }).select("Sector").lean()
          : [],
        idsByType.sale.length
          ? SaleProperty.find({ _id: { $in: idsByType.sale } }).select("Sector").lean()
          : []
      ]);

      const sectorCounts = {};
      [...rentals, ...sales].forEach(p => {
        if (p.Sector) sectorCounts[p.Sector] = (sectorCounts[p.Sector] || 0) + 1;
      });

      const topSectors = Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([sector]) => sector);

      const stats = {
        totalEnquiries: enquiries.length,
        propertyTypes: enquiries.map(e => e.propertyType)
      };

      return {
        userId,
        email: user?.email,
        preferences: user?.preferences || {},
        topSectors,
        engagementLevel: stats.totalEnquiries > 5 ? "high" : "medium",
        propertyTypes: [...new Set(stats.propertyTypes)]
      };
    } catch (error) {
      console.error("Error building user profile:", error);
      return { userId, topSectors: [], engagementLevel: "low", propertyTypes: [] };
    }
  }

  /**
   * Score and rank candidate properties
   * Weighted: sector match (40%) + ranking (35%) + recency (25%)
   */
  async scoreCandidateProperties(userProfile, limit, propertyType) {
    const PropertyModel = propertyType === "rental" ? Rentalproperty : SaleProperty;

    try {
      // Get properties from interested sectors
      const candidates = await PropertyModel.find({
        Sector: {
          $in: userProfile.topSectors.length > 0 ? userProfile.topSectors : [""]
        },
        isActive: true,
        "ranking.status": "ACTIVE"
      })
        .select("title Sector bedrooms monthlyRent price ranking images createdAt")
        .limit(limit * 3)
        .lean();

      if (candidates.length === 0) {
        // Fallback: top-ranked properties
        return await PropertyModel.find({
          isActive: true,
          "ranking.status": "ACTIVE"
        })
          .select("title Sector bedrooms monthlyRent price ranking images createdAt")
          .sort({ "ranking.score": -1 })
          .limit(limit)
          .lean();
      }

      // Score each property
      const scored = candidates.map(prop => ({
        ...prop,
        score: this.calculatePropertyScore(prop, userProfile)
      }));

      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error("Error scoring properties:", error);
      return [];
    }
  }

  /**
   * Calculate recommendation score for a property
   */
  calculatePropertyScore(property, userProfile) {
    let score = 0;

    // Sector match (40%)
    const sectorMatch = userProfile.topSectors.includes(property.Sector) ? 1 : 0.3;
    score += sectorMatch * 40;

    // Ranking score (35%)
    const rankingScore = (property.ranking?.score || 0) / 100;
    score += rankingScore * 35;

    // Recency bonus (25%)
    const daysOld = Math.floor(
      (Date.now() - new Date(property.createdAt)) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = Math.max(0, 1 - daysOld / 90);
    score += recencyScore * 25;

    return Math.round(score);
  }

  /**
   * Get trending properties
   */
  async getTrendingProperties(propertyType = "rental", limit = 10) {
    const cacheKey = `trending:${propertyType}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const PropertyModel = propertyType === "rental" ? Rentalproperty : SaleProperty;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const trending = await PropertyModel.find({
        isActive: true,
        "ranking.status": "ACTIVE",
        createdAt: { $gte: thirtyDaysAgo }
      })
        .select("title Sector bedrooms monthlyRent price ranking images createdAt")
        .sort({
          "ranking.score": -1,
          createdAt: -1
        })
        .limit(limit)
        .lean();

      this.cache.set(cacheKey, trending);
      return trending;
    } catch (error) {
      console.error("Error getting trending properties:", error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache(pattern = "all") {
    if (pattern === "all") {
      this.cache.flushAll();
    } else {
      const keys = this.cache.keys();
      keys.forEach(key => {
        if (key.includes(pattern)) {
          this.cache.del(key);
        }
      });
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      stats: this.cache.getStats()
    };
  }
}

module.exports = new RecommendationEngine();
