/**
 * Merge the data of the extra databases into one bigger database (for example after you move to a
 * paid plan and no longer need several free accounts).
 *
 * Safe by design:
 *   - Dry run unless you pass --apply (it only prints what it would copy).
 *   - Never overwrites: a document is added only if its _id is not in the target yet, so it is
 *     safe to run again and to resume after a stop.
 *   - Source databases are not changed unless you pass --delete-source. Then, before anything is
 *     removed, a backup file of those documents is written (merge-backup-<time>/), and only
 *     documents whose target copy is IDENTICAL (compared field by field) are removed. A document
 *     with the same _id but different content in the target is kept in the source and reported.
 *   - Documents that clash with a unique index in the target (same phone / email in two databases)
 *     are not copied; they are listed in the report so you can decide what to do.
 *
 * Usage (from server/), with the URIs in the environment as for the app:
 *   node scripts/mergeDatabases.js --from 2,3 --to 1                 # dry run: copy databases 2 and 3 into 1
 *   node scripts/mergeDatabases.js --from 2,3 --to 1 --apply         # really copy
 *   node scripts/mergeDatabases.js --from 2,3 --to 1 --apply --delete-source   # copy, verify, then empty 2 and 3
 *   NEW_MONGO_URI=mongodb+srv://... node scripts/mergeDatabases.js --from 1,2,3 --to-uri --apply
 *                                                                    # copy everything into a brand-new paid database
 *
 * Numbers are the slots: 1 = MONGO_URI, 2 = MONGO_URI_2, and so on.
 *
 * After a merge: remove the merged MONGO_URI_n values (or set MONGO_URI to the new database) and
 * restart. Stop the app (or put it in maintenance) while you run it so no new data arrives mid-copy.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { MongoClient, BSON } = require("mongodb");
const { EJSON } = BSON;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const APPLY = flag("--apply");
const DELETE_SOURCE = flag("--delete-source");
const BATCH = Number(val("--batch")) || 1000;
const BACKUP_DIR = val("--backup-dir") || path.join(process.cwd(), `merge-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const same = (a, b) => EJSON.stringify(a, { relaxed: false }) === EJSON.stringify(b, { relaxed: false });

const uriFor = (slot) => {
  const key = Number(slot) === 1 ? "MONGO_URI" : `MONGO_URI_${slot}`;
  const uri = process.env[key];
  if (!uri) throw new Error(`${key} is not set.`);
  return uri.trim();
};
const mask = (t) => String(t).replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]*@/gi, "$1***@");
const skipName = (n) => n.startsWith("system.") || n.startsWith("__fed_");

async function copyIndexes(src, dst) {
  const specs = (await src.indexes().catch(() => [])).filter((i) => i.name !== "_id_");
  for (const { key, name, v, ns, ...opts } of specs) {
    try { await dst.createIndex(key, { name, ...opts }); } catch (e) { console.warn(`    index ${name}: ${e.message}`); }
  }
}

async function copyCollection(srcDb, dstDb, name, report) {
  const src = srcDb.collection(name);
  const dst = dstDb.collection(name);
  const total = await src.estimatedDocumentCount();
  if (!total) return;
  if (!APPLY) { console.log(`  ${name}: ${total} documents would be copied`); report.would += total; return; }

  await copyIndexes(src, dst);
  let copied = 0, existed = 0, clashes = 0, verified = 0, deleted = 0, conflicts = 0;
  let backup = null;
  if (DELETE_SOURCE) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    backup = fs.createWriteStream(path.join(BACKUP_DIR, `${srcDb.databaseName}.${name}.ndjson`), { flags: "a" });
  }
  const cursor = src.find({}, { batchSize: BATCH });
  let batch = [];
  const flush = async () => {
    if (!batch.length) return;
    const ids = batch.map((d) => d._id);
    const ops = batch.map((d) => ({ updateOne: { filter: { _id: d._id }, update: { $setOnInsert: d }, upsert: true } }));
    try {
      const r = await dst.bulkWrite(ops, { ordered: false });
      copied += r.upsertedCount; existed += r.matchedCount;
    } catch (e) {
      const errs = e.writeErrors || [];
      if (!errs.length || errs.some((w) => w.code !== 11000)) throw e;
      copied += (e.result?.upsertedCount ?? e.result?.nUpserted ?? 0);
      clashes += errs.length;
      errs.forEach((w) => report.clashes.push({ collection: name, _id: String(batch[w.index]?._id), detail: String(w.errmsg || "").slice(0, 160) }));
    }
    // Verify field by field: the same _id with different content is NOT a safe copy.
    const inTarget = new Map((await dst.find({ _id: { $in: ids } }).toArray()).map((d) => [String(d._id), d]));
    const ok = [];
    for (const d of batch) {
      const t = inTarget.get(String(d._id));
      if (t && same(d, t)) ok.push(d);
      else if (t) { conflicts += 1; report.conflicts.push({ collection: name, _id: String(d._id) }); }
    }
    verified += ok.length;
    if (DELETE_SOURCE && ok.length) {
      await new Promise((res, rej) => backup.write(ok.map((d) => EJSON.stringify(d, { relaxed: false })).join("\n") + "\n", (e) => (e ? rej(e) : res())));
      deleted += (await src.deleteMany({ _id: { $in: ok.map((d) => d._id) } })).deletedCount;
    }
    batch = [];
  };
  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  if (backup) await new Promise((res) => backup.end(res));
  console.log(`  ${name}: ${total} read, ${copied} copied, ${existed} already there, ${clashes} unique clashes, ${conflicts} differ, ${verified} verified${DELETE_SOURCE ? `, ${deleted} removed from source` : ""}`);
  report.copied += copied; report.verified += verified;
}

async function main() {
  const from = (val("--from") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!from.length) throw new Error("Pass --from with the database numbers to merge, for example --from 2,3");
  let targetUri, targetLabel;
  if (flag("--to-uri")) {
    targetUri = process.env.NEW_MONGO_URI;
    if (!targetUri) throw new Error("NEW_MONGO_URI is not set.");
    targetLabel = "NEW_MONGO_URI";
  } else {
    const to = val("--to") || "1";
    if (from.includes(to)) throw new Error("The target database cannot also be a source.");
    targetUri = uriFor(to);
    targetLabel = `database ${to}`;
  }
  console.log(`${APPLY ? "APPLY" : "DRY RUN"}: merging database(s) ${from.join(", ")} into ${targetLabel}${DELETE_SOURCE ? " and removing verified documents from the sources" : ""}`);
  if (DELETE_SOURCE && !APPLY) throw new Error("--delete-source needs --apply.");

  const dstClient = await new MongoClient(targetUri).connect();
  const dstDb = dstClient.db();
  const report = { would: 0, copied: 0, verified: 0, clashes: [], conflicts: [] };
  try {
    for (const slot of from) {
      const srcClient = await new MongoClient(uriFor(slot)).connect();
      const srcDb = srcClient.db();
      if (srcDb.databaseName === dstDb.databaseName && uriFor(slot) === targetUri) throw new Error(`Database ${slot} is the same as the target.`);
      console.log(`Database ${slot} (${mask(srcDb.databaseName)}):`);
      try {
        for (const { name } of await srcDb.listCollections({}, { nameOnly: true }).toArray()) {
          if (!skipName(name)) await copyCollection(srcDb, dstDb, name, report);
        }
      } finally {
        await srcClient.close();
      }
    }
  } finally {
    await dstClient.close();
  }
  if (!APPLY) console.log(`\nDry run done: ${report.would} documents would be copied. Add --apply to do it.`);
  else {
    console.log(`\nDone: ${report.copied} copied, ${report.verified} verified in the target.`);
    if (report.clashes.length) {
      console.log(`${report.clashes.length} documents were NOT copied because of unique-index clashes (first 20):`);
      report.clashes.slice(0, 20).forEach((c) => console.log(`  ${c.collection} ${c._id} ${c.detail}`));
      process.exitCode = 2;
    }
    if (report.conflicts.length) {
      console.log(`${report.conflicts.length} documents already exist in the target with DIFFERENT content; they were kept in the source (first 20):`);
      report.conflicts.slice(0, 20).forEach((c) => console.log(`  ${c.collection} ${c._id}`));
      process.exitCode = 2;
    }
    if (DELETE_SOURCE) console.log(`Backup of everything removed from the sources: ${BACKUP_DIR}`);
    console.log("Next: remove the merged MONGO_URI_n values (or point MONGO_URI at the new database), then restart the app.");
  }
}

main().catch((e) => { console.error("Merge failed:", mask(e.message)); process.exit(1); });
