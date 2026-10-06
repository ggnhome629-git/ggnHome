import { User, UserRound, Users } from "lucide-react";
import { GURGAON_LOCALITIES } from "../../data/cityPropertyOptions";
import { containsContactInfo, isPastDate } from "../../components/postForm/scoring";

export const STEPS = [
  { key: "room", label: "Room & Flatmates", heading: "Who Are You Looking For?", hint: "Tell people about the household and the spot that's open." },
  { key: "location", label: "Location", heading: "Where Is The Room?", hint: "Pick the sector or locality people will search for." },
  { key: "rent", label: "Rent & Move-In", heading: "Rent And Move-In Date", hint: "Share the monthly rent for the room and when it's free." },
  { key: "details", label: "Room Details", heading: "Describe The Room", hint: "Amenities, a clear title and a few lines about the flat." },
  { key: "photos", label: "Photos", heading: "Add Room Photos", hint: "The room, common areas and the view — 4 or more is ideal." },
  { key: "review", label: "Review & Post", heading: "Review Your Listing", hint: "This is how your listing will appear in flatmate search." },
];
export const STEP = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));

export const GENDERS = [
  { value: "female", label: "Female", hint: "Only women flatmates", icon: UserRound },
  { value: "male", label: "Male", hint: "Only men flatmates", icon: User },
  { value: "any", label: "Anyone", hint: "Open to all", icon: Users },
];
export const SPOTS = ["1", "2", "3", "4"].map((n) => ({ value: n, label: n === "4" ? "4+" : n }));
export const OCCUPANTS = ["0", "1", "2", "3", "4", "5"].map((n) => ({ value: n, label: n === "0" ? "None yet" : n === "5" ? "5+" : n }));
export const FURNISHED = [
  { value: "yes", label: "Furnished" },
  { value: "no", label: "Unfurnished" },
];
export const AMENITIES = ["WiFi", "Air Conditioning", "Attached Bathroom", "Balcony", "Washing Machine", "Fridge", "Geyser", "RO Water", "Power Backup", "Cook", "Housekeeping", "Parking", "Gym", "Swimming Pool", "Security", "Pet Friendly"];
export const CONTACT = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
];

export const LOCALITY_OPTIONS = [
  ...Array.from({ length: 115 }, (_, i) => `Sector ${i + 1}`),
  ...[...new Set([...GURGAON_LOCALITIES.rent, ...GURGAON_LOCALITIES.sale].filter((l) => !/^Sector \d+$/.test(l)))].sort(),
];

export const INITIAL = {
  preferredGender: "",
  occupancyWanted: "1",
  currentOccupants: "",
  furnished: "",
  area: "",
  minRent: "",
  maxRent: "",
  moveInDate: "",
  amenities: [],
  contact: [],
  title: "",
  description: "",
};

const num = (v) => (v === "" || v == null ? NaN : Number(v));
const share = (n, target) => Math.min(1, n / target);

export const SCORE_ITEMS = [
  { key: "gender", label: "Choose who can apply", points: 6, step: STEP.room, done: ({ f }) => Boolean(f.preferredGender) },
  { key: "spots", label: "Add spots open", points: 5, step: STEP.room, done: ({ f }) => Boolean(f.occupancyWanted) },
  { key: "occupants", label: "Add current flatmates", points: 4, step: STEP.room, done: ({ f }) => f.currentOccupants !== "" },
  { key: "furnished", label: "Say if it's furnished", points: 4, step: STEP.room, done: ({ f }) => Boolean(f.furnished) },
  { key: "area", label: "Add the sector / locality", points: 12, step: STEP.location, done: ({ f }) => f.area.trim().length > 1 },
  { key: "rent", label: "Add the monthly rent", points: 14, step: STEP.rent, done: ({ f }) => (num(f.minRent) > 0 ? 0.5 : 0) + (num(f.maxRent) > 0 ? 0.5 : 0) },
  { key: "movein", label: "Add the move-in date", points: 6, step: STEP.rent, done: ({ f }) => Boolean(f.moveInDate) },
  { key: "amenities", label: "Tick 5+ amenities", points: 8, step: STEP.details, done: ({ f }) => share(f.amenities.length, 5) },
  { key: "title", label: "Write a clear title", points: 6, step: STEP.details, done: ({ f }) => f.title.trim().length >= 10 },
  { key: "description", label: "Describe the room & household", points: 12, step: STEP.details, done: ({ f }) => share(f.description.trim().length, 200) },
  { key: "contact", label: "Pick how people reach you", points: 3, step: STEP.details, done: ({ f }) => f.contact.length > 0 },
  { key: "photos", label: "Add 4+ photos", points: 20, step: STEP.photos, done: ({ photos }) => share(photos.length, 4) },
];

