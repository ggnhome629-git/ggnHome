const SaleProperty = require('../models/SaleProperty.model');
const RentalProperty = require('../models/Rentalproperty.model');

class PropertyRankingService {
  /**
   * Calculate quality score (Q) - 40%
   * Measures: completeness, media, description quality
   */
  static calculateQualityScore(property) {
    let completeness = 0;
    let media = 0;
    let description = 0;

    // Completeness: Check if key fields exist
    const requiredFields = ['price', 'totalArea', 'Sector', 'propertyType'];
    const hasConfig = property.totalArea?.configuration || property.bedrooms != null;
    const completenessFields = [
      property.price != null,
      hasConfig,
      property.totalArea?.sqft != null,
      property.Sector,
      property.propertyType
    ].filter(Boolean).length;

    if (completenessFields === 5) completeness = 100;
    else if (completenessFields === 4) completeness = 75;
    else if (completenessFields === 3) completeness = 50;
    else completeness = 0;

    // Media: Photo count
    const photoCount = property.images?.length || 0;
    if (photoCount === 0) media = 0;
    else if (photoCount <= 2) media = 40;
    else if (photoCount <= 5) media = 70;
    else media = 100;

    // Description: Length check
    const descLength = property.description?.trim().length || 0;
    if (descLength === 0) description = 0;
    else if (descLength < 50) description = 0;
    else if (descLength < 150) description = 50;
    else description = 100;

    const Q = (completeness * 0.4) + (media * 0.35) + (description * 0.25);
    return Math.round(Q * 100) / 100;
  }

  /**
   * Calculate engagement score (E) - 35%
   * Uses Bayesian smoothing to avoid penalizing new listings
   */
  static calculateEngagementScore(property) {
    const enquiries = property.enquiryCount || 0;
    const saves = property.saveCount || 0;
    const views = property.viewCount || 0;

    // Bayesian smoothing for enquiry rate
    const enquiryRate = (enquiries + 3) / (views + 10);
    const sectorAvg = property.sectorAvgEnquiryRate || 0.05; // 5% as default

    const ratio = enquiryRate / Math.max(sectorAvg, 0.01);
    const enquiryScore = 50 + 50 * Math.tanh(Math.log(ratio));

    // Simple save rate (0-100)
    const saveRate = saves > 0 ? Math.min(100, (saves / (views + 1)) * 1000) : 50;

    const E = (enquiryScore * 0.7) + (saveRate * 0.3);
    return Math.round(E * 100) / 100;
  }

