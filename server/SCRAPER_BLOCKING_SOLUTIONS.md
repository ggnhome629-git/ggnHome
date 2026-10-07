# Scraper Blocking Solutions - 99acres & Anti-Bot Sites

## The Problem

**99acres blocks direct HTTP requests** (Cheerio + Axios) with **403 Forbidden** or **User-Agent detection**.

### Why?
- Anti-bot detection (Cloudflare, similar)
- Requires JavaScript rendering
- Blocks non-browser User-Agents

### Impact on Free Tier
- Puppeteer/Playwright = **400+ MB** (exceeds 512 MB limit)
- Can't use real browser on free tier
- Need alternative solutions

---

## Solution Options by Tier

### ✅ **OPTION 1: NoBroker Only (Recommended for Free Tier)**

**Current Implementation:**
- ✅ NoBroker works with Cheerio + Axios
- ✅ Uses only 50 MB
- ✅ No blocking issues
- ✅ Sufficient for MVP

**Configuration:**

```bash
# server/index.js or routes
POST /api/admin/scraper/run
{ "source": "nobroker" }  # Only NoBroker, not 99acres
```

**Advantages:**
- Free tier compatible
- Reliable data source
- Good coverage for Gurgaon
- No additional costs

**Implementation:** Already done! Use `"source": "nobroker"` instead of `"all"`

---

### 📊 **OPTION 2: Browserless.io API (Paid - ~$0.10 per page)**

Use cloud headless browser service:

#### Setup

```bash
npm install @browserless/play
```

#### Implementation

```javascript
// server/scrapers/browserless-99acres.js
const { BrowserlessPlaywright } = require('@browserless/play');

class BrowserlessNinetyNineAcres {
  constructor() {
    this.client = new BrowserlessPlaywright({
      token: process.env.BROWSERLESS_API_KEY,
    });
  }

  async scrapeNinetyNineAcres() {
    try {
      const page = await this.client.page();
      
      await page.goto('https://www.99acres.com/search/home-rent-gurgaon', {
        waitUntil: 'networkidle2',
      });

      // Parse HTML
      const properties = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.property-card')).map(el => ({
          title: el.querySelector('.property-name')?.textContent,
          price: el.querySelector('.property-price')?.textContent,
          location: el.querySelector('.property-location')?.textContent,
          // ... more fields
        }));
      });

      await page.close();
      return { source: '99acres', count: properties.length, properties };
    } catch (error) {
      console.error('Browserless scraping failed', error);
      throw error;
    }
  }
}

module.exports = new BrowserlessNinetyNineAcres();
```

#### Cost Analysis

```
API Price: $0.05-0.10 per page
Example:
- 10 pages × $0.10 = $1.00 per run
- 1 run per day = $30/month
- 2 runs per day = $60/month
```

#### Benefits
✅ Works with JavaScript-heavy sites
✅ No memory constraints
✅ Reliable blocking bypass
✅ Per-use payment (no monthly fee if not used)

#### When to Use
- Production with 99acres data critical
- Can afford $30-60/month
- Scaling beyond MVP

---

### 🚀 **OPTION 3: Upgrade to Paid Render Tier**

Use Puppeteer/Playwright on upgraded server:

#### Render Pricing

```
Free Tier:     512 MB  -  $0/month
Standard:      2 GB    -  $12/month
Premium:       8 GB    -  $50/month
```

#### Puppeteer Implementation

```bash
npm install puppeteer
```

```javascript
// server/scrapers/puppeteer-scraper.js
const puppeteer = require('puppeteer');

class PuppeteerScraper {
  async scrapeNinetyNineAcres() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto('https://www.99acres.com/search/home-rent-gurgaon');
    
    const properties = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.property-card')).map(el => ({
        title: el.querySelector('.property-name')?.textContent,
        price: el.querySelector('.property-price')?.textContent,
        // ... more fields
      }));
    });

    await browser.close();
    return properties;
  }
}
```

#### Benefits
✅ Native Puppeteer support
✅ Full browser capabilities
✅ Reliable scraping
✅ No per-request costs

#### When to Use
- Stable production environment
- Multiple data sources needed
- Long-term scaling

---

### 🔄 **OPTION 4: Proxy + Rotating User-Agents (Workaround)**

Use proxy service with rotating User-Agents:

```bash
npm install axios-https-proxy-agent
```

```javascript
async fetchWithProxy(url) {
  const ProxyAgent = require('axios-https-proxy-agent');
  
  const agent = new ProxyAgent('http://proxy-service.com:8080');
  
  try {
    return await axios.get(url, {
      httpAgent: agent,
      httpsAgent: agent,
      headers: {
        'User-Agent': this.getRandomUserAgent(),
      },
      timeout: 10000,
    });
  } catch (error) {
    // Still might be blocked
    throw error;
  }
}

getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}
```

**Limitations:**
- ❌ Expensive ($50-200/month for residential proxies)
- ❌ Still might get blocked by Cloudflare
- ❌ Ethical concerns (violates ToS)
- ✅ Only if other methods fail

---

### ❌ **OPTION 5: Chrome/Playwright on Free Tier (NOT Viable)**

