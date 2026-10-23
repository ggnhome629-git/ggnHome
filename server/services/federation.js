const mongoose = require("mongoose");
const pool = require("./dbPool");
const { isFederated, mongoUris } = require("../config/db");

/**
 * Federation: several MongoDB databases behave as ONE for the whole app (MONGO_POOL_MODE=federated).
 *
 * Every Mongoose model goes through mongoose's collection layer, so the routing lives there and no
 * controller or model needs to change:
 *   - inserts          -> the active database (first one below the full threshold); small system
 *                         collections (counters, job locks, settings, SMS queue...) stay in database 1.
 *   - reads            -> all databases that hold the collection, merged (sort / skip / limit honoured).
 *   - updates, deletes -> the first database where the filter matches (the database that already holds it).
 *   - updateMany/deleteMany/count -> every database, results added up.
 *   - aggregate        -> the database itself when one holds the data, otherwise the matching data is
 *                         gathered into temporary collections and the pipeline runs there.
 *   - unique indexes   -> checked across ALL databases before an insert (same phone, same email, same _id),
 *                         and reported exactly like MongoDB's own E11000 error.
 *   - transactions     -> operations with a session run on database 1 only (a transaction cannot span clusters).
 * ObjectIds are generated in the app, so the same _id in two databases cannot happen by chance; if a
 * custom _id is reused it is rejected by the unique check above. An in-memory hint remembers where each
 * _id lives so single-document lookups hit the right database first.
 */

const PINNED = /^(counters|joblocks?|ratelimit|sitecache|appsetting|featuretoggle|smsqueue|smsdevice|smssetting|system\.|__fed_)/i;
const HOLDER_TTL = 5000;
const INDEX_TTL = 60000;
const HINT_MAX = 20000;

const holderCache = new Map(); // collection -> { at, slots:Set }
const indexCache = new Map(); // collection -> { at, specs }
const ensured = new Set(); // "slot:collection"
const hints = new Map(); // collection -> Map(idString -> slot)
const warned = new Map();
const orig = {};
let installed = false;

const warnOnce = (key, msg) => {
  if (Date.now() - (warned.get(key) || 0) > 60000) { warned.set(key, Date.now()); console.warn(msg); }
};

async function rawCol(slot, name) {
  const conn = pool.connectionFor(slot);
  if (slot !== 0) await conn.asPromise();
  return conn.db.collection(name);
}

const isNetworkError = (err) => !!err && (/Network|ServerSelection|Timeout|PoolCleared|Topology/i.test(err.name || "") || /ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/.test(err.code || ""));
function unavailable(slot) {
  const err = new Error(`Database ${slot + 1} is temporarily unavailable. Please try again in a moment.`);
  err.code = "DB_SLOT_UNAVAILABLE";
  err.status = 503;
  err.slot = slot;
  return err;
}
const isUnavailable = (err) => !!err && err.code === "DB_SLOT_UNAVAILABLE";

function redis() {
  try {
    const r = require("../utils/redisCache");
    return r.isConnected() ? r.getClient() : null;
  } catch (_) { return null; }
}

/** Run fn on a slot. A database that does not answer is marked down for all servers and the call fails loudly. */
async function onSlot(slot, name, fn) {
  if (slot !== 0 && pool.isDown(slot)) throw unavailable(slot);
  try {
    return await fn(await rawCol(slot, name));
  } catch (err) {
    if (slot !== 0 && isNetworkError(err)) {
      pool.markDown(slot);
      const r = redis();
      if (r) r.set(`ggn:fed:down:${slot}`, "1", "EX", 30).catch(() => {});
      warnOnce(`down${slot}`, `Database ${slot + 1} is not answering: ${err.message}`);
      throw unavailable(slot);
    }
    throw err;
  }
}

/** Read from a slot. One quick retry for a blip; never returns a made-up empty answer. */
async function readSlot(slot, name, fn) {
  try {
    return await onSlot(slot, name, fn);
  } catch (err) {
    if (!isUnavailable(err) || slot === 0) throw err;
    throw err;
  }
}

