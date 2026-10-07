const PropertyRankingService = require('../services/PropertyRankingService');
const SaleProperty = require('../models/SaleProperty.model');
const RentalProperty = require('../models/Rentalproperty.model');

/**
 * Calculate/recalculate ranking for a single property
 */
const calculatePropertyRanking = async (req, res) => {
  try {
    const { propertyId, propertyType = 'sale' } = req.params;
    const { source = 'Own' } = req.body;

    if (!propertyId) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const result = await PropertyRankingService.updatePropertyRanking(
      propertyId,
      propertyType,
      source
    );

    if (!result.success) {
      return res.status(404).json({ message: result.error });
    }

    return res.json({
      message: 'Ranking calculated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error calculating ranking:', error);
    res.status(500).json({ message: 'Server error calculating ranking' });
  }
};

/**
 * Get ranking details for a property
 */
const getPropertyRanking = async (req, res) => {
  try {
    const { propertyId, propertyType = 'sale' } = req.params;

    const Model = propertyType === 'rental' ? RentalProperty : SaleProperty;
    const property = await Model.findById(propertyId).select('ranking');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    return res.json({
      propertyId,
      ranking: property.ranking || {
        score: 0,
        status: 'ACTIVE',
        source: 'Own',
        isSuspicious: false,
        updatedAt: null
      }
    });
  } catch (error) {
    console.error('Error fetching ranking:', error);
    res.status(500).json({ message: 'Server error fetching ranking' });
  }
};

/**
 * Batch recalculate rankings (admin only)
 */
const batchRecalculateRankings = async (req, res) => {
  try {
    // Check if user is admin (optional - add auth check if needed)
    const result = await PropertyRankingService.updateAllRankings();

    return res.json({
      message: 'Batch ranking calculation completed',
      result
    });
  } catch (error) {
    console.error('Error in batch recalculation:', error);
    res.status(500).json({ message: 'Server error during batch recalculation' });
  }
};

/**
 * Get properties by ranking tier
 */
const getPropertiesByRankingTier = async (req, res) => {
  try {
    const { tier = 'all', propertyType = 'sale', limit = 20, page = 1 } = req.query;

    const Model = propertyType === 'rental' ? RentalProperty : SaleProperty;
    const skip = (page - 1) * limit;

    let query = { isActive: true };

    // Filter by ranking tier if specified
    if (tier !== 'all') {
      if (tier === 'platinum') query['ranking.score'] = { $gte: 90 };
      else if (tier === 'gold') query['ranking.score'] = { $gte: 80, $lt: 90 };
      else if (tier === 'silver') query['ranking.score'] = { $gte: 60, $lt: 80 };
      else if (tier === 'bronze') query['ranking.score'] = { $gte: 40, $lt: 60 };
      else if (tier === 'new') query['ranking.score'] = { $lt: 40 };
    }

    const total = await Model.countDocuments(query);
    const properties = await Model.find(query)
      .sort({ 'ranking.score': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('_id title price monthlyRent location Sector ranking createdAt images');

    return res.json({
      properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching properties by tier:', error);
    res.status(500).json({ message: 'Server error fetching properties' });
  }
};

/**
 * Get ranking statistics
 */
const getRankingStats = async (req, res) => {
  try {
    const { propertyType = 'sale' } = req.query;

    const Model = propertyType === 'rental' ? RentalProperty : SaleProperty;

    const stats = await Model.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalProperties: { $sum: 1 },
          avgScore: { $avg: '$ranking.score' },
          maxScore: { $max: '$ranking.score' },
          minScore: { $min: '$ranking.score' },
          platinum: {
            $sum: { $cond: [{ $gte: ['$ranking.score', 90] }, 1, 0] }
          },
          gold: {
            $sum: { $cond: [{ $gte: ['$ranking.score', 80] }, { $cond: [{ $lt: ['$ranking.score', 90] }, 1, 0] }, 0] }
          },
          silver: {
            $sum: { $cond: [{ $gte: ['$ranking.score', 60] }, { $cond: [{ $lt: ['$ranking.score', 80] }, 1, 0] }, 0] }
          },
          bronze: {
            $sum: { $cond: [{ $gte: ['$ranking.score', 40] }, { $cond: [{ $lt: ['$ranking.score', 60] }, 1, 0] }, 0] }
          },
          newTier: {
            $sum: { $cond: [{ $lt: ['$ranking.score', 40] }, 1, 0] }
          },
          suspicious: {
            $sum: { $cond: ['$ranking.isSuspicious', 1, 0] }
          }
        }
      }
    ]);

    return res.json({
      propertyType,
      stats: stats[0] || {
        totalProperties: 0,
        avgScore: 0,
        platinum: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        newTier: 0,
        suspicious: 0
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
};

/**
 * Get suspicious properties (for admin review)
 */
const getSuspiciousProperties = async (req, res) => {
  try {
    const { propertyType = 'sale', limit = 20, page = 1 } = req.query;

    const Model = propertyType === 'rental' ? RentalProperty : SaleProperty;
    const skip = (page - 1) * limit;

    const total = await Model.countDocuments({
      isActive: true,
      'ranking.isSuspicious': true
    });

    const properties = await Model.find({
      isActive: true,
      'ranking.isSuspicious': true
    })
      .sort({ 'ranking.updatedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('_id title price monthlyRent location Sector ranking createdAt');

    return res.json({
      properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching suspicious properties:', error);
    res.status(500).json({ message: 'Server error fetching suspicious properties' });
  }
};

module.exports = {
  calculatePropertyRanking,
  getPropertyRanking,
  batchRecalculateRankings,
  getPropertiesByRankingTier,
  getRankingStats,
  getSuspiciousProperties
};
