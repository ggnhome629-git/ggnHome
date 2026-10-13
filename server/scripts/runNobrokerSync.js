// Manual one-off NoBroker sync: `npm run sync:nobroker`
require("dotenv").config();
const mongoose = require("mongoose");
const { syncNoBrokerListings } = require("./nobrokerSync");

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 2, minPoolSize: 0, maxConnecting: 1, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 });
  const summary = await syncNoBrokerListings();
  console.log("[nobrokerSync] finished:", JSON.stringify(summary));
  await mongoose.disconnect();
})().catch((err) => {
  console.error("[nobrokerSync] run failed:", err);
  process.exit(1);
});
