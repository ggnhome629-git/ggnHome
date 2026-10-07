const logger = require('./logger');

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        logger.warn(`Attempt ${attempt} failed, retrying in ${waitTime}ms...`, { error: error.message });

        if (onRetry) {
          onRetry(attempt, waitTime, error);
        }

        await sleep(waitTime);
      }
    }
  }

  throw lastError;
}

/**
 * Parse price string to number
 */
function parsePrice(priceStr) {
  if (!priceStr) return null;

  // Remove currency symbols and spaces
  let cleaned = priceStr.replace(/[^\d.,]/g, '').trim();

  // Handle different formats: 1,00,000 (Indian) or 100,000 (Western)
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');

    // Indian format: 1,00,000 or 10,00,000
    if (parts.length >= 2 && parts[parts.length - 1].length === 2) {
      // Remove all commas and convert
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const price = parseFloat(cleaned);
  return isNaN(price) ? null : Math.round(price);
}

/**
 * Parse area string to number (in sqft)
 */
function parseArea(areaStr) {
  if (!areaStr) return null;

  const cleaned = areaStr.replace(/[^\d.,]/g, '').trim();
  const area = parseFloat(cleaned.replace(/,/g, ''));

  return isNaN(area) ? null : Math.round(area);
}

/**
 * Normalize sector/location name
 */
function normalizeSector(sector) {
  if (!sector) return null;

  return sector
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract BHK from configuration string
 */
function extractBHK(config) {
  if (!config) return null;

  // Match patterns like "2 BHK", "3BHK", "1 RK", etc.
  const match = config.match(/(\d+)\s*(BHK|RK)/i);
  if (match) {
    return `${match[1]} ${match[2].toUpperCase()}`;
  }

  return null;
}

/**
 * Validate property object
 */
function validateProperty(property) {
  const errors = [];

  if (!property.title) errors.push('Missing title');
  if (!property.monthlyRent && property.sourcePortal) errors.push('Missing rent/price');
  if (!property.Sector) errors.push('Missing sector');
  if (!property.propertyType) errors.push('Missing property type');

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate tracking ID
 */
function generateTrackingId(portal, listingId) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${portal.substring(0, 3).toUpperCase()}_${timestamp}_${random}`.toUpperCase();
}

/**
 * Format date
 */
function formatDate(date) {
  if (!(date instanceof Date)) {
    return null;
  }
  return date.toISOString();
}

/**
 * Deduplicate properties by source ID
 */
function deduplicateBySourceId(properties) {
  const seen = new Set();
  return properties.filter(prop => {
    const key = `${prop.sourcePortal}_${prop.sourceListingId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

module.exports = {
  sleep,
  retry,
  parsePrice,
  parseArea,
  normalizeSector,
  extractBHK,
  validateProperty,
  generateTrackingId,
  formatDate,
  deduplicateBySourceId,
  getCurrentTimestamp
};
