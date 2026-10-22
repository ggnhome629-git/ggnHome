/**
 * Caps the page size of every request, so one call like ?limit=1000000 cannot make the server read and send a
 * whole collection (memory on a small instance, and a cheap way to take the site down).
 * Applies to limit / pageSize / perPage / per_page. The default cap is 200 (the biggest page the apps ask for);
 * change it with MAX_PAGE_SIZE. Values that are not positive numbers are left for each route to default.
 * Also keeps `page` a sane positive whole number.
 */
const MAX = Math.max(1, Number(process.env.MAX_PAGE_SIZE) || 200);
const SIZE_KEYS = ["limit", "pageSize", "perPage", "per_page"];
const MAX_PAGE = 100000;

function capPagination(req, res, next) {
  const original = req.query || {};
  const cleaned = { ...original };
  let changed = false;

  for (const key of SIZE_KEYS) {
    if (cleaned[key] === undefined) continue;
    const n = Number(Array.isArray(cleaned[key]) ? cleaned[key][0] : cleaned[key]);
    if (Number.isFinite(n) && n > MAX) { cleaned[key] = String(MAX); changed = true; }
  }
  if (cleaned.page !== undefined) {
    const n = Number(Array.isArray(cleaned.page) ? cleaned.page[0] : cleaned.page);
    if (Number.isFinite(n) && (n > MAX_PAGE || n < 1)) { cleaned.page = String(Math.min(Math.max(1, Math.floor(n) || 1), MAX_PAGE)); changed = true; }
  }

  // In Express 5 req.query is a getter that parses the URL again on every read, so a plain assignment would not stick.
  if (changed) Object.defineProperty(req, "query", { value: cleaned, writable: true, configurable: true, enumerable: true });
  next();
}

module.exports = { capPagination, MAX_PAGE_SIZE: MAX };
