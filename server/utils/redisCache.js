/**
 * Redis Cache Layer
 * Provides persistent caching across server restarts and multiple instances
 * Gracefully degrades if Redis is unavailable
 * Uses ioredis for connection management
 */

const Redis = require('ioredis');
const { logger } = require('../config/logger');

let client = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
async function initialize() {
  if (!process.env.REDIS_URL) {
    logger.info('[redis] REDIS_URL not set - Redis caching disabled');
    return false;
  }

  try {
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        if (times > 10) {
          logger.error('[redis] Max reconnection attempts reached');
          return null;
        }
        return delay;
      },
      enableReadyCheck: false,
      enableOfflineQueue: true,
      connectTimeout: 5000
    });

    client.on('error', (err) => {
      logger.error('[redis] Error:', err.message);
      isConnected = false;
    });

    client.on('connect', () => {
      logger.info('[redis] Connected');
      isConnected = true;
    });

    client.on('reconnecting', () => {
      logger.warn('[redis] Reconnecting...');
    });

    // Wait for connection
    await client.ping();
    isConnected = true;
    logger.info('[redis] Initialized and connected');
    return true;
  } catch (error) {
    logger.error('[redis] Initialization failed:', error.message);
    isConnected = false;
    return false;
  }
}

/**
 * Get value from Redis
 */
async function get(key) {
  if (!isConnected || !client) {
    return null;
  }

  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('[redis] Get error:', error.message);
    return null;
  }
}

/**
 * Set value in Redis with TTL
 */
async function set(key, value, ttl = 600) {
  if (!isConnected || !client) {
    return false;
  }

  try {
    await client.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('[redis] Set error:', error.message);
    return false;
  }
}

/**
 * Delete key from Redis
 */
async function invalidate(key) {
  if (!isConnected || !client) {
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('[redis] Delete error:', error.message);
    return false;
  }
}

/**
 * Delete keys matching pattern
 */
async function invalidatePattern(pattern) {
  if (!isConnected || !client) {
    return false;
  }

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    logger.error('[redis] Pattern delete error:', error.message);
    return false;
  }
}

/**
 * Clear all keys in Redis database
 */
async function clearAll() {
  if (!isConnected || !client) {
    return false;
  }

  try {
    await client.flushDb();
    return true;
  } catch (error) {
    logger.error('[redis] Clear all error:', error.message);
    return false;
  }
}

/**
 * Get Redis info/stats
 */
async function getStats() {
  if (!isConnected || !client) {
    return null;
  }

  try {
    const info = await client.info();
    return { connected: true, info };
  } catch (error) {
    logger.error('[redis] Stats error:', error.message);
    return { connected: false };
  }
}

/**
 * Check if Redis is connected
 */
function checkConnection() {
  return isConnected && client !== null;
}

/**
 * Graceful shutdown
 */
async function disconnect() {
  if (client) {
    try {
      await client.disconnect();
      isConnected = false;
      logger.info('[redis] Disconnected');
    } catch (error) {
      logger.error('[redis] Disconnect error:', error.message);
    }
  }
}

module.exports = {
  initialize,
  get,
  set,
  invalidate,
  invalidatePattern,
  clearAll,
  getStats,
  isConnected: checkConnection,
  disconnect
};