/**
 * Every database that may hold rows of this collection, INCLUDING ones that are down right now:
 * asking a down database fails the request instead of silently answering without its rows.
 * A database is left out only when it is known to be empty.
 */
async function holders(name) {
  const hit = holderCache.get(name);
  if (hit && Date.now() - hit.at < HOLDER_TTL) return [...hit.slots].sort((a, b) => a - b);
  const slots = new Set([0, ...(hit ? hit.slots : [])]);
  const r = redis();
  if (r) {
    try { (await r.smembers(`ggn:fed:holders:${name}`)).forEach((x) => slots.add(Number(x))); } catch (_) { /* redis is only a shortcut */ }
  }
  const all = mongoUris().map((_, i) => i).filter((i) => i !== 0);
  if (r) {
    try {
      const flags = await r.mget(all.map((i) => `ggn:fed:down:${i}`));
      flags.forEach((f, k) => { if (f) pool.markDown(all[k], 15000); }); // another server already saw it fail
    } catch (_) { /* redis is only a shortcut */ }
  }
  await Promise.all(
    all.map(async (i) => {
      try {
        await onSlot(i, name, async (c) => {
          if ((await c.estimatedDocumentCount()) > 0) {
            slots.add(i);
            if (r) r.sadd(`ggn:fed:holders:${name}`, String(i)).catch(() => {});
          }
        });
      } catch (err) {
        if (!isUnavailable(err)) throw err;
        if (!pool.knownEmpty(i)) slots.add(i); // might hold rows: treat as a holder we cannot reach
      }
    })
  );
  holderCache.set(name, { at: Date.now(), slots });
  return [...slots].sort((a, b) => a - b);
}
/** Holders that cannot be asked right now. */
async function unreachableHolders(name) {
  return (await holders(name)).filter((i) => i !== 0 && pool.isDown(i));
}
/** Sync peek used to keep the native fast path while only database 1 holds the collection. */
const cachedHolders = (name) => {
  const hit = holderCache.get(name);
  return hit && Date.now() - hit.at < HOLDER_TTL ? [...hit.slots].sort((a, b) => a - b) : null;
};
const noteHolder = (name, slot) => {
  const h = holderCache.get(name);
  if (h) h.slots.add(slot);
  const r = slot !== 0 && redis();
  if (r) r.sadd(`ggn:fed:holders:${name}`, String(slot)).catch(() => {}); // other servers see it at once
};

function hintMap(name) {
  if (!hints.has(name)) hints.set(name, new Map());
  return hints.get(name);
}
function setHint(name, id, slot) {
  if (id == null) return;
  const m = hintMap(name);
  if (m.size > HINT_MAX) m.delete(m.keys().next().value);
  m.set(String(id), slot);
}
const scalarId = (filter) => {
  const id = filter && filter._id;
  if (id == null || typeof id === "function") return null;
  if (typeof id === "object" && !(id instanceof mongoose.Types.ObjectId) && !(id instanceof Date)) return null;
  return id;
};
function orderSlots(name, filter, slots) {
  const id = scalarId(filter);
  const h = id != null ? hintMap(name).get(String(id)) : undefined;
  return h !== undefined && slots.includes(h) ? [h, ...slots.filter((s) => s !== h)] : slots;
}

/* ---------- indexes ---------- */
async function indexSpecs(name) {
  const hit = indexCache.get(name);
  if (hit && Date.now() - hit.at < INDEX_TTL) return hit.specs;
  let specs = [];
  try { specs = (await (await rawCol(0, name)).indexes()).filter((ix) => ix.name !== "_id_"); } catch (_) { /* collection not created yet */ }
  indexCache.set(name, { at: Date.now(), specs });
  return specs;
}
/** First time a database is written for a collection: give it the same indexes as database 1. */
async function ensureSlot(slot, name) {
  if (slot === 0) return;
  const specs = await indexSpecs(name);
  const sig = `${slot}:${name}:${specs.map((x) => x.name).sort().join(",")}`;
  if (ensured.has(sig)) return;
  const c = await rawCol(slot, name);
  for (const ix of specs) {
    const { key, name: ixName, v, ns, ...opts } = ix;
    try { await c.createIndex(key, { name: ixName, ...opts }); } catch (err) { console.warn(`Index ${ixName} on database ${slot + 1}: ${err.message}`); }
  }
  ensured.add(sig);
}

