# Render Free Tier (512 MB) - Deployment & Optimization Guide

## Overview
Running GgnHome backend on Render's free tier requires careful resource management. This guide provides optimization strategies and deployment best practices.

---

## Constraints

### Free Tier Limits
- **RAM**: 512 MB
- **CPU**: Shared
- **Disk**: 100 MB
- **Auto-sleep**: Shuts down after 15 minutes of inactivity
- **Build time**: 30 minutes

### Resource Budgeting
```
Node.js base:        ~50 MB
Express + Middleware: ~30 MB
Sequelize ORM:        ~40 MB
MongoDB/Mongoose:     ~30 MB
Available for code:   ~350 MB
```

---

## Scraper Strategy for Free Tier

### Why NOT Puppeteer
- Full browser: 300-400 MB RAM
- Chromium: 200+ MB
- **Total needed**: 500+ MB (exceeds free tier)

### Recommended: HTTP + Cheerio
- **HTTP requests**: ~5 MB per request
- **Cheerio parsing**: ~20 MB
- **Total**: ~50 MB per scrape job
- **Benefit**: Sequential processing, predictable memory

### Implementation
```javascript
// Instead of:
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch(); // ❌ Too heavy

// Use:
const axios = require('axios');
const cheerio = require('cheerio');
const $ = cheerio.load(html); // ✅ Lightweight
```

---

## Deployment Checklist

### 1. Dependencies Optimization

**Remove heavy packages:**
```bash
# Remove from package.json
- puppeteer (if not needed elsewhere)
- playwright
- nightmare

# Keep lightweight alternatives
- axios (HTTP)
- cheerio (HTML parsing)
- joi (validation)
- winston (logging)
```

**Trim node_modules:**
```bash
# In Render build settings
npm ci --production  # Installs only production dependencies
npm prune            # Remove dev dependencies
```

### 2. Environment Variables

```bash
# Render dashboard → Environment Variables

# Database
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/ggnhome
MONGODB_URI=${DATABASE_URL}

# Server
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# Scraper
SCRAPER_ENABLED=true
SCRAPER_SCHEDULE="0 2 * * *"  # Daily 2 AM UTC
DISABLE_CRON=false
SCRAPER_MAX_CONCURRENT=2       # Limit for free tier

# Rate Limiting
DISABLE_RATE_LIMIT=false

# Cache
REDIS_URL=redis://your-redis-instance

# Disable unnecessary services
DISABLE_NOTIFICATIONS=true    # If not using push notifications
```

### 3. Server Configuration

**package.json**
```json
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  },
  "scripts": {
    "start": "node server/index.js",
    "build": "npm ci --production && npm run migrate"
  }
}
```

**Render deployment settings:**
- Build command: `npm install`
- Start command: `npm start`
- Environment: `Node`
- Plan: `Free`

### 4. Cron Job Setup (Optional - requires paid tier for background jobs)

For free tier, use Render cron jobs via external trigger:
```bash
# Create a cron endpoint
POST /api/admin/cron/scrape-trigger?secret=YOUR_SECRET

# Then use external cron service:
- EasyCron.com (free tier)
- CronJob.org
- AWS EventBridge (free tier included)
```

---

## Code Optimizations

### 1. Lazy Loading & Code Splitting

```javascript
// ❌ Load everything at startup
const scraperService = require('./services/scraper.service');
const analyticService = require('./services/analytics.service');
const aiService = require('./services/ai.service');

// ✅ Load on demand
const scraperService = require('./services/scraper.service'); // Only what's needed
```

### 2. Database Connection Pooling

```javascript
// config/database.js
const pool = {
  max: 2,        // Reduce from 5 for free tier
  min: 0,        // Release immediately
  acquire: 30000, // Wait 30 seconds for connection
  idle: 5000,     // Release unused after 5 seconds
};
```

### 3. Memory Cleanup

```javascript
// middleware/memoryCleanup.js
setInterval(() => {
  if (global.gc) {
    global.gc(); // Force garbage collection
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Start with: node --expose-gc server/index.js
```

### 4. Scraper Memory Management

```javascript
// In scraper service
async scrapeNoBroker() {
  const properties = [];

  // Process in chunks to avoid memory buildup
  const chunkSize = 10;
  for (let i = 0; i < totalPages; i += chunkSize) {
    const chunk = await this.scrapePages(i, i + chunkSize);
    properties.push(...chunk);

    // Save to database immediately
    await Property.bulkCreate(chunk);
    
    // Clear memory
    chunk.length = 0;

    // Wait before next chunk
    await this.sleep(2000);
  }
}
```

### 5. Logging Optimization

```javascript
// config/logger.js
const transports = [
  // Only errors to file (not all logs)
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error', // ✅ Only errors
    maxsize: 1048576, // 1MB (smaller)
    maxFiles: 2,     // Keep 2 files
  }),
];
```

### 6. Response Compression

```javascript
// server/index.js
const compression = require('compression');

app.use(compression({
  level: 6,                    // Balance speed vs compression
  threshold: 1024,             // Only compress > 1KB
  filter: (req, res) => {
    // Don't compress if already compressed
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));
```

---

## Monitoring & Auto-Restart

### Uptime Monitoring (Free Options)

```bash
# Use UptimeRobot (free tier)
1. Login to uptimerobot.com
2. Add new monitor:
   - URL: https://your-app.onrender.com/
   - Check every: 5 minutes
   - Notifications: Email
```

### Keep-Alive Script

