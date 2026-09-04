require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { syncNoBrokerListings } = require("./nobrokerSync");

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();
  console.log(dryRun ? "Running NoBroker sync (dry run, no writes)..." : "Running NoBroker sync...");

  const summary = await syncNoBrokerListings({ dryRun });
  console.log(JSON.stringify(summary, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
