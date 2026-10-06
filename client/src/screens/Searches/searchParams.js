// URL query keys the search page understands. They match the API's own
// parameter names, so the page can forward them unchanged.
export const FILTER_KEYS = [
  "bhk",
  "bathrooms",
  "minPrice",
  "maxPrice",
  "minArea",
  "maxArea",
  "parking",
  "moveInBy",
  "propertyType",
  "postedBy",
  "listedWithin",
  "withPhotos",
];

export const PROPERTY_TYPE_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "Independent house" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "condo", label: "Condo" },
];

export const POSTED_BY_OPTIONS = [
  { value: "Owner", label: "Owner" },
  { value: "Agent", label: "Agent" },
];

export const LISTED_WITHIN_OPTIONS = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

const labelFor = (options, value) => options.find((o) => o.value === value)?.label || value;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Newest first" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
];

export const BHK_OPTIONS = ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK"];

export const PAGE_LIMIT = 12;

export function readFilters(searchParams) {
  const out = {};
  FILTER_KEYS.forEach((k) => {
    out[k] = searchParams.get(k) || "";
  });
  return out;
}

export function formatINR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `₹${+(n / 1e3).toFixed(1)}K`;
  return `₹${n}`;
}

/** Human labels for the active-filter chips. */
export function activeFilterChips(filters) {
  const chips = [];
  if (filters.bhk) chips.push({ keys: ["bhk"], label: filters.bhk });
  if (filters.bathrooms) chips.push({ keys: ["bathrooms"], label: `${filters.bathrooms} bath${filters.bathrooms === "1" ? "" : "s"}` });
  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? formatINR(filters.minPrice) : "Any";
    const max = filters.maxPrice ? formatINR(filters.maxPrice) : "Any";
    chips.push({ keys: ["minPrice", "maxPrice"], label: `${min} – ${max}` });
  }
  if (filters.minArea || filters.maxArea) {
    chips.push({
      keys: ["minArea", "maxArea"],
      label: `${filters.minArea || "Any"} – ${filters.maxArea || "Any"} sqft`,
    });
  }
  if (filters.parking) chips.push({ keys: ["parking"], label: `Parking: ${filters.parking}` });
  if (filters.moveInBy) chips.push({ keys: ["moveInBy"], label: `Move in by ${filters.moveInBy}` });
  if (filters.propertyType) chips.push({ keys: ["propertyType"], label: labelFor(PROPERTY_TYPE_OPTIONS, filters.propertyType) });
  if (filters.postedBy) chips.push({ keys: ["postedBy"], label: `By ${filters.postedBy.toLowerCase()}` });
  if (filters.listedWithin) chips.push({ keys: ["listedWithin"], label: labelFor(LISTED_WITHIN_OPTIONS, filters.listedWithin) });
  if (filters.withPhotos) chips.push({ keys: ["withPhotos"], label: "With photos" });
  return chips;
}
