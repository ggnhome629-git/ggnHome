const PropertyRankingService = require('../services/PropertyRankingService');

/**
 * Hook to auto-calculate ranking when property is created or updated
 * Should be called after property is saved
 */
const calculateRankingAfterSave = async (propertyId, propertyType = 'sale', source = 'Own') => {
  try {
    await PropertyRankingService.updatePropertyRanking(propertyId, propertyType, source);
  } catch (error) {
    console.error(`Error auto-calculating ranking for property ${propertyId}:`, error);
    // Don't throw - let the property save succeed even if ranking fails
  }
};

/**
 * Debounced ranking calculation for high-frequency updates
 * (e.g., when multiple enquiries come in quickly)
 */
const debouncedRankingCalculation = (() => {
  const pending = new Map();

  return (propertyId, propertyType = 'sale', source = 'Own', delay = 5000) => {
    const key = `${propertyId}_${propertyType}`;

    // Clear previous timeout
    if (pending.has(key)) {
      clearTimeout(pending.get(key).timeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      calculateRankingAfterSave(propertyId, propertyType, source);
      pending.delete(key);
    }, delay);

    pending.set(key, { timeout, propertyId, propertyType, source });
  };
})();

module.exports = {
  calculateRankingAfterSave,
  debouncedRankingCalculation
};
