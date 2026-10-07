/**
 * Hybrid Cache System: Redis (persistent) + In-Memory (L1 fast cache)
 * - L1 (In-Memory): 5-10 min TTL, instant access
 * - L2 (Redis): 30-60 min TTL, survives restarts
 * - Fallback: Graceful degradation if Redis unavailable
 */

const NodeCache = require('node-cache');
const redis = require('./redisCache');
const { logger } = require('../config/logger');

// L1 Cache: In-memory with 5-minute default TTL
const localCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Cache key builders
 */
const cacheKeys = {
  property: (type, id) => `property:${type}:${id}`,
  ranking: (type, id) => `ranking:${type}:${id}`,
  search: (type, city, page) => `search:${type}:${city}:${page}`,
  stats: (key) => `stats:${key}`,
  user: (id) => `user:${id}`,
  trending: (type) => `trending:${type}`,
  featured: (city) => `featured:${city}`
};

/**
 * Get from cache (L1 then L2)
 */
async function get(key, options = {}) {
  try {
    // L1: Check in-memory cache first
    const localValue = localCache.get(key);
    if (localValue) {
      logger.debug('[cache] L1 hit:', key);
      return localValue;
    }

    // L2: Check Redis
    if (redis.isConnected()) {
      const redisValue = await redis.get(key);
      if (redisValue) {
        // Repopulate L1
        localCache.set(key, redisValue, 300);
        logger.debug('[cache] L2 hit:', key);
        return redisValue;
      }
    }

    logger.debug('[cache] miss:', key);
    return null;
  } catch (error) {
    logger.error('[cache] Get error:', error.message);
    return null;
  }
}

/**
 * Set to cache (both L1 and L2)
 */
async function set(key, value, ttl = 600) {
  try {
    // L1: Store in memory (shorter TTL)
    localCache.set(key, value, Math.min(ttl, 300));

    // L2: Store in Redis (longer TTL)
    if (redis.isConnected()) {
      await redis.set(key, value, ttl);
      logger.debug('[cache] set (L1+L2):', key, `ttl=${ttl}s`);
    } else {
      logger.debug('[cache] set (L1 only):', key, `ttl=${Math.min(ttl, 300)}s`);
    }
  } catch (error) {
    logger.error('[cache] Set error:', error.message);
  }
}

/**
 * Delete from cache (both L1 and L2)
 */
async function invalidate(key) {
  try {
    localCache.del(key);
    if (redis.isConnected()) {
      await redis.invalidate(key);
      logger.debug('[cache] invalidated (L1+L2):', key);
    } else {
      logger.debug('[cache] invalidated (L1 only):', key);
    }
  } catch (error) {
    logger.error('[cache] Invalidate error:', error.message);
  }
}

/**
 * Clear all cache
 */
async function clear() {
  try {
    localCache.flushAll();
    if (redis.isConnected()) {
      await redis.clearAll();
      logger.debug('[cache] cleared (L1+L2)');
    } else {
      logger.debug('[cache] cleared (L1 only)');
    }
  } catch (error) {
    logger.error('[cache] Clear error:', error.message);
  }
}

/**
 * Cache property by ID and type
 */
async function cacheProperty(propertyId, propertyType, propertyData, ttl = 600) {
  const key = cacheKeys.property(propertyType, propertyId);
  await set(key, propertyData, ttl);
}

/**
 * Get cached property
 */
async function getProperty(propertyId, propertyType) {
  const key = cacheKeys.property(propertyType, propertyId);
  return await get(key);
}

/**
 * Invalidate property cache
 */
async function invalidateProperty(propertyId, propertyType) {
  const key = cacheKeys.property(propertyType, propertyId);
  await invalidate(key);
}

/**
 * Cache ranking data
 */
async function cacheRanking(propertyId, propertyType, rankingData, ttl = 900) {
  const key = cacheKeys.ranking(propertyType, propertyId);
  await set(key, rankingData, ttl);
}

/**
 * Get cached ranking
 */
async function getRanking(propertyId, propertyType) {
  const key = cacheKeys.ranking(propertyType, propertyId);
  return await get(key);
}

/**
 * Invalidate ranking cache
 */
async function invalidateRanking(propertyId, propertyType) {
  const key = cacheKeys.ranking(propertyType, propertyId);
  await invalidate(key);
}

/**
 * Cache search results
 */
async function cacheSearch(propertyType, city, page, results, ttl = 1800) {
  const key = cacheKeys.search(propertyType, city, page);
  await set(key, results, ttl);
}

/**
 * Get cached search results
 */
async function getSearch(propertyType, city, page) {
  const key = cacheKeys.search(propertyType, city, page);
  return await get(key);
}

/**
 * Invalidate all search results for a city
 */
async function invalidateSearchCity(propertyType, city) {
  try {
    // Invalidate L1
    for (let page = 1; page <= 100; page++) {
      localCache.del(cacheKeys.search(propertyType, city, page));
    }

    // Invalidate L2 (wildcard pattern)
    if (redis.isConnected()) {
      await redis.invalidatePattern(`search:${propertyType}:${city}:*`);
    }
    logger.debug('[cache] invalidated search for:', city);
  } catch (error) {
    logger.error('[cache] Invalidate search error:', error.message);
  }
}

/**
 * Cache statistics
 */
async function cacheStats(key, data, ttl = 3600) {
  const cacheKey = cacheKeys.stats(key);
  await set(cacheKey, data, ttl);
}

/**
 * Get cached statistics
 */
async function getStats(key) {
  const cacheKey = cacheKeys.stats(key);
  return await get(cacheKey);
}

/**
 * Cache trending properties
 */
async function cacheTrending(propertyType, data, ttl = 1800) {
  const key = cacheKeys.trending(propertyType);
  await set(key, data, ttl);
}

/**
 * Get cached trending
 */
async function getTrending(propertyType) {
  const key = cacheKeys.trending(propertyType);
  return await get(key);
}

/**
 * Cache featured properties
 */
async function cacheFeatured(city, data, ttl = 1800) {
  const key = cacheKeys.featured(city);
  await set(key, data, ttl);
}

/**
 * Get cached featured
 */
async function getFeatured(city) {
  const key = cacheKeys.featured(city);
  return await get(key);
}

/**
 * Get cache statistics
 */
function getStats() {
  return {
    localCache: localCache.getStats(),
    redis: redis.isConnected() ? 'connected' : 'disconnected'
  };
}

module.exports = {
  // Low-level ops
  get,
  set,
  invalidate,
  clear,
  cacheKeys,

  // Property caching
  cacheProperty,
  getProperty,
  invalidateProperty,

  // Ranking caching
  cacheRanking,
  getRanking,
  invalidateRanking,

  // Search caching
  cacheSearch,
  getSearch,
  invalidateSearchCity,

  // Stats caching
  cacheStats,
  getStats: getStats,

  // Trending/Featured
  cacheTrending,
  getTrending,
  cacheFeatured,
  getFeatured,

  // Utility
  getStats: () => ({
    localCache: localCache.getStats(),
    redis: redis.isConnected() ? 'connected' : 'disconnected'
  })
};
