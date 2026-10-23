const RentalProperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");

const SITE_URL = "https://www.ggnhome.com";
const MAX_PROPERTIES_PER_TYPE = 20000;
const MIN_PROPERTIES_PER_LOCALITY = 10;

const xmlEscape = (value) =>
  String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const xmlHeader = () => '<?xml version="1.0" encoding="UTF-8"?>';
const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
const urlsetClose = "</urlset>";

function dateOnly(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function propertyEntry(property, routeBase) {
  if (!property || !property._id) return "";
  const url = `${SITE_URL}/${routeBase}/${property._id}`;
  const lastmod = dateOnly(property.updatedAt || property.createdAt);
  const image = Array.isArray(property.images)
    ? property.images.find((item) => typeof item === "string" && /^https?:\/\//i.test(item))
    : "";
  const lines = [
    "<url>",
    `<loc>${xmlEscape(url)}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
  ];
  if (image) {
    lines.push(
      "<image:image xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">",
      `<image:loc>${xmlEscape(image)}</image:loc>`,
      property.title ? `<image:title>${xmlEscape(property.title)}</image:title>` : "",
      "</image:image>"
    );
  }
  lines.push("</url>");
  return lines.filter(Boolean).join("");
}

function sendXml(res, body) {
  return res
    .status(200)
    .set("Content-Type", "application/xml; charset=utf-8")
    .set("Cache-Control", "public, max-age=3600, s-maxage=3600")
    .send(body);
}

/**
 * Live sitemap for active public property detail pages.
 * Only listings visible in the public active feed are included; placeholder
 * IDs and inactive/removed records are never emitted.
 */
async function servePropertySitemap(req, res) {
  try {
    const publicFilter = {
      isActive: true,
      "ranking.status": { $nin: ["QUARANTINED", "REJECTED"] },
    };
    const fields = "_id title images updatedAt createdAt";
    const [rentals, sales] = await Promise.all([
      RentalProperty.find(publicFilter, fields)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(MAX_PROPERTIES_PER_TYPE)
        .lean(),
      SaleProperty.find(publicFilter, fields)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(MAX_PROPERTIES_PER_TYPE)
        .lean(),
    ]);
    const entries = [
      ...rentals.map((property) => propertyEntry(property, "Rentaldetails")),
      ...sales.map((property) => propertyEntry(property, "Saledetails")),
    ].filter(Boolean);
    return sendXml(res, `${xmlHeader()}${urlsetOpen}${entries.join("")}${urlsetClose}`);
  } catch (error) {
    console.error("Property sitemap generation failed:", error);
    return res.status(503).set("Cache-Control", "no-store").type("text/plain").send("Property sitemap temporarily unavailable");
  }
}

function slugifyLocality(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

async function localityCounts(Model) {
  return Model.aggregate([
    { $match: { isActive: true, Sector: { $type: "string", $ne: "" } } },
    {
      $group: {
        _id: "$Sector",
        count: { $sum: 1 },
        lastmod: { $max: { $ifNull: ["$updatedAt", "$createdAt"] } },
      },
    },
  ]).exec();
}

/**
 * Build indexable locality URLs only when a locality has enough active
 * inventory to provide a useful landing page.
 */
async function serveLocalitySitemap(req, res) {
  try {
    const [rentalGroups, saleGroups] = await Promise.all([
      localityCounts(RentalProperty),
      localityCounts(SaleProperty),
    ]);
    const merged = new Map();
    [...rentalGroups, ...saleGroups].forEach((group) => {
      const name = String(group._id || "").trim();
      const slug = slugifyLocality(name);
      if (!name || !slug) return;
      const current = merged.get(slug) || { name, count: 0, lastmod: null };
      current.count += Number(group.count) || 0;
      const candidate = group.lastmod ? new Date(group.lastmod) : null;
      if (candidate && !Number.isNaN(candidate.getTime()) && (!current.lastmod || candidate > current.lastmod)) {
        current.lastmod = candidate;
      }
      merged.set(slug, current);
    });

    const entries = [];
    for (const [slug, locality] of merged) {
      if (locality.count < MIN_PROPERTIES_PER_LOCALITY) continue;
      const url = `${SITE_URL}/properties-in-gurgaon/${slug}`;
      const lastmod = dateOnly(locality.lastmod);
      entries.push(
        `<url><loc>${xmlEscape(url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`
      );
    }
    return sendXml(res, `${xmlHeader()}${urlsetOpen}${entries.join("")}${urlsetClose}`);
  } catch (error) {
    console.error("Locality sitemap generation failed:", error);
    return res.status(503).set("Cache-Control", "no-store").type("text/plain").send("Locality sitemap temporarily unavailable");
  }
}

module.exports = { servePropertySitemap, serveLocalitySitemap };
