/**************************************************************
 * invalidatePropertyCache.js
 *
 * Mongoose plugin that drops cached property payloads whenever a listing
 * changes.
 *
 * Property writes happen across a dozen controllers (owner posts, agent
 * posts, admin approvals, edits, deletes, the nightly NoBroker sync), so
 * hanging invalidation off the schema is the only way to guarantee no path
 * silently serves stale listings. Invalidation is debounced and
 * fire-and-forget: a write is never delayed by, or failed by, the cache.
 **************************************************************/

const cache = require("../../config/cache");

const PROPERTY_NAMESPACE = "properties";

// Query middleware fires on the query, document middleware on the document —
// covering both means findByIdAndUpdate, updateOne, save() and friends all
// land here.
const QUERY_HOOKS = [
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
];

module.exports = function invalidatePropertyCache(schema) {
  // Zero-arity so Mongoose treats these as synchronous hooks and the write
  // returns without waiting on Redis.
  const flush = () => cache.invalidateSoon(PROPERTY_NAMESPACE);

  schema.post("save", flush);
  schema.post("insertMany", flush);
  QUERY_HOOKS.forEach((hook) => schema.post(hook, flush));
};
