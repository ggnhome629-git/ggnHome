/**
 * Fixes "E11000 duplicate key ... index: email_1 dup key: { email: null }" on /login/request-otp.
 *
 * Cause: users.email has a UNIQUE index that is not sparse/partial, so every account
 * without an email (mobile-only signups) counts as the same value, null. The second
 * such signup fails.
 *
 * Fix: keep email unique, but only for accounts that actually have an email string.
 *
 * Usage (from server/):
 *   node scripts/fixUserEmailIndex.js            # read-only report
 *   node scripts/fixUserEmailIndex.js --apply    # drop + recreate the email index
 */
require("dotenv").config();
const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");
const PARTIAL = { email: { $type: "string" } };

const isEmailIndex = (idx) => Object.keys(idx.key).length === 1 && idx.key.email === 1;
const isFixed = (idx) => idx.unique && idx.partialFilterExpression && idx.partialFilterExpression.email;

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set.");
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.db.collection("users");
  console.log(`Connected to database "${mongoose.connection.name}"`);

  const emailIndexes = (await users.indexes()).filter(isEmailIndex);
  console.log("Email indexes:", JSON.stringify(emailIndexes.map(({ name, unique, sparse, partialFilterExpression }) => ({ name, unique: !!unique, sparse: !!sparse, partialFilterExpression: partialFilterExpression || null }))));

  const noEmail = await users.countDocuments({ $or: [{ email: null }, { email: { $exists: false } }] });
  const duplicates = await users
    .aggregate([
      { $match: { email: { $type: "string" } } },
      { $group: { _id: "$email", n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
      { $limit: 20 },
    ])
    .toArray();
  console.log(`Users with no email: ${noEmail}`);
  console.log(`Emails used by more than one user: ${duplicates.length}${duplicates.length ? " -> " + JSON.stringify(duplicates) : ""}`);

  const broken = emailIndexes.filter((idx) => idx.unique && !isFixed(idx));
  if (broken.length === 0) {
    console.log("Nothing to fix: no unique email index that blocks accounts without an email.");
    return;
  }
  if (!APPLY) {
    console.log(`\nDry run. Problem index: ${broken.map((b) => b.name).join(", ")}. Re-run with --apply to fix.`);
    return;
  }
  if (duplicates.length) {
    throw new Error("Refusing to apply: some real emails are shared by several users. Resolve those first.");
  }

  for (const idx of broken) {
    console.log(`Dropping index ${idx.name} ...`);
    await users.dropIndex(idx.name);
  }
  console.log("Creating unique index on email for accounts that have an email ...");
  await users.createIndex({ email: 1 }, { name: "email_1", unique: true, partialFilterExpression: PARTIAL });
  console.log("Done. Accounts without an email no longer collide.");
}

main()
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
