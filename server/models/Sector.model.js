// models/Sector.model.js
const mongoose = require("mongoose");

const SectorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  city: { type: String, default: "Gurgaon" }, // optional, can be extended
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Sector", SectorSchema);