const assert = require("assert");
const { MongoMemoryServer } = require("mongodb-memory-server");
(async () => {
  const srv = await Promise.all([1, 2, 3].map(() => MongoMemoryServer.create()));
  const uris = srv.map((s) => s.getUri() + "app");
  Object.assign(process.env, { MONGO_URI: uris[0], MONGO_URI_2: uris[1], MONGO_URI_3: uris[2], MONGO_POOL_MODE: "federated" });
  const R = "/home/user/ggnHome/server/";
  const mongoose = require("mongoose"); await mongoose.connect(uris[0]);
  const fed = require(R + "services/federation"); const pool = require(R + "services/dbPool"); fed.install();
  const Item = mongoose.model("Item", new mongoose.Schema({ k: String })); await Item.init();
  pool._forceActive(2); const a = await Item.create({ k: "on3" });
  assert.equal(await Item.countDocuments(), 1);
  await srv[2].stop();                                   // real outage of database 3
  await new Promise((r) => setTimeout(r, 5100));
  const t = Date.now();
  await assert.rejects(Item.find(), (e) => e.code === "DB_SLOT_UNAVAILABLE");
  console.log("read failed closed in", Date.now() - t, "ms");
  const b = await Item.create({ k: "after" });           // active slot is down -> goes to a working database
  assert.ok(b._id);
  assert.ok(await Item.findOne({ _id: b._id }));
  console.log("insert survived outage");
  process.exit(0);
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
