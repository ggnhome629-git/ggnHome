# Admin Dashboard Guide

## Overview

The updated Admin Dashboard provides a complete solution for managing property listings and web scraping operations. It's designed for non-technical users with an intuitive, mobile-responsive interface.

---

## New Features

### 1. **Scraper Control** 🔧

**Location:** Settings → Scraper Control (First Tab)

#### Features:
- **One-Click Scraper Trigger** - Start/stop scraping with a single button
- **Real-time Status Monitoring** - See live scraper status and progress
- **Data Source Selection** - Choose between NoBroker, 99acres, or both
- **Live Statistics** - Total properties scraped, success rate, last run time
- **Detailed Logs** - View scraper activity and error messages
- **Auto-Refresh** - Optional automatic status updates every 5 seconds

#### How to Use:

1. **Select Data Source**
   ```
   Choose "NoBroker" for reliable scraping
   (99acres requires premium setup)
   ```

2. **Start Scraping**
   - Click "Start Scraper" button
   - Monitor progress in the status cards
   - View logs for details

3. **View Results**
   - Success Rate card shows percentage
   - Total Scraped card shows number of properties
   - Last Run card shows when scraper ran

4. **Stop if Needed**
   - Click "Stop" button to halt scraping
   - Can restart at any time

#### Status Cards:
- **Status** - Shows "Running" or "Idle"
- **Last Run** - When scraper last executed
- **Total Scraped** - Number of properties in database
- **Success Rate** - Percentage of successful scrapes

#### Logs Section:
- Shows detailed scraping activity
- Click "Show Details" to view log entries
- Filter by level (Error, Warning, Info)
- Each log shows timestamp, level, and message

---

### 2. **Property Manager** 🏠

**Location:** Settings → Property Manager (Second Tab)

#### Features:
- **View All Properties** - See every property in the database
- **Search & Filter** - Find properties by title, location, source
- **Bulk Export** - Download properties as CSV
- **Delete Management** - Remove duplicate or incorrect properties
- **Source Tracking** - Know where each property came from
- **Pagination** - Easy navigation through large datasets

#### How to Use:

1. **View Properties**
   - All properties display in a clean table format
   - See title, location, price, BHK, and source
   - Properties from NoBroker show "NoBroker" tag

2. **Search**
   - Type in search box for title or location
   - Results update instantly
   - Works across all properties

3. **Filter**
   - **Source Filter** - NoBroker, 99acres, or Manual
   - **Status Filter** - Active, Inactive, or Sold
   - Combine filters for precise results
   - Click "Reset" to clear all filters

4. **View Details**
   - Click eye icon on any property
   - See complete information in modal
   - View property description if available

5. **Delete Property**
   - Click trash icon to remove
   - Confirm before deletion
   - Useful for removing duplicates

6. **Export Data**
   - Click "Export CSV" button
   - Downloads all properties as spreadsheet
   - Includes: Title, Price, Location, BHK, Area, Source, Added Date
   - Use for analysis or backup

#### Stats Cards:
- **Total Properties** - Count of all properties
- **Current Page** - Properties on this page
- **NoBroker** - Properties from NoBroker source
- **Export CSV** - Quick export button

---

## Mobile Responsiveness

### Scraper Control (Mobile)
- Full-width card layout on small screens
- Buttons stack vertically
- Status cards show one per row
- Logs scrollable horizontally
- Touch-friendly button sizing

### Property Manager (Mobile)
- Table scrolls horizontally
- Search/filter inputs stack
- Pagination works smoothly
- Action icons easily tappable
- Dialog opens full-screen on mobile

### Navigation Tabs
- Tabs scroll horizontally on mobile
- Icon shows with label
- Easy to tap between sections
- Responsive spacing

---

## Complete Workflow Example

### Adding Properties Via Scraper

1. **Go to Settings → Scraper Control**

2. **Start Scraper**
   ```
   Source: NoBroker
   Click: "Start Scraper"
   ```

3. **Monitor Progress**
   - Watch status card
   - Check "Scraping in progress..." bar
   - View logs for details

4. **Scraper Completes**
   - Status changes to "Idle"
   - Success Rate updates
   - Total Scraped increases

5. **Verify in Property Manager**
   ```
   Go to: Settings → Property Manager
   Filter: Source = "NoBroker"
   See: All newly scraped properties
   ```

6. **Manage as Needed**
   - Delete duplicates
   - Export for analysis
   - Search for specific properties

---

## Statistics & Monitoring

