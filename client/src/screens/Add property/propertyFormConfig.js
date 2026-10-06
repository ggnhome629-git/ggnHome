import { Building, Building2, Castle, DoorOpen, Home, LandPlot, Layers, Warehouse } from "lucide-react";
import { GURGAON_LOCALITIES } from "../../data/cityPropertyOptions";
import { containsContactInfo, isPastDate, rupeesInWords } from "../../components/postForm/scoring";

export const STEPS = [
  { key: "basics", label: "Basic Details", heading: "What Are You Listing?", hint: "Start with the basics — it takes about 3 minutes." },
  { key: "location", label: "Location", heading: "Where Is It?", hint: "People search by sector first, so this matters most." },
  { key: "profile", label: "Property Profile", heading: "Tell Us About The Property", hint: "Size, rooms and features people filter by." },
  { key: "price", label: "Price & Description", heading: "Set Your Price", hint: "Add a clear title and a few lines about the home." },
  { key: "photos", label: "Photos", heading: "Add Photos", hint: "Bright, wide photos of every room work best." },
  { key: "review", label: "Review & Post", heading: "Review Your Listing", hint: "This is how your listing will look. Check everything before posting." },
];
export const STEP = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));

export const PURPOSES = [
  { value: "Rent", label: "Rent Out", hint: "Find tenants for your property", icon: DoorOpen },
  { value: "Sale", label: "Sell", hint: "Find buyers for your property", icon: Home },
];

const TYPES = {
  apartment: { label: "Apartment / Flat", icon: Building2 },
  "builder-floor": { label: "Builder Floor", icon: Layers },
  house: { label: "Independent House", icon: Home },
  villa: { label: "Villa", icon: Castle },
  studio: { label: "Studio", icon: Building },
  "1RK": { label: "1 RK", icon: DoorOpen },
  plot: { label: "Plot / Land", icon: LandPlot },
  townhouse: { label: "Townhouse", icon: Warehouse },
};
export const typeLabel = (v) => TYPES[v]?.label || v || "";
export function propertyTypes(purpose) {
  const keys = purpose === "Sale" ? ["apartment", "builder-floor", "house", "villa", "studio", "plot"] : ["apartment", "builder-floor", "house", "villa", "studio", "1RK"];
  return keys.map((k) => ({ value: k, ...TYPES[k] }));
}

export const BHK_OPTIONS = ["1", "2", "3", "4", "5", "6"].map((n) => ({ value: n, label: n === "6" ? "5+ BHK" : `${n} BHK` }));
export const BATH_OPTIONS = ["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: n === "5" ? "5+" : n }));
export const FURNISHING = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi-furnished", label: "Semi-Furnished" },
  { value: "furnished", label: "Fully Furnished" },
];
export const PARKING = ["None", "1 Covered", "2 Covered", "Open Parking"];
export const FEATURES = ["Air Conditioning", "Modular Kitchen", "Wardrobes", "Geyser", "Refrigerator", "Washing Machine", "Microwave", "RO Water", "Power Backup", "Lift", "Gym", "Swimming Pool", "Security", "Gated Society", "Balcony", "Pet Friendly"];
export const TENANTS = ["Family", "Bachelors", "Working Professionals", "Company Lease"];
export const POSSESSION = [
  { value: "ready", label: "Ready To Move" },
  { value: "under-construction", label: "Under Construction" },
];
export const AGES = ["New (0–1 yr)", "1–5 yrs", "5–10 yrs", "10+ yrs"];

const NAMED = [...new Set([...GURGAON_LOCALITIES.rent, ...GURGAON_LOCALITIES.sale, ...GURGAON_LOCALITIES.plots].filter((l) => !/^Sector \d+$/.test(l)))];
export const LOCALITY_OPTIONS = [...Array.from({ length: 115 }, (_, i) => `Sector ${i + 1}`), ...NAMED.sort()];

export const INITIAL = {
  purpose: "",
  propertyType: "",
  Sector: "",
  address: "",
  bhk: "",
  bathrooms: "",
  sqft: "",
  totalFloors: "",
  floor: "",
  furnishing: "",
  parking: "",
  appliances: [],
  monthlyRent: "",
  securityDeposit: "",
  moveInDate: "",
  tenants: [],
  price: "",
  possessionStatus: "",
  propertyAge: "",
  title: "",
  description: "",
  ownerMobile: "",
  // Admin-only rental extras (the admin form has always collected these).
  layoutFeatures: "",
  outdoorSpace: "",
  conditionAge: "",
  renovations: "",
  leaseTerm: "",
  utilities: [],
  otherFees: "",
  maintenance: "",
  insurance: "",
  petPolicy: "",
  smokingPolicy: "",
  neighborhoodVibe: "",
  transportation: "",
  localAmenities: "",
  communityFeatures: [],
};

