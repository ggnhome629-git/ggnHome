const mongoose = require("mongoose");
const pool = require("../services/dbPool");

/**
 * A log-style collection that spills into the next database once the current one is full.
 * create() writes to the active database; find() reads from every database and merges the rows,
 * so nothing disappears when the active database changes. With a single MONGO_URI it is plain mongoose.
 */
module.exports = function overflowModel(name, schema) {
  const base = mongoose.model(name, schema);
  const perConn = new Map();
  const on = (conn) => {
    if (conn === mongoose.connection) return base;
    if (!perConn.has(conn)) perConn.set(conn, conn.model(name, schema));
    return perConn.get(conn);
  };
  const safe = async (fn) => { try { return await fn(); } catch (_) { return null; } };

  base.createOverflow = (doc) => on(pool.activeConnection()).create(doc);
  base.findAll = async (filter = {}, { select, sort, limit } = {}) => {
    const lists = await Promise.all(
      pool.allConnections().map((c) => safe(() => {
        let q = on(c).find(filter);
        if (select) q = q.select(select);
        if (sort) q = q.sort(sort);
        if (limit) q = q.limit(limit);
        return q.lean();
      }))
    );
    let rows = lists.filter(Boolean).flat();
    if (sort && Object.keys(sort).length === 1) {
      const [k, d] = Object.entries(sort)[0];
      rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (d < 0 ? -1 : 1));
    }
    return limit ? rows.slice(0, limit) : rows;
  };
  return base;
};