❌ **Do NOT attempt** - will crash due to memory:

```
Node.js:           50 MB
Express/ORM:       70 MB
Puppeteer:         400+ MB
────────────────────────
Total:             520+ MB (exceeds 512 MB limit)
```

Result: Out of Memory error on first scrape.

---

## Recommended Approach for Your Project

### **Phase 1: Free Tier (Now)**
```
Use NoBroker ONLY
└─ Works with Cheerio
└─ 50 MB memory
└─ Free forever
└─ Sufficient for MVP
```

**Configuration:**
```javascript
// routes/scraper.routes.js
POST /api/admin/scraper/run
{ "source": "nobroker" }  // ← Use this
```

### **Phase 2: Add 99acres (When Ready)**

**Option A: Use Browserless.io (~$30-60/month)**
```javascript
// Hybrid approach
- NoBroker: Cheerio (free)
- 99acres: Browserless API (paid)
```

**Option B: Upgrade to Paid Render ($12+/month)**
```javascript
// Full Puppeteer support
- NoBroker: Cheerio
- 99acres: Puppeteer
```

---

## Step-by-Step: Disable 99acres for Free Tier

### Current Code (Problematic)
```javascript
const result = await scraperService.startScrapingJob('all');
// Tries both NoBroker and 99acres → 99acres fails
```

### Fixed for Free Tier
```javascript
const result = await scraperService.startScrapingJob('nobroker');
// Only NoBroker → Always works
```

### Implementation

Update `server/services/scraper.service.js`:

```javascript
async runScrapers(source) {
  const results = [];

  // NoBroker: Always works on free tier
  if (source === 'nobroker' || source === 'all') {
    try {
      const noBrokerResult = await headlessScraper.scrapeNoBroker();
      results.push(noBrokerResult);
      logger.scraper('info', 'NoBroker scraping completed', {
        count: noBrokerResult.count,
      });
    } catch (error) {
      logger.scraper('error', 'NoBroker scraping failed', {
        error: error.message,
      });
    }
  }

  // 99acres: Only if explicitly enabled AND (Puppeteer OR Browserless available)
  if (source === '99acres' || source === 'all') {
    // Check if 99acres is enabled
    if (process.env.ENABLE_99ACRES !== 'true') {
      logger.scraper('warn', '99acres disabled on free tier (requires upgrade)');
      return results;
    }

    // Check which method to use
    if (process.env.BROWSERLESS_API_KEY) {
      // Use Browserless API
      const browserlessResult = await browserlessScraper.scrapeNinetyNineAcres();
      results.push(browserlessResult);
    } else if (process.env.NODE_ENV === 'paid-tier') {
      // Use Puppeteer (only on paid tier)
      const puppeteerResult = await puppeteerScraper.scrapeNinetyNineAcres();
      results.push(puppeteerResult);
    } else {
      logger.scraper('warn', '99acres scraping disabled (free tier limitation)');
    }
  }

  return results;
}
```

### Environment Variables
```bash
# .env (Free Tier)
ENABLE_99ACRES=false

# .env (With Browserless)
ENABLE_99ACRES=true
BROWSERLESS_API_KEY=your-api-key-here

# .env (Paid Tier)
ENABLE_99ACRES=true
# Can use Puppeteer directly
```

---

## Costs Comparison

| Solution | Setup | Monthly | Pros | Cons |
|----------|-------|---------|------|------|
| **NoBroker Only** | Free | $0 | Free, works, simple | Limited to 1 source |
| **Browserless.io** | 5 min | $30-60 | Works reliably | Per-request cost |
| **Render Paid Tier** | 10 min | $12-50 | Full power | Recurring cost |
| **Proxies** | 20 min | $50-200 | Many options | Expensive, unreliable |

---

## What I Recommend

### For MVP (Now)
```
✅ Use NoBroker only
✅ Free forever
✅ Sufficient coverage
```

### For Production (Later)
```
Option 1: Add Browserless.io ($30/month)
  - Keep NoBroker (free)
  - Add 99acres (paid per-request)
  - Best cost/benefit ratio

Option 2: Upgrade Render to Standard ($12/month + Puppeteer)
  - Both sources work
  - Simpler implementation
  - Better for long-term
```

---

## Implementation Status

### ✅ Already Done
- NoBroker scraper with Cheerio (works!)
- Memory-optimized for free tier
- Sequential processing
- Error handling

### ⚠️ Needs Update
- Disable 99acres on free tier config
- Document limitation in README
- Add option to enable for paid tier

### 🔮 Future
- Browserless.io integration (optional)
- Puppeteer fallback (paid tier)
- Multi-source routing logic

---

## Summary

**For Render Free Tier (512 MB):**

✅ **Use:** NoBroker only with Cheerio
- Works reliably
- Free forever
- 50 MB memory
- Good data coverage

❌ **Don't use:** 99acres without real browser
- Gets blocked by site
- Requires 400+ MB
- Not viable on free tier

**Future expansion:**
- Add Browserless.io for 99acres ($30/month)
- Or upgrade Render tier ($12+/month)

Your current implementation is **optimal for free tier** - just specify `source: "nobroker"` in API calls!
