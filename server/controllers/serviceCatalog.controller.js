/**
 * Home services catalogue.
 *  Public: GET /api/service-catalog                → services switched on for users
 *  Admin:  GET/POST /api/admin/service-catalog       → list all / add
 *          PATCH/DELETE /api/admin/service-catalog/:id → edit / toggle / delete
 *
 * The first read seeds the ten services the app has always offered, so
 * nothing changes for users until an admin edits the catalogue.
 */
const mongoose = require("mongoose");
const ServiceCatalog = require("../models/ServiceCatalog.model");

const DEFAULT_SERVICES = [
  { key: "cleaning", title: "Cleaning", emoji: "🧹", color: "#00A79D", description: "Deep cleaning for homes, kitchens and bathrooms." },
  { key: "painting", title: "Painting", emoji: "🎨", color: "#8B5CF6", description: "Interior and exterior painting by trained painters." },
  { key: "termite", title: "Termite Control", emoji: "🐛", color: "#DC2626", description: "Anti-termite treatment for woodwork and walls." },
  { key: "plumbing", title: "Plumbing", emoji: "🚰", color: "#2563EB", description: "Leaks, taps, fittings, drainage and bathroom repairs." },
  { key: "acService", title: "AC Service", emoji: "❄️", color: "#06B6D4", description: "AC servicing, gas refill, installation and repair." },
  { key: "carpenter", title: "Carpenter", emoji: "🪚", color: "#D97706", description: "Furniture repair, fittings and custom woodwork." },
  { key: "electrical", title: "Electrical", emoji: "⚡", color: "#F59E0B", description: "Wiring, switches, lights, fans and appliance points." },
  { key: "moving", title: "Moving", emoji: "📦", color: "#10B981", description: "Packers and movers for shifting within Gurgaon and beyond." },
  { key: "pestControl", title: "Pest Control", emoji: "🦟", color: "#EF4444", description: "Cockroach, mosquito and general pest treatment." },
  { key: "other", title: "Other", emoji: "🔧", color: "#6B7280", description: "Anything else your home needs — tell us the details." },
].map((s, i) => ({ ...s, order: (i + 1) * 10, active: true }));

let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  if ((await ServiceCatalog.estimatedDocumentCount()) === 0) {
    await ServiceCatalog.insertMany(DEFAULT_SERVICES, { ordered: false }).catch(() => {});
  }
  seeded = true;
}

const slug = (s) =>
  String(s || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^[^a-zA-Z]+/, "")
    .replace(/^./, (c) => c.toLowerCase())
    .slice(0, 40);

/** Whitelists editable fields; `key` is only accepted on create. */
function cleanInput(body = {}, { creating = false } = {}) {
  const out = {};
  if (body.title !== undefined) out.title = String(body.title).trim().slice(0, 60);
  if (body.emoji !== undefined) out.emoji = String(body.emoji).trim().slice(0, 8) || "🔧";
  if (body.description !== undefined) out.description = String(body.description).trim().slice(0, 300);
  if (body.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(body.color))) out.color = String(body.color);
  if (body.startsFrom !== undefined) {
    const n = Number(body.startsFrom);
    if (Number.isFinite(n) && n >= 0 && n <= 10000000) out.startsFrom = Math.round(n);
  }
  if (body.order !== undefined && Number.isFinite(Number(body.order))) out.order = Math.round(Number(body.order));
  if (typeof body.active === "boolean") out.active = body.active;
  if (creating) out.key = slug(body.key || body.title);
  return out;
}

const publicShape = (s) => ({ key: s.key, title: s.title, emoji: s.emoji, color: s.color, description: s.description, startsFrom: s.startsFrom });

exports.DEFAULT_SERVICES = DEFAULT_SERVICES;
exports.ensureSeeded = ensureSeeded;

exports.listPublic = async (req, res) => {
  try {
    await ensureSeeded();
    const items = await ServiceCatalog.find({ active: true }).sort({ order: 1, title: 1 }).lean();
    res.set("Cache-Control", "public, max-age=60");
    res.json({ success: true, services: items.map(publicShape) });
  } catch (err) {
    console.error("service catalog list failed:", err.message);
    res.status(500).json({ success: false, message: "Could not load services." });
  }
};

exports.adminList = async (req, res) => {
  try {
    await ensureSeeded();
    const items = await ServiceCatalog.find({}).sort({ order: 1, title: 1 }).lean();
    res.json({ success: true, services: items });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not load services." });
  }
};

exports.adminCreate = async (req, res) => {
  try {
    const data = cleanInput(req.body, { creating: true });
    if (!data.title) return res.status(400).json({ success: false, message: "Title is required." });
    if (!data.key || data.key.length < 2) return res.status(400).json({ success: false, message: "Could not make an ID from that title — use letters." });
    if (data.order === undefined) {
      const last = await ServiceCatalog.findOne({}).sort({ order: -1 }).select("order").lean();
      data.order = (last?.order || 0) + 10;
    }
    const doc = await ServiceCatalog.create(data);
    res.status(201).json({ success: true, service: doc });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ success: false, message: "A service with this ID already exists." });
    res.status(400).json({ success: false, message: err.message || "Could not add the service." });
  }
};

exports.adminUpdate = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
    const data = cleanInput(req.body);
    if (data.title === "") return res.status(400).json({ success: false, message: "Title can't be empty." });
    const doc = await ServiceCatalog.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ success: false, message: "Service not found" });
    res.json({ success: true, service: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Could not update the service." });
  }
};

exports.adminDelete = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
    const doc = await ServiceCatalog.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Service not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not delete the service." });
  }
};
