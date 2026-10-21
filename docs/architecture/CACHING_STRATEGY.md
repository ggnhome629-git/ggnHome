# GgnHome Caching Strategy

## Overview
Implement a multi-tier caching strategy for fast data retrieval and offline access.

Three-tier cache architecture:
1. **Memory Cache** (RAM) - Fastest, limited size, session-only
2. **LocalStorage** - Medium speed, ~5-10MB, persists across sessions
3. **IndexedDB** - Slowest, unlimited, persists across sessions

---

## Cache Tiers

### Memory Cache (L1)
- **Speed**: Instant (0ms)
- **Size**: ~50-100MB depending on device
- **Duration**: Session only
- **Use Case**: Frequently accessed data (current page, search results)

**Pros:**
- Fastest retrieval
- No serialization overhead
- Automatic garbage collection

**Cons:**
- Lost on page refresh
- Limited capacity
- Device dependent

### LocalStorage (L2)
- **Speed**: ~1-5ms
- **Size**: ~5-10MB per domain
- **Duration**: Persistent (until manually cleared)
- **Use Case**: User preferences, search filters, recently viewed

**Pros:**
- Persists across sessions
- Simple API
- Good for small-medium data

**Cons:**
- Synchronous API (blocks thread)
- Small size limit
- Slower than memory

### IndexedDB (L3)
- **Speed**: ~5-20ms
- **Size**: 50MB+, browser dependent
- **Duration**: Persistent (until manually cleared)
- **Use Case**: Large datasets (property listings, analytics)

**Pros:**
- Large storage capacity
- Asynchronous (non-blocking)
- Indexing for fast queries
- Structured data support

**Cons:**
- More complex API
- Slower than localStorage
- Browser compatibility varies

---

## Caching Strategy by Data Type

### User Data
```javascript
// Cache: User profile, preferences
Duration: 24 hours (CACHE_DURATIONS.LONG)
Tier: Memory + LocalStorage + IndexedDB
Key: ggnhome_user_{userId}
Update: When user logs in, profile changes

// Usage in component
import { useCachedUser } from './utils/cacheManager';

const { data: user, loading, error } = useCachedUser(
  userId,
  () => fetch(`/api/user/${userId}`).then(r => r.json())
);
```

### Property Listings
```javascript
// Cache: Property details
Duration: 24 hours (CACHE_DURATIONS.LONG)
Tier: Memory + IndexedDB (large files)
Key: ggnhome_properties_{propertyId}
Update: Monthly or when property changes
Stale-While-Revalidate: Yes (serve cache, refresh in background)

// Usage
import { cacheUtils } from './utils/cacheManager';

const property = await cacheUtils.getProperty(propertyId);
// Or fetch with cache:
const property = await cacheUtils.cacheAPIResponse(
  `property_${propertyId}`,
  () => fetch(`/api/property/${propertyId}`).then(r => r.json()),
  CACHE_DURATIONS.LONG
);
```

### Search Results
```javascript
// Cache: Search/filter results
Duration: 30 minutes (CACHE_DURATIONS.MEDIUM)
Tier: Memory + LocalStorage
Key: ggnhome_filters_{filters_hash}
Update: When filters change
Invalidate: On property updates

// Usage with React Hook
import { useCachedSearch } from './utils/cacheManager';

const filters = { sector: 31, bhk: 2, priceMin: 30, priceMax: 50 };
const { data: results, loading } = useCachedSearch(
  filters,
  (filters) => fetch(`/api/search?...`).then(r => r.json())
);
```

### User Preferences
```javascript
// Cache: UI preferences, settings
Duration: 7 days (CACHE_DURATIONS.EXTENDED)
Tier: Memory + LocalStorage
Key: ggnhome_preferences_{userId}
Update: When preferences change
Persist: Yes

// Usage
import { cacheUtils } from './utils/cacheManager';

const preferences = {
  userId: 'user123',
  theme: 'dark',
  language: 'en',
  notifications: true,
};
await cacheUtils.cacheUserPreferences(preferences);

// Later: retrieve
const saved = await cacheUtils.getUserPreferences('user123');
```

### Analytics Data
```javascript
// Cache: Performance metrics
Duration: 5 minutes (CACHE_DURATIONS.SHORT)
Tier: Memory only (refresh frequently)
Key: ggnhome_analytics_{userId}
Update: Every 5 minutes
Invalidate: On manual refresh

// Usage
import { cacheUtils } from './utils/cacheManager';

await cacheUtils.cacheAnalytics(userId, analyticsData);
const stats = await cacheUtils.getAnalytics(userId);
```