/* ---------- unique checks across databases ---------- */
const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
function dupError(name, keyPattern, keyValue) {
  const MongoServerError = mongoose.mongo.MongoServerError;
  return new MongoServerError({
    message: `E11000 duplicate key error collection: ${name} index: ${Object.keys(keyPattern).join("_")}_1 dup key: ${JSON.stringify(keyValue)}`,
    code: 11000, keyPattern, keyValue,
  });
}
async function assertUniqueAcross(name, docs, targetSlot, holderSlots) {
  const others = holderSlots.filter((s) => s !== targetSlot);
  if (!others.length) return;
  const specs = [{ key: { _id: 1 } }, ...(await indexSpecs(name)).filter((ix) => ix.unique && !ix.partialFilterExpression)];
  const blind = others.filter((s) => pool.isDown(s));
  if (blind.length && specs.length > 1) throw unavailable(blind[0]); // cannot prove the phone / email is free
  for (const doc of docs) {
    for (const ix of specs) {
      const fields = Object.keys(ix.key);
      if (fields.some((f) => ix.key[f] === "text" || ix.key[f] === "hashed" || f.startsWith("$"))) continue;
      const q = {};
      let skip = false;
      for (const f of fields) {
        const v = getPath(doc, f);
        if (v === undefined || (v === null && ix.sparse)) { skip = true; break; }
        q[f] = v;
      }
      if (skip) continue;
      for (const s of others.filter((x) => !pool.isDown(x))) {
        const found = await readSlot(s, name, (c) => c.findOne(q, { projection: { _id: 1 } }), null);
        if (found) throw dupError(name, ix.key, q);
      }
    }
  }
}

/* ---------- sorting / merging ---------- */
const rank = (v) => (v == null ? 0 : typeof v === "number" ? 1 : typeof v === "string" ? 2 : v instanceof Date ? 4 : typeof v === "boolean" ? 5 : 3);
function cmp(a, b) {
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return 0;
  if (ra === 4) return a.getTime() - b.getTime();
  if (ra === 3) { const x = String(a), y = String(b); return x < y ? -1 : x > y ? 1 : 0; }
  return a < b ? -1 : a > b ? 1 : 0;
}
function normSort(sort) {
  if (!sort) return null;
  if (sort instanceof Map) return [...sort.entries()];
  if (Array.isArray(sort)) return Array.isArray(sort[0]) ? sort : [sort];
  if (typeof sort === "string") return [[sort, 1]];
  return Object.entries(sort);
}
const dirOf = (d) => (d === -1 || d === "desc" || d === "descending" ? -1 : 1);
function mergeRows(lists, sort) {
  const rows = lists.flat();
  const keys = normSort(sort);
  if (keys && keys.length && !keys.some(([, d]) => typeof d === "object")) {
    rows.sort((a, b) => {
      for (const [f, d] of keys) { const c = cmp(getPath(a, f), getPath(b, f)); if (c) return c * dirOf(d); }
      return cmp(a && a._id, b && b._id);
    });
  }
  return rows;
}
/** The fields the sort needs must survive the projection until the rows are merged. */
function withSortFields(projection, sort) {
  const keys = normSort(sort);
  if (!projection || !keys || !Object.keys(projection).length) return { projection, added: [] };
  const inclusive = Object.values(projection).some((v) => v === 1 || v === true);
  if (!inclusive) return { projection, added: [] };
  const added = keys.map(([f]) => f).filter((f) => !(f in projection));
  return { projection: { ...projection, ...Object.fromEntries(added.map((f) => [f, 1])) }, added };
}
const strip = (rows, added) => { added.forEach((f) => rows.forEach((r) => { if (!f.includes(".")) delete r[f]; })); return rows; };

