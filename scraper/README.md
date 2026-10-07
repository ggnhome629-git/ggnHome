# ggnHome Property Scraper

A self-contained, production-ready property scraper for ggnHome that imports rental properties from multiple platforms (NoBroker, 99acres, and others) and integrates them into the main database.

## Features

✅ **Multi-platform Support**
- NoBroker.in scraper
- 99acres.com scraper
- Extensible architecture for more platforms

✅ **Robust & Reliable**
- Automatic retry with exponential backoff
- Error logging and reporting
- Duplicate detection and deduplication
- Graceful error handling

✅ **Affiliate Integration**
- Commission tracking per platform
- Affiliate link management
- Click and conversion tracking setup
- Cashback calculation support

✅ **Database Integration**
- Direct MongoDB integration
- Automatic property creation/update
- Source tracking (sourcePortal, sourceListingId, sourceUrl)
- Approval workflow support

✅ **Scheduled Execution**
- Cron-based scheduling (default: Friday 9 AM)
- On-demand execution
- Comprehensive logging

## Installation

### Prerequisites
- Node.js >= 14.0.0
- MongoDB (local or remote)
- Main ggnHome repository access

### Setup

1. **Copy scraper to main repo** (already done - located at `/scraper`)

2. **Install dependencies:**
```bash
cd scraper
npm install
```

3. **Create `.env` file:**
```bash
cp .env.example .env
```

4. **Edit `.env` with your configuration:**
```
MONGODB_URI=mongodb://localhost:27017/ggnhome
NOBROKER_PAGES_TO_SCRAPE=5
NINETY_NINE_ACRES_PAGES_TO_SCRAPE=5
ENABLE_SCHEDULE=true
SCHEDULE_TIME=0 9 * * 5
```

## Usage

### One-time Scraping

**Run all scrapers:**
```bash
npm start
# or
npm run scrape:all
```

**Run specific scraper:**
```bash
npm run scrape:nobroker
npm run scrape:99acres
```

### Scheduled Scraping

**Start scheduler (runs in background):**
```bash
npm run schedule
```

The scheduler will run at the time specified in `SCHEDULE_TIME` (default: Friday 9 AM).

### Database Initialization

**Initialize scraper models:**
```bash
npm run db:init
```

### Testing

**Test scraper configuration:**
```bash
npm test
```

## Configuration

### Environment Variables

```env
# Database
MONGODB_URI              # MongoDB connection string
MONGODB_USER             # DB user (optional)
MONGODB_PASSWORD         # DB password (optional)

# Scraper Behavior
SCRAPER_DELAY_MS         # Delay between requests (default: 2000ms)
SCRAPER_TIMEOUT          # Request timeout (default: 30000ms)
SCRAPER_RETRY_ATTEMPTS   # Max retry attempts (default: 3)

# Platform URLs (can customize if platforms change URL structure)
NOBROKER_SEARCH_URL
NINETY_NINE_ACRES_SEARCH_URL

# Affiliate Configuration
AFFILIATE_NOBROKER_ID
AFFILIATE_99ACRES_ID
AFFILIATE_COMMISSION_NOBROKER  # 10-15% typically
AFFILIATE_COMMISSION_99ACRES   # 10-15% typically

# Scheduling
SCHEDULE_TIME           # Cron format (default: "0 9 * * 5" = Friday 9 AM)
ENABLE_SCHEDULE         # true/false

# Logging
LOG_LEVEL              # debug, info, warn, error
LOG_FILE               # Log file path
```

## Architecture

### File Structure

```
scraper/
├── index.js                 # Main entry point
├── package.json
├── .env.example
├── README.md
├── scheduler.js            # Cron scheduler
├── scrapers/
│   ├── nobroker.js        # NoBroker scraper
│   ├── 99acres.js         # 99acres scraper
│   └── all.js             # Run all scrapers
├── models/
│   └── ScraperLog.js      # Logging model
├── utils/
│   ├── logger.js          # Winston logger
│   └── helpers.js         # Utility functions
├── scripts/
│   └── init-db.js         # Initialize database
├── test/
│   └── test-scraper.js    # Test suite
└── logs/
    ├── scraper.log        # Main log file
    └── error.log          # Error log file
```

