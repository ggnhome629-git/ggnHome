const axios = require("axios");
const RentalProperty = require("../models/Rentalproperty.model");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// A listing is only ever deleted after showing "removed" on two separate runs
// at least this far apart, so a single blocked/odd fetch can't wipe real data.
const REMOVAL_CONFIRM_AFTER_MS = 12 * 60 * 60 * 1000;

// If more than this fraction of a run's listings look "removed", NoBroker is
// almost certainly rate-limiting/blocking us rather than every listing having
// vanished at once — abort the whole run without writing anything.
const REMOVED_FRACTION_BREAKER = 0.15;
const REMOVED_COUNT_BREAKER_FLOOR = 5;

function extractAppState(html) {
  const marker = "nb.appState = ";
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = idx + marker.length;
  if (html[start] !== "{") return null;

  let i = start;
  let depth = 0;
  let inStr = false;
  let strChar = "";
  let escape = false;
  let end = null;

  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === strChar) inStr = false;
    } else {
      if (c === '"' || c === "'") {
        inStr = true;
        strChar = c;
      } else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
  }
  if (end === null) return null;

  try {
    return JSON.parse(html.slice(start, end));
  } catch (e) {
    return null;
  }
}

// Returns one of: "active" | "inactive" | "removed" | "unknown"
// NoBroker always answers HTTP 200, even for a listing id that never
// existed — it just serves the generic homepage shell with a null
// detailsData block. So HTTP status can't tell us anything; the only
// reliable signal is whether detailsData itself is present.
async function checkListing(sourceUrl) {
  let res;
  try {
    res = await axios.get(sourceUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true,
    });
  } catch (err) {
    return { status: "unknown", reason: err.message };
  }

  if (typeof res.data !== "string") {
    return { status: "unknown", reason: "non_html_response" };
  }

  const appState = extractAppState(res.data);
  const dd = appState && appState.propertyDetails && appState.propertyDetails.detailsData;

  if (!dd) return { status: "removed" };
  return { status: dd.active === false ? "inactive" : "active" };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Checks every scraped (sourceUrl-having) RentalProperty against its live
 * NoBroker page and mirrors the listing's fate:
 *  - NoBroker says rented out (active:false)      -> isActive: false here too
 *  - NoBroker page no longer resolves to a listing -> deleted here too,
 *    but only once the same listing has shown "removed" on two runs at
 *    least REMOVAL_CONFIRM_AFTER_MS apart (protects against a one-off
 *    fetch that looks empty for unrelated reasons).
 *  - Reactivated on NoBroker                       -> isActive restored here.
 *
 * A run-level circuit breaker skips ALL writes if an implausible fraction
 * of listings come back "removed" in a single pass, since that pattern
 * means we're likely being blocked, not that everything got delisted.
 */
async function syncNoBrokerListings({
  dryRun = false,
  hardDeleteOnRemove = true,
  delayMs = 450,
} = {}) {
  const docs = await RentalProperty.find({ sourceUrl: { $exists: true } })
    .select("_id sourceUrl isActive sourceRemovalFlaggedAt")
    .lean();

  const now = new Date();
  const results = [];

  for (const doc of docs) {
    const result = await checkListing(doc.sourceUrl);
    results.push({ doc, result });
    await sleep(delayMs + Math.random() * 200);
  }

  const removedCount = results.filter((r) => r.result.status === "removed").length;
  const breakerThreshold = Math.max(
    REMOVED_COUNT_BREAKER_FLOOR,
    docs.length * REMOVED_FRACTION_BREAKER
  );
  const breakerTripped = removedCount > breakerThreshold;

  const summary = {
    total: docs.length,
    active: 0,
    deactivated: 0,
    reactivated: 0,
    removalFlagged: 0,
    deleted: 0,
    unknown: 0,
    breakerTripped,
    removedCount,
    errors: [],
  };

  if (breakerTripped) {
    summary.errors.push(
      `Circuit breaker tripped: ${removedCount}/${docs.length} listings looked "removed" in one run ` +
        `(threshold ${breakerThreshold.toFixed(0)}). Likely a block/CAPTCHA from NoBroker, not mass delisting. ` +
        `No changes were written — investigate before re-running.`
    );
    return summary;
  }

  for (const { doc, result } of results) {
    try {
      if (result.status === "active") {
        summary.active++;
        const set = { sourceStatus: "active", sourceCheckedAt: now };
        const unset = doc.sourceRemovalFlaggedAt ? { sourceRemovalFlaggedAt: "" } : undefined;
        if (doc.isActive === false) summary.reactivated++;
        if (!dryRun) {
          await RentalProperty.updateOne(
            { _id: doc._id },
            { $set: { ...set, isActive: true }, ...(unset ? { $unset: unset } : {}) }
          );
        }
      } else if (result.status === "inactive") {
        summary.deactivated++;
        if (!dryRun) {
          await RentalProperty.updateOne(
            { _id: doc._id },
            {
              $set: { isActive: false, sourceStatus: "inactive", sourceCheckedAt: now },
              ...(doc.sourceRemovalFlaggedAt ? { $unset: { sourceRemovalFlaggedAt: "" } } : {}),
            }
          );
        }
      } else if (result.status === "removed") {
        const previouslyFlaggedAt = doc.sourceRemovalFlaggedAt
          ? new Date(doc.sourceRemovalFlaggedAt)
          : null;
        const confirmed =
          previouslyFlaggedAt &&
          now.getTime() - previouslyFlaggedAt.getTime() >= REMOVAL_CONFIRM_AFTER_MS;

        if (confirmed) {
          summary.deleted++;
          if (!dryRun) {
            if (hardDeleteOnRemove) {
              await RentalProperty.deleteOne({ _id: doc._id });
            } else {
              await RentalProperty.updateOne(
                { _id: doc._id },
                { $set: { isActive: false, sourceStatus: "removed", sourceCheckedAt: now } }
              );
            }
          }
        } else {
          summary.removalFlagged++;
          if (!dryRun) {
            await RentalProperty.updateOne(
              { _id: doc._id },
              {
                $set: {
                  sourceStatus: "removed",
                  sourceCheckedAt: now,
                  sourceRemovalFlaggedAt: previouslyFlaggedAt || now,
                },
              }
            );
          }
        }
      } else {
        summary.unknown++;
        if (result.reason) summary.errors.push({ id: doc._id, url: doc.sourceUrl, reason: result.reason });
      }
    } catch (err) {
      summary.unknown++;
      summary.errors.push({ id: doc._id, url: doc.sourceUrl, error: err.message });
    }
  }

  return summary;
}

module.exports = { syncNoBrokerListings, checkListing, extractAppState };
