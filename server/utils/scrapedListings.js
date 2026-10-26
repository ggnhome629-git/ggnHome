/**
 * Admin switch for scraped (imported) listings — the rental/sale rows that
 * carry a `sourcePortal` (NoBroker, 99acres).
 *
 * When the switch is off:
 *   - every public request sees no scraped listing. Rather than patching each
 *     of the dozens of listing queries, a request-scoped flag (set by
 *     `scrapedVisibilityMiddleware`) is read by query hooks on the two property
 *     models (`scrapedListingsPlugin`). Admin routes and background jobs run
 *     without the flag, so the admin panel still lists everything.
 *   - the scraper and NoBroker sync refuse to run (`assertScraperUnlocked`).
 *
 * The setting lives on the platform FeatureToggle document; it defaults to on
 * so existing deployments behave exactly as before until an admin turns it off.
 */
const { AsyncLocalStorage } = require("async_hooks");

const context = new AsyncLocalStorage();

const CACHE_MS = 10 * 1000;
let cached = { value: true, at: 0 };

async function isScrapedEnabled() {
  if (Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    // Required lazily: the property models load this file through the plugin.
    const FeatureToggle = require("../models/FeatureToggle.model");
    const settings = await FeatureToggle.findOne({ key: "platform" }).select("scrapedListings").lean();
    cached = { value: settings?.scrapedListings !== false, at: Date.now() };
  } catch (err) {
    // A failed read keeps the last known value rather than flipping listings.
    console.error("[scrapedListings] could not read the setting:", err.message);
    cached = { ...cached, at: Date.now() };
  }
  return cached.value;
}

/** Called after an admin saves the toggle so this instance applies it at once. */
function setScrapedEnabledCache(value) {
  cached = { value: value !== false, at: Date.now() };
}

// Admin screens must keep seeing (and managing) scraped rows.
const UNFILTERED_PATHS = [/^\/api\/admin\b/i, /^\/admin\b/i];

async function scrapedVisibilityMiddleware(req, res, next) {
  if (UNFILTERED_PATHS.some((re) => re.test(req.path))) return next();
  let hide = false;
  try {
    hide = !(await isScrapedEnabled());
  } catch (_) {
    hide = false;
  }
  if (!hide) return next();
  return context.run({ hideScraped: true }, next);
}

const shouldHide = () => Boolean(context.getStore()?.hideScraped);

// Matches rows with no sourcePortal (missing or null) — our own listings.
const OWN_LISTINGS = { sourcePortal: null };

// Stages that must stay first in an aggregation pipeline.
const LEADING_STAGES = ["$geoNear", "$search", "$searchMeta", "$vectorSearch"];

function scrapedListingsPlugin(schema) {
  const filterQuery = function () {
    // ANDed onto whatever the query asks for, so even a query that names
    // sourcePortal itself cannot reach scraped rows.
    if (shouldHide()) this.and([OWN_LISTINGS]);
  };
  ["find", "findOne", "countDocuments", "distinct"].forEach((op) => schema.pre(op, filterQuery));

  schema.pre("aggregate", function () {
    if (!shouldHide()) return;
    const pipeline = this.pipeline();
    const first = pipeline[0] ? Object.keys(pipeline[0])[0] : null;
    const at = LEADING_STAGES.includes(first) ? 1 : 0;
    pipeline.splice(at, 0, { $match: OWN_LISTINGS });
  });
}

class ScraperLockedError extends Error {
  constructor() {
    super("Scraped properties are turned off. Turn them on from the admin dashboard to use the scraper.");
    this.status = 423;
    this.code = "SCRAPER_LOCKED";
  }
}

async function assertScraperUnlocked() {
  if (!(await isScrapedEnabled())) throw new ScraperLockedError();
}

/** Route guard for scraper actions. */
async function requireScraperUnlocked(req, res, next) {
  if (await isScrapedEnabled()) return next();
  const err = new ScraperLockedError();
  return res.status(err.status).json({ success: false, code: err.code, message: err.message });
}

module.exports = {
  isScrapedEnabled,
  setScrapedEnabledCache,
  scrapedVisibilityMiddleware,
  scrapedListingsPlugin,
  assertScraperUnlocked,
  requireScraperUnlocked,
  ScraperLockedError,
};