/* ---------- operations ---------- */
const hasSession = (o) => !!(o && o.session);
/** A transaction session belongs to database 1; other databases are used without it. */
const optsFor = (slot, o) => {
  if (!o || !o.session || slot === 0) return o;
  const { session, ...rest } = o;
  return rest;
};

async function fedFind(name, filter, options = {}) {
  const slots = orderSlots(name, filter, await holders(name));
  const { sort, skip = 0, limit = 0 } = options;
  const { projection, added } = withSortFields(options.projection || options.fields, sort);
  const base = { ...options, skip: 0, projection };
  delete base.fields;
  if (limit) base.limit = limit + skip;
  const lists = await Promise.all(slots.map((s) => readSlot(s, name, async (c) => {
    const rows = await c.find(filter, optsFor(s, base)).toArray();
    rows.forEach((r) => setHint(name, r._id, s));
    return rows;
  })));
  let rows = mergeRows(lists, sort);
  if (skip) rows = rows.slice(skip);
  if (limit) rows = rows.slice(0, limit);
  return strip(rows, added);
}

async function fedFindOne(name, filter, options = {}) {
  const slots = orderSlots(name, filter, await holders(name));
  if (options.sort || slots.length === 1) {
    const rows = await fedFind(name, filter, { ...options, limit: 1 });
    return rows[0] || null;
  }
  let blind = null;
  for (const s of slots) {
    try {
      const row = await readSlot(s, name, (c) => c.findOne(filter, optsFor(s, options)));
      if (row) { setHint(name, row._id, s); return row; }
    } catch (err) {
      if (!isUnavailable(err)) throw err;
      blind = err;
    }
  }
  if (blind) throw blind; // not found here, but a database we could not ask might have it
  return null;
}

async function insertTarget(name, options) {
  if (hasSession(options)) return 0;
  const slot = PINNED.test(name) ? 0 : pool.activeIndex();
  return slot;
}

async function fedInsert(name, docs, options, many = false) {
  const slot = await insertTarget(name, options);
  const hold = await holders(name);
  await assertUniqueAcross(name, docs, slot, hold);
  const tryOn = async (target) => {
    await ensureSlot(target, name);
    const res = await onSlot(target, name, (c) => (many ? c.insertMany(docs, options) : c.insertOne(docs[0], options)));
    noteHolder(name, target);
    docs.forEach((d) => setHint(name, d._id, target));
    return res;
  };
  try {
    return await tryOn(slot);
  } catch (err) {
    if (!isUnavailable(err) || slot === 0 || hasSession(options)) throw err;
    // The chosen database stopped answering before anything was written: use the next one that is up.
    const next = pool.usableSlots().find((i) => i !== slot);
    if (next === undefined) throw err;
    await assertUniqueAcross(name, docs, next, hold);
    return tryOn(next);
  }
}

/** An upsert must not create a second copy because a database that may hold the row could not be asked. */
async function refuseIfBlind(name) {
  const blind = await unreachableHolders(name);
  if (blind.length) {
    const err = new Error(`Database ${blind.map((i) => i + 1).join(", ")} is temporarily unavailable; cannot safely create this record yet.`);
    err.code = "DB_SLOT_UNAVAILABLE";
    throw err;
  }
}