export function validateStep(step, f) {
  const e = {};
  if (step === STEP.room) {
    if (!f.preferredGender) e.preferredGender = "Choose who can apply";
    if (!f.occupancyWanted) e.occupancyWanted = "Choose how many spots are open";
  }
  if (step === STEP.location) {
    if (f.area.trim().length < 2) e.area = "Enter the sector or locality (e.g. Sector 46)";
    else if (containsContactInfo(f.area)) e.area = "Please remove phone numbers / emails";
  }
  if (step === STEP.rent) {
    const lo = num(f.minRent);
    const hi = num(f.maxRent);
    if (!(lo > 0)) e.minRent = "Enter the rent";
    else if (lo < 1000 || lo > 500000) e.minRent = "Rent should be between ₹1,000 and ₹5 Lakh";
    if (f.maxRent !== "" && !(hi >= lo)) e.maxRent = "Upper rent can't be lower than the starting rent";
    else if (hi > 500000) e.maxRent = "Rent should be under ₹5 Lakh";
    if (!f.moveInDate) e.moveInDate = "Choose when the room is available";
    else if (isPastDate(f.moveInDate)) e.moveInDate = "Move-in date can't be in the past";
  }
  if (step === STEP.details) {
    const t = f.title.trim();
    if (!t) e.title = "Add a title for your listing";
    else if (t.length < 10) e.title = "Make the title at least 10 characters";
    else if (t.length > 100) e.title = "Keep the title under 100 characters";
    else if (containsContactInfo(t)) e.title = "Please remove phone numbers / emails from the title";
    const d = f.description.trim();
    if (d.length < 30) e.description = "Write at least 30 characters about the room and household";
    else if (d.length > 2000) e.description = "Keep the description under 2,000 characters";
    else if (containsContactInfo(d)) e.description = "Please remove phone numbers / emails — people contact you through ggnHome";
  }
  return e;
}

export function firstInvalidStep(f, upTo = STEP.photos) {
  for (let s = 0; s <= upTo; s += 1) if (Object.keys(validateStep(s, f)).length) return s;
  return -1;
}

export function reviewChecks(f, photos) {
  const out = [];
  if (!photos.length) out.push({ level: "warn", text: "No photos yet — rooms with photos get far more interest.", step: STEP.photos });
  else if (photos.length < 3) out.push({ level: "warn", text: `Only ${photos.length} photo${photos.length > 1 ? "s" : ""}. Add the common areas too.`, step: STEP.photos });
  else out.push({ level: "ok", text: `${photos.length} photos added.` });
  if (!f.contact.length) out.push({ level: "warn", text: "Pick at least one way for people to contact you.", step: STEP.details });
  if (f.description.trim().length < 120) out.push({ level: "warn", text: "Tell people a bit more — household routine, rules, what's nearby.", step: STEP.details });
  out.push({ level: "ok", text: "No phone numbers or emails in the listing text." });
  return out;
}

export function suggestTitle(f) {
  const who = f.preferredGender === "female" ? " for Women" : f.preferredGender === "male" ? " for Men" : "";
  const furn = f.furnished === "yes" ? "Furnished " : "";
  const where = f.area.trim() ? ` in ${f.area.trim()}` : "";
  return `${furn}Room Available${who}${where}`.trim();
}

export function suggestDescription(f) {
  const parts = [];
  const spots = Number(f.occupancyWanted) || 1;
  parts.push(`Looking for ${spots === 1 ? "a flatmate" : `${spots} flatmates`}${f.area.trim() ? ` in ${f.area.trim()}, Gurgaon` : " in Gurgaon"}.`);
  if (f.currentOccupants !== "") parts.push(f.currentOccupants === "0" ? "The flat is currently empty." : `${f.currentOccupants} ${f.currentOccupants === "1" ? "person lives" : "people live"} here now.`);
  if (f.furnished) parts.push(f.furnished === "yes" ? "The room is furnished." : "The room is unfurnished.");
  if (f.amenities.length) parts.push(`Includes ${f.amenities.slice(0, 6).join(", ").toLowerCase()}.`);
  if (f.moveInDate) parts.push(`Available from ${new Date(f.moveInDate).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`);
  return parts.join(" ");
}

export function buildFormData(f, photos) {
  const lo = Number(f.minRent);
  const hi = f.maxRent === "" ? lo : Number(f.maxRent);
  const form = new FormData();
  form.append("title", f.title.trim());
  form.append("description", f.description.trim());
  form.append("city", "Gurgaon");
  form.append("area", f.area.trim());
  form.append("moveInDate", f.moveInDate);
  form.append("budget", JSON.stringify({ min: lo, max: hi }));
  form.append("preferredGender", f.preferredGender);
  form.append("occupancyWanted", String(Number(f.occupancyWanted) || 1));
  form.append("currentOccupants", String(Number(f.currentOccupants) || 0));
  form.append("furnished", f.furnished === "yes" ? "true" : "false");
  form.append("amenities", JSON.stringify(f.amenities));
  form.append("contactMethods", JSON.stringify({ phone: f.contact.includes("phone"), email: f.contact.includes("email") }));
  photos.forEach((p) => p.file && form.append("photos", p.file));
  return form;
}

export function previewListing(f, photos) {
  const lo = Number(f.minRent) || 0;
  return {
    _id: "preview",
    title: f.title || suggestTitle(f),
    budget: { min: lo, max: f.maxRent === "" ? lo : Number(f.maxRent) },
    area: f.area,
    city: "Gurgaon",
    preferredGender: f.preferredGender || "any",
    occupancyWanted: Number(f.occupancyWanted) || 1,
    furnished: f.furnished === "yes",
    moveInDate: f.moveInDate,
    photos: photos.map((p) => p.url),
    createdAt: new Date().toISOString(),
  };
}
