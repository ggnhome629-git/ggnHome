const mongoose = require("mongoose");

async function allocatePartnerCode() {
  const counters = mongoose.connection.collection("counters");
  const result = await counters.findOneAndUpdate(
    { _id: "agentCode" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = result?.value?.seq ?? result?.seq;
  if (!Number.isInteger(seq) || seq < 1) throw new Error("Could not allocate a partner code");
  return `ggnhome-${String(seq).padStart(4, "0")}`;
}

module.exports = { allocatePartnerCode };