### Scraper Statistics
- **Total Run** - Number of times scraper has executed
- **Successful Runs** - Runs that completed without error
- **Failed Runs** - Runs that encountered issues
- **Properties Scraped** - Total count of properties
- **Last Run** - Most recent execution timestamp
- **Next Run** - Scheduled run time (if applicable)

### Property Statistics
- **Total Properties** - Database count
- **By Source** - Count per source (NoBroker, 99acres, Manual)
- **Page Size** - 10 properties per page

---

## Tips for Non-Technical Users

### Best Practices

1. **Schedule Scraping**
   - Run scraper during off-peak hours
   - Weekly or bi-weekly is typical
   - Set external cron job for automation

2. **Monitor Health**
   - Check success rate regularly
   - If rate drops, check logs for issues
   - Contact support if rate < 80%

3. **Manage Duplicates**
   - After scraping, review Property Manager
   - Sort by "Date Added" (newest first)
   - Look for duplicate titles
   - Delete obvious duplicates

4. **Regular Backups**
   - Export CSV weekly
   - Store in secure location
   - Use for recovery if needed

5. **Source Awareness**
   - NoBroker: Most reliable
   - Manual: Listings you added
   - 99acres: Requires setup (see docs)

---

## Troubleshooting

### Scraper Won't Start
- Ensure you have admin permissions
- Check internet connection
- Try refreshing page
- If still fails, contact support

### Logs Show Errors
- Check scraper documentation
- Most errors are temporary
- Scraper retries automatically
- If persistent, try stopping and restarting

### Can't Find Property
- Use search function
- Try different keywords
- Check filter settings
- Reset filters to clear confusion

### Export Won't Download
- Check browser download settings
- Ensure pop-ups not blocked
- Try different browser
- Check internet connection

### Mobile Display Issues
- Rotate phone to landscape for table
- Use zoom out if text too small
- Clear browser cache if styling odd
- Try different browser if persists

---

## Advanced Features

### Search Operators
```
Search: "2 BHK" - Find all 2-room properties
Search: "Gurgaon" - Find properties by location
Search: "500000" - Find by price
```

### Filter Combinations
```
Source: NoBroker + Status: Active
= All active properties from NoBroker

Source: Manual + Status: Sold
= All manually added sold properties
```

### CSV Export Uses
- Spreadsheet analysis (Excel, Google Sheets)
- Email to clients
- Website feed generation
- Backup and archival
- Data transformation

---

## Admin Settings Overview

### Complete Tab Structure

| Tab | Purpose | Users |
|-----|---------|-------|
| **Scraper Control** | Manage web scraping | Admins |
| **Property Manager** | Database management | Admins |
| Feature Toggles | Enable/disable features | Admins |
| Promo Cards | Create promotions | Admins |
| SMS Devices | SMS configuration | Admins |
| Affiliate Tracker | Track referrals | Admins |
| Affiliate Config | Configure affiliates | Admins |
| Link Manager | Manage URLs | Admins |

---

## Keyboard Shortcuts

### On Property Manager Table
| Key | Action |
|-----|--------|
| `Ctrl+F` | Browser search (works in table) |
| `Ctrl+A` | Select all text |
| `Ctrl+C` | Copy cell content |
| `Page Down` | Next page |
| `Page Up` | Previous page |

---

## Permissions Required

To access these features, you must have:
- **Admin Role** - In user system
- **Login Token** - Valid session
- **API Access** - Server must be running

If you see "Unauthorized" error:
1. Ensure you're logged in as admin
2. Check if token is expired
3. Try logging out and back in

---

## Support & Resources

### For Scraper Issues
- See: `server/SCRAPER_TRIGGERING_GUIDE.md`
- See: `server/SCRAPER_BLOCKING_SOLUTIONS.md`
- See: `server/DEPLOYMENT_FREE_TIER.md`

### For Property Management
- See: Backend API documentation
- Contact: Admin support

### For Mobile Issues
- Update browser to latest version
- Clear cache and cookies
- Try landscape orientation
- Contact: Technical support

---

## Summary

The new Admin Dashboard makes it easy to:
✅ Trigger web scraping with one click
✅ Monitor scraping progress in real-time
✅ Manage all properties in a clean interface
✅ Search and filter properties instantly
✅ Export data for analysis
✅ Work seamlessly on mobile or desktop

**Perfect for non-technical team members who need powerful property management without complexity!**

---

## What's Next?

After implementing this dashboard:

1. **Set up external cron** for scheduled scraping
2. **Monitor success rate** regularly
3. **Clean duplicates** after each scrape
4. **Export weekly** for backups
5. **Track statistics** to optimize

Questions? Contact your technical administrator!
