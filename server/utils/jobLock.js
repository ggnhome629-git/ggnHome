const os = require("os");
const crypto = require("crypto");
const JobLock = require("../models/JobLock.model");

// Who is asking: unique per running process, readable in the database.
const OWNER = `${os.hostname()}:${process.pid}:${crypto.randomBytes(3).toString("hex")}`;

/**
 * Runs `fn` on ONE server only, once per slot. Every server fires its own schedule at the same moment; the
 * first to claim the lock runs the job, the others skip it.
 *
 * holdMs is how long the slot stays claimed (even after the job ends). Use a little less than the schedule's
 * period: ~20 h for a daily job, ~4 min for a 5-minute job. It also covers a server that dies mid-job: the
 * slot frees itself when holdMs passes.
 *
 * Returns { ran: true, result } or { ran: false } when another server has the slot. A failure in `fn` is
 * recorded and rethrown to the caller (the schedulers log it); the slot is not released early, so a failing
 * job does not hammer the database from every server.
 */
let indexReady = null;
async function runOnce(name, holdMs, fn) {
  // The lock depends on the unique index on `key`. On a brand-new database it may not exist yet when several
  // servers start together, so wait for it before claiming anything.
  if (!indexReady) indexReady = JobLock.init().catch((err) => { indexReady = null; throw err; });
  await indexReady;
  const now = new Date();
  try {
    await JobLock.findOneAndUpdate(
      { key: name, $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }] },
      { $set: { lockedUntil: new Date(now.getTime() + holdMs), owner: OWNER, lastStartedAt: now, lastError: "" } },
      { upsert: true, new: true }
    );
  } catch (err) {
    // The filter did not match (someone holds the lock), so the upsert tried to insert a second document.
    if (err && err.code === 11000) return { ran: false };
    throw err;
  }

  try {
    const result = await fn();
    await JobLock.updateOne({ key: name, owner: OWNER }, { $set: { lastFinishedAt: new Date() } }).catch(() => {});
    return { ran: true, result };
  } catch (err) {
    await JobLock.updateOne({ key: name, owner: OWNER }, { $set: { lastError: String(err && err.message).slice(0, 300) } }).catch(() => {});
    throw err;
  }
}

module.exports = { runOnce, OWNER };
