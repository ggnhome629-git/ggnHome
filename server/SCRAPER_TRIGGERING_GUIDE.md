# Scraper Triggering Guide

## Overview

The scraper can be triggered in **3 different ways** depending on your needs. Each method is optimized for the Render free tier (512 MB).

---

## Method 1: Manual API Trigger (Recommended for Testing)

### Basic Usage

Trigger scraper directly via HTTP POST request:

```bash
curl -X POST https://your-app.onrender.com/api/admin/scraper/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"nobroker"}'
```

### Request Parameters

```json
{
  "source": "nobroker"  // Options: "nobroker", "99acres", "all"
}
```

### Response (202 Accepted)

```json
{
  "success": true,
  "message": "Scraper job started",
  "data": {
    "jobId": "job_1696920000000",
    "status": "running",
    "source": "nobroker"
  }
}
```

### Check Status

```bash
curl -X GET https://your-app.onrender.com/api/admin/scraper/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Use Cases

✅ **Testing & Development**
- Test scraper locally
- Verify it works before scheduling

✅ **On-Demand Scraping**
- Trigger when you need fresh data
- No automatic scheduling needed

✅ **Manual Control**
- Full control over when scraper runs
- Easy to stop or restart

---

## Method 2: External Cron Service (Recommended for Production)

Automatic scheduled scraping using a **free external cron service**. Best for Render free tier.

### Setup Steps

#### Step 1: Set Environment Variables in Render

Go to **Render Dashboard** → **Environment** → **Add Environment Variable**

```
CRON_SECRET=super-secret-key-change-me-123
```

*(Use a strong random string)*

#### Step 2: Choose a Free Cron Service

### **Option A: EasyCron.com** (Easiest)

1. Go to https://www.easycron.com
2. Sign up (free)
3. Click **"Add Cron Job"**
4. Enter details:
   - **URL**: `https://your-app.onrender.com/api/cron/scraper-trigger?secret=super-secret-key-change-me-123`
   - **Cron Expression**: `0 2 * * *` (Daily at 2 AM UTC)
   - **Notification**: Email on failure (optional)
5. Click **Save**

**Result:** Scraper runs automatically every day at 2 AM UTC

### **Option B: CronJob.org** (Alternative)

1. Go to https://www.cronjob.org
2. Create account
3. Click **"Create Cron Job"**
4. Enter details:
   - **URL**: `https://your-app.onrender.com/api/cron/scraper-trigger?secret=super-secret-key-change-me-123`
   - **Schedule**: `0 2 * * *` (Daily 2 AM UTC)
   - **Notifications**: Enable email alerts
5. Save

### **Option C: Node-Schedule (Server-Side - NOT for Free Tier)**

⚠️ **Not recommended** for free tier because it keeps the process running 24/7 and uses memory even when idle.

If you still want to use it:

```bash
npm install node-cron
```

Add to `server/index.js`:

```javascript
const cron = require('node-cron');
const scraperService = require('./services/scraper.service');

// Run scraper daily at 2 AM UTC
cron.schedule('0 2 * * *', async () => {
  console.log('Scheduled scraper job started');
  try {
    await scraperService.startScrapingJob('nobroker');
  } catch (error) {
    console.error('Scheduled scraper failed', error.message);
  }
});
```

#### Step 3: Test the Cron Trigger

```bash
# Manually trigger to verify setup
curl -X POST https://your-app.onrender.com/api/cron/scraper-trigger?secret=super-secret-key-change-me-123
```

Expected response:
```json
{
  "status": "Scraper job started",
  "jobId": "job_1696920000000"
}
```

### Cron Expression Formats

Common schedules:

```
0 2 * * *      # Daily at 2 AM UTC
0 */6 * * *    # Every 6 hours
30 2 * * 1     # Every Monday at 2:30 AM UTC
0 0 1 * *      # First day of month
0 12 * * *     # Daily at noon UTC
```

### Monitoring Scheduled Runs

1. **Check logs in Render**:
   - Render Dashboard → Logs
   - Search for "Scraper job started"

2. **Monitor with UptimeRobot** (free tier):
   - Add monitor for `https://your-app.onrender.com/`
   - Set to ping every 10 minutes
   - Alerts you if app is down

3. **Check scraper status via API**:
```bash
curl -X GET https://your-app.onrender.com/api/admin/scraper/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Use Cases

✅ **Production Deployments**
- Fully automated
- No manual intervention
- Reliable scheduling

✅ **Regular Data Updates**
- Daily scrapes
- Predictable schedule
- Consistent data freshness

✅ **Free Tier Friendly**
- External service keeps app responsive
- Doesn't use server memory 24/7
- Clean separation of concerns

---

## Method 3: Keep-Alive Endpoint (Prevent Auto-Sleep)

Render free tier auto-sleeps after 15 minutes of inactivity. Prevent this:

### Using UptimeRobot (Free)

1. Go to https://uptimerobot.com
2. Sign up (free account)
3. Click **"Add New Monitor"**
4. Enter details:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: ggnHome Keep-Alive
   - **URL**: `https://your-app.onrender.com/api/keep-alive`
   - **Monitor Interval**: Every 10 minutes
   - **Notifications**: Email
5. Save

**Result:** UptimeRobot pings your app every 10 minutes, preventing auto-sleep.

### Manual Keep-Alive

