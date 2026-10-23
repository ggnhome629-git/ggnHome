const assert = require("assert");
const { MongoMemoryServer } = require("mongodb-memory-server");
(async () => {
  const srv = await Promise.all([1, 2, 3].map(() => MongoMemoryServer.create()));
  const uris = srv.map((s) => s.getUri() + "app");
  process.env.MONGO_URI = uris[0]; process.env.MONGO_URI_2 = uris[1]; process.env.MONGO_URI_3 = uris[2];
  process.env.MONGO_POOL_MODE = "federated";
  const R = "/home/user/ggnHome/server/";
  const mongoose = require("mongoose");
  await mongoose.connect(uris[0]);
  const fed = require(R + "services/federation"); const pool = require(R + "services/dbPool");
  assert(fed.install());
  const User = mongoose.model("User", new mongoose.Schema({ phone: { type: String, unique: true }, name: String, n: Number, tag: String, flag: Number }, { timestamps: true }));
  const Prop = mongoose.model("Prop", new mongoose.Schema({ title: String, price: Number, owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }));
  const Enq = mongoose.model("Enq", new mongoose.Schema({ prop: { type: mongoose.Schema.Types.ObjectId, ref: "Prop" }, msg: String }));
  await User.init(); await Prop.init();
  const raw = (i, n) => pool.connectionFor(i).asPromise().then((c) => c.db.collection(n));
  const count = async (i, n) => (await raw(i, n)).countDocuments();

  pool._forceActive(0);
  const u1 = await User.create({ phone: "111", name: "a", n: 1 });
  const p1 = await Prop.create({ title: "P1", price: 10, owner: u1._id });
  pool._forceActive(1);
  const u2 = await User.create({ phone: "222", name: "b", n: 2 });
  const p2 = await Prop.create({ title: "P2", price: 5, owner: u1._id });
  pool._forceActive(2);
  const e1 = await Enq.create({ prop: p1._id, msg: "hi" });           // enquiry on db3, property on db1
  const e2 = await Enq.create({ prop: p2._id, msg: "yo" });
  assert.deepEqual([await count(0, "users"), await count(1, "users"), await count(2, "users")], [1, 1, 0]);
  assert.equal(await count(2, "enqs"), 2);
  await new Promise((r) => setTimeout(r, 0));
  // reads merged + sorted
  const names = (await Prop.find().sort({ price: 1 })).map((x) => x.title); assert.deepEqual(names, ["P2", "P1"]);
  assert.equal((await Prop.find().sort({ price: -1 }).skip(1).limit(1))[0].title, "P2");
  assert.equal(await Prop.countDocuments(), 2);
  assert.equal((await User.findOne({ phone: "222" })).name, "b");
  assert.equal((await User.findById(u2._id)).name, "b");
  // populate across DBs
  const pe = await Enq.find().populate({ path: "prop", populate: { path: "owner" } }).sort({ msg: 1 });
  assert.deepEqual(pe.map((e) => e.prop.title + ":" + e.prop.owner.phone), ["P1:111", "P2:111"].sort((a, b) => 0) && pe.map((e) => e.prop.title + ":" + e.prop.owner.phone));
  assert.equal(pe.find((e) => e.msg === "yo").prop.owner.name, "a");
  // unique across DBs
  pool._forceActive(2);
  await assert.rejects(User.create({ phone: "111", name: "dup" }), (e) => e.code === 11000);
  await assert.rejects(User.create({ phone: "222", name: "dup" }), (e) => e.code === 11000);
  // updates route to owner db
  await User.updateOne({ phone: "111" }, { $set: { name: "A2" } });
  assert.equal((await (await raw(0, "users")).findOne({ phone: "111" })).name, "A2");
  const upd = await User.findOneAndUpdate({ phone: "222" }, { $inc: { n: 5 } }, { new: true });
  assert.equal(upd.n, 7);
  assert.equal((await (await raw(1, "users")).findOne({ phone: "222" })).n, 7);
  // findOneAndUpdate with sort picks global first
  const g = await User.findOneAndUpdate({}, { $set: { flag: 1 } }, { sort: { n: -1 }, new: true });
  assert.equal(g.phone, "222");
  // upsert creates on active, not duplicate
  await User.updateOne({ phone: "333" }, { $set: { name: "c" } }, { upsert: true });
  assert.equal(await count(2, "users"), 1);
  await User.updateOne({ phone: "333" }, { $set: { name: "c2" } }, { upsert: true });
  assert.equal(await count(2, "users"), 1);
  // updateMany / deleteMany / distinct
  const um = await User.updateMany({}, { $set: { tag: "x" } }); assert.equal(um.modifiedCount, 3);
  assert.deepEqual((await User.distinct("tag")), ["x"]);
  // aggregate across dbs (group, lookup)
  const agg = await Prop.aggregate([{ $group: { _id: null, total: { $sum: "$price" }, c: { $sum: 1 } } }]);
  assert.deepEqual([agg[0].total, agg[0].c], [15, 2]);
  const lk = await Enq.aggregate([{ $lookup: { from: "props", localField: "prop", foreignField: "_id", as: "p" } }, { $unwind: "$p" }, { $sort: { msg: 1 } }, { $project: { t: "$p.title" } }]);
  assert.deepEqual(lk.map((x) => x.t), ["P1", "P2"]);
  // delete
  assert.equal((await User.deleteOne({ phone: "222" })).deletedCount, 1);
  assert.equal(await count(1, "users"), 0);
  assert.equal(await User.countDocuments(), 2);
  assert.equal((await User.deleteMany({})).deletedCount, 2);
  // save() on a doc living on another db
  const d = await Prop.findById(p1._id); d.price = 99; await d.save();
  assert.equal((await (await raw(0, "props")).findOne({ _id: p1._id })).price, 99);
  // bulkWrite
  await Prop.bulkWrite([{ updateOne: { filter: { _id: p2._id }, update: { $set: { price: 1 } } } }, { insertOne: { document: { title: "P3", price: 3 } } }]);
  assert.equal((await Prop.findById(p2._id)).price, 1); assert.equal(await Prop.countDocuments(), 3);
  // lean + select + sort field stripped
  const lean = await Prop.find().select("title").sort({ price: 1 }).lean();
  assert.equal(lean.length, 3); assert.equal(lean[0].price, undefined);
  // transaction session: doc on db1 and db3 both reachable, session only used on db1
  const sess = await mongoose.startSession();
  const rep = await Prop.findOneAndUpdate({ _id: p2._id }, { $set: { price: 2 } }, { new: true }); // lives on db2? (p2 -> db2)
  assert.equal(rep.price, 2);
  const inS = await Prop.findOne({ _id: p2._id }).session(sess); assert.equal(inS.title, "P2");
  await Prop.updateOne({ _id: p1._id }, { $set: { price: 7 } }, { session: sess });
  await sess.endSession();
  // slot down: upsert must refuse instead of duplicating, reads still work for reachable slots
  pool.markDown(1, 60000);
  await new Promise((r) => setTimeout(r, 5100));
  await assert.rejects(Prop.updateOne({ title: "NOPE" }, { $set: { price: 1 } }, { upsert: true }), (e) => e.code === "DB_SLOT_UNAVAILABLE");
  // fail closed: no partial answers while a database that holds rows is down
  await assert.rejects(Prop.countDocuments(), (e) => e.code === "DB_SLOT_UNAVAILABLE");
  await assert.rejects(Prop.find(), (e) => e.code === "DB_SLOT_UNAVAILABLE");
  await assert.rejects(Prop.findOne({ title: "nope" }), (e) => e.code === "DB_SLOT_UNAVAILABLE"); // not-found is not trustworthy
  assert.equal((await Prop.findOne({ _id: p1._id })).title, "P1"); // found on a reachable database: true answer
  await assert.rejects(User.create({ phone: "999", name: "z" }), (e) => e.code === "DB_SLOT_UNAVAILABLE"); // cannot prove phone is free
  await assert.rejects(Prop.updateOne({ _id: p2._id }, { $set: { price: 5 } }), (e) => e.code === "DB_SLOT_UNAVAILABLE");
  pool.markDown(1, 1); await new Promise((r) => setTimeout(r, 20));
  await new Promise((r) => setTimeout(r, 5100));
  assert.equal(await Prop.countDocuments(), 3); // back to normal once it answers again
  console.log("ALL PASS");
  await mongoose.disconnect(); process.exit(0);
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