async function fedUpdateFirst(name, filter, run, options, upsertFallback) {
  const slots = orderSlots(name, filter, await holders(name));
  let last;
  let blind = null;
  for (const s of slots) {
    try {
      last = await onSlot(s, name, (c) => run(c, { ...optsFor(s, options), upsert: false }));
    } catch (err) {
      if (!isUnavailable(err)) throw err;
      blind = err;
      continue;
    }
    if (last && (last.matchedCount > 0 || last.deletedCount > 0)) { const id = scalarId(filter); if (id != null) setHint(name, id, s); return last; }
  }
  if (blind) throw blind; // the row may live on the database that did not answer
  if (options && options.upsert && upsertFallback) {
    await refuseIfBlind(name);
    const slot = await insertTarget(name, options);
    await ensureSlot(slot, name);
    noteHolder(name, slot);
    return onSlot(slot, name, (c) => upsertFallback(c, options));
  }
  return last;
}

/** findOneAndX with a sort: pick the globally first match, then change exactly that document. */
async function fedFindOneAndSorted(name, filter, options, run) {
  const first = await fedFind(name, filter, { sort: options.sort, limit: 1, projection: { _id: 1 } });
  if (!first[0]) return null;
  const slot = hintMap(name).get(String(first[0]._id));
  const { sort, ...rest } = options;
  return onSlot(slot ?? 0, name, (c) => run(c, { _id: first[0]._id }, optsFor(slot ?? 0, rest)));
}

const sumFields = ["matchedCount", "modifiedCount", "upsertedCount", "deletedCount", "insertedCount"];
function sumResults(list) {
  const out = { acknowledged: true };
  list.filter(Boolean).forEach((r) => sumFields.forEach((f) => { if (typeof r[f] === "number") out[f] = (out[f] || 0) + r[f]; }));
  const up = list.find((r) => r && r.upsertedId);
  if (up) out.upsertedId = up.upsertedId;
  return out;
}

async function fedMany(name, options, run) {
  const slots = await holders(name);
  return sumResults(await Promise.all(slots.map((s) => onSlot(s, name, (c) => run(c, optsFor(s, options))))));
}

async function fedDistinct(name, key, filter, options) {
  const lists = await Promise.all((await holders(name)).map((s) => readSlot(s, name, (c) => c.distinct(key, filter, options), [])));
  const seen = new Map();
  lists.flat().forEach((v) => seen.set(JSON.stringify(v), v));
  return [...seen.values()];
}

/* ---------- aggregate ---------- */
function referencedCollections(pipeline, out = new Set()) {
  for (const st of pipeline || []) {
    if (st.$lookup) { if (st.$lookup.from) out.add(st.$lookup.from); referencedCollections(st.$lookup.pipeline, out); }
    if (st.$graphLookup && st.$graphLookup.from) out.add(st.$graphLookup.from);
    if (st.$unionWith) { const u = st.$unionWith; out.add(typeof u === "string" ? u : u.coll); if (u.pipeline) referencedCollections(u.pipeline, out); }
    if (st.$facet) Object.values(st.$facet).forEach((p) => referencedCollections(p, out));
  }
  return out;
}
function renameFrom(pipeline, map) {
  return (pipeline || []).map((st) => {
    const s = { ...st };
    if (s.$lookup) s.$lookup = { ...s.$lookup, from: map[s.$lookup.from] || s.$lookup.from, ...(s.$lookup.pipeline ? { pipeline: renameFrom(s.$lookup.pipeline, map) } : {}) };
    if (s.$graphLookup) s.$graphLookup = { ...s.$graphLookup, from: map[s.$graphLookup.from] || s.$graphLookup.from };
    if (s.$unionWith) s.$unionWith = typeof s.$unionWith === "string" ? map[s.$unionWith] || s.$unionWith : { ...s.$unionWith, coll: map[s.$unionWith.coll] || s.$unionWith.coll, ...(s.$unionWith.pipeline ? { pipeline: renameFrom(s.$unionWith.pipeline, map) } : {}) };
    if (s.$facet) s.$facet = Object.fromEntries(Object.entries(s.$facet).map(([k, p]) => [k, renameFrom(p, map)]));
    return s;
  });
}

