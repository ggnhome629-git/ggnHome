const mongoose = require("mongoose");
const RentalProperty = mongoose.models.RentalProperty || require("../models/RentalProperty.model");
const SaleProperty = mongoose.models.SaleProperty || require("../models/SaleProperty.model");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Shape a Rental/Sale document into the flat row the Property Manager page renders.
const toRow = (doc, kind) => {
  const p = doc.toObject ? doc.toObject() : doc;
  const config = p.totalArea?.configuration;
  return {
    _id: p._id,
    title: p.title,
    price: kind === "rent" ? p.monthlyRent : p.price,
    location: p.Sector || p.location || p.address || "",
    bhk: config || (p.bedrooms ? `${p.bedrooms} BHK` : ""),
    area: p.totalArea?.sqft ?? "",
    bath: p.bathrooms,
    source: p.source || "Own",
    status: p.status || "ACTIVE",
    isActive: !!p.isActive,
    listingType: kind,
    createdAt: p.createdAt,
  };
};

/**
 * GET /api/admin/properties?page&limit&search&source&status
 * Lists rental + sale properties together, newest first.
 */
const listAdminProperties = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const { search, source, status } = req.query;

    const filter = {};
    if (source) filter.source = String(source);
    if (status) filter.status = String(status);
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: rx }, { Sector: rx }, { address: rx }];
    }

    // Each collection is queried up to page*limit rows, then merged and sliced.
    const window = page * limit;
    const [rent, sale, rentTotal, saleTotal] = await Promise.all([
      RentalProperty.find(filter).sort({ createdAt: -1 }).limit(window),
      SaleProperty.find(filter).sort({ createdAt: -1 }).limit(window),
      RentalProperty.countDocuments(filter),
      SaleProperty.countDocuments(filter),
    ]);

    const rows = [...rent.map((d) => toRow(d, "rent")), ...sale.map((d) => toRow(d, "sale"))]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice((page - 1) * limit, page * limit);

    res.json({ success: true, data: rows, meta: { total: rentTotal + saleTotal, page, limit } });
  } catch (err) {
    console.error("listAdminProperties error:", err);
    res.status(500).json({ success: false, message: "Failed to load properties" });
  }
};

module.exports = { listAdminProperties };