```bash
# Test the endpoint
curl -X GET https://your-app.onrender.com/api/keep-alive

# Response:
# {
#   "status": "ok",
#   "uptime": 3600,
#   "timestamp": "2026-10-07T10:30:00.000Z"
# }
```

---

## 📋 Complete Setup Checklist

### For Development (Local Testing)

- [ ] Install dependencies: `npm install joi winston cheerio axios`
- [ ] Update `server/index.js` with keep-alive and cron endpoints
- [ ] Add scraper routes to `server/Route/route.js`
- [ ] Test manual API trigger locally
- [ ] Test with Postman or curl

### For Production (Render Deployment)

- [ ] Set `CRON_SECRET` environment variable in Render
- [ ] Deploy code with scraper integration
- [ ] Choose external cron service (EasyCron or CronJob.org)
- [ ] Configure cron job with correct URL and schedule
- [ ] Set up UptimeRobot monitoring
- [ ] Test cron trigger manually first
- [ ] Monitor first scheduled run via Render logs
- [ ] Verify scraper completed successfully

### Environment Variables

```bash
# Required
CRON_SECRET=your-secret-key-here

# Optional
DISABLE_RATE_LIMIT=false
SCRAPER_ENABLED=true
LOG_LEVEL=info
```

---

## API Endpoints Reference

### Start Scraper (Manual)
```
POST /api/admin/scraper/run
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "source": "nobroker" | "99acres" | "all"
}

Response: 202 Accepted
```

### Get Status
```
GET /api/admin/scraper/status
Authorization: Bearer {TOKEN}

Response: 200 OK
{
  "isRunning": false,
  "stats": { ... }
}
```

### Stop Scraper
```
POST /api/admin/scraper/stop
Authorization: Bearer {TOKEN}

Response: 200 OK
```

### Get Logs
```
GET /api/admin/scraper/logs?limit=100
Authorization: Bearer {TOKEN}

Response: 200 OK
[
  { timestamp, message, level, ... }
]
```

### Update Schedule
```
PATCH /api/admin/scraper/schedule
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "cron": "0 2 * * *"
}

Response: 200 OK
```

### Cron Trigger (External)
```
POST /api/cron/scraper-trigger?secret=YOUR_CRON_SECRET

Response: 202 Accepted
{
  "status": "Scraper job started",
  "jobId": "job_1696920000000"
}
```

### Keep-Alive (Monitoring)
```
GET /api/keep-alive

Response: 200 OK
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-10-07T10:30:00.000Z"
}
```

---

## Troubleshooting

### Cron Job Not Triggering

**Check:**
1. Is the URL correct? (copy from deployment)
2. Is `CRON_SECRET` environment variable set in Render?
3. Does the secret in URL match the environment variable?
4. Check Render logs for any errors

**Test:**
```bash
# Manually trigger to verify
curl -X POST https://your-app.onrender.com/api/cron/scraper-trigger?secret=YOUR_SECRET
```

### Scraper Fails with Out of Memory

**Solutions:**
1. Reduce chunk size in scraper
2. Increase delay between requests
3. Limit properties scraped per run
4. Check Render dashboard for memory usage

### App Auto-Sleeps Before Cron Runs

**Solution:**
Set up UptimeRobot to ping `/api/keep-alive` every 10 minutes. This prevents auto-sleep.

### Cron Service Returns 401 Unauthorized

**Causes:**
1. Wrong secret in URL
2. Environment variable not set
3. Environment variable not deployed yet

**Fix:**
1. Double-check `CRON_SECRET` in Render dashboard
2. Redeploy application
3. Wait 2-3 minutes for Render to restart
4. Test again

---

## Recommended Setup for Free Tier

### Optimal Configuration

```
┌─────────────────────────────────────────────────────┐
│                  Your Application                    │
│  (Render Free Tier - 512 MB, auto-sleeps at 15m)   │
└─────────────────────────────────────────────────────┘
                         ▲
        ┌────────────────┼────────────────┐
        │                │                │
    [EasyCron]      [UptimeRobot]   [Manual API]
   (Daily 2 AM)   (Ping every 10m)  (On-demand)
```

**Why this works:**
1. **EasyCron** → Triggers scraper automatically on schedule
2. **UptimeRobot** → Prevents auto-sleep between cron runs
3. **Manual API** → For testing and on-demand scraping

### Setup Time
- EasyCron: 5 minutes
- UptimeRobot: 5 minutes
- Total: 10 minutes

### Cost
- **Free** (all services have generous free tiers)

---

## Summary

| Method | Setup Time | Cost | Best For | Free Tier |
|--------|-----------|------|----------|-----------|
| Manual API | 0 min | Free | Testing, on-demand | ✅ |
| External Cron | 5 min | Free | Scheduled production | ✅ |
| Node-Cron | 10 min | Free | Complex schedules | ❌ |
| UptimeRobot | 5 min | Free | Prevent auto-sleep | ✅ |

**Recommendation:** Use **External Cron + UptimeRobot** for best free-tier experience.

---

## Next Steps

1. Deploy current code to Render
2. Set `CRON_SECRET` environment variable
3. Sign up for EasyCron and CronJob.org
4. Configure cron job to call `/api/cron/scraper-trigger`
5. Set up UptimeRobot monitoring
6. Test manual trigger first
7. Monitor logs during first scheduled run

Done! Your scraper is now fully automated and production-ready. 🚀