async function gather(name, pipeline, options) {
  const names = [name, ...referencedCollections(pipeline)];
  const tag = `__fed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}_`;
  const map = Object.fromEntries(names.map((n) => [n, tag + n]));
  const scratchSlot = pool.activeIndex();
  await rawCol(scratchSlot, name);
  const primary = pool.connectionFor(scratchSlot).db;
  const first = pipeline[0] || {};
  let baseFilter = {};
  if (first.$match && !JSON.stringify(first.$match).match(/\$(text|where|expr)/)) baseFilter = first.$match;
  else if (first.$geoNear && first.$geoNear.query) baseFilter = first.$geoNear.query;
  try {
    for (const n of names) {
      const slots = await holders(n);
      const target = primary.collection(map[n]);
      for (const s of slots) {
        await readSlot(s, n, async (c) => {
          const cursor = c.find(n === name ? baseFilter : {}, { batchSize: 500 });
          let batch = [];
          for await (const d of cursor) {
            batch.push(d);
            if (batch.length >= 500) { await target.insertMany(batch, { ordered: false }).catch((e) => { if (e.code !== 11000 && !(e.writeErrors || []).every((w) => w.code === 11000)) throw e; }); batch = []; }
          }
          if (batch.length) await target.insertMany(batch, { ordered: false }).catch((e) => { if (e.code !== 11000 && !(e.writeErrors || []).every((w) => w.code === 11000)) throw e; });
        }, null);
      }
    }
    for (const ix of await indexSpecs(name)) {
      const { key, name: ixName, v, ns, unique, expireAfterSeconds, ...opts } = ix;
      try { await primary.collection(map[name]).createIndex(key, opts); } catch (_) { /* best effort */ }
    }
    return await primary.collection(map[name]).aggregate(renameFrom(pipeline, map), options).toArray();
  } finally {
    await Promise.all(names.map((n) => primary.collection(map[n]).drop().catch(() => {})));
  }
}

async function fedAggregate(name, pipeline, options) {
  const refs = [name, ...referencedCollections(pipeline)];
  const multi = new Set();
  for (const n of refs) { const h = await holders(n); h.forEach((s) => multi.add(s)); }
  if (multi.size <= 1) {
    const slot = [...multi][0] ?? 0;
    return onSlot(slot, name, (c) => c.aggregate(pipeline, options).toArray());
  }
  return gather(name, pipeline, options);
}

/* ---------- cursor facade (find / aggregate return cursors synchronously) ---------- */
class LazyCursor {
  constructor(loader, native) { this._loader = loader; this._native = native; this._rows = null; this._pos = 0; }
  async _load() { if (!this._rows) this._rows = await this._loader(); return this._rows; }
  async toArray() { return [...(await this._load())]; }
  async next() { const r = await this._load(); return this._pos < r.length ? r[this._pos++] : null; }
  async hasNext() { return this._pos < (await this._load()).length; }
  async forEach(fn) { for (const r of await this._load()) fn(r); }
  async close() { this._rows = []; }
  rewind() { this._pos = 0; return this; }
  async *[Symbol.asyncIterator]() { for (const r of await this._load()) yield r; }
  stream() { return require('stream').Readable.from(this[Symbol.asyncIterator]()); }
  map() { return this; }
  addCursorFlag() { return this; }
  batchSize() { return this; }
  maxTimeMS() { return this; }
  allowDiskUse() { return this; }
  hint() { return this; }
  collation() { return this; }
  comment() { return this; }
  get closed() { return false; }
}

/** Temporary collections of an aggregate that was cut short by a restart. */
async function cleanScratch() {
  for (let i = 0; i < mongoUris().length; i += 1) {
    try {
      const db = pool.connectionFor(i).db || (await pool.connectionFor(i).asPromise()).db;
      for (const c of await db.listCollections({ name: /^__fed_/ }).toArray()) {
        const t = parseInt(c.name.slice(6, c.name.indexOf("_", 6)), 36);
        if (!t || Date.now() - t > 3600e3) await db.collection(c.name).drop().catch(() => {});
      }
    } catch (_) { /* database not reachable now */ }
  }
}

