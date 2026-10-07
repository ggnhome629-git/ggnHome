/**
 * Cache Manager Utility
 * Manages multi-tier caching: Memory (RAM), LocalStorage, and IndexedDB
 * For fast data retrieval and offline access
 */

import React from 'react';

const CACHE_KEYS = {
  USER_DATA: 'ggnhome_user',
  PROPERTIES: 'ggnhome_properties',
  SEARCH_FILTERS: 'ggnhome_filters',
  ANALYTICS: 'ggnhome_analytics',
  PREFERENCES: 'ggnhome_preferences',
  LOCALITIES: 'ggnhome_localities',
  AMENITIES: 'ggnhome_amenities',
};

const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  EXTENDED: 7 * 24 * 60 * 60 * 1000, // 7 days
};

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.db = null;
    this.initDB();
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  initDB() {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not available, using memory cache only');
      return;
    }

    const request = indexedDB.open('GgnHomeCache', 1);

    request.onerror = () => {
      console.error('IndexedDB initialization failed');
    };

    request.onsuccess = (event) => {
      this.db = event.target.result;
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('cache')) {
        const store = db.createObjectStore('cache', { keyPath: 'key' });
        store.createIndex('expiry', 'expiry', { unique: false });
      }
    };
  }

  /**
   * Get data from cache (memory -> localStorage -> IndexedDB)
   */
  async get(key, options = {}) {
    const { useMemory = true, useStorage = true, useIDB = true } = options;

    // Check memory cache first
    if (useMemory && this.memoryCache.has(key)) {
      const { data, expiry } = this.memoryCache.get(key);
      if (!this.isExpired(expiry)) {
        return data;
      }
      this.memoryCache.delete(key);
    }

    // Check localStorage
    if (useStorage) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const { data, expiry } = JSON.parse(stored);
          if (!this.isExpired(expiry)) {
            this.memoryCache.set(key, { data, expiry });
            return data;
          }
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`Error parsing cache for ${key}:`, e);
          localStorage.removeItem(key);
        }
      }
    }

    // Check IndexedDB
    if (useIDB && this.db) {
      try {
        const data = await this.getFromIDB(key);
        if (data && !this.isExpired(data.expiry)) {
          this.memoryCache.set(key, { data: data.value, expiry: data.expiry });
          return data.value;
        }
        await this.deleteFromIDB(key);
      } catch (e) {
        console.error(`Error getting from IndexedDB for ${key}:`, e);
      }
    }

    return null;
  }

  /**
   * Set data in cache (memory + localStorage/IndexedDB)
   */
  async set(key, value, duration = CACHE_DURATIONS.MEDIUM, options = {}) {
    const { useMemory = true, useStorage = true, useIDB = true } = options;
    const expiry = Date.now() + duration;
    const cacheData = { data: value, expiry };

    // Save to memory cache
    if (useMemory) {
      this.memoryCache.set(key, cacheData);
    }

    // Save to localStorage (max ~5-10MB)
    if (useStorage) {
      try {
        const size = JSON.stringify(cacheData).length;
        if (size < 1024 * 1024) { // Only cache if < 1MB
          localStorage.setItem(key, JSON.stringify(cacheData));
        }
      } catch (e) {
        console.warn(`LocalStorage full or unavailable for ${key}:`, e);
        // Continue to IndexedDB
      }
    }

    // Save to IndexedDB (more storage, slower)
    if (useIDB && this.db) {
      try {
        await this.saveToIDB(key, value, expiry);
      } catch (e) {
        console.warn(`IndexedDB save failed for ${key}:`, e);
      }
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key) {
    this.memoryCache.delete(key);
    localStorage.removeItem(key);
    if (this.db) {
      await this.deleteFromIDB(key);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    this.memoryCache.clear();
    localStorage.clear();
    if (this.db) {
      const request = this.db
        .transaction(['cache'], 'readwrite')
        .objectStore('cache')
        .clear();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired() {
    const now = Date.now();

    // Clear from memory
    for (const [key, { expiry }] of this.memoryCache.entries()) {
      if (this.isExpired(expiry)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from localStorage
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('ggnhome_')) {
        try {
          const { expiry } = JSON.parse(localStorage.getItem(key));
          if (this.isExpired(expiry)) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    }

    // Clear from IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expiry');
      const range = IDBKeyRange.upperBound(now);

      return new Promise((resolve, reject) => {
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get cache size info
   */
  getCacheStats() {
    let memorySize = 0;
    for (const { data } of this.memoryCache.values()) {
      memorySize += JSON.stringify(data).length;
    }

    let localStorageSize = 0;
    for (const value of Object.values(localStorage)) {
      localStorageSize += value.length;
    }

    return {
      memory: (memorySize / 1024).toFixed(2) + ' KB',
      localStorage: (localStorageSize / 1024).toFixed(2) + ' KB',
      totalEntries: this.memoryCache.size,
    };
  }

  /**
   * Helper: Check if cache entry is expired
   */
  isExpired(expiry) {
    return Date.now() > expiry;
  }

  /**
   * IndexedDB helpers
   */
  getFromIDB(key) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null);

      const request = this.db
        .transaction(['cache'], 'readonly')
        .objectStore('cache')
        .get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  saveToIDB(key, value, expiry) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();

      const request = this.db
        .transaction(['cache'], 'readwrite')
        .objectStore('cache')
        .put({ key, value, expiry });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  deleteFromIDB(key) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();

      const request = this.db
        .transaction(['cache'], 'readwrite')
        .objectStore('cache')
        .delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
const cacheManager = new CacheManager();

/**
 * React Hook: useCachedData
 * Fetches data with automatic caching
 */
export const useCachedData = (
  key,
  fetchFn,
  duration = CACHE_DURATIONS.MEDIUM,
  deps = []
) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // Try to get from cache first
        const cached = await cacheManager.get(key);
        if (cached && isMounted) {
          setData(cached);
          setLoading(false);
          return;
        }

        // Fetch fresh data
        const fresh = await fetchFn();
        if (isMounted) {
          await cacheManager.set(key, fresh, duration);
          setData(fresh);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          // Try to use stale cache on error
          const stale = await cacheManager.get(key, { useMemory: false });
          if (stale) {
            setData(stale);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, deps);

  return { data, loading, error };
};

/**
 * React Hook: useCachedSearch
 * Caches search/filter results
 */
export const useCachedSearch = (filters, searchFn) => {
  const cacheKey = `search_${JSON.stringify(filters)}`;
  return useCachedData(
    cacheKey,
    () => searchFn(filters),
    CACHE_DURATIONS.MEDIUM,
    [JSON.stringify(filters)]
  );
};

/**
 * React Hook: useCachedUser
 * Caches user profile/preferences
 */
export const useCachedUser = (userId, fetchUserFn) => {
  return useCachedData(
    `${CACHE_KEYS.USER_DATA}_${userId}`,
    fetchUserFn,
    CACHE_DURATIONS.LONG,
    [userId]
  );
};

/**
 * Specific cache utilities for common use cases
 */
export const cacheUtils = {
  /**
   * Cache API response
   */
  cacheAPIResponse: async (key, apiCall, duration = CACHE_DURATIONS.MEDIUM) => {
    const cached = await cacheManager.get(key);
    if (cached) return cached;

    const data = await apiCall();
    await cacheManager.set(key, data, duration);
    return data;
  },

  /**
   * Cache user preferences
   */
  cacheUserPreferences: async (preferences) => {
    await cacheManager.set(
      `${CACHE_KEYS.PREFERENCES}_${preferences.userId}`,
      preferences,
      CACHE_DURATIONS.EXTENDED
    );
  },

  /**
   * Get cached user preferences
   */
  getUserPreferences: async (userId) => {
    return await cacheManager.get(`${CACHE_KEYS.PREFERENCES}_${userId}`);
  },

  /**
   * Cache search results
   */
  cacheSearchResults: async (filters, results) => {
    const key = `${CACHE_KEYS.SEARCH_FILTERS}_${JSON.stringify(filters)}`;
    await cacheManager.set(key, results, CACHE_DURATIONS.MEDIUM);
  },

  /**
   * Get cached search results
   */
  getSearchResults: async (filters) => {
    const key = `${CACHE_KEYS.SEARCH_FILTERS}_${JSON.stringify(filters)}`;
    return await cacheManager.get(key);
  },

  /**
   * Cache property details
   */
  cacheProperty: async (propertyId, propertyData) => {
    await cacheManager.set(
      `${CACHE_KEYS.PROPERTIES}_${propertyId}`,
      propertyData,
      CACHE_DURATIONS.LONG
    );
  },

  /**
   * Get cached property
   */
  getProperty: async (propertyId) => {
    return await cacheManager.get(`${CACHE_KEYS.PROPERTIES}_${propertyId}`);
  },

  /**
   * Cache analytics data
   */
  cacheAnalytics: async (userId, analyticsData) => {
    await cacheManager.set(
      `${CACHE_KEYS.ANALYTICS}_${userId}`,
      analyticsData,
      CACHE_DURATIONS.SHORT
    );
  },

  /**
   * Get cached analytics
   */
  getAnalytics: async (userId) => {
    return await cacheManager.get(`${CACHE_KEYS.ANALYTICS}_${userId}`);
  },

  /**
   * Cache localities/sectors
   */
  cacheLocalities: async (localities) => {
    await cacheManager.set(
      CACHE_KEYS.LOCALITIES,
      localities,
      CACHE_DURATIONS.EXTENDED
    );
  },

  /**
   * Get cached localities
   */
  getLocalities: async () => {
    return await cacheManager.get(CACHE_KEYS.LOCALITIES);
  },

  /**
   * Clear specific cache
   */
  clearCache: async (key) => {
    await cacheManager.delete(key);
  },

  /**
   * Clear all cache
   */
  clearAllCache: async () => {
    await cacheManager.clear();
  },

  /**
   * Clear expired entries
   */
  clearExpired: async () => {
    await cacheManager.clearExpired();
  },

  /**
   * Get cache stats
   */
  getStats: () => cacheManager.getCacheStats(),
};

export { CACHE_KEYS, CACHE_DURATIONS, cacheManager };

export default {
  useCachedData,
  useCachedSearch,
  useCachedUser,
  cacheUtils,
  CACHE_KEYS,
  CACHE_DURATIONS,
};
