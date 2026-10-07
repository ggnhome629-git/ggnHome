# Scraper Integration Guide

Complete guide for using the property scraper with the main ggnHome application.

## Overview

The scraper is a self-contained Node.js application that:
1. Fetches properties from NoBroker, 99acres, and other platforms
2. Normalizes and validates the data
3. Stores properties in the main MongoDB database
4. Integrates with the affiliate cashback system
5. Can run on a schedule or manually

## Architecture

### Separation of Concerns

```
Main Application          Scraper Application
├── Server (Express)      ├── Scrapers (Cheerio/Axios)
├── Client (React)        ├── Database (Mongoose)
├── API Routes            ├── Scheduler (Cron)
└── UI Components         └── Logging (Winston)
```

Both share:
- MongoDB database
- RentalProperty/SaleProperty models
- Affiliate models

### Data Flow

```
NoBroker/99acres
      ↓
   Scraper (fetch + parse)
      ↓
   Normalize + Validate
      ↓
   Check for duplicates
      ↓
   MongoDB (RentalProperty)
      ↓
   Main app displays properties
      ↓
   User clicks property
      ↓
   Track in AffiliateTracking
      ↓
   Calculate cashback (UserWallet)
```

## Setup Instructions

### 1. Prerequisites

```bash
# Main application already has
- Node.js 14+
- MongoDB running
- Express server

# Scraper needs (install in scraper folder)
npm install
```

### 2. Environment Setup

**Main Application** - Add to `.env`:
```env
# Scraper will use same MongoDB
MONGODB_URI=mongodb://localhost:27017/ggnhome

# Optional: Scraper credentials (if different user)
SCRAPER_DB_USER=scraper
SCRAPER_DB_PASSWORD=password
```

**Scraper** - Create `scraper/.env`:
```env
# Must match main app's MongoDB
MONGODB_URI=mongodb://localhost:27017/ggnhome

# Platform configurations
NOBROKER_PAGES_TO_SCRAPE=5
NINETY_NINE_ACRES_PAGES_TO_SCRAPE=5
SCRAPER_DELAY_MS=2000

# Affiliate settings
AFFILIATE_NOBROKER_ID=YOUR_ID
AFFILIATE_99ACRES_ID=YOUR_ID
AFFILIATE_COMMISSION_NOBROKER=12
AFFILIATE_COMMISSION_99ACRES=10

# Scheduling (Friday 9 AM)
SCHEDULE_TIME=0 9 * * 5
```

### 3. Running the Scraper

**From within scraper folder:**

```bash
cd scraper

# Install dependencies (one time)
npm install

# Run all scrapers once
npm start

# Run specific platform
npm run scrape:nobroker
npm run scrape:99acres

# Start scheduled runs
npm run schedule

# View recent runs
npm run logs
```

**From main application folder:**

```bash
# Run scraper via NPM script
npm run scraper:all

# Run scheduled scraper
npm run scraper:schedule
```

### 4. Integration with Main App

Add to main `package.json`:
```json
{
  "scripts": {
    "scraper:all": "cd scraper && npm start",
    "scraper:nobroker": "cd scraper && npm run scrape:nobroker",
    "scraper:99acres": "cd scraper && npm run scrape:99acres",
    "scraper:schedule": "cd scraper && npm run schedule",
    "scraper:install": "cd scraper && npm install"
  }
}
```

## Database Integration

### Models Used

**RentalProperty** - Properties are stored with:

```javascript
{
  // Standard fields
  title, description, Sector, propertyType,
  monthlyRent, bedrooms, bathrooms, furnishing,
  
  // SOURCE TRACKING (Important!)
  sourcePortal: "nobroker" | "99acres",
  sourceListingId: "12345",    // Platform's ID
  sourceUrl: "https://...",    // Link to original
  sourceStatus: "active" | "inactive" | "removed",
  sourceCheckedAt: Date,
  
  // AFFILIATE TRACKING
  affiliateId: "YOUR_ID",
  commission: 12,  // percentage
  
  // STATUS
  ownerType: "ggnHome",
  isActive: true,
  isPostedNew: false,  // No approval needed for scraped
}
```

### Key Differences from User-Posted Properties

| Field | User-Posted | Scraped |
|-------|-------------|---------|
| `ownerType` | "Owner" or "Agent" | "ggnHome" |
| `sourcePortal` | undefined | "nobroker" or "99acres" |
| `isPostedNew` | Usually true | false (no approval) |
| `isActive` | After approval | true immediately |
| `showContact` | true | false (affiliate only) |
| Commission | Optional | Always set |

## Frontend Integration

### Display Scraped Properties

In property card/detail pages, differentiate by checking `sourcePortal`:

```javascript
// In PropertyCard component
if (property.sourcePortal) {
  // Scraped property
  return <AffiliateListingCard property={property} />;
} else {
  // User-posted property
  return <StandardPropertyCard property={property} />;
}
```

### Show Source Label