export const EXTRA = {
  outdoorSpace: ["Balcony", "Terrace", "Private Garden", "Lawn", "None"],
  leaseTerm: [
    { value: "6", label: "6 Months" },
    { value: "11", label: "11 Months" },
    { value: "12", label: "12 Months" },
    { value: "24", label: "24 Months" },
    { value: "flexible", label: "Flexible" },
  ],
  utilities: ["Electricity", "Water", "Gas", "Internet", "Maintenance"],
  insurance: [
    { value: "required", label: "Required" },
    { value: "optional", label: "Optional" },
    { value: "not-required", label: "Not Required" },
  ],
  petPolicy: [
    { value: "allowed", label: "Pets Allowed" },
    { value: "not-allowed", label: "No Pets" },
    { value: "restrictions", label: "With Restrictions" },
    { value: "negotiable", label: "Negotiable" },
  ],
  smokingPolicy: [
    { value: "allowed", label: "Smoking Allowed" },
    { value: "not-allowed", label: "No Smoking" },
    { value: "outdoor-only", label: "Outdoor Only" },
  ],
  communityFeatures: ["Swimming Pool", "Fitness Center", "Clubhouse", "24/7 Security", "Playground", "Garden", "Parking"],
};
const EXTRA_TEXT = ["layoutFeatures", "renovations", "otherFees", "maintenance", "neighborhoodVibe", "transportation", "localAmenities"];
export const EXTRA_TEXT_FIELDS = EXTRA_TEXT;

export const isPlot = (f) => f.propertyType === "plot";
const isRK = (f) => f.propertyType === "1RK";
const hasRooms = (f) => !isPlot(f) && !isRK(f);
const num = (v) => (v === "" || v == null ? NaN : Number(v));

export function configuration(f) {
  if (isRK(f)) return "1 RK";
  if (!f.bhk) return "";
  return `${f.bhk} BHK`;
}