/* ---------- install ---------- */
function applies(coll) {
  return installed && coll && coll.collection && !coll.buffer && coll.conn === mongoose.connection && !PINNED.test(coll.name);
}

function wrap(method, build) {
  const Native = require("mongoose/lib/drivers/node-mongodb-native/collection");
  const original = Native.prototype[method];
  orig[method] = original;
  Native.prototype[method] = function (...args) {
    if (!installed || !this.collection || this.buffer || this.conn !== mongoose.connection) return original.apply(this, args);
    return build.call(this, original, args);
  };
}

function install() {
  if (installed || !isFederated() || mongoUris().length < 2) return false;
  installed = true;
  pool.start();
  const pinnedWrite = (coll) => PINNED.test(coll.name);

  wrap("find", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const [filter = {}, options = {}] = args;
    const only = cachedHolders(this.name);
    if (only && only.length === 1 && only[0] === 0) return original.apply(this, args); // nothing overflowed yet
    return new LazyCursor(() => fedFind(this.name, filter, options));
  });
  wrap("findOne", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    return fedFindOne(this.name, args[0] || {}, args[1] || {});
  });
  const counter = (m) => wrap(m, function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const name = this.name;
    if (m === "estimatedDocumentCount") return holders(name).then((h) => Promise.all(h.map((s) => readSlot(s, name, (c) => c.estimatedDocumentCount(), 0)))).then((a) => a.reduce((x, y) => x + y, 0));
    const [filter = {}, options = {}] = args;
    return holders(name).then((h) => Promise.all(h.map((s) => readSlot(s, name, (c) => c[m](filter, (({ skip, limit, ...rest }) => rest)(options)), 0)))).then((a) => {
      let total = a.reduce((x, y) => x + y, 0);
      if (options.skip) total = Math.max(0, total - options.skip);
      return options.limit ? Math.min(total, options.limit) : total;
    });
  });
  ["countDocuments", "count", "estimatedDocumentCount"].forEach(counter);

  wrap("distinct", function (original, args) { return pinnedWrite(this) ? original.apply(this, args) : fedDistinct(this.name, args[0], args[1] || {}, args[2]); });

  wrap("insertOne", function (original, args) { return pinnedWrite(this) ? original.apply(this, args) : fedInsert(this.name, [args[0]], args[1]); });
  wrap("insertMany", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    return fedInsert(this.name, args[0], args[1], true);
  });

  wrap("updateOne", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const [filter, update, options = {}] = args;
    return fedUpdateFirst(this.name, filter, (c, o) => c.updateOne(filter, update, o), options, (c, o) => c.updateOne(filter, update, o));
  });
  wrap("replaceOne", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const [filter, doc, options = {}] = args;
    return fedUpdateFirst(this.name, filter, (c, o) => c.replaceOne(filter, doc, o), options, (c, o) => c.replaceOne(filter, doc, o));
  });
  wrap("deleteOne", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const [filter, options = {}] = args;
    return fedUpdateFirst(this.name, filter, (c, o) => c.deleteOne(filter, o), options, null);
  });
  const faOne = (m, hasUpdate) => wrap(m, function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const name = this.name;
    const filter = args[0];
    const update = hasUpdate ? args[1] : undefined;
    const options = (hasUpdate ? args[2] : args[1]) || {};
    const call = (c, f, o) => (hasUpdate ? c[m](f, update, o) : c[m](f, o));
    if (options.sort && !hasSession(options)) return fedFindOneAndSorted(name, filter, options, call).then((r) => r ?? (options.upsert && hasUpdate ? insertTarget(name, options).then(async (s) => { await ensureSlot(s, name); noteHolder(name, s); return onSlot(s, name, (c) => call(c, filter, options)); }) : r));
    return (async () => {
      const list = orderSlots(name, filter, await holders(name));
      let last = null;
      let blind = null;
      for (const s of list) {
        try {
          last = await onSlot(s, name, (c) => call(c, filter, { ...optsFor(s, options), upsert: false }));
        } catch (err) {
          if (!isUnavailable(err)) throw err;
          blind = err;
          continue;
        }
        const doc = last && last.value !== undefined ? last.value : last;
        if (doc) { setHint(name, doc._id, s); return last; }
      }
      if (blind) throw blind;
      if (options.upsert && hasUpdate) {
        await refuseIfBlind(name);
        const s = await insertTarget(name, options);
        await ensureSlot(s, name);
        noteHolder(name, s);
        return onSlot(s, name, (c) => call(c, filter, options));
      }
      return last;
    })();
  });
  faOne("findOneAndUpdate", true);
  faOne("findOneAndReplace", true);
  faOne("findOneAndDelete", false);

  wrap("updateMany", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const [filter, update, options = {}] = args;
    return fedMany(this.name, options, (c, o) => c.updateMany(filter, update, { ...o, upsert: false })).then(async (r) => {
      if (options.upsert && !r.matchedCount) { const s = await insertTarget(this.name, options); await ensureSlot(s, this.name); noteHolder(this.name, s); return onSlot(s, this.name, (c) => c.updateMany(filter, update, options)); }
      return r;
    });
  });
  wrap("deleteMany", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const [filter = {}, options = {}] = args;
    return fedMany(this.name, options, (c, o) => c.deleteMany(filter, o));
  });

  wrap("bulkWrite", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const [ops, options = {}] = args;
    const coll = this;
    return (async () => {
      const results = [];
      for (const op of ops) {
        const [kind] = Object.keys(op);
        const o = op[kind];
        if (kind === "insertOne") results.push({ insertedCount: 1, ...(await fedInsert(coll.name, [o.document], options)) });
        else if (kind === "updateOne") results.push(await fedUpdateFirst(coll.name, o.filter, (c, x) => c.updateOne(o.filter, o.update, { ...x, ...(o.arrayFilters ? { arrayFilters: o.arrayFilters } : {}) }), { ...options, upsert: o.upsert }, (c, x) => c.updateOne(o.filter, o.update, { ...x, upsert: true })));
        else if (kind === "replaceOne") results.push(await fedUpdateFirst(coll.name, o.filter, (c, x) => c.replaceOne(o.filter, o.replacement, x), { ...options, upsert: o.upsert }, (c, x) => c.replaceOne(o.filter, o.replacement, { ...x, upsert: true })));
        else if (kind === "deleteOne") results.push(await fedUpdateFirst(coll.name, o.filter, (c, x) => c.deleteOne(o.filter, x), options, null));
        else if (kind === "updateMany") results.push(await fedMany(coll.name, options, (c, x) => c.updateMany(o.filter, o.update, x)));
        else if (kind === "deleteMany") results.push(await fedMany(coll.name, options, (c, x) => c.deleteMany(o.filter, x)));
        else throw new Error(`bulkWrite op ${kind} is not supported with several databases`);
      }
      const total = sumResults(results);
      return { ...total, insertedCount: total.insertedCount || 0, matchedCount: total.matchedCount || 0, modifiedCount: total.modifiedCount || 0, deletedCount: total.deletedCount || 0, upsertedCount: total.upsertedCount || 0, upsertedIds: {}, insertedIds: {}, isOk: () => true, ok: 1, result: { ok: 1 } };
    })();
  });

  wrap("aggregate", function (original, args) {
    if (pinnedWrite(this)) return original.apply(this, args);
    const [pipeline = [], options = {}] = args;
    if (hasSession(options)) return original.apply(this, args);
    const only = cachedHolders(this.name);
    if (only && only.length === 1 && only[0] === 0 && !referencedCollections(pipeline).size) return original.apply(this, args);
    return new LazyCursor(() => fedAggregate(this.name, pipeline, options));
  });

  cleanScratch().catch(() => {});
  console.log(`Federation on: ${mongoUris().length} databases act as one.`);
  return true;
}

module.exports = { install, _internal: { cmp, mergeRows, holders } };
