/**
 * Recommendations Routes
 * Integrated into main server
 */

const express = require("express");
const router = express.Router();
const recommendationEngine = require("../services/recommendations/engine");
const { verifyTokenOptional, verifyToken, checkAdminEmail } = require("../middleware/verifyToken");

/**
 * GET /api/recommendations/user/:userId?limit=10
 * Get personalized recommendations for user
 */
router.get("/user/:userId", verifyTokenOptional, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const recommendations = await recommendationEngine.getUserRecommendations(
      userId,
      Math.min(parseInt(limit), 50)
    );

    res.json({
      success: true,
      count: recommendations.length,
      recommendations,
      meta: {
        userId,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/recommendations/similar/:propertyId?limit=8&type=rental
 * Get similar properties
 */
router.get("/similar/:propertyId", verifyTokenOptional, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { type = "rental", limit = 8 } = req.query;

    if (!propertyId) {
      return res.status(400).json({ error: "propertyId required" });
    }

    const similar = await recommendationEngine.getSimilarProperties(
      propertyId,
      type,
      Math.min(parseInt(limit), 20)
    );

    res.json({
      success: true,
      count: similar.length,
      properties: similar,
      meta: {
        propertyId,
        type,
        matchCriteria: "sector + bedrooms + price range (±20%)"
      }
    });
  } catch (error) {
    console.error("Similar properties error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/recommendations/trending?type=rental&limit=10
 * Get trending properties
 */
router.get("/trending", verifyTokenOptional, async (req, res) => {
  try {
    const { type = "rental", limit = 10 } = req.query;

    const trending = await recommendationEngine.getTrendingProperties(
      type,
      Math.min(parseInt(limit), 30)
    );

    res.json({
      success: true,
      count: trending.length,
      properties: trending,
      meta: {
        type,
        period: "last 30 days",
        sortedBy: "ranking score"
      }
    });
  } catch (error) {
    console.error("Trending error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/recommendations/cache/stats
 * Admin only: Get cache stats
 */
router.get("/cache/stats", verifyToken, checkAdminEmail, (req, res) => {
  const stats = recommendationEngine.getCacheStats();
  res.json({
    success: true,
    cache: stats
  });
});

/**
 * POST /api/recommendations/cache/clear
 * Admin only: Clear cache
 */
router.post("/cache/clear", verifyToken, checkAdminEmail, (req, res) => {
  try {
    const { pattern = "all" } = req.body;
    recommendationEngine.clearCache(pattern);
    res.json({
      success: true,
      message: `Cache cleared for pattern: ${pattern}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
