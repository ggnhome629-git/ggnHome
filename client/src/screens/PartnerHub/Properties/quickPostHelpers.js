import { Building2, Castle, DoorOpen, Home, LandPlot, Layers } from "lucide-react";

// Property types the database accepts (kept in sync with the Rental / Sale models).
const FLAT = { value: "apartment", en: "Flat", hi: "फ्लैट", icon: Building2 };
const HOUSE = { value: "house", en: "House", hi: "मकान", icon: Home };
const FLOOR = { value: "builder-floor", en: "Builder Floor", hi: "बिल्डर फ्लोर", icon: Layers };
const VILLA = { value: "villa", en: "Villa", hi: "कोठी", icon: Castle };
export const RENT_TYPES = [FLAT, HOUSE, FLOOR, VILLA, { value: "studio", en: "Studio / 1 Room", hi: "स्टूडियो / 1 कमरा", icon: DoorOpen }];
export const SALE_TYPES = [FLAT, HOUSE, FLOOR, VILLA, { value: "plot", en: "Plot", hi: "प्लॉट", icon: LandPlot }];

// Types that are not described by a bedroom count.
export const NO_BHK = new Set(["plot", "studio"]);

// A typical size per BHK: one tap fills the size box, the partner can still change it.
export const TYPICAL_AREA = { 1: 600, 2: 1000, 3: 1500, 4: 2200, 5: 3000, studio: 400 };
export const PLOT_SIZES_GAJ = [100, 150, 200, 250, 300, 400];

export const RENT_PRICES = [10000, 15000, 20000, 30000, 50000];
export const SALE_PRICES = [
  { label: "50 Lakh", value: 5000000 },
  { label: "75 Lakh", value: 7500000 },
  { label: "1 Crore", value: 10000000 },
  { label: "1.5 Crore", value: 15000000 },
  { label: "2 Crore", value: 20000000 },
];

// Sector suggestions for the (rare) case GPS and search cannot tell us the sector.
export const SECTOR_OPTIONS = [
  ...Array.from({ length: 115 }, (_, i) => `Sector ${i + 1}`),
  "DLF Phase 1", "DLF Phase 2", "DLF Phase 3", "DLF Phase 4", "DLF Phase 5",
  "Sushant Lok", "Golf Course Road", "Golf Course Extension", "Sohna Road", "MG Road",
  "South City", "Palam Vihar", "New Gurgaon", "Dwarka Expressway", "Manesar",
];

export const GAJ_TO_SQFT = 9; // 1 gaj (sq yd) = 9 sq ft

const toRad = (n) => (n * Math.PI) / 180;
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * How well the phone's position agrees with the chosen address.
 * "match" under 1 km, "near" up to 3 km, "far" beyond that (the partner must confirm).
 */
export function checkAddressAgainstGps(gps, loc) {
  if (!gps || !loc || loc.latitude == null || loc.longitude == null || loc.source === "gps") return null;
  const meters = haversineMeters(gps.latitude, gps.longitude, loc.latitude, loc.longitude);
  return { meters, status: meters < 1000 ? "match" : meters < 3000 ? "near" : "far" };
}

export const formatKm = (meters) => (meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`);

/**
 * Reads the phone's location for a few seconds and keeps the MOST accurate reading,
 * stopping early once it is good enough. Rejects with the browser's error (code 1 =
 * permission denied) when nothing was received.
 */
export function getBestPosition({ maxWaitMs = 10000, goodEnoughM = 25 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error("Location is not supported on this phone."), { code: 0 }));
      return;
    }
    let best = null;
    let finished = false;
    let watchId = null;
    let timer = null;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(error || Object.assign(new Error("Could not read your location."), { code: 3 }));
    };
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const c = position.coords;
        if (!best || c.accuracy < best.accuracy) best = { latitude: c.latitude, longitude: c.longitude, accuracy: Math.round(c.accuracy) };
        if (c.accuracy <= goodEnoughM) finish();
      },
      (error) => finish(error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs }
    );
    timer = setTimeout(() => finish(), maxWaitMs);
  });
}

/**
 * Shrinks a phone photo (often 5-10 MB) to about 1600 px / 80% JPEG before upload:
 * much faster on mobile data. If the browser cannot decode it, the original is kept.
 */
export async function compressImage(file, maxSide = 1600, quality = 0.8) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // already small: keep the original
    return new File([blob], renameJpg(file.name), { type: "image/jpeg" });
  } catch (_) {
    return file;
  }
}

const renameJpg = (name) => `${String(name || "photo").replace(/\.[^.]+$/, "")}.jpg`;