### How It Works

1. **Scraper Manager** (`index.js`)
   - Manages multiple scrapers
   - Handles database connections
   - Orchestrates run sequence

2. **Platform Scrapers** (e.g., `nobroker.js`)
   - Fetch pages from platform
   - Parse HTML using Cheerio
   - Extract property data
   - Validate and normalize

3. **Database Import**
   - Check for existing properties by sourceId
   - Create new or update existing
   - Maintain source tracking
   - Handle approval workflow

4. **Logging**
   - Winston logger for all operations
   - Separate error logs
   - Comprehensive debugging info

## Property Data Model

Properties are imported as `RentalProperty` documents with:

```javascript
{
  // Basic info
  title: String,
  description: String,
  Sector: String,
  propertyType: String, // apartment, villa, house, etc.
  
  // Specifications
  monthlyRent: Number,
  totalArea: { sqft: Number },
  bedrooms: Number,
  bathrooms: Number,
  furnishing: String, // unfurnished, semi-furnished, furnished
  
  // Source tracking (IMPORTANT)
  sourcePortal: String, // "nobroker" or "99acres"
  sourceListingId: String, // Platform's ID
  sourceUrl: String, // Link to original listing
  sourceStatus: String, // active, inactive, removed
  sourceCheckedAt: Date,
  
  // Affiliate
  affiliateId: String,
  commission: Number,
  
  // Status
  ownerType: String, // "ggnHome" for scraped
  isActive: Boolean,
  isPostedNew: Boolean, // Approval workflow
}
```

## Integration with Main Application

### 1. Property Display

Scraped properties show in search/dashboard:
- Users see them like any other property
- Source label indicates "From NoBroker" or "From 99acres"
- No owner contact shown (affiliate-only)

### 2. Affiliate Links

When user clicks property:
- Redirect through affiliate link
- Track click in `AffiliateTracking`
- Calculate user cashback when user books
- Track ggnHome commission

### 3. Daily Updates

Properties are checked daily:
- Mark as inactive if removed from source
- Update stats (clicks, conversions)
- Maintain price/availability info

## Logs

All scraper activity is logged to:

- **Main logs:** `logs/scraper.log`
- **Error logs:** `logs/error.log`
- **Database logs:** `ScraperLog` collection

View recent runs:
```bash
tail -f logs/scraper.log
```

Query database:
```javascript
db.scraperlogs.find({}, { status: 1, startedAt: -1 }).limit(10)
```

## Troubleshooting

### Issue: Properties not importing

**Check:**
1. MongoDB connection: `MONGODB_URI`
2. Logs: `logs/error.log`
3. Database model exists

### Issue: Slow scraping

**Optimize:**
- Reduce `SCRAPER_DELAY_MS` (but respect robots.txt)
- Increase `SCRAPER_TIMEOUT`
- Check network connectivity

### Issue: Duplicate properties

**Solution:**
- Deduplicate function runs automatically
- Check `sourcePortal + sourceListingId` uniqueness

## Performance

- **Typical run time:** 5-15 minutes (5 pages per platform)
- **Properties per run:** 50-200 properties
- **Memory usage:** 100-500 MB
- **Database impact:** Low (indexed queries)

## Security

- Sensitive data encrypted in database
- Affiliate IDs protected
- API keys not logged
- User-Agent headers included
- Rate limiting respected

## Future Enhancements

- [ ] Webhook for real-time updates
- [ ] Advanced filtering/segmentation
- [ ] AI-based duplicate detection
- [ ] Image processing and compression
- [ ] Multi-city support
- [ ] Mobile app listing scraper
- [ ] Magicbricks, Sulekha support
- [ ] Price trend analysis

## Support

**Issues or questions?**

1. Check logs: `logs/error.log`
2. Review configuration: `.env`
3. Run test: `npm test`
4. Check database connection

## License

MIT - ggnHome Team
