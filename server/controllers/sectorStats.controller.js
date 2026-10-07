const SectorStats = require("../models/SectorStats.model");
const RentalProperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");
const Visit = require("../models/Visit.model");
const User = require("../models/user.model");

function jsonError(res, status, message) {
  return res.status(status).json({ code: status >= 500 ? "SERVER_ERROR" : "ERROR", message });
}

// GET /api/price-trends — Series for a sector/type (SectorStats documents)
exports.getTrends = async (req, res) => {
  try {
    const { sector, type } = req.query;
    let filter = {};
    if (sector) filter.sector = sector;
    if (type) filter.type = type;
    const stats = await SectorStats.find(filter).sort({ sector: 1, type: 1, updatedAt: -1 });
    return res.json({ success: true, stats });
  } catch (err) {
    jsonError(res, 500, "Failed to load trends");
  }
};

// GET /api/sector-stats
exports.getStats = async (req, res) => {
  try {
    const { sector, type } = req.query;
    let filter = {};
    if (sector) filter.sector = sector;
    if (type) filter.type = type;
    const stats = await SectorStats.find(filter).sort({ sector: 1, type: 1 });
    return res.json({ success: true, stats });
  } catch (err) {
    jsonError(res, 500, "Failed to load stats");
  }
};

// POST /api/admin/sector-stats/seed — compute SectorStats once
exports.seed = async (req, res) => {
  try {
    if (String(req.user.role) !== "admin") return jsonError(res, 403, "Admins only");
    const bulk = [];
    const combine = async (Model, field, valueField) => {
      const docs = await Model.find({ isActive: true }).select(field || "Sector monthlyRent type price");
      const map = new Map();
      for (const d of docs) {
        const key = `${d.Sector || d.sector || "unknown"}|${d.defaultpropertytype || d.type || "rental"}`;
        if (!map.has(key)) map.set(key, { sector: d.Sector || d.sector || "unknown", type: d.defaultpropertytype || d.type || "rental", total: 0, count: 0 });
        const v = map.get(key);
        v.total += Number(d.monthlyRent || d.price || 0);
        v.count += 1;
      }
      return map;
    };
    const [rent, sale] = await Promise.all([combine(RentalProperty), combine(SaleProperty)]);
    for (const [key, v] of rent) {
      const [sector, type] = key.split("|");
      if (v.count === 0) continue;
      const [avg, p75] = [v.total / v.count, 0];
      bulk.push({
        updateOne: {
          filter: { sector, type },
          update: {
            sector,
            type,
            avgPrice: avg,
            avgRent: avg,
            pricePerSqft: 0,
            count: v.count,
            p25: 0,
            p75,
            updatedAt: new Date(),
          },
        },
      });
    }
    for (const [key, v] of sale) {
      const [sector, type] = key.split("|");
      if (v.count === 0) continue;
      bulk.push({
        updateOne: {
          filter: { sector, type },
          update: {
            sector,
            type,
            avgPrice: v.total / v.count,
            avgRent: 0,
            pricePerSqft: 0,
            count: v.count,
            p25: 0,
            p75: v.total / v.count,
            updatedAt: new Date(),
          },
        },
      });
    }
    await SectorStats.bulkWrite(bulk, { ordered: false });
    return res.json({ success: true, count: bulk.length });
  } catch (err) {
    jsonError(res, 500, "Failed to seed sector stats");
  }
};
