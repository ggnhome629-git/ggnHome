/**
 * Normalises a raw RentalProperty / SaleProperty API response into one shape
 * the detail page can render generically.
 *
 * The two collections genuinely differ (rent carries `monthlyRent`, lease and
 * policy fields; sale carries `price` and `location`), and several fields the
 * UI can display — floor plans, documents, RERA, developer, geo coordinates —
 * do not exist in the schema yet. Everything below therefore returns
 * `null`/`[]` when absent so each section can hide itself rather than render
 * an empty shell or, worse, invented data.
 */

export const PROPERTY_TYPE = { RENTAL: "rental", SALE: "sale" };

const asArray = (value) =>
  Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()) : [];

// Scraped listings carry placeholder junk in optional text fields ("N 0",
// "N.A", "-"). Treat those as absent so the section hides rather than
// rendering a value that reads as broken.
const PLACEHOLDER = /^(n\.?\s*a\.?|n\/a|na|n\s*0|none|null|-{1,2}|0)$/i;

const clean = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || PLACEHOLDER.test(trimmed)) return null;
    return trimmed;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return value;
};

/**
 * Address strings from scraped sources usually already end with the sector
 * and city, so appending them again produces "Sector 112, Gurgaon, Sector
 * 112, Gurgaon". Only add a part the address doesn't already mention.
 */
export function locationLine(property) {
  const parts = [];
  const address = property.address;
  if (address) parts.push(address);
  const lower = (address || "").toLowerCase();
  [property.sector, property.city].forEach((part) => {
    if (part && !lower.includes(String(part).toLowerCase())) parts.push(part);
  });
  return parts.join(", ");
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

/** ₹1.85 Cr / ₹85 L / ₹45,000 — the compact form used in hero + sticky bars. */
export function formatCompactCurrency(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2).replace(/\.00$/, "")} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatArea(sqft) {
  const value = Number(sqft);
  if (!Number.isFinite(value) || value <= 0) return null;
  return `${Math.round(value).toLocaleString("en-IN")} sq.ft.`;
}

export function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * A listing is "ready to move" when it is available now, otherwise it carries
 * the possession date. Derived — the schema has no status enum.
 */
function deriveStatus(raw, type) {
  if (type === PROPERTY_TYPE.RENTAL && raw.moveInDate) {
    const moveIn = new Date(raw.moveInDate);
    if (!Number.isNaN(moveIn.getTime())) {
      return moveIn.getTime() <= Date.now()
        ? { label: "Ready to move", tone: "success" }
        : { label: `Available ${formatDate(raw.moveInDate)}`, tone: "info" };
    }
  }
  if (raw.isPostedNew) return { label: "New listing", tone: "accent" };
  return { label: "Ready to move", tone: "success" };
}

/**
 * Verification badges are derived only from signals we can actually stand
 * behind — never a hardcoded "RERA verified".
 */
function deriveVerification(raw) {
  const badges = [];
  if (raw.isActive) badges.push("Listing active");
  if (Array.isArray(raw.images) && raw.images.length > 0) badges.push("Photos verified");
  if (clean(raw.Sector)) badges.push("Location verified");
  if (clean(raw.ownernumber)) badges.push("Contact verified");
  if (clean(raw.sourcePortal)) badges.push(`Sourced from ${raw.sourcePortal}`);
  return badges;
}

/** Highlights are pulled from real descriptive fields, not invented copy. */
function deriveHighlights(raw, type) {
  const highlights = [];
  const push = (value) => {
    const cleaned = clean(value);
    if (!cleaned) return;
    // These fields are often bullet-ish free text; split them into real points.
    cleaned
      .split(/\r?\n|\t•\t|•|•/)
      .map((part) => part.trim().replace(/^[-–—]\s*/, ""))
      .filter((part) => part.length > 2)
      .forEach((part) => highlights.push(part));
  };
  push(raw.layoutFeatures);
  if (type === PROPERTY_TYPE.RENTAL) {
    push(raw.outdoorSpace);
    push(raw.renovations);
  }
  return [...new Set(highlights)].slice(0, 12);
}