  /**
   * Calculate trust & freshness score (TF) - 25%
   * Trust base by source + freshness decay
   */
  static calculateTrustFreshnessScore(property, source = 'Own') {
    const trustBase = this.getTrustBaseScore(source);

    // Freshness: Days since last meaningful edit
    const lastUpdate = property.updatedAt || property.createdAt;
    const daysSinceUpdate = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24));

    let freshness = 100;
    if (daysSinceUpdate === 0) freshness = 100;
    else if (daysSinceUpdate <= 7) freshness = 90;
    else if (daysSinceUpdate <= 21) freshness = 70;
    else if (daysSinceUpdate <= 45) freshness = 40;
    else freshness = 10;

    const TF = (trustBase * 0.6) + (freshness * 0.4);
    return Math.round(TF * 100) / 100;
  }

  /**
   * Get trust base score by source type
   */
  static getTrustBaseScore(source) {
    const trustScores = {
      'Own': 90,
      'Partner': 80,
      'Agent': 70,
      'Owner': 65,
      'Scraped': 50
    };
    return trustScores[source] || 50;
  }

  /**
   * Gate checks - returns null if property fails any hard check
   */
  static performGateChecks(property) {
    const checks = {
      missingCritical: !this.hasCriticalFields(property),
      hasPhoto: !property.images || property.images.length === 0,
      invalidPrice: this.isInvalidPrice(property),
      invalidArea: this.isInvalidArea(property),
      spamText: this.hasSpamText(property),
      invalidSector: !property.Sector
    };

    // If any check fails, return the failed checks
    const failedChecks = Object.entries(checks)
      .filter(([_, failed]) => failed)
      .map(([check, _]) => check);

    return failedChecks.length > 0 ? failedChecks : null;
  }

  /**
   * Check if critical fields exist
   */
  static hasCriticalFields(property) {
    return (
      property.price != null &&
      (property.totalArea?.configuration || property.bedrooms != null) &&
      property.totalArea?.sqft != null &&
      property.Sector &&
      property.propertyType
    );
  }

  /**
   * Validate price is reasonable
   */
  static isInvalidPrice(property) {
    const price = property.price;
    const isRental = property.monthlyRent != null;

    if (isRental) {
      // Rent: should be between ₹1000 and ₹50L/month
      return price < 1000 || price > 5000000;
    } else {
      // Sale: should be between ₹50K and ₹10Cr
      return price < 50000 || price > 1000000000;
    }
  }

  /**
   * Validate area is reasonable
   */
  static isInvalidArea(property) {
    const area = property.totalArea?.sqft;
    if (!area) return false;
    // Area should be between 100 and 100,000 sqft
    return area < 100 || area > 100000;
  }

  /**
   * Check for spam text
   */
  static hasSpamText(property) {
    const description = property.description || '';
    const phoneRegex = /\b[6-9]\d{9}\b/g;
    const urlRegex = /https?:\/\/|www\./i;
    const bannedWords = ['buy-now', 'limited-offer', 'spam', 'casino', 'lottery'];

    const hasPhone = phoneRegex.test(description);
    const hasUrl = urlRegex.test(description);
    const hasBanned = bannedWords.some(word => description.toLowerCase().includes(word));

    return hasPhone || hasUrl || hasBanned;
  }

  /**
   * Apply penalties to score
   */
  static applyPenalties(score, property) {
    let multiplier = 1.0;

    // Price anomaly penalty
    if (property.isPriceAnomaly) {
      multiplier *= 0.7;
    }

    // Unconfirmed for too long
    const daysSinceCreation = Math.floor((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreation > 60 && !property.isConfirmed) {
      multiplier *= 0.6;
    }

    // Has unresolved complaints
    if ((property.reportCount || 0) > 2) {
      multiplier *= 0.5;
    }

    return Math.round(score * multiplier * 100) / 100;
  }

  /**
   * Main ranking calculation function
   */
  static calculateRankingScore(property, source = 'Own') {
    // Perform gate checks
    const failedChecks = this.performGateChecks(property);

    if (failedChecks && failedChecks.includes('hasPhoto')) {
      return {
        score: 0,
        status: 'QUARANTINED',
        isSuspicious: true,
        failedChecks: failedChecks
      };
    }

    if (failedChecks) {
      return {
        score: 0,
        status: 'REJECTED',
        isSuspicious: true,
        failedChecks: failedChecks
      };
    }

    // Calculate component scores
    const Q = this.calculateQualityScore(property);
    const E = this.calculateEngagementScore(property);
    const TF = this.calculateTrustFreshnessScore(property, source);

    // Calculate final score: (40% Q + 35% E + 25% TF)
    let finalScore = (0.40 * Q) + (0.35 * E) + (0.25 * TF);

    // Apply penalties
    finalScore = this.applyPenalties(finalScore, property);

    // Clamp score between 0 and 100
    finalScore = Math.max(0, Math.min(100, finalScore));

    return {
      score: Math.round(finalScore * 100) / 100,
      status: 'ACTIVE',
      isSuspicious: false,
      components: { Q, E, TF }
    };
  }

  /**
   * Update ranking for a property
   */
  static async updatePropertyRanking(propertyId, propertyType = 'sale', source = 'Own') {
    try {
      const Model = propertyType === 'rental' ? RentalProperty : SaleProperty;
      const property = await Model.findById(propertyId);

      if (!property) {
        throw new Error(`Property not found: ${propertyId}`);
      }

      const rankingResult = this.calculateRankingScore(property, source);

      // Update property with ranking
      property.ranking = {
        score: rankingResult.score,
        status: rankingResult.status,
        source: source,
        isSuspicious: rankingResult.isSuspicious,
        updatedAt: new Date()
      };

      await property.save();

      return {
        success: true,
        propertyId,
        ranking: property.ranking,
        components: rankingResult.components
      };
    } catch (error) {
      console.error('Error updating property ranking:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch update rankings (for scheduler jobs)
   */
  static async updateAllRankings() {
    try {
      const saleProperties = await SaleProperty.find({ isActive: true }).select('_id ownerType');
      const rentalProperties = await RentalProperty.find({ isActive: true }).select('_id ownerType');

      let updated = 0;
      let failed = 0;

      // Update sale properties
      for (const prop of saleProperties) {
        const source = this.getSourceFromOwnerType(prop.ownerType);
        const result = await this.updatePropertyRanking(prop._id, 'sale', source);
        if (result.success) updated++;
        else failed++;
      }

      // Update rental properties
      for (const prop of rentalProperties) {
        const source = this.getSourceFromOwnerType(prop.ownerType);
        const result = await this.updatePropertyRanking(prop._id, 'rental', source);
        if (result.success) updated++;
        else failed++;
      }

      return { updated, failed };
    } catch (error) {
      console.error('Error in batch ranking update:', error);
      return { updated: 0, failed: 0, error: error.message };
    }
  }

  /**
   * Map ownerType to source
   */
  static getSourceFromOwnerType(ownerType) {
    const mapping = {
      'Owner': 'Owner',
      'Agent': 'Agent',
      'Admin': 'Own',
      'Partner': 'Partner',
      'Scraped': 'Scraped'
    };
    return mapping[ownerType] || 'Own';
  }
}

module.exports = PropertyRankingService;