### Localities/Sectors
```javascript
// Cache: Location data
Duration: 7 days (CACHE_DURATIONS.EXTENDED)
Tier: Memory + LocalStorage
Key: ggnhome_localities
Update: Weekly or on demand
Invalidate: Manually after adding new localities

// Usage
import { cacheUtils } from './utils/cacheManager';

await cacheUtils.cacheLocalities(localityList);
const localities = await cacheUtils.getLocalities();
```

---

## Implementation Examples

### Example 1: Basic Data Caching
```javascript
import { useCachedData, CACHE_DURATIONS } from './utils/cacheManager';

function PropertyDetail({ propertyId }) {
  const { data: property, loading, error } = useCachedData(
    `property_${propertyId}`,
    async () => {
      const response = await fetch(`/api/property/${propertyId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    CACHE_DURATIONS.LONG,
    [propertyId]
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <PropertyCard property={property} />;
}
```

### Example 2: Search with Caching
```javascript
import { useCachedSearch, CACHE_DURATIONS } from './utils/cacheManager';

function SearchResults({ filters }) {
  const { data: results, loading } = useCachedSearch(
    filters,
    async (filters) => {
      const query = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/search?${query}`);
      return response.json();
    }
  );

  return (
    <>
      {loading && <Skeleton />}
      {results?.map(property => <PropertyCard key={property.id} property={property} />)}
    </>
  );
}
```

### Example 3: Manual Cache Management
```javascript
import { cacheUtils } from './utils/cacheManager';

async function clearOldCache() {
  // Clear specific cache
  await cacheUtils.clearCache('ggnhome_search_sector_31');

  // Clear expired entries
  await cacheUtils.clearExpired();

  // Get cache statistics
  const stats = cacheUtils.getStats();
  console.log('Cache stats:', stats);
  // Output: { memory: '2.45 KB', localStorage: '15.30 KB', totalEntries: 12 }
}
```

### Example 4: API Response Caching
```javascript
import { cacheUtils, CACHE_DURATIONS } from './utils/cacheManager';

async function fetchAnalytics(userId) {
  // Caches API response automatically
  return await cacheUtils.cacheAPIResponse(
    `analytics_${userId}`,
    () => fetch(`/api/analytics/${userId}`).then(r => r.json()),
    CACHE_DURATIONS.SHORT // 5 minutes for analytics
  );
}
```

### Example 5: Stale-While-Revalidate Pattern
```javascript
import { cacheManager } from './utils/cacheManager';

async function fetchWithStaleCache(url, cacheKey, duration) {
  // Check cache first (returns immediately)
  const cached = await cacheManager.get(cacheKey);
  if (cached) {
    // Fetch fresh data in background
    fetch(url)
      .then(r => r.json())
      .then(fresh => {
        cacheManager.set(cacheKey, fresh, duration);
      })
      .catch(err => console.warn('Background fetch failed:', err));

    // Return stale cache immediately
    return cached;
  }

  // No cache, wait for fresh fetch
  const response = await fetch(url);
  const data = await response.json();
  cacheManager.set(cacheKey, data, duration);
  return data;
}
```

---

## Cache Invalidation Strategy

### Time-Based Expiry
```javascript
// Automatic expiry based on duration
const DURATIONS = {
  ANALYTICS: 5 * 60 * 1000,        // 5 minutes
  SEARCH: 30 * 60 * 1000,          // 30 minutes
  USER_DATA: 24 * 60 * 60 * 1000,  // 24 hours
  STATIC: 7 * 24 * 60 * 60 * 1000  // 7 days
};
```

### Event-Based Invalidation
```javascript
// Clear cache on specific events
import { cacheUtils } from './utils/cacheManager';

// On user login
function handleLogin(userId) {
  cacheUtils.clearAllCache(); // Clear old user's cache
  // Load new user's data (will be cached)
}

// On property update
function handlePropertyUpdate(propertyId) {
  cacheUtils.clearCache(`ggnhome_properties_${propertyId}`);
  // Re-fetch will get latest data
}

// On filter change
function handleFilterChange(filters) {
  cacheUtils.clearCache(`search_${JSON.stringify(filters)}`);
}
```

### Manual Clearing
```javascript
// Clear specific cache
await cacheUtils.clearCache('ggnhome_search_sector_31');

// Clear all analytics
for (let i = 1; i <= 10; i++) {
  await cacheUtils.clearCache(`ggnhome_analytics_user_${i}`);
}

// Clear all expired entries
await cacheUtils.clearExpired();

// Clear everything
await cacheUtils.clearAllCache();
```

---

## Cache Size Management

### Monitor Cache Size
```javascript
import { cacheUtils } from './utils/cacheManager';

// Get current cache stats
const stats = cacheUtils.getStats();
console.log('Memory cache:', stats.memory);
console.log('LocalStorage:', stats.localStorage);
console.log('Total entries:', stats.totalEntries);
```

### Storage Limits

| Tier | Limit | When Full |
|------|-------|-----------|
| Memory | ~100MB | Automatic GC after session |
| LocalStorage | ~5-10MB | Clear oldest entries |
| IndexedDB | 50MB+ | Browser prompts for more |

### Handle Storage Quota
```javascript
// When localStorage is full
try {
  await cacheManager.set(key, value, duration);
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    // Clear oldest entries and retry
    await cacheUtils.clearExpired();
    await cacheManager.set(key, value, duration);
  }
}
```

---

## Best Practices

### DO ✅
- ✅ Cache read-heavy data (properties, listings)
- ✅ Use short TTL for frequently changing data (analytics, prices)
- ✅ Implement stale-while-revalidate for better UX
- ✅ Clear cache on user logout
- ✅ Use memory cache for current session data
- ✅ Implement cache warming on app load
- ✅ Monitor cache size in production
- ✅ Test offline mode with cache

### DON'T ❌
- ❌ Cache sensitive data (tokens, passwords)
- ❌ Cache user-specific data across users
- ❌ Use localStorage for synchronous operations in render
- ❌ Exceed storage limits (monitor regularly)
- ❌ Cache data without expiry (use appropriate TTL)
- ❌ Ignore cache invalidation on data changes
- ❌ Use cache for real-time data (prices, availability)

---

## Integration Checklist

### Phase 1: Core Setup
- [ ] Import cacheManager in main App.js
- [ ] Clear cache on user logout
- [ ] Set up cache expiry intervals
- [ ] Test memory cache basic operations

### Phase 2: Feature Implementation
- [ ] Cache property listings
- [ ] Cache search results
- [ ] Cache user preferences
- [ ] Cache analytics data

### Phase 3: Optimization
- [ ] Implement stale-while-revalidate
- [ ] Add cache warming on app load
- [ ] Monitor cache size
- [ ] Optimize cache duration per data type

### Phase 4: Monitoring
- [ ] Log cache hits/misses
- [ ] Track cache size metrics
- [ ] Monitor IndexedDB quota
- [ ] Set up alerts for cache issues

---

## Troubleshooting

### Cache not persisting
```javascript
// Check if IndexedDB is available
if (!('indexedDB' in window)) {
  console.warn('IndexedDB not available');
}

// Check localStorage access
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  console.warn('LocalStorage not available');
}
```

### Cache too large
```javascript
// Clear old entries
await cacheUtils.clearExpired();

// Check size
const stats = cacheUtils.getStats();
console.log(stats);

// Clear specific large caches
await cacheUtils.clearCache('ggnhome_properties_*');
```

### Memory leaks
```javascript
// Clear cache on component unmount
useEffect(() => {
  return () => {
    // Cleanup if needed
  };
}, []);

// Clear cache on long sessions
setInterval(() => {
  cacheUtils.clearExpired();
}, 30 * 60 * 1000); // Every 30 minutes
```

---

## Performance Impact

### Metrics (Approximate)
- Memory cache: ~200ms faster than API
- LocalStorage: ~50ms faster than API
- IndexedDB: ~20ms faster than API for large datasets
- API call: ~500-2000ms depending on network

### Cache Hit Rate Goals
- Memory cache: 80%+
- LocalStorage: 60%+
- API fallback: < 20%

---

## References

- [Cache API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [localStorage MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [IndexedDB MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Workers & Caching](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## Future Enhancements

1. **Cache Warming**: Pre-load common data on app launch
2. **Background Sync**: Sync cache when connection restored
3. **Cache Analytics**: Track cache hits/misses
4. **Smart Expiry**: Adjust TTL based on data type
5. **Compression**: Compress large datasets before caching
6. **Encryption**: Encrypt sensitive cached data
7. **Replication**: Sync cache across tabs
8. **Predictive Loading**: Pre-cache based on user behavior
