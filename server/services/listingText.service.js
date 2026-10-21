/**
 * Writes the title and description of a listing from its facts, so partners
 * never have to. Plain, factual sentences: no phone numbers or contact details
 * (those are never allowed in public listing text), no claims we cannot verify.
 */

const TYPE_LABELS = {
  apartment: "Flat",
  house: "Independent House",
  villa: "Villa",
  "builder-floor": "Builder Floor",
  plot: "Plot",
  studio: "Studio Apartment",
  "1RK": "1 RK Flat",
  condo: "Condo",
  townhouse: "Townhouse",
};

// Types that are not described by a bedroom count.
const NO_BHK = new Set(["plot", "studio", "1RK"]);

const NEARBY_LABELS = {
  metro: "metro station",
  market: "market",
  hospital: "hospital",
  school: "school",
  park: "park",
  mall: "mall",
};

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

function formatPrice(price) {
  const n = Number(price);
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Crore`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} Lakh`;
  return inr(n);
}

function ordinal(n) {
  const v = Number(n);
  if (v === 0) return "ground";
  const mod100 = v % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${v}th`;
  return `${v}${{ 1: "st", 2: "nd", 3: "rd" }[v % 10] || "th"}`;
}

function distanceText(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m) || m <= 0) return "";
  return m < 1000 ? `about ${Math.max(50, Math.round(m / 50) * 50)} m` : `about ${(m / 1000).toFixed(1)} km`;
}

/** Sensible bathroom count when the partner did not give one. */
function estimateBathrooms(bedrooms) {
  const beds = Number(bedrooms);
  if (!Number.isFinite(beds) || beds <= 0) return undefined;
  return Math.max(1, beds > 2 ? beds - 1 : beds);
}

/**
 * @param {{ purpose: 'rental'|'sale', propertyType: string, bedrooms?: number, bathrooms?: number,
 *           area?: number, price: number, sector?: string, furnishing?: string, floor?: number,
 *           totalFloors?: number, amenities?: Array<{category:string,name?:string,distanceMeters?:number}> }} facts
 * @returns {{ title: string, description: string }}
 */
function buildListingText(facts) {
  const { purpose, propertyType, bedrooms, bathrooms, price, sector, furnishing, floor, totalFloors, amenities } = facts;
  const forRent = purpose === "rental";
  const typeLabel = TYPE_LABELS[propertyType] || "Property";
  const beds = Number(bedrooms);
  const bhk = beds > 0 && !NO_BHK.has(propertyType) ? `${beds} BHK ` : "";
  const area = Number(facts.area);
  const where = sector ? ` in ${sector}, Gurugram` : " in Gurugram";
  const deal = forRent ? "Rent" : "Sale";

  const head = propertyType === "plot" && area > 0 ? `${area.toLocaleString("en-IN")} sq ft Plot` : `${bhk}${typeLabel}`;
  const title = `${head} for ${deal}${where}`.slice(0, 160);

  const sentences = [`${head} available for ${deal.toLowerCase()}${where}.`];

  const size = [];
  if (area > 0 && propertyType !== "plot") size.push(`Area is about ${area.toLocaleString("en-IN")} sq ft`);
  if (beds > 0 && !NO_BHK.has(propertyType)) size.push(`${beds} ${beds === 1 ? "bedroom" : "bedrooms"}`);
  const baths = Number(bathrooms);
  if (baths > 0 && propertyType !== "plot") size.push(`${baths} ${baths === 1 ? "bathroom" : "bathrooms"}`);
  if (size.length) sentences.push(`${size[0]}${size.length > 1 ? ` with ${size.slice(1).join(" and ")}` : ""}.`);

  if (["unfurnished", "semi-furnished", "furnished"].includes(furnishing)) sentences.push(`It is ${furnishing}.`);

  const fl = Number(floor);
  if (Number.isFinite(fl) && fl >= 0 && propertyType !== "plot") {
    const total = Number(totalFloors);
    sentences.push(`Located on the ${ordinal(fl)} floor${total > 0 ? ` of a ${total}-floor building` : ""}.`);
  }

  if (Number(price) > 0) sentences.push(forRent ? `Monthly rent is ${inr(price)}.` : `Asking price is ${formatPrice(price)}.`);

  const near = (Array.isArray(amenities) ? amenities : [])
    .filter((a) => NEARBY_LABELS[a.category] && Number(a.distanceMeters) > 0)
    .map((a) => `${NEARBY_LABELS[a.category]} ${distanceText(a.distanceMeters)}`);
  if (near.length) sentences.push(`Nearby (approximate): ${near.join(", ")}.`);

  sentences.push("Contact GgnHome to arrange a visit.");
  return { title, description: sentences.join(" ") };
}

module.exports = { buildListingText, estimateBathrooms, TYPE_LABELS };