```javascript
function PropertySourceLabel({ property }) {
  const sources = {
    nobroker: "From NoBroker",
    "99acres": "From 99acres"
  };
  
  if (property.sourcePortal) {
    return <span className="source-label">
      {sources[property.sourcePortal]}
    </span>;
  }
  return null;
}
```

### Handle Affiliate Redirect

When user clicks scraped property:

```javascript
async function handlePropertyClick(property) {
  if (property.sourcePortal && property.sourceUrl) {
    // Track click in AffiliateTracking
    await trackAffiliateClick({
      propertyId: property._id,
      sourcePortal: property.sourcePortal,
      userId: currentUser._id
    });
    
    // Redirect to affiliate link
    window.open(property.sourceUrl, '_blank');
  } else {
    // Normal navigation
    navigate(`/property/${property._id}`);
  }
}
```

## API Endpoints (To Be Implemented)

### Tracking Clicks

```
POST /api/affiliate/click
Body: {
  propertyId: ObjectId,
  sourcePortal: "nobroker" | "99acres"
}
Response: {
  trackingId: "TRK_ABC123",
  url: "https://affiliate-link"
}
```

### Recording Conversions

```
POST /api/affiliate/conversion
Body: {
  trackingId: "TRK_ABC123",
  bookingPrice: 50000
}
Response: {
  userCashback: 750,
  ggnHomeCommission: 6000
}
```

### Get User Wallet

```
GET /api/user/wallet
Response: {
  userId: ObjectId,
  balance: 5000,
  totalEarned: 25000,
  totalWithdrawn: 15000,
  pendingCashback: 3000
}
```

## Monitoring & Logging

### Scraper Logs

Located in `scraper/logs/`:
- `scraper.log` - All operations
- `error.log` - Errors only

Example log entry:
```json
{
  "timestamp": "2026-10-07T10:30:00Z",
  "level": "info",
  "message": "Scraping NoBroker page 1...",
  "service": "ggnhome-scraper",
  "properties": 12
}
```

### Database Logs

Query scraper runs:
```javascript
db.scraperlogs.find({}).sort({ startedAt: -1 }).limit(10)

// Result:
{
  _id: ObjectId,
  startedAt: 2026-10-07T10:00:00Z,
  completedAt: 2026-10-07T10:15:00Z,
  status: "success",
  scrapers: {
    nobroker: {
      propertiesFound: 25,
      propertiesImported: 20,
      propertiesUpdated: 3,
      propertiesSkipped: 2
    }
  }
}
```

### Admin Panel Integration

Add admin page to view scraper runs:

```javascript
// In admin panel
import ScraperLogs from '@/pages/admin/ScraperLogs';

function AdminScraperPage() {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    // Fetch from MongoDB
    fetch('/api/admin/scraper-logs?limit=20')
      .then(r => r.json())
      .then(data => setLogs(data));
  }, []);
  
  return (
    <div>
      <h1>Scraper Runs</h1>
      {logs.map(log => (
        <ScraperLogCard key={log._id} log={log} />
      ))}
    </div>
  );
}
```

## Troubleshooting

### Properties Not Appearing

1. **Check database connection:**
   ```bash
   mongosh
   > use ggnhome
   > db.rentalproperty.count({ sourcePortal: "nobroker" })
   ```

2. **Check scraper logs:**
   ```bash
   tail -f scraper/logs/error.log
   ```

3. **Verify Mongoose connection:**
   - Ensure same `MONGODB_URI` in both apps
   - Check if MongoDB is running

### Duplicate Properties

- Scraper automatically deduplicates by `sourcePortal + sourceListingId`
- If duplicates appear, check `sourceListingId` parsing

### Properties Marked as Inactive

- Scraper marks as inactive if no longer on source platform
- Set `sourceStatus: "removed"`
- Can be automatically deleted after X days

## Performance Optimization

### For Large Datasets

```env
# Scrape fewer pages initially
NOBROKER_PAGES_TO_SCRAPE=1
NINETY_NINE_ACRES_PAGES_TO_SCRAPE=1

# After testing, increase gradually
NOBROKER_PAGES_TO_SCRAPE=10
NINETY_NINE_ACRES_PAGES_TO_SCRAPE=10
```

### Database Indexes

Scraper creates optimal indexes:
```javascript
// Automatic
db.rentalproperty.createIndex({ sourcePortal: 1, sourceListingId: 1 })
db.rentalproperty.createIndex({ isActive: 1, rankScore: -1 })
```

### Caching

Consider caching frequently accessed data:
```javascript
// Cache scraped property list for 1 hour
app.get('/api/properties/scraped', 
  cache('1 hour'),
  getScrapedProperties
);
```

## Next Steps

1. ✅ Scraper setup complete
2. **TODO:** Implement affiliate tracking APIs
3. **TODO:** Add admin UI for scraper management
4. **TODO:** Implement user wallet UI
5. **TODO:** Add webhook for real-time updates
6. **TODO:** Create analytics dashboard
7. **TODO:** Expand to more platforms

## Support

For issues:
1. Check `scraper/README.md`
2. Review logs in `scraper/logs/`
3. Test with: `npm test`
4. Create issue with full error logs