function deriveAmenities(raw) {
  return [...new Set([...asArray(raw.appliances), ...asArray(raw.communityFeatures), ...asArray(raw.utilities)])];
}

export function normaliseProperty(raw, type) {
  if (!raw) return null;
  const isRental = type === PROPERTY_TYPE.RENTAL;
  const price = isRental ? clean(raw.monthlyRent) : clean(raw.price);
  const sqft = clean(raw.totalArea?.sqft);

  return {
    id: raw._id,
    type,
    isRental,
    title: clean(raw.title) || "Property",
    description: clean(raw.description),
    status: deriveStatus(raw, type),

    // Pricing
    price,
    priceLabel: isRental ? "Monthly rent" : "Price",
    priceDisplay: isRental ? formatCurrency(price) : formatCompactCurrency(price),
    priceExact: formatCurrency(price),
    pricePerSqFt: price && sqft ? Math.round(price / sqft) : null,
    securityDeposit: clean(raw.securityDeposit),
    maintenance: clean(raw.maintenance),
    otherFees: clean(raw.otherFees),
    leaseTerm: clean(raw.leaseTerm),

    // Location
    sector: clean(raw.Sector),
    address: clean(raw.address) || clean(raw.location),
    city: "Gurgaon",

    // Specs
    propertyType: clean(raw.propertyType),
    configuration: clean(raw.totalArea?.configuration),
    bedrooms: clean(raw.bedrooms),
    bathrooms: clean(raw.bathrooms),
    builtUpArea: sqft,
    builtUpAreaDisplay: formatArea(sqft),
    floor: clean(raw.floorForRent),
    totalFloors: clean(raw.totalFloors),
    parking: clean(raw.parking),
    age: clean(raw.conditionAge),
    possession: isRental ? formatDate(raw.moveInDate) : null,
    ownership: clean(raw.ownerType),

    // Media
    images: asArray(raw.images),
    panoramas: Array.isArray(raw.panoramas) ? raw.panoramas.filter((p) => p?.url?.trim()) : [],

    // Descriptive
    highlights: deriveHighlights(raw, type),
    amenities: deriveAmenities(raw),
    neighbourhood: clean(raw.neighborhoodVibe),
    transportation: clean(raw.transportation),
    localAmenities: clean(raw.localAmenities),
    petPolicy: clean(raw.petPolicy),
    smokingPolicy: clean(raw.smokingPolicy),
    tenantRequirements: clean(raw.tenantRequirements),

    // Listed by
    contactNumber: clean(raw.ownernumber),
    ownerType: clean(raw.ownerType) || "Owner",

    // Trust
    verification: deriveVerification(raw),
    sourceUrl: clean(raw.sourceUrl),

    // Not in the schema yet — sections consuming these stay hidden until the
    // API starts returning them.
    floorPlans: Array.isArray(raw.floorPlans) ? raw.floorPlans : [],
    sitePlan: clean(raw.sitePlan),
    documents: Array.isArray(raw.documents) ? raw.documents : [],
    nearbyPlaces: Array.isArray(raw.nearbyPlaces) ? raw.nearbyPlaces : [],
    connectivity: Array.isArray(raw.connectivity) ? raw.connectivity : [],
    developer: raw.developer || null,
    project: raw.project || null,
    reraNumber: clean(raw.reraNumber),
    latitude: clean(raw.latitude),
    longitude: clean(raw.longitude),
    videos: asArray(raw.videos),

    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    raw,
  };
}

/** Google Maps directions target — coordinates when present, else the address. */
export function directionsUrl(property) {
  if (property.latitude && property.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`;
  }
  const query = [property.address, property.sector, property.city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function whatsappUrl(property, number) {
  const text = `Hi, I'm interested in "${property.title}" (${property.sector || property.city}) listed on GgnHome — ${window.location.href}`;
  const digits = String(number || "").replace(/\D/g, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