/** Same rules the old form used: "sec 56" / "56" -> "Sector-56", DLF names untouched. */
export function normalizeSector(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/\bdlf\b/i.test(s)) return s;
  const f = s.replace(/[^a-zA-Z0-9]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
  const m = f.match(/sector\s*(\d+)/);
  if (m) return `Sector-${m[1]}`;
  if (/^\d+$/.test(f)) return `Sector-${f}`;
  if (/^sec\s*\d+$/.test(f)) return `Sector-${f.replace("sec", "").trim()}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- visibility score (adds up to 100 for both purposes) ----------
const photoShare = (n, target) => Math.min(1, n / target);
export function scoreItems(purpose) {
  const rent = purpose !== "Sale";
  const S = STEP;
  const items = [
    { key: "type", label: "Choose the property type", points: 5, step: S.basics, done: ({ f }) => Boolean(f.propertyType) },
    { key: "sector", label: "Add the sector / locality", points: 10, step: S.location, done: ({ f }) => f.Sector.trim().length > 1 },
    { key: "address", label: rent ? "Add society / street address" : "Add the full address", points: rent ? 5 : 6, step: S.location, done: ({ f }) => f.address.trim().length >= 5 },
    { key: "bhk", label: "Pick the BHK", points: 8, step: S.profile, done: ({ f }) => !hasRooms(f) || Boolean(f.bhk) },
    { key: "baths", label: "Add bathrooms", points: 4, step: S.profile, done: ({ f }) => isPlot(f) || Boolean(f.bathrooms) },
    { key: "area", label: "Add the area in sqft", points: 8, step: S.profile, done: ({ f }) => num(f.sqft) > 0 },
    { key: "floors", label: "Add floor details", points: 4, step: S.profile, done: ({ f }) => (isPlot(f) ? 1 : (f.totalFloors !== "" ? 0.5 : 0) + (f.floor !== "" ? 0.5 : 0)) },
    { key: "furnishing", label: "Add furnishing", points: rent ? 4 : 3, step: S.profile, done: ({ f }) => isPlot(f) || Boolean(f.furnishing) },
    { key: "parking", label: "Add parking", points: 3, step: S.profile, done: ({ f }) => Boolean(f.parking) },
    { key: "features", label: "Tick features & amenities", points: rent ? 4 : 3, step: S.profile, done: ({ f }) => isPlot(f) || photoShare(f.appliances.length, 4) },
    { key: "title", label: "Write a clear title", points: 4, step: S.price, done: ({ f }) => f.title.trim().length >= 10 },
    { key: "description", label: "Describe the property", points: rent ? 8 : 9, step: S.price, done: ({ f }) => Math.min(1, f.description.trim().length / 150) },
    { key: "photos", label: "Add 5+ photos", points: rent ? 12 : 14, step: S.photos, done: ({ photos }) => photoShare(photos.length, 5) },
  ];
  if (rent) {
    items.push(
      { key: "rent", label: "Set the monthly rent", points: 10, step: S.price, done: ({ f }) => num(f.monthlyRent) > 0 },
      { key: "deposit", label: "Add security deposit", points: 4, step: S.price, done: ({ f }) => f.securityDeposit !== "" },
      { key: "movein", label: "Add available-from date", points: 4, step: S.price, done: ({ f }) => Boolean(f.moveInDate) },
      { key: "tenants", label: "Choose preferred tenants", points: 3, step: S.price, done: ({ f }) => f.tenants.length > 0 }
    );
  } else {
    items.push(
      { key: "price", label: "Set the expected price", points: 12, step: S.price, done: ({ f }) => num(f.price) > 0 },
      { key: "possession", label: "Add possession status", points: 4, step: S.price, done: ({ f }) => Boolean(f.possessionStatus) },
      { key: "age", label: "Add property age", points: 3, step: S.price, done: ({ f }) => isPlot(f) || Boolean(f.propertyAge) }
    );
  }
  return items;
}

// ---------- hard validation, per step ----------
export function validateStep(step, f) {
  const e = {};
  const rent = f.purpose === "Rent";
  if (step === STEP.basics) {
    if (!f.purpose) e.purpose = "Choose whether you want to rent out or sell";
    if (!f.propertyType) e.propertyType = "Choose the property type";
  }
  if (step === STEP.location) {
    if (f.Sector.trim().length < 2) e.Sector = "Enter the sector or locality (e.g. Sector 56)";
    if (!rent && f.address.trim().length < 5) e.address = "Enter the property address";
    if (containsContactInfo(f.address)) e.address = "Please remove phone numbers / emails from the address";
    // Admin-only field; owners and agents never see it so it stays empty.
    if (f.ownerMobile && !/^(?:\+?91)?[6-9]\d{9}$/.test(String(f.ownerMobile).replace(/[\s-]/g, ""))) e.ownerMobile = "Enter a valid 10-digit mobile number";
  }
  if (step === STEP.profile) {
    if (hasRooms(f) && !f.bhk) e.bhk = "Pick the number of bedrooms";
    const sq = num(f.sqft);
    if (!(sq > 0)) e.sqft = "Enter the area in sqft";
    else if (sq < 50 || sq > 100000) e.sqft = "Area should be between 50 and 1,00,000 sqft";
    const tf = num(f.totalFloors);
    const fl = num(f.floor);
    if (f.totalFloors !== "" && (!(tf >= 0) || tf > 120 || !Number.isInteger(tf))) e.totalFloors = "Enter a whole number of floors (0–120)";
    if (f.floor !== "" && (!(fl >= 0) || !Number.isInteger(fl))) e.floor = "Enter the floor as a whole number (0 = ground)";
    else if (f.floor !== "" && f.totalFloors !== "" && fl > tf) e.floor = "Floor can't be higher than the total floors";
  }
  if (step === STEP.price) {
    if (rent) {
      const r = num(f.monthlyRent);
      if (!(r > 0)) e.monthlyRent = "Enter the monthly rent";
      else if (r < 1000 || r > 5000000) e.monthlyRent = "Rent should be between ₹1,000 and ₹50 Lakh a month";
      const d = num(f.securityDeposit);
      if (f.securityDeposit !== "" && (!(d >= 0) || d > 50000000)) e.securityDeposit = "Enter a valid deposit amount";
      if (isPastDate(f.moveInDate)) e.moveInDate = "Available-from date can't be in the past";
    } else {
      const p = num(f.price);
      if (!(p > 0)) e.price = "Enter the expected price";
      else if (p < 100000 || p > 5000000000) e.price = "Price should be between ₹1 Lakh and ₹500 Crore";
    }
    const t = f.title.trim();
    if (!t) e.title = "Add a title for your listing";
    else if (t.length < 10) e.title = "Make the title at least 10 characters";
    else if (t.length > 100) e.title = "Keep the title under 100 characters";
    else if (containsContactInfo(t)) e.title = "Please remove phone numbers / emails from the title";
    EXTRA_TEXT.forEach((k) => {
      if (String(f[k] || "").length > 500) e[k] = "Keep this under 500 characters";
      else if (containsContactInfo(f[k])) e[k] = "Please remove phone numbers / emails";
    });
    if (f.description.length > 2000) e.description = "Keep the description under 2,000 characters";
    else if (containsContactInfo(f.description)) e.description = "Please remove phone numbers / emails — enquiries reach you through ggnHome";
  }
  return e;
}

/** First step (up to `upTo`) that has errors, or -1. */
export function firstInvalidStep(f, upTo = STEP.photos) {
  for (let s = 0; s <= upTo; s += 1) if (Object.keys(validateStep(s, f)).length) return s;
  return -1;
}

// ---------- soft checks for the review step ----------
export function reviewChecks(f, photos) {
  const out = [];
  const rent = f.purpose === "Rent";
  const sq = num(f.sqft);
  const amount = num(rent ? f.monthlyRent : f.price);
  if (!photos.length) out.push({ level: "warn", text: "No photos yet — listings without photos are often skipped.", step: STEP.photos });
  else if (photos.length < 3) out.push({ level: "warn", text: `Only ${photos.length} photo${photos.length > 1 ? "s" : ""}. Add a few more rooms for a fuller picture.`, step: STEP.photos });
  else out.push({ level: "ok", text: `${photos.length} photos added.` });

  if (sq > 0 && amount > 0) {
    const perSqft = amount / sq;
    const [lo, hi] = rent ? [5, 300] : [2000, 60000];
    if (perSqft < lo || perSqft > hi) {
      out.push({ level: "warn", text: `${rent ? "Rent" : "Price"} works out to ₹${Math.round(perSqft).toLocaleString("en-IN")}/sqft, which is unusual for Gurgaon. Please double-check the amount and area.`, step: STEP.price });
    } else {
      out.push({ level: "ok", text: `${rent ? "Rent" : "Price"} works out to ₹${Math.round(perSqft).toLocaleString("en-IN")}/sqft.` });
    }
  }
  if (rent && num(f.securityDeposit) > 10 * num(f.monthlyRent)) out.push({ level: "warn", text: "Deposit is more than 10 months' rent — that may put tenants off.", step: STEP.price });
  if (hasRooms(f) && f.bathrooms && f.bhk && Number(f.bathrooms) > Number(f.bhk) + 2) out.push({ level: "warn", text: "More bathrooms than usual for this BHK — please check.", step: STEP.profile });
  if (f.description.trim().length < 80) out.push({ level: "warn", text: "Add a few lines of description (what's nearby, condition, society).", step: STEP.price });
  out.push({ level: "ok", text: "No phone numbers or emails in the listing text." });
  return out;
}

// ---------- helpers that write for the user ----------
export function suggestTitle(f) {
  const where = f.Sector ? ` in ${f.Sector.trim()}` : "";
  const what = typeLabel(f.propertyType).replace(" / Flat", "");
  const conf = hasRooms(f) && f.bhk ? `${BHK_OPTIONS.find((b) => b.value === f.bhk)?.label} ` : "";
  const furn = f.furnishing === "furnished" ? "Furnished " : f.furnishing === "semi-furnished" ? "Semi-Furnished " : "";
  return `${furn}${conf}${what || "Property"} for ${f.purpose === "Sale" ? "Sale" : "Rent"}${where}`.replace(/\s+/g, " ").trim();
}

export function suggestDescription(f) {
  const rent = f.purpose === "Rent";
  const parts = [];
  const what = typeLabel(f.propertyType).toLowerCase().replace(" / flat", "") || "property";
  const conf = isRK(f) ? "1 RK " : hasRooms(f) && f.bhk ? `${BHK_OPTIONS.find((b) => b.value === f.bhk)?.label} ` : "";
  const size = num(f.sqft) > 0 ? ` spread over ${Number(f.sqft).toLocaleString("en-IN")} sqft` : "";
  parts.push(`${f.furnishing ? FURNISHING.find((x) => x.value === f.furnishing).label + " " : ""}${conf}${what}${size} available for ${rent ? "rent" : "sale"}${f.Sector ? ` in ${f.Sector.trim()}, Gurgaon` : " in Gurgaon"}.`);
  if (f.floor !== "" && f.totalFloors !== "") parts.push(`It is on floor ${f.floor} of ${f.totalFloors}.`);
  if (f.bathrooms) parts.push(`${f.bathrooms} bathroom${f.bathrooms === "1" ? "" : "s"}.`);
  if (f.appliances.length) parts.push(`Comes with ${f.appliances.slice(0, 6).join(", ").toLowerCase()}.`);
  if (f.parking && f.parking !== "None") parts.push(`${f.parking} parking.`);
  if (rent) {
    if (f.tenants.length) parts.push(`Ideal for ${f.tenants.join(" / ").toLowerCase()}.`);
    if (f.moveInDate) parts.push(`Available from ${new Date(f.moveInDate).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`);
  } else if (f.possessionStatus) {
    parts.push(f.possessionStatus === "ready" ? "Ready to move in." : "Under construction.");
  }
  return parts.join(" ");
}

// ---------- submission (same contract the API already accepts) ----------
export function buildFormData(f, photos, panoramas) {
  const form = new FormData();
  const rent = f.purpose === "Rent";
  const put = (k, v) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (s !== "") form.append(k, s);
  };
  const list = (k, arr) => (arr || []).forEach((v) => put(`${k}[]`, v));

  put("purpose", f.purpose);
  put("title", f.title);
  put("description", f.description);
  put("Sector", normalizeSector(f.Sector));
  put("propertyType", f.propertyType);
  if (hasRooms(f) && f.bhk) put("bedrooms", Number(f.bhk));
  if (isRK(f)) put("bedrooms", 1);
  if (!isPlot(f) && f.bathrooms) put("bathrooms", Number(f.bathrooms));
  if (num(f.sqft) > 0) put("totalArea.sqft", Number(f.sqft));
  put("totalArea.configuration", configuration(f));
  if (!isPlot(f)) {
    put("furnishing", f.furnishing);
    list("appliances", f.appliances);
  }
  put("parking", f.parking);
  put("ownerMobile", String(f.ownerMobile || "").replace(/[\s-]/g, ""));
  put("totalFloors", f.totalFloors);

  if (rent) {
    put("address", f.address);
    put("floorForRent", f.floor);
    put("monthlyRent", Number(f.monthlyRent));
    put("securityDeposit", f.securityDeposit === "" ? "" : Number(f.securityDeposit));
    put("moveInDate", f.moveInDate);
    put("tenantRequirements", f.tenants.join(", "));
    // Admin-only extras; always empty for owners and agents.
    ["outdoorSpace", "conditionAge", "leaseTerm", "insurance", "petPolicy", "smokingPolicy", ...EXTRA_TEXT].forEach((k) => put(k, f[k]));
    list("utilities", f.utilities);
    list("communityFeatures", f.communityFeatures);
  } else {
    put("location", f.address);
    put("floorNumber", f.floor);
    put("price", Number(f.price));
    put("possessionStatus", f.possessionStatus);
    if (!isPlot(f)) put("propertyAge", f.propertyAge);
  }

  photos.forEach((p) => p.file && form.append("images", p.file));

  (panoramas || [])
    .map((p) => ({ ...p, title: (p.title || "").trim() }))
    .filter((p) => p.title && (p.file || p.url))
    .forEach((p) => {
      if (p.file) form.append("panoFiles", p.file);
      form.append("panoTitles[]", p.title);
      form.append("panoYaw[]", String(Number(p.yaw) || 0));
      form.append("panoPitch[]", String(Number(p.pitch) || 0));
      form.append("panoNotes[]", p.notes || "");
    });
  return form;
}

/** Shape PropertyCard understands, for the live preview. */
export function previewProperty(f, photos) {
  const rent = f.purpose !== "Sale";
  return {
    _id: "preview",
    title: f.title || suggestTitle(f),
    defaultpropertytype: rent ? "rental" : "sale",
    monthlyRent: rent && f.monthlyRent ? Number(f.monthlyRent) : undefined,
    price: !rent && f.price ? Number(f.price) : undefined,
    bedrooms: hasRooms(f) && f.bhk ? Number(f.bhk) : undefined,
    bathrooms: !isPlot(f) && f.bathrooms ? Number(f.bathrooms) : undefined,
    totalArea: { sqft: Number(f.sqft) || undefined, configuration: configuration(f) || undefined },
    Sector: normalizeSector(f.Sector),
    address: f.address,
    location: f.address,
    images: photos.map((p) => p.url),
    imageCount: photos.length,
    createdAt: new Date().toISOString(),
  };
}

export { rupeesInWords };