```javascript
// In cron job (runs every 10 minutes via external service)
POST /api/cron/keep-alive?secret=YOUR_SECRET

// Prevents auto-sleep
app.get('/api/cron/keep-alive', (req, res) => {
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  logger.info('Keep-alive ping');
  res.json({ status: 'ok', uptime: process.uptime() });
});
```

---

## Scraper Execution Options

### Option 1: On-Demand via API (Recommended)
```bash
POST /api/admin/scraper/run
{
  "source": "nobroker"
}

# Response: 202 Accepted (job runs in background)
```

**Pros**: No cron needed, triggered manually, good for free tier
**Cons**: Manual triggering

### Option 2: Scheduled via External Cron

**Using EasyCron (free tier):**
1. Create external cron service
2. POST to `https://your-app.onrender.com/api/admin/scraper/run`
3. Runs automatically on schedule

**Curl example:**
```bash
curl -X POST https://your-app.onrender.com/api/admin/scraper/run \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"nobroker"}'
```

### Option 3: Worker Threads (Advanced)

```javascript
// server/workers/scraper-worker.js
const { Worker } = require('worker_threads');

// Run scraper in separate thread to avoid blocking main thread
function runScraperInWorker() {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./scrapers/headless-scraper-worker.js');
    
    worker.on('message', resolve);
    worker.on('error', reject);
    
    // Kill worker after 5 minutes
    setTimeout(() => worker.terminate(), 5 * 60 * 1000);
  });
}
```

---

## Scaling Beyond Free Tier

### When to Upgrade

```
Free Tier → Standard (Paid)
- RAM: 512 MB → 2 GB+
- CPU: Shared → Dedicated
- Cost: $0 → $12+/month
```

**Triggers for upgrade:**
- App consistently using >400 MB RAM
- Scraper runs cause memory errors
- Auto-sleep interferes with functionality
- Need background job service

### Paid Tier Improvements
- Use Puppeteer for advanced scraping
- Multiple scraper instances
- Persistent Redis cache
- Background job workers
- Multiple server instances (load balancing)

---

## Troubleshooting

### Issue: App Crashes After Deploy

```bash
# Check logs
# Render Dashboard → Recent Logs

# Solutions:
1. Reduce concurrent database connections
2. Disable unnecessary services
3. Increase Node memory limit:
   NODE_OPTIONS="--max-old-space-size=384"
```

### Issue: Scraper Times Out

```javascript
// Increase timeout for scraper
const timeout = 15000; // 15 seconds (from 10)

// Or break into smaller jobs:
// Scrape 5 properties at a time instead of 50
const chunkSize = 5;
```

### Issue: Out of Memory

```bash
# 1. Check what's using memory
node --max-old-space-size=256 server/index.js

# 2. Enable garbage collection
node --expose-gc server/index.js

# 3. Reduce logging level
LOG_LEVEL=warn
```

### Issue: Database Connection Pool Exhausted

```javascript
// config/database.js
const pool = {
  max: 1,     // Reduce further
  min: 0,     // Never keep idle connections
  acquire: 10000, // Fail fast if no connection
  idle: 2000,
};
```

---

## Performance Monitoring

### Key Metrics to Track

```bash
# Add to your dashboard
- Memory usage: Should stay < 400 MB
- API response time: Should be < 500ms
- Scraper run time: Should complete in < 10 minutes
- Error rate: Should be < 1%
```

### Dashboard Services (Free)

1. **Render Dashboard**
   - Built-in metrics
   - Memory/CPU usage
   - Recent logs

2. **Sentry** (free tier)
   - Error tracking
   - Performance monitoring
   - Alert notifications

3. **UptimeRobot** (free tier)
   - Uptime monitoring
   - Status page
   - Email alerts

---

## Example Minimal Setup

```
Project Structure (Optimized)
├── server/
│   ├── index.js          (Express app)
│   ├── config/
│   │   ├── database.js   (Minimal pool)
│   │   └── logger.js     (Basic logging)
│   ├── controllers/      (Thin controllers)
│   ├── services/
│   │   └── scraper.service.js  (Main logic)
│   ├── scrapers/
│   │   └── headless-scraper.js (Lightweight)
│   └── routes/           (API routes)
├── package.json          (Production deps only)
└── .env                  (Free tier settings)
```

---

## Checklist for Free Tier

- [ ] Node.js 18.x
- [ ] Lightweight dependencies only
- [ ] Database pooling: max:2, min:0
- [ ] Cheerio scraper (no Puppeteer)
- [ ] Logging at 'info' level minimum
- [ ] Compression middleware enabled
- [ ] UptimeRobot monitoring configured
- [ ] External cron for scraper (if needed)
- [ ] Error handling for memory issues
- [ ] Keep-alive endpoint for uptime
- [ ] Environment variables configured
- [ ] Test deployment before production

---

## Resources

- [Render Docs - Node.js](https://render.com/docs/node-versions)
- [Free Tier Limitations](https://render.com/docs/free)
- [Performance Best Practices](https://render.com/docs/best-practices)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Node.js Memory Management](https://nodejs.org/en/docs/guides/simple-profiling/)

---

## Summary

For **Render Free Tier (512 MB)**:

✅ **DO**:
- Use Cheerio + Axios (lightweight scraping)
- Limit database connections (max: 2)
- Process data sequentially
- Monitor memory usage
- Keep logs minimal
- Use external cron for scheduled tasks

❌ **DON'T**:
- Use Puppeteer (too heavy)
- Maximize database pool (wastes RAM)
- Log everything to disk
- Run heavy background jobs
- Deploy without testing

With these optimizations, you can run a production API + lightweight scraper on the **free tier** without issues!
