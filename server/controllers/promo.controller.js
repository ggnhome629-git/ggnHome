const Promo = require("../models/Promo.model");

const EDITABLE = [
  "overline",
  "title",
  "text",
  "ctaLabel",
  "link",
  "theme",
  "icon",
  "imageUrl",
  "placements",
  "audience",
  "weight",
  "isActive",
  "startsAt",
  "endsAt",
];

// Only site paths or http(s) URLs — never javascript: or data: links.
const safeLink = (link) => {
  const v = String(link || "").trim();
  if (!v) return "/";
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "/";
  } catch (e) {
    return "/";
  }
};

const safeImage = (url) => {
  const v = String(url || "").trim();
  if (!v) return "";
  try {
    return new URL(v).protocol === "https:" ? v : "";
  } catch (e) {
    return "";
  }
};

const pick = (body) => {
  const out = {};
  EDITABLE.forEach((k) => {
    if (body[k] !== undefined) out[k] = body[k];
  });
  if (out.link !== undefined) out.link = safeLink(out.link);
  if (out.imageUrl !== undefined) out.imageUrl = safeImage(out.imageUrl);
  ["startsAt", "endsAt"].forEach((k) => {
    if (out[k] === "" || out[k] === null) out[k] = undefined;
  });
  return out;
};

// GET /api/promos?placement=search&type=rent — public, live promos only.
exports.getActivePromos = async (req, res) => {
  try {
    const placement = ["dashboard", "search", "banner"].includes(req.query.placement) ? req.query.placement : "dashboard";
    const type = ["rent", "sale"].includes(req.query.type) ? req.query.type : null;
    const now = new Date();
    const promos = await Promo.find({
      isActive: true,
      placements: placement,
      ...(type ? { audience: { $in: ["all", type] } } : {}),
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .select("-createdBy -__v")
      .limit(30)
      .lean();
    res.set("Cache-Control", "public, max-age=60");
    res.status(200).json(promos);
  } catch (err) {
    res.status(500).json({ message: "Error fetching promos" });
  }
};

exports.listPromosAdmin = async (req, res) => {
  try {
    const promos = await Promo.find().sort({ updatedAt: -1 }).lean();
    res.status(200).json(promos);
  } catch (err) {
    res.status(500).json({ message: "Error fetching promos" });
  }
};

exports.createPromo = async (req, res) => {
  try {
    const promo = await Promo.create({ ...pick(req.body || {}), createdBy: req.user?._id });
    res.status(201).json(promo);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not create promo" });
  }
};

exports.updatePromo = async (req, res) => {
  try {
    const promo = await Promo.findByIdAndUpdate(req.params.id, pick(req.body || {}), {
      new: true,
      runValidators: true,
    });
    if (!promo) return res.status(404).json({ message: "Promo not found" });
    res.status(200).json(promo);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not update promo" });
  }
};

exports.deletePromo = async (req, res) => {
  try {
    const promo = await Promo.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: "Promo not found" });
    res.status(200).json({ message: "Promo deleted" });
  } catch (err) {
    res.status(500).json({ message: "Could not delete promo" });
  }
};
