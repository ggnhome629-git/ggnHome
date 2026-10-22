import React, { useCallback, useEffect, useRef, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, ButtonBase, Chip, CircularProgress, Container, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, ChevronDown, ImagePlus, LocateFixed, MapPin, Search, Send, Star, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { rupeesInWords } from "../../../components/postForm/scoring";
import {
  GAJ_TO_SQFT, NO_BHK, PLOT_SIZES_GAJ, RENT_PRICES, RENT_TYPES, SALE_PRICES, SALE_TYPES, SECTOR_OPTIONS, TYPICAL_AREA,
  checkAddressAgainstGps, compressImage, formatKm, getBestPosition,
} from "./quickPostHelpers";

/**
 * Quick listing form for partners: photos, the property, size and price, the place.
 * Four short screens, big buttons, English with Hindi underneath. The title,
 * description, bathrooms and map position are filled in by the server, and the
 * nearby places are found on the last screen (the partner can edit or add to them in a closed
 * menu), so the partner never has to type them.
 */

const API = process.env.REACT_APP_Base_API || "";
const DRAFT_KEY = "partnerQuickPost:v3";
const MAX_PHOTOS = 10;
const GREEN = "#0f766e";
const INK = "#0f172a";

const STEPS = [
  { en: "Photos", hi: "फोटो" },
  { en: "Property", hi: "प्रॉपर्टी" },
  { en: "Size & price", hi: "साइज़, कीमत" },
  { en: "Place", hi: "जगह" },
];
const LAST_STEP = STEPS.length - 1;

// Nearby places the server looks for, with a Hindi name for each.
const NEARBY_LABELS = {
  market: { en: "Market", hi: "बाज़ार" },
  metro: { en: "Metro", hi: "मेट्रो" },
  hospital: { en: "Hospital", hi: "अस्पताल" },
  school: { en: "School", hi: "स्कूल" },
  park: { en: "Park", hi: "पार्क" },
  mall: { en: "Mall", hi: "मॉल" },
};
const NEARBY_ORDER = Object.keys(NEARBY_LABELS);
const NEARBY_EXAMPLES = { market: "Sector 57 Market", metro: "Sikanderpur Metro", hospital: "Fortis Hospital", school: "DPS School", park: "Central Park", mall: "Ambience Mall" };

const EMPTY_FORM = { purpose: "", propertyType: "", bedrooms: "", area: "", areaUnit: "sqft", price: "", furnishing: "", ownerMobile: "" };
const EMPTY_LOC = { address: "", sector: "", latitude: null, longitude: null, source: "", accuracy: null };

const authToken = () => localStorage.getItem("partnerAccessToken") || "";

async function apiJson(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: "include",
    ...options,
    headers: { Accept: "application/json", Authorization: `Bearer ${authToken()}`, ...(options.body ? { "Content-Type": "application/json" } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || "Something went wrong. Please try again."), { status: res.status });
  return data;
}

// Upload with a progress percentage, so a slow connection does not look like a frozen page.
function postProperty(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", API + "/api/partner/properties");
    xhr.setRequestHeader("Authorization", `Bearer ${authToken()}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch (_) { /* keep empty */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(Object.assign(new Error(data.message || "Could not publish. Please try again."), { status: xhr.status }));
    };
    xhr.onerror = () => reject(new Error("No internet. Please check your connection and try again. / इंटरनेट नहीं है, दोबारा कोशिश करें।"));
    xhr.send(formData);
  });
}

function readDraft() {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return raw && typeof raw === "object" ? raw : null;
  } catch (_) {
    return null;
  }
}

/** English headline with the Hindi underneath. */
function Bi({ en, hi, size = 20, sub }) {
  return (
    <Box>
      <Typography sx={{ fontSize: size, fontWeight: 800, color: INK, lineHeight: 1.25 }}>{en}</Typography>
      <Typography sx={{ fontSize: size - 4, color: "#475569", lineHeight: 1.3 }}>{hi}</Typography>
      {sub && <Typography sx={{ fontSize: 14, color: "#64748b", mt: 0.5 }}>{sub}</Typography>}
    </Box>
  );
}

function Choice({ selected, onClick, icon: Icon, en, hi, compact = false }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        position: "relative", flexDirection: "column", justifyContent: "center", gap: 0.5, px: 1.5, py: compact ? 1.25 : 2,
        minHeight: compact ? 64 : 92, borderRadius: 3, border: "2px solid", textAlign: "center", width: "100%",
        borderColor: selected ? GREEN : "#d6dee8", bgcolor: selected ? "#e4f5f0" : "#fff",
        transition: "all .15s ease", "&:active": { transform: "scale(0.97)" },
      }}
    >
      {Icon && <Icon size={compact ? 22 : 30} color={selected ? GREEN : "#334155"} />}
      <Typography sx={{ fontSize: 17, fontWeight: 800, color: INK, lineHeight: 1.2 }}>{en}</Typography>
      {hi && <Typography sx={{ fontSize: 14, color: "#475569", lineHeight: 1.2 }}>{hi}</Typography>}
      {selected && <Box sx={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", bgcolor: GREEN, display: "grid", placeItems: "center" }}><Check size={14} color="#fff" /></Box>}
    </ButtonBase>
  );
}

function BigButton({ icon: Icon, children, sub, ...props }) {
  return (
    <Button
      variant="contained"
      startIcon={Icon ? <Icon size={22} /> : undefined}
      {...props}
      sx={{ minHeight: 60, borderRadius: 3, textTransform: "none", fontWeight: 800, fontSize: 17, bgcolor: GREEN, boxShadow: "none", "&:hover": { bgcolor: "#0b5f58" }, ...(props.sx || {}) }}
    >
      <Box sx={{ textAlign: "left" }}>
        <Box>{children}</Box>
        {sub && <Box sx={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>{sub}</Box>}
      </Box>
    </Button>
  );
}

export default function PartnerQuickPost() {
  const navigate = useNavigate();
  const [draft] = useState(readDraft); // read the saved draft once

  const [step, setStep] = useState(draft?.step ?? 0);
  const [photos, setPhotos] = useState([]); // [{ id, file, url }] (photos are not saved in the draft)
  const [f, setF] = useState({ ...EMPTY_FORM, ...(draft?.f || {}) });
  const [loc, setLoc] = useState({ ...EMPTY_LOC, ...(draft?.loc || {}) });
  const [gps, setGps] = useState(draft?.gps || null);
  const [farConfirmed, setFarConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [locNote, setLocNote] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editSector, setEditSector] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(null); // { title }
  const [typing, setTyping] = useState(false); // a phone keyboard is open: hide the bottom bar
  const [nearby, setNearby] = useState({ status: "idle", items: [] }); // idle | loading | done | failed
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const typeRef = useRef(null);
  const bhkRef = useRef(null);
  const locRef = useRef(loc);
  locRef.current = loc;

  const needsBhk = !!f.propertyType && !NO_BHK.has(f.propertyType);
  const isPlot = f.propertyType === "plot";
  const rent = f.purpose === "rent";
  const types = rent ? RENT_TYPES : SALE_TYPES;
  const areaSqft = isPlot && f.areaUnit === "gaj" ? Number(f.area) * GAJ_TO_SQFT : Number(f.area);
  const check = checkAddressAgainstGps(gps, loc);

  const set = (patch) => { setF((prev) => ({ ...prev, ...patch })); setError(""); };

  // When a new question appears below, bring it into view so nobody has to hunt for it.
  const showSection = (ref) => setTimeout(() => ref.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 120);

  // A new screen always starts at the top (instant: a smooth scroll fights with a touch scroll).
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  // On phones the keyboard covers half the screen: hide the Back/Next bar while a field is being typed in.
  useEffect(() => {
    if (!window.matchMedia || !window.matchMedia("(pointer: coarse)").matches) return undefined;
    let timer;
    const isField = (el) => !!el && /^(INPUT|TEXTAREA)$/.test(el.tagName);
    const onIn = (e) => { clearTimeout(timer); if (isField(e.target)) setTyping(true); };
    const onOut = () => { timer = setTimeout(() => setTyping(false), 150); };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => { clearTimeout(timer); document.removeEventListener("focusin", onIn); document.removeEventListener("focusout", onOut); };
  }, []);

  // Single-line fields: the keyboard's Done key closes the keyboard.
  const doneKeyDown = (e) => { if (e.key === "Enter") e.target.blur(); };

  // Nearby places for the chosen spot, shown on the last screen. Looked up once per spot (not per
  // letter typed, and not again when going Back and Next), so what the partner edited is kept.
  const nearbyFor = useRef("");
  useEffect(() => {
    if (step !== LAST_STEP || loc.latitude == null || loc.longitude == null) return undefined;
    const spot = `${loc.latitude},${loc.longitude}`;
    if (nearbyFor.current === spot) return undefined;
    nearbyFor.current = spot;
    let cancelled = false;
    let finished = false;
    setNearby({ status: "loading", items: [] });
    const timer = setTimeout(async () => {
      try {
        const data = await apiJson("/api/nearby-parameters", { method: "POST", body: JSON.stringify({ address: locRef.current.address, sector: locRef.current.sector, latitude: loc.latitude, longitude: loc.longitude }) });
        if (cancelled) return;
        const items = (data.amenities || []).filter((a) => a.found && NEARBY_LABELS[a.category]).map((a) => ({ category: a.category, name: a.name, distanceMeters: a.distanceMeters }));
        finished = true;
        setNearby({ status: "done", items });
      } catch (_) {
        finished = true;
        if (!cancelled) setNearby({ status: "failed", items: [] });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (!finished) nearbyFor.current = ""; // left before the answer came: look again next time
    };
  }, [step, loc.latitude, loc.longitude]);

  // The partner can change a place, or add one that was not found (a park, a market...).
  const setPlace = (category, patch) => setNearby((prev) => {
    const exists = prev.items.some((a) => a.category === category);
    const items = exists
      ? prev.items.map((a) => (a.category === category ? { ...a, ...patch, edited: true } : a))
      : [...prev.items, { category, name: "", distanceMeters: "", ...patch, edited: true }];
    return { ...prev, items };
  });
  const placeOf = (category) => nearby.items.find((a) => a.category === category) || { name: "", distanceMeters: "" };
  const shownPlaces = nearby.items.filter((a) => String(a.name || "").trim() || Number(a.distanceMeters) > 0);

  // Keep what was typed if the page is closed by accident (photos cannot be kept).
  useEffect(() => {
    if (done) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, f, loc, gps })); } catch (_) { /* storage blocked */ }
  }, [step, f, loc, gps, done]);

  // Release the photo previews when leaving the page (the ref always holds the current list).
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // ---------------------------------------------------------------- photos --
  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList || []).filter((file) => /^image\//.test(file.type)).slice(0, MAX_PHOTOS - photos.length);
    if (!incoming.length) return;
    setError("");
    setCompressing(true);
    try {
      const small = await Promise.all(incoming.map((file) => compressImage(file)));
      setPhotos((prev) => [...prev, ...small.map((file) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS));
    } finally {
      setCompressing(false);
    }
  };
  const removePhoto = (id) => setPhotos((prev) => { const gone = prev.find((p) => p.id === id); if (gone) URL.revokeObjectURL(gone.url); return prev.filter((p) => p.id !== id); });
  const makeFront = (id) => setPhotos((prev) => { const pick = prev.find((p) => p.id === id); return pick ? [pick, ...prev.filter((p) => p.id !== id)] : prev; });

  // -------------------------------------------------------------- location --
  const detectLocation = async () => {
    setError(""); setLocNote(""); setLocBusy(true);
    try {
      const pos = await getBestPosition();
      setGps(pos);
      setFarConfirmed(false);
      try {
        const data = await apiJson("/api/partner/location/reverse", { method: "POST", body: JSON.stringify({ latitude: pos.latitude, longitude: pos.longitude }) });
        setLoc({ address: data.address || "", sector: data.sector || "", latitude: pos.latitude, longitude: pos.longitude, source: "gps", accuracy: pos.accuracy });
        setEditSector(!data.sector);
        if (data.inServiceArea === false) setLocNote("This place looks outside Gurugram. Please check. / यह जगह गुरुग्राम के बाहर लगती है, जाँच लें।");
        else if (pos.accuracy > 100) setLocNote(`Location is only accurate to about ${pos.accuracy} m. Move near a window or outside and try again, or search the address. / लोकेशन ठीक नहीं है, खिड़की के पास जाकर फिर कोशिश करें।`);
      } catch (e) {
        // GPS worked but the address lookup did not: keep the position, ask for the address.
        setLoc((prev) => ({ ...prev, latitude: pos.latitude, longitude: pos.longitude, source: "gps", accuracy: pos.accuracy }));
        setLocNote("We got your location but could not find the address. Please search or type it below. / पता नहीं मिला, नीचे खोजें या लिखें।");
        if (e.status === 401) navigate("/partner/login");
      }
    } catch (e) {
      setLocNote(e.code === 1
        ? "Location is blocked. Allow location for this site in your phone settings, or search the address below. / लोकेशन बंद है, फोन सेटिंग में चालू करें या नीचे पता खोजें।"
        : "Could not find your location. Try near a window, or search the address below. / लोकेशन नहीं मिली, नीचे पता खोजें।");
    } finally {
      setLocBusy(false);
    }
  };

  // Address search: waits until the partner pauses typing.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) { setSuggestions([]); return undefined; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiJson(`/api/partner/location/suggest?q=${encodeURIComponent(text)}`);
        if (!cancelled) setSuggestions(data.suggestions || []);
      } catch (_) {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const pickSuggestion = (s) => {
    setLoc({ address: s.label, sector: s.sector || "", latitude: s.latitude, longitude: s.longitude, source: "search", accuracy: null });
    setEditSector(!s.sector);
    setSuggestions([]); setQuery(""); setFarConfirmed(false); setError("");
  };

  // ------------------------------------------------------------ navigation --
  const validate = (index) => {
    if (index === 0 && !photos.length) return "Add at least 1 photo. / कम से कम 1 फोटो जोड़ें।";
    if (index === 1) {
      if (!f.purpose) return "Choose Rent or Sale. / किराये पर या बिक्री चुनें।";
      if (!f.propertyType) return "Choose the type of property. / प्रॉपर्टी का प्रकार चुनें।";
      if (needsBhk && !f.bedrooms) return "Choose the number of rooms. / कमरे चुनें।";
    }
    if (index === 2) {
      if (!(Number(f.area) > 0)) return "Enter the size. / साइज़ लिखें।";
      if (!(Number(f.price) > 0)) return rent ? "Enter the monthly rent. / किराया लिखें।" : "Enter the price. / कीमत लिखें।";
    }
    if (index === 3) {
      if (loc.address.trim().length < 5) return "Add the address: tap “Use my location” or search. / पता जोड़ें।";
      if (!loc.sector.trim()) return "Choose the sector or area. / सेक्टर या इलाका चुनें।";
      if (!/^[6-9]\d{9}$/.test(f.ownerMobile)) return "Enter the owner's 10-digit mobile number. / मालिक का 10 अंकों का मोबाइल नंबर लिखें।";
      if (check && check.status === "far" && !farConfirmed) return "Your phone is far from this address. Tap “Yes, address is correct” if it is right. / पता सही है तो “हाँ, पता सही है” दबाएँ।";
    }
    return "";
  };

  const goNext = () => {
    const problem = validate(step);
    if (problem) { setError(problem); return; }
    setError("");
    setStep((s) => Math.min(LAST_STEP, s + 1));
  };
  const goBack = () => { setError(""); setStep((s) => Math.max(0, s - 1)); };

  const publish = async () => {
    const firstProblem = [0, 1, 2, 3].find((i) => validate(i));
    if (firstProblem !== undefined) { setStep(firstProblem); setError(validate(firstProblem)); return; }
    const fd = new FormData();
    fd.append("purpose", f.purpose);
    fd.append("propertyType", f.propertyType);
    if (needsBhk) fd.append("bedrooms", f.bedrooms);
    fd.append("area", String(Math.round(areaSqft)));
    fd.append("price", f.price);
    fd.append("address", loc.address.trim());
    fd.append("sector", loc.sector.trim());
    if (loc.latitude != null && loc.longitude != null) { fd.append("latitude", String(loc.latitude)); fd.append("longitude", String(loc.longitude)); }
    fd.append("ownerMobile", f.ownerMobile);
    if (f.furnishing) fd.append("furnishing", f.furnishing);
    // The nearby places shown on this screen (found automatically, or edited / added by the partner)
    // go with the listing, so the server does not search again.
    if (shownPlaces.length) {
      fd.append("amenities", JSON.stringify(shownPlaces.map((a) => ({
        category: a.category,
        name: String(a.name || "").trim(),
        distanceMeters: Number(a.distanceMeters) > 0 ? Math.round(Number(a.distanceMeters)) : undefined,
        source: a.edited ? "partner" : "locationiq",
        edited: !!a.edited,
      }))));
    }
    fd.append("imageCategories", JSON.stringify(photos.map((_, i) => (i === 0 ? "front" : "other"))));
    photos.forEach((p, i) => fd.append("images", p.file, p.file.name || `photo-${i + 1}.jpg`));

    setError(""); setPublishing(true); setProgress(0);
    try {
      const data = await postProperty(fd, setProgress);
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* ignore */ }
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setDone({ title: data.property?.title || "Your property" });
    } catch (e) {
      if (e.status === 401) { localStorage.removeItem("partnerAccessToken"); navigate("/partner/login"); return; }
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const startOver = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* ignore */ }
    setPhotos([]); setF({ ...EMPTY_FORM }); setLoc({ ...EMPTY_LOC }); setGps(null); setFarConfirmed(false);
    setStep(0); setDone(null); setError(""); setLocNote(""); setQuery(""); setSuggestions([]); setNearby({ status: "idle", items: [] }); nearbyFor.current = "";
    window.scrollTo({ top: 0 });
  }, []);

  // ---------------------------------------------------------------- views ---
  if (done) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb", display: "grid", placeItems: "center", px: 2, py: 5 }}>
        <Container maxWidth="sm">
          <Stack spacing={3} alignItems="center" sx={{ textAlign: "center", p: 4, bgcolor: "#fff", borderRadius: 4, border: "1px solid #e2e8f0" }}>
            <CheckCircle2 size={72} color={GREEN} />
            <Bi en="Property published!" hi="प्रॉपर्टी पोस्ट हो गई!" size={26} />
            <Typography sx={{ fontSize: 17, color: INK, fontWeight: 700 }}>{done.title}</Typography>
            <Typography sx={{ fontSize: 14, color: "#64748b" }}>The title and description were written for you. / शीर्षक और विवरण अपने-आप बन गए।</Typography>
            <Stack spacing={1.5} sx={{ width: "100%" }}>
              <BigButton icon={ImagePlus} onClick={startOver} fullWidth sub="दूसरी प्रॉपर्टी जोड़ें">Add another property</BigButton>
              <Button onClick={() => navigate("/partner/properties")} sx={{ minHeight: 52, textTransform: "none", fontWeight: 800, fontSize: 16, borderRadius: 3, border: "2px solid #d6dee8", color: INK }}>
                See my properties / मेरी प्रॉपर्टी
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    );
  }

  const phoneOk = /^[6-9]\d{9}$/.test(f.ownerMobile);

  return (
    <Box sx={{ minHeight: "100vh", "@supports (height: 100dvh)": { minHeight: "100dvh" }, bgcolor: "#f5f7fb", pb: typing ? 3 : "calc(124px + env(safe-area-inset-bottom))" }}>
      <Container maxWidth="sm" sx={{ pt: 2.5, px: 2 }}>
        {/* Progress */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: GREEN, letterSpacing: 0.6 }}>ADD PROPERTY · प्रॉपर्टी जोड़ें</Typography>
          <Typography sx={{ fontSize: 13, color: "#64748b" }}>Step {step + 1} of {STEPS.length} · 2-3 min</Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          {STEPS.map((s, i) => (
            <Box key={s.en} sx={{ flex: 1 }}>
              <Box sx={{ height: 6, borderRadius: 3, bgcolor: i <= step ? GREEN : "#d6dee8" }} />
              <Typography sx={{ fontSize: 13, mt: 0.5, fontWeight: i === step ? 800 : 500, color: i === step ? INK : "#64748b", lineHeight: 1.25 }}>{s.en}<Box component="span" sx={{ display: "block", fontWeight: 500, fontSize: 12 }}>{s.hi}</Box></Typography>
            </Box>
          ))}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2, fontSize: 15, alignItems: "center" }}>{error}</Alert>}

        {/* ------------------------------------------------ 1. photos ------ */}
        {step === 0 && (
          <Stack spacing={2.5}>
            <Bi en="Add photos" hi="फोटो जोड़ें" size={26} sub="Best: 4 to 8 photos. The first photo should show the building from outside. / पहली फोटो बिल्डिंग के बाहर की रखें।" />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <BigButton icon={Camera} fullWidth onClick={() => cameraRef.current?.click()} disabled={photos.length >= MAX_PHOTOS} sub="फोटो खींचें">Take photo</BigButton>
              <BigButton icon={ImagePlus} fullWidth onClick={() => galleryRef.current?.click()} disabled={photos.length >= MAX_PHOTOS} sub="गैलरी से चुनें" sx={{ bgcolor: "#1e40af", "&:hover": { bgcolor: "#1b3a9c" } }}>Choose from gallery</BigButton>
            </Stack>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

            {compressing && <Stack direction="row" spacing={1.5} alignItems="center"><CircularProgress size={22} /><Typography>Getting photos ready… / फोटो तैयार हो रही हैं…</Typography></Stack>}

            {photos.length > 0 && (
              <>
                <Typography sx={{ fontWeight: 800, color: INK }}>{photos.length} photo{photos.length > 1 ? "s" : ""} added · {photos.length} फोटो जुड़ीं {photos.length < 3 && <Box component="span" sx={{ fontWeight: 500, color: "#b45309" }}> (3+ is better / 3+ बेहतर)</Box>}</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.25 }}>
                  {photos.map((p, i) => (
                    <Box key={p.id} sx={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 2.5, overflow: "hidden", border: i === 0 ? `3px solid ${GREEN}` : "1px solid #d6dee8", bgcolor: "#e2e8f0" }}>
                      <Box component="img" src={p.url} alt={`Photo ${i + 1}`} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      {i === 0 && <Chip label="Front · बाहर की" size="small" sx={{ position: "absolute", left: 4, top: 4, bgcolor: GREEN, color: "#fff", fontWeight: 800, fontSize: 11 }} />}
                      <ButtonBase onClick={() => removePhoto(p.id)} aria-label="Remove photo" sx={{ position: "absolute", right: 4, top: 4, width: 32, height: 32, borderRadius: "50%", bgcolor: "rgba(15,23,42,0.75)" }}><X size={18} color="#fff" /></ButtonBase>
                      {i !== 0 && <ButtonBase onClick={() => makeFront(p.id)} aria-label="Make this the front photo" sx={{ position: "absolute", left: 4, bottom: 4, px: 1, height: 30, borderRadius: 15, bgcolor: "rgba(15,23,42,0.75)", color: "#fff", gap: 0.5, fontSize: 12, fontWeight: 700 }}><Star size={14} /> Front</ButtonBase>}
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Stack>
        )}

        {/* ------------------------------------------------ 2. property --- */}
        {step === 1 && (
          <Stack spacing={3}>
            <Bi en="Rent or Sale?" hi="किराये पर या बिक्री?" size={24} />
            <Stack direction="row" spacing={1.5}>
              <Choice selected={f.purpose === "rent"} onClick={() => { if (!f.purpose) showSection(typeRef); set({ purpose: "rent", propertyType: f.propertyType === "plot" ? "" : f.propertyType, price: "" }); }} en="Rent" hi="किराये पर" />
              <Choice selected={f.purpose === "sale"} onClick={() => { if (!f.purpose) showSection(typeRef); set({ purpose: "sale", propertyType: f.propertyType === "studio" ? "" : f.propertyType, price: "" }); }} en="Sale" hi="बिक्री" />
            </Stack>

            {f.purpose && (
              <Box ref={typeRef} sx={{ scrollMarginTop: 12 }}>
                <Stack spacing={2}>
                  <Bi en="What is it?" hi="यह क्या है?" size={22} />
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                    {types.map((t) => (
                      <Choice key={t.value} selected={f.propertyType === t.value} icon={t.icon} en={t.en} hi={t.hi} onClick={() => { if (!NO_BHK.has(t.value) && !f.bedrooms) showSection(bhkRef); set({ propertyType: t.value, bedrooms: NO_BHK.has(t.value) ? "" : f.bedrooms, areaUnit: t.value === "plot" ? "gaj" : "sqft", area: t.value === "plot" || f.propertyType === "plot" ? "" : f.area }); }} />
                    ))}
                  </Box>
                </Stack>
              </Box>
            )}

            {needsBhk && (
              <Box ref={bhkRef} sx={{ scrollMarginTop: 12 }}>
                <Stack spacing={2}>
                  <Bi en="How many rooms (BHK)?" hi="कितने कमरे (BHK)?" size={22} />
                  <Stack direction="row" spacing={1.25}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <ButtonBase key={n} onClick={() => set({ bedrooms: String(n) })} aria-pressed={f.bedrooms === String(n)} sx={{ flex: 1, minHeight: 64, borderRadius: 3, border: "2px solid", borderColor: f.bedrooms === String(n) ? GREEN : "#d6dee8", bgcolor: f.bedrooms === String(n) ? "#e4f5f0" : "#fff", fontSize: 22, fontWeight: 800, color: INK }}>
                        {n === 5 ? "5+" : n}
                      </ButtonBase>
                    ))}
                  </Stack>
                </Stack>
              </Box>
            )}
          </Stack>
        )}

        {/* ------------------------------------------------ 3. size & price */}
        {step === 2 && (
          <Stack spacing={3}>
            <Bi en={isPlot ? "Plot size" : "Size (sq ft)"} hi={isPlot ? "प्लॉट का साइज़" : "साइज़ (वर्ग फुट)"} size={22} />
            {isPlot && (
              <Stack direction="row" spacing={1}>
                <Choice compact selected={f.areaUnit === "gaj"} onClick={() => set({ areaUnit: "gaj" })} en="Gaj" hi="गज" />
                <Choice compact selected={f.areaUnit === "sqft"} onClick={() => set({ areaUnit: "sqft" })} en="Sq ft" hi="वर्ग फुट" />
              </Stack>
            )}
            <TextField
              value={f.area}
              onChange={(e) => set({ area: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              placeholder={isPlot && f.areaUnit === "gaj" ? "e.g. 200" : "e.g. 1000"}
              onKeyDown={doneKeyDown}
              inputProps={{ inputMode: "numeric", enterKeyHint: "done", style: { fontSize: 22, fontWeight: 700, padding: "16px 14px" } }}
              InputProps={{ endAdornment: <Typography sx={{ color: "#64748b", ml: 1, whiteSpace: "nowrap", flexShrink: 0 }}>{isPlot && f.areaUnit === "gaj" ? "gaj" : "sq ft"}</Typography> }}
              fullWidth
            />
            {isPlot && f.areaUnit === "gaj" && Number(f.area) > 0 && <Typography sx={{ color: "#475569" }}>= {Math.round(areaSqft).toLocaleString("en-IN")} sq ft</Typography>}
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {isPlot
                ? (f.areaUnit === "gaj" ? PLOT_SIZES_GAJ : []).map((g) => <Chip key={g} label={`${g} gaj`} onClick={() => set({ area: String(g) })} sx={{ fontSize: 15, fontWeight: 700, height: 40 }} />)
                : (() => { const typical = f.propertyType === "studio" ? TYPICAL_AREA.studio : TYPICAL_AREA[f.bedrooms]; return typical ? <Chip label={`Typical size: ${typical.toLocaleString("en-IN")} sq ft — tap to use / आम साइज़`} onClick={() => set({ area: String(typical) })} color="primary" variant="outlined" sx={{ fontSize: 14, fontWeight: 700, height: "auto", minHeight: 40, py: 0.5, "& .MuiChip-label": { whiteSpace: "normal", textAlign: "left" } }} /> : null; })()}
            </Stack>

            <Bi en={rent ? "Monthly rent" : "Price"} hi={rent ? "महीने का किराया" : "कीमत"} size={22} />
            <TextField
              value={f.price}
              onChange={(e) => set({ price: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              placeholder={rent ? "e.g. 25000" : "e.g. 7500000"}
              onKeyDown={doneKeyDown}
              inputProps={{ inputMode: "numeric", enterKeyHint: "done", style: { fontSize: 22, fontWeight: 700, padding: "16px 14px" } }}
              InputProps={{ startAdornment: <Typography sx={{ fontSize: 22, fontWeight: 700, mr: 0.5 }}>₹</Typography> }}
              helperText={Number(f.price) > 0 ? `${rupeesInWords(f.price)}${rent ? " per month" : ""}` : " "}
              FormHelperTextProps={{ sx: { fontSize: 16, fontWeight: 700, color: GREEN } }}
              fullWidth
            />
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {rent
                ? RENT_PRICES.map((p) => <Chip key={p} label={`₹${p.toLocaleString("en-IN")}`} onClick={() => set({ price: String(p) })} sx={{ fontSize: 15, fontWeight: 700, height: 40 }} />)
                : SALE_PRICES.map((p) => <Chip key={p.value} label={p.label} onClick={() => set({ price: String(p.value) })} sx={{ fontSize: 15, fontWeight: 700, height: 40 }} />)}
            </Stack>

            <Box>
              <Typography sx={{ fontWeight: 700, color: INK, mb: 1 }}>Furnishing (optional) · फर्नीचर (ज़रूरी नहीं)</Typography>
              <Stack direction="row" spacing={1}>
                {[["unfurnished", "Empty", "खाली"], ["semi-furnished", "Some items", "कुछ सामान"], ["furnished", "Full", "पूरा सामान"]].map(([value, en, hi]) => (
                  <Choice key={value} compact selected={f.furnishing === value} onClick={() => set({ furnishing: f.furnishing === value ? "" : value })} en={en} hi={hi} />
                ))}
              </Stack>
            </Box>
          </Stack>
        )}

        {/* ------------------------------------------------ 4. place ------- */}
        {step === LAST_STEP && (
          <Stack spacing={2.5}>
            <Bi en="Where is it?" hi="प्रॉपर्टी कहाँ है?" size={26} sub="Stand at the property and tap the button. We find the address for you. / प्रॉपर्टी पर खड़े होकर बटन दबाएँ।" />
            <BigButton icon={locBusy ? undefined : LocateFixed} fullWidth onClick={detectLocation} disabled={locBusy} sub="मेरी लोकेशन लगाएँ">
              {locBusy ? <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} sx={{ color: "#fff" }} /><span>Finding your location…</span></Stack> : "Use my location"}
            </BigButton>
            {locNote && <Alert severity="warning" sx={{ fontSize: 14 }}>{locNote}</Alert>}

            <Typography sx={{ textAlign: "center", color: "#64748b", fontWeight: 700 }}>— or search the address / या पता खोजें —</Typography>
            <Box>
              <TextField
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Sector 57, Sushant Lok"
                inputProps={{ style: { fontSize: 18, padding: "16px 14px" } }}
                InputProps={{ startAdornment: <Search size={20} style={{ marginRight: 8 }} />, endAdornment: searching ? <CircularProgress size={18} /> : null }}
                fullWidth
              />
              {suggestions.length > 0 && (
                <Stack sx={{ mt: 1, border: "1px solid #d6dee8", borderRadius: 3, bgcolor: "#fff", overflow: "hidden" }}>
                  {suggestions.map((s) => (
                    <ButtonBase key={`${s.latitude}-${s.longitude}-${s.label}`} onClick={() => pickSuggestion(s)} sx={{ justifyContent: "flex-start", textAlign: "left", gap: 1.25, px: 1.5, py: 1.5, borderBottom: "1px solid #eef2f6" }}>
                      <MapPin size={20} color={GREEN} style={{ flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 15 }}>{s.label}</Typography>
                    </ButtonBase>
                  ))}
                </Stack>
              )}
            </Box>

            {(loc.address || loc.latitude != null) && (
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#fff", border: `2px solid ${GREEN}` }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <MapPin size={20} color={GREEN} />
                  <Typography sx={{ fontWeight: 800, color: INK }}>Address · पता</Typography>
                  {loc.source === "gps" && loc.accuracy != null && <Chip size="small" label={`GPS ±${loc.accuracy} m`} sx={{ ml: "auto", fontWeight: 700 }} color={loc.accuracy <= 50 ? "success" : "warning"} />}
                </Stack>
                <TextField value={loc.address} onChange={(e) => setLoc((prev) => ({ ...prev, address: e.target.value, source: prev.source === "gps" ? "gps" : "manual" }))} multiline minRows={2} placeholder="House / flat number, street, society" inputProps={{ style: { fontSize: 16 } }} fullWidth />
                <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.5 }}>You can add the house or flat number here. / यहाँ मकान या फ्लैट नंबर जोड़ सकते हैं।</Typography>

                <Box sx={{ mt: 1.5 }}>
                  {loc.sector && !editSector ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={loc.sector} sx={{ fontSize: 16, fontWeight: 800, height: 38, bgcolor: "#e4f5f0", color: GREEN }} />
                      <Button size="small" onClick={() => setEditSector(true)} sx={{ textTransform: "none", fontWeight: 700 }}>Change / बदलें</Button>
                    </Stack>
                  ) : (
                    <Autocomplete
                      freeSolo
                      options={SECTOR_OPTIONS}
                      value={loc.sector}
                      onInputChange={(_, value) => setLoc((prev) => ({ ...prev, sector: value }))}
                      renderInput={(params) => <TextField {...params} label="Sector / area · सेक्टर या इलाका" placeholder="e.g. Sector 57" />}
                    />
                  )}
                </Box>
              </Box>
            )}

            {check && check.status === "match" && <Alert icon={<CheckCircle2 size={20} />} severity="success" sx={{ fontSize: 15 }}>Address matches your location ({formatKm(check.meters)} apart). / पता आपकी लोकेशन से मेल खाता है।</Alert>}
            {check && check.status === "near" && <Alert severity="warning" sx={{ fontSize: 15 }}>Your phone is {formatKm(check.meters)} from this address. Please check it is right. / पता जाँच लें।</Alert>}
            {check && check.status === "far" && (
              <Alert severity="warning" sx={{ fontSize: 15 }} action={!farConfirmed ? <Button color="inherit" size="small" onClick={() => setFarConfirmed(true)} sx={{ fontWeight: 800 }}>Yes, address is correct</Button> : null}>
                {farConfirmed ? "Thanks, address confirmed. / पता सही माना गया।" : `Your phone is ${formatKm(check.meters)} away from this address. Is the address correct? / आपका फोन इस पते से दूर है, क्या पता सही है?`}
              </Alert>
            )}

            {loc.latitude != null && (
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#fff", border: "1px solid #d6dee8" }}>
                <Typography sx={{ fontWeight: 800, color: INK }}>Nearby places · आसपास की जगहें</Typography>
                {nearby.status === "loading" && (
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                    <CircularProgress size={20} />
                    <Typography sx={{ fontSize: 14, color: "#475569" }}>Finding nearby places… / आसपास की जगहें खोज रहे हैं…</Typography>
                  </Stack>
                )}
                {nearby.status !== "loading" && shownPlaces.length > 0 && (
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    {shownPlaces.map((a) => (
                      <Stack key={a.category} direction="row" spacing={1} alignItems="baseline" justifyContent="space-between">
                        <Typography sx={{ fontSize: 15, color: INK, minWidth: 0 }}><b>{NEARBY_LABELS[a.category].en}</b> · {NEARBY_LABELS[a.category].hi}{a.name && <Box component="span" sx={{ display: "block", fontSize: 13, color: "#64748b" }}>{a.name}</Box>}</Typography>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: GREEN, whiteSpace: "nowrap" }}>{Number(a.distanceMeters) > 0 ? formatKm(Number(a.distanceMeters)) : ""}</Typography>
                      </Stack>
                    ))}
                    <Typography sx={{ fontSize: 12, color: "#64748b" }}>Approximate straight-line distance. These are added to your listing. / अनुमानित दूरी, लिस्टिंग में अपने-आप जुड़ेगी।</Typography>
                  </Stack>
                )}
                {nearby.status === "done" && shownPlaces.length === 0 && (
                  <Typography sx={{ mt: 1, fontSize: 14, color: "#475569" }}>No nearby places found for this spot. You can still publish. / इस जगह के पास कुछ नहीं मिला, फिर भी पोस्ट कर सकते हैं।</Typography>
                )}
                {nearby.status === "failed" && shownPlaces.length === 0 && (
                  <Typography sx={{ mt: 1, fontSize: 14, color: "#475569" }}>Could not find nearby places right now. You can still publish. / अभी आसपास की जगहें नहीं मिलीं, फिर भी पोस्ट कर सकते हैं।</Typography>
                )}

                {/* Closed by default: everything above is filled in automatically. */}
                {nearby.status !== "loading" && (
                  <Accordion disableGutters elevation={0} square sx={{ mt: 1.5, border: "1px solid #d6dee8", borderRadius: "12px !important", "&:before": { display: "none" }, overflow: "hidden" }}>
                    <AccordionSummary expandIcon={<ChevronDown size={22} />} sx={{ minHeight: 52, "& .MuiAccordionSummary-content": { my: 1 } }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 15, color: GREEN }}>Edit or add places · जगहें बदलें या जोड़ें</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      <Typography sx={{ fontSize: 13, color: "#64748b", mb: 1.5 }}>Found something we missed, like a park? Add its name and distance. / कुछ छूट गया हो, जैसे पार्क? नाम और दूरी लिखें।</Typography>
                      <Stack spacing={2}>
                        {NEARBY_ORDER.map((category) => {
                          const place = placeOf(category);
                          const has = String(place.name || "").trim() || Number(place.distanceMeters) > 0;
                          return (
                            <Box key={category}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography sx={{ fontWeight: 800, color: INK, fontSize: 15 }}>{NEARBY_LABELS[category].en} · {NEARBY_LABELS[category].hi}</Typography>
                                {has && <Button size="small" onClick={() => setPlace(category, { name: "", distanceMeters: "" })} sx={{ textTransform: "none", fontWeight: 700, minWidth: 0 }}>Clear · हटाएँ</Button>}
                              </Stack>
                              <TextField
                                value={place.name || ""}
                                onChange={(e) => setPlace(category, { name: e.target.value.slice(0, 80) })}
                                onKeyDown={doneKeyDown}
                                placeholder={`e.g. ${NEARBY_EXAMPLES[category]}`}
                                inputProps={{ "aria-label": `${NEARBY_LABELS[category].en} name`, enterKeyHint: "done", style: { fontSize: 16, padding: "12px 14px" } }}
                                fullWidth
                                sx={{ mt: 0.75 }}
                              />
                              <TextField
                                value={place.distanceMeters === null || place.distanceMeters === undefined ? "" : String(place.distanceMeters)}
                                onChange={(e) => setPlace(category, { distanceMeters: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                                onKeyDown={doneKeyDown}
                                placeholder="Distance in metres"
                                inputProps={{ "aria-label": `${NEARBY_LABELS[category].en} distance in metres`, inputMode: "numeric", enterKeyHint: "done", style: { fontSize: 16, padding: "12px 14px" } }}
                                InputProps={{ endAdornment: <Typography sx={{ color: "#64748b", ml: 1, whiteSpace: "nowrap", flexShrink: 0 }}>{Number(place.distanceMeters) >= 1000 ? formatKm(Number(place.distanceMeters)) : "m"}</Typography> }}
                                sx={{ mt: 1, width: { xs: "100%", sm: 260 } }}
                              />
                            </Box>
                          );
                        })}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )}

            <Bi en="Owner's mobile number" hi="मालिक का मोबाइल नंबर" size={22} sub="Only the GgnHome team sees this. / इसे सिर्फ GgnHome टीम देखती है।" />
            <TextField
              value={f.ownerMobile}
              onChange={(e) => set({ ownerMobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              onKeyDown={doneKeyDown}
              placeholder="10-digit number"
              inputProps={{ inputMode: "numeric", enterKeyHint: "done", style: { fontSize: 22, fontWeight: 700, padding: "16px 14px", letterSpacing: 1 } }}
              InputProps={{ endAdornment: phoneOk ? <CheckCircle2 size={22} color={GREEN} /> : null }}
              fullWidth
            />

            <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#eef6ff", border: "1px solid #cfe0f7" }}>
              <Typography sx={{ fontWeight: 800, color: INK, mb: 0.5 }}>We will write the rest for you ✔</Typography>
              <Typography sx={{ fontSize: 14, color: "#334155" }}>Title, description, bathrooms and map position are added automatically. / शीर्षक, विवरण और नक्शे की जगह अपने-आप जुड़ जाएँगी।</Typography>
            </Box>
          </Stack>
        )}
      </Container>

      {/* Bottom bar: easy to reach with a thumb. Hidden while the phone keyboard is open. */}
      <Box sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, bgcolor: "#fff", borderTop: "1px solid #d6dee8", pb: "env(safe-area-inset-bottom)", display: typing && !publishing ? "none" : "block" }}>
        <Container maxWidth="sm" sx={{ py: 1.5, px: 2 }}>
          {publishing && (
            <Box sx={{ mb: 1.25 }}>
              <LinearProgress variant={progress >= 100 ? "indeterminate" : "determinate"} value={progress} sx={{ height: 8, borderRadius: 4 }} />
              <Typography sx={{ fontSize: 13, color: "#475569", mt: 0.5 }}>{progress >= 100 ? "Saving your property… this can take a minute. / सेव हो रहा है…" : `Uploading photos ${progress}% / फोटो अपलोड हो रही हैं`}</Typography>
            </Box>
          )}
          <Stack direction="row" spacing={1.5}>
            {step > 0 && (
              <Button onClick={goBack} disabled={publishing} startIcon={<ArrowLeft size={20} />} sx={{ minHeight: 56, px: 2.5, borderRadius: 3, textTransform: "none", fontWeight: 800, fontSize: 16, border: "2px solid #d6dee8", color: INK }}>
                Back
              </Button>
            )}
            {step < LAST_STEP ? (
              <BigButton fullWidth onClick={goNext} disabled={compressing} sx={{ flex: 1 }} endIcon={<ArrowRight size={22} />} sub="आगे बढ़ें">Next</BigButton>
            ) : (
              <BigButton fullWidth icon={Send} onClick={publish} disabled={publishing} sx={{ flex: 1 }} sub="प्रकाशित करें">{publishing ? "Publishing…" : "Publish property"}</BigButton>
            )}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
