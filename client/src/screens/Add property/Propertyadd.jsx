import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  FormControlLabel,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, Eye, MapPin, PencilLine, RotateCcw, Send, ShieldCheck, Sparkles, Wallet, Wand2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import PanoramicImagesModal from "./panaromicimagesadd.jsx";
import { useAuth } from "../../Context/AuthContext";
import PostFormLayout from "../../components/postForm/PostFormLayout";
import { ChoiceChips, ChoiceTiles, FormSection } from "../../components/postForm/ChoiceChips";
import PhotoUploader from "../../components/postForm/PhotoUploader";
import TrustPanel from "../../components/postForm/TrustPanel";
import PostPromos from "../../components/postForm/PostPromos";
import ReviewChecks from "../../components/postForm/ReviewChecks";
import PropertyCard from "../../components/property/PropertyCard";
import { computeScore, todayISO } from "../../components/postForm/scoring";
import { radii } from "../../theme/theme";
import {
  AGES,
  BATH_OPTIONS,
  BHK_OPTIONS,
  FEATURES,
  FURNISHING,
  INITIAL,
  LOCALITY_OPTIONS,
  PARKING,
  POSSESSION,
  PURPOSES,
  STEP,
  STEPS,
  TENANTS,
  buildFormData,
  configuration,
  firstInvalidStep,
  isPlot,
  previewProperty,
  propertyTypes,
  reviewChecks,
  rupeesInWords,
  scoreItems,
  suggestDescription,
  suggestTitle,
  typeLabel,
  validateStep,
} from "./propertyFormConfig";

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const DRAFT_KEY = "postPropertyDraft:v2";
const HEADER_BADGES = [
  { icon: Wallet, label: "Free Listing" },
  { icon: ShieldCheck, label: "Reviewed Before Going Live" },
  { icon: PencilLine, label: "Edit Anytime" },
];

function readDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return d && d.f ? d : null;
  } catch (e) {
    return null;
  }
}

function money(n) {
  return n ? `₹${Number(n).toLocaleString("en-IN")}` : "";
}

function SummaryBlock({ title, rows, onEdit }) {
  const shown = rows.filter(([, v]) => v !== "" && v != null && v !== false);
  return (
    <Box sx={{ p: 4, borderRadius: `${radii.md}px`, border: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 800, color: "primary.main" }}>{title}</Typography>
        <Button size="small" onClick={onEdit} startIcon={<PencilLine size={14} />} sx={{ fontWeight: 700 }}>
          Edit
        </Button>
      </Stack>
      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "minmax(110px, 40%) 1fr", rowGap: 1.5, columnGap: 3 }}>
        {shown.map(([k, v]) => (
          <React.Fragment key={k}>
            <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
              {k}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 600, color: "text.primary", wordBreak: "break-word" }}>
              {v}
            </Typography>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}

export default function PropertyListingForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userToken = localStorage.getItem("accessToken");

  const initialDraft = useRef(readDraft()).current;
  const [f, setF] = useState(() => {
    if (initialDraft) return { ...INITIAL, ...initialDraft.f };
    const q = new URLSearchParams(location.search).get("purpose");
    const purpose = /^sale|sell$/i.test(q || "") ? "Sale" : /^rent$/i.test(q || "") ? "Rent" : "";
    return { ...INITIAL, purpose };
  });
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  const [reached, setReached] = useState(initialDraft?.reached ?? 0);
  const [restored, setRestored] = useState(Boolean(initialDraft));
  const [photos, setPhotos] = useState([]);
  const [panoramas, setPanoramas] = useState([]);
  const [panoOpen, setPanoOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saved, setSaved] = useState(null);

  // Autosave everything except files (browsers can't store those).
  useEffect(() => {
    if (saved) return undefined;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ f, step, reached }));
      } catch (e) {
        // storage full or blocked — the form still works, just without a draft
      }
    }, 600);
    return () => clearTimeout(t);
  }, [f, step, reached, saved]);

  const set = (key) => (value) => {
    setF((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const onInput = (key) => (e) => set(key)(e.target.value);

  const { score, missing } = useMemo(() => computeScore(scoreItems(f.purpose), { f, photos }), [f, photos]);
  const rent = f.purpose !== "Sale";
  const roleLabel = (() => {
    const r = String(user?.role || "").toLowerCase();
    return r === "admin" ? "Admin" : r === "agent" ? "Agent" : "Owner";
  })();

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const goTo = (target) => {
    if (target === step) return;
    if (target > reached) {
      const bad = firstInvalidStep(f, target - 1);
      if (bad !== -1) {
        setErrors(validateStep(bad, f));
        setStep(bad);
        scrollToTop();
        return;
      }
      setReached(target);
    }
    setErrors({});
    setStep(target);
    scrollToTop();
  };

  const showErrors = (errs) => {
    setErrors(errs);
    const first = Object.keys(errs)[0];
    setTimeout(() => {
      const el = document.getElementById(`field-${first}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const next = () => {
    const errs = validateStep(step, f);
    if (Object.keys(errs).length) return showErrors(errs);
    if (step === STEP.review) return submit();
    const to = step + 1;
    setReached((r) => Math.max(r, to));
    setErrors({});
    setStep(to);
    scrollToTop();
  };
  const back = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
    scrollToTop();
  };

  const startOver = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      // ignore
    }
    setF({ ...INITIAL });
    setPhotos([]);
    setPanoramas([]);
    setStep(0);
    setReached(0);
    setErrors({});
    setRestored(false);
  };

  async function submit() {
    if (submitting) return;
    const bad = firstInvalidStep(f);
    if (bad !== -1) {
      setStep(bad);
      showErrors(validateStep(bad, f));
      return;
    }
    if (!declared) {
      showErrors({ declaration: "Please confirm the details are accurate" });
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const url = rent ? process.env.REACT_APP_ADD_RENT_PROPERTY_API : process.env.REACT_APP_ADD_SALE_PROPERTY_API;
      const res = await fetch(url, {
        method: "POST",
        body: buildFormData(f, photos, panoramas),
        credentials: "include",
        headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
      });
      if (res.status === 401) {
        navigate("/login", { state: { from: "/add-property" } });
        return;
      }
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        data = null;
      }
      if (!res.ok) {
        const msg = (data && (data.message || data.error)) || "We couldn't post your property. Please try again.";
        const detail = data && typeof data.error === "string" && data.message ? ` (${data.error})` : "";
        setSubmitError(`${msg}${detail}`);
        return;
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        // ignore
      }
      setSaved(data?.property || data || {});
    } catch (err) {
      setSubmitError(`Network error: ${err.message}. Your details are saved — try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------- steps
  const err = (k) => errors[k];
  const amountHelper = (v) => (v ? rupeesInWords(v) : " ");

  const stepBasics = (
    <>
      <FormSection title="I Want To" required error={err("purpose")} id="field-purpose">
        <ChoiceTiles
          ariaLabel="Purpose"
          options={PURPOSES}
          value={f.purpose}
          columns={{ xs: 2 }}
          error={Boolean(err("purpose"))}
          onChange={(v) =>
            setF((prev) => ({
              ...prev,
              purpose: v,
              // Plot and 1 RK only exist on one side.
              propertyType: propertyTypes(v).some((t) => t.value === prev.propertyType) ? prev.propertyType : "",
            }))
          }
        />
      </FormSection>
      <FormSection title="Property Type" required error={err("propertyType")} id="field-propertyType">
        <ChoiceTiles ariaLabel="Property type" options={propertyTypes(f.purpose)} value={f.propertyType} onChange={set("propertyType")} columns={{ xs: 2, sm: 3 }} error={Boolean(err("propertyType"))} />
      </FormSection>
    </>
  );

  const stepLocation = (
    <>
      <FormSection title="City">
        <Chip icon={<MapPin size={14} />} label="Gurgaon (Gurugram)" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
      </FormSection>
      <FormSection title="Sector / Locality" required hint="Pick from the list or type your own — e.g. Sector 56, DLF Phase 3" id="field-Sector">
        <Autocomplete
          freeSolo
          options={LOCALITY_OPTIONS}
          inputValue={f.Sector}
          onInputChange={(e, v) => set("Sector")(v || "")}
          filterOptions={(opts, state) => {
            const q = state.inputValue.trim().toLowerCase();
            if (!q) return opts.slice(0, 40);
            const digits = q.replace(/\D/g, "");
            return opts.filter((o) => o.toLowerCase().includes(q) || (digits && o === `Sector ${digits}`)).slice(0, 40);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search sector or locality"
              error={Boolean(err("Sector"))}
              helperText={err("Sector") || " "}
              InputProps={{ ...params.InputProps, startAdornment: <MapPin size={18} color="#00A79D" style={{ marginLeft: 6 }} /> }}
            />
          )}
        />
      </FormSection>
      <FormSection title={rent ? "Society / Street Address" : "Full Address"} required={!rent} hint="Shown only as the area name on the card" id="field-address">
        <TextField
          fullWidth
          value={f.address}
          onChange={onInput("address")}
          placeholder={rent ? "e.g. Tower B, Orchid Petals, Sohna Road" : "e.g. House 123, Block C, Sushant Lok 1"}
          error={Boolean(err("address"))}
          helperText={err("address") || " "}
          inputProps={{ maxLength: 200 }}
        />
      </FormSection>
    </>
  );

  const stepProfile = (
    <>
      {!isPlot(f) && f.propertyType !== "1RK" && (
        <FormSection title="Bedrooms" required error={err("bhk")} id="field-bhk">
          <ChoiceChips ariaLabel="Bedrooms" options={BHK_OPTIONS} value={f.bhk} onChange={set("bhk")} error={Boolean(err("bhk"))} />
        </FormSection>
      )}
      {!isPlot(f) && (
        <FormSection title="Bathrooms">
          <ChoiceChips ariaLabel="Bathrooms" options={BATH_OPTIONS} value={f.bathrooms} onChange={set("bathrooms")} />
        </FormSection>
      )}
      <FormSection title={isPlot(f) ? "Plot Area" : "Built-Up Area"} required id="field-sqft">
        <TextField
          type="number"
          value={f.sqft}
          onChange={onInput("sqft")}
          placeholder="e.g. 1450"
          error={Boolean(err("sqft"))}
          helperText={err("sqft") || (Number(f.sqft) > 0 ? `≈ ${Math.round(Number(f.sqft) / 9).toLocaleString("en-IN")} sq yd · ${Math.round(Number(f.sqft) * 0.0929).toLocaleString("en-IN")} sq m` : " ")}
          InputProps={{ endAdornment: <InputAdornment position="end">sqft</InputAdornment> }}
          inputProps={{ min: 0, inputMode: "numeric" }}
          sx={{ width: { xs: "100%", sm: 320 } }}
        />
      </FormSection>
      {!isPlot(f) && (
        <FormSection title="Floor Details">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
            <TextField id="field-totalFloors" type="number" label="Total floors in building" value={f.totalFloors} onChange={onInput("totalFloors")} error={Boolean(err("totalFloors"))} helperText={err("totalFloors") || " "} inputProps={{ min: 0, inputMode: "numeric" }} fullWidth />
            <TextField id="field-floor" type="number" label={rent ? "Floor for rent (0 = ground)" : "Property on floor (0 = ground)"} value={f.floor} onChange={onInput("floor")} error={Boolean(err("floor"))} helperText={err("floor") || " "} inputProps={{ min: 0, inputMode: "numeric" }} fullWidth />
          </Stack>
        </FormSection>
      )}
      {!isPlot(f) && (
        <FormSection title="Furnishing">
          <ChoiceChips ariaLabel="Furnishing" options={FURNISHING} value={f.furnishing} onChange={set("furnishing")} />
        </FormSection>
      )}
      <FormSection title="Parking">
        <ChoiceChips ariaLabel="Parking" options={PARKING} value={f.parking} onChange={set("parking")} />
      </FormSection>
      {!isPlot(f) && (
        <FormSection title="Features & Amenities" hint="Tick everything that's included">
          <ChoiceChips multiple size="sm" ariaLabel="Features" options={FEATURES} value={f.appliances} onChange={set("appliances")} />
        </FormSection>
      )}
    </>
  );

  const perSqft = (() => {
    const amount = Number(rent ? f.monthlyRent : f.price);
    const sq = Number(f.sqft);
    return amount > 0 && sq > 0 ? Math.round(amount / sq) : 0;
  })();

  const stepPrice = (
    <>
      {rent ? (
        <>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
<Box sx={{ flex: 1 }}>
            <FormSection title="Monthly Rent" required id="field-monthlyRent">
              <TextField
                type="number"
                fullWidth
                value={f.monthlyRent}
                onChange={onInput("monthlyRent")}
                placeholder="e.g. 35000"
                error={Boolean(err("monthlyRent"))}
                helperText={err("monthlyRent") || (perSqft ? `${amountHelper(f.monthlyRent)} · ₹${perSqft}/sqft` : amountHelper(f.monthlyRent))}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment>, endAdornment: <InputAdornment position="end">/month</InputAdornment> }}
                inputProps={{ min: 0, inputMode: "numeric" }}
              />
            </FormSection>
            </Box>
            <Box sx={{ flex: 1 }}>
            <FormSection title="Security Deposit" id="field-securityDeposit">
              <TextField
                type="number"
                fullWidth
                value={f.securityDeposit}
                onChange={onInput("securityDeposit")}
                placeholder="e.g. 70000"
                error={Boolean(err("securityDeposit"))}
                helperText={err("securityDeposit") || amountHelper(f.securityDeposit)}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0, inputMode: "numeric" }}
              />
              {Number(f.monthlyRent) > 0 && (
                <Stack direction="row" spacing={1.5} sx={{ mt: -1 }}>
                  {[1, 2, 3].map((m) => (
                    <Chip key={m} size="small" variant="outlined" label={`${m} month${m > 1 ? "s" : ""}`} onClick={() => set("securityDeposit")(String(m * Number(f.monthlyRent)))} />
                  ))}
                </Stack>
              )}
            </FormSection>
            </Box>
          </Stack>
          <FormSection title="Available From" id="field-moveInDate">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "flex-start" }}>
              <Chip
                label="Immediately"
                color={f.moveInDate === todayISO() ? "secondary" : "default"}
                variant={f.moveInDate === todayISO() ? "filled" : "outlined"}
                onClick={() => set("moveInDate")(todayISO())}
                sx={{ fontWeight: 700, alignSelf: { xs: "flex-start", sm: "center" } }}
              />
              <TextField type="date" value={f.moveInDate} onChange={onInput("moveInDate")} error={Boolean(err("moveInDate"))} helperText={err("moveInDate") || " "} inputProps={{ min: todayISO() }} sx={{ width: { xs: "100%", sm: 240 } }} />
            </Stack>
          </FormSection>
          <FormSection title="Preferred Tenants">
            <ChoiceChips multiple ariaLabel="Preferred tenants" options={TENANTS} value={f.tenants} onChange={set("tenants")} />
          </FormSection>
        </>
      ) : (
        <>
          <FormSection title="Expected Price" required id="field-price">
            <TextField
              type="number"
              value={f.price}
              onChange={onInput("price")}
              placeholder="e.g. 18500000"
              error={Boolean(err("price"))}
              helperText={err("price") || (perSqft ? `${amountHelper(f.price)} · ₹${perSqft.toLocaleString("en-IN")}/sqft` : amountHelper(f.price))}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              inputProps={{ min: 0, inputMode: "numeric" }}
              sx={{ width: { xs: "100%", sm: 360 } }}
            />
          </FormSection>
          <FormSection title="Possession Status">
            <ChoiceChips ariaLabel="Possession status" options={POSSESSION} value={f.possessionStatus} onChange={set("possessionStatus")} />
          </FormSection>
          {!isPlot(f) && (
            <FormSection title="Age Of Property">
              <ChoiceChips ariaLabel="Age of property" options={AGES} value={f.propertyAge} onChange={set("propertyAge")} />
            </FormSection>
          )}
        </>
      )}

      <FormSection title="Listing Title" required id="field-title">
        <TextField
          fullWidth
          value={f.title}
          onChange={onInput("title")}
          placeholder="e.g. Furnished 3 BHK Apartment for Rent in Sector 56"
          error={Boolean(err("title"))}
          helperText={err("title") || `${f.title.length}/100`}
          inputProps={{ maxLength: 100 }}
        />
        <Button size="small" startIcon={<Sparkles size={14} />} onClick={() => set("title")(suggestTitle(f))} sx={{ mt: 1, fontWeight: 700 }}>
          Suggest a title
        </Button>
      </FormSection>
      <FormSection title="Description" hint="What's nearby, condition, society facilities, rules" id="field-description">
        <TextField
          fullWidth
          multiline
          minRows={5}
          value={f.description}
          onChange={onInput("description")}
          placeholder="Describe the home in a few lines…"
          error={Boolean(err("description"))}
          helperText={err("description") || `${f.description.length}/2000 · Don't add phone numbers — enquiries reach you through ggnHome`}
          inputProps={{ maxLength: 2000 }}
        />
        <Button
          size="small"
          startIcon={<Wand2 size={14} />}
          onClick={() => {
            const draft = suggestDescription(f);
            set("description")(f.description.trim() ? `${f.description.trim()}\n\n${draft}` : draft);
          }}
          sx={{ mt: 1, fontWeight: 700 }}
        >
          Write it for me
        </Button>
      </FormSection>
    </>
  );

  const stepPhotos = (
    <>
      <PhotoUploader
        value={photos}
        onChange={setPhotos}
        max={8}
        privacyNotice="For your safety, please don't upload photos that show the front of your house or your house number. Photos of rooms, kitchen, bathrooms and the view work best."
        tips={["Shoot in daylight with lights on", "Hold the phone horizontally and capture whole rooms", "The first photo is the cover — pick your best one"]}
      />
      <Box sx={{ mt: 6, p: 5, borderRadius: `${radii.md}px`, border: "1.5px dashed #A9C7E6", backgroundColor: "#F7FBFF" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "primary.main" }}>360° Virtual Tour (Optional)</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {panoramas.length ? `${panoramas.length} panoramic scene${panoramas.length > 1 ? "s" : ""} added.` : "Upload 2:1 panoramic photos with room names for the 3D viewer."}
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => setPanoOpen(true)} sx={{ fontWeight: 700, flexShrink: 0 }}>
            {panoramas.length ? "Edit 360° Scenes" : "Add 360° Scenes"}
          </Button>
        </Stack>
      </Box>
    </>
  );

  const checks = reviewChecks(f, photos);
  const stepReview = (
    <>
      <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 340px) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Eye size={14} /> Preview
          </Typography>
          <Box sx={{ maxWidth: 360, pointerEvents: "none" }}>
            <PropertyCard property={previewProperty(f, photos)} />
          </Box>
        </Box>
        <Stack spacing={4}>
          <SummaryBlock
            title="Basics & Location"
            onEdit={() => goTo(STEP.basics)}
            rows={[
              ["Listing for", rent ? "Rent" : "Sale"],
              ["Type", typeLabel(f.propertyType)],
              ["Sector", f.Sector],
              [rent ? "Address" : "Full address", f.address],
            ]}
          />
          <SummaryBlock
            title="Property Profile"
            onEdit={() => goTo(STEP.profile)}
            rows={[
              ["Configuration", configuration(f)],
              ["Bathrooms", f.bathrooms],
              ["Area", f.sqft ? `${Number(f.sqft).toLocaleString("en-IN")} sqft` : ""],
              ["Floor", f.floor !== "" ? `${f.floor}${f.totalFloors !== "" ? ` of ${f.totalFloors}` : ""}` : f.totalFloors !== "" ? `${f.totalFloors} floors` : ""],
              ["Furnishing", FURNISHING.find((x) => x.value === f.furnishing)?.label],
              ["Parking", f.parking],
              ["Features", f.appliances.join(", ")],
            ]}
          />
          <SummaryBlock
            title="Price & Description"
            onEdit={() => goTo(STEP.price)}
            rows={
              rent
                ? [
                    ["Rent", f.monthlyRent ? `${money(f.monthlyRent)}/month` : ""],
                    ["Deposit", money(f.securityDeposit)],
                    ["Available from", f.moveInDate ? new Date(f.moveInDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""],
                    ["Preferred tenants", f.tenants.join(", ")],
                    ["Title", f.title],
                    ["Description", f.description],
                  ]
                : [
                    ["Price", f.price ? `${money(f.price)} (${rupeesInWords(f.price)})` : ""],
                    ["Possession", POSSESSION.find((x) => x.value === f.possessionStatus)?.label],
                    ["Age", f.propertyAge],
                    ["Title", f.title],
                    ["Description", f.description],
                  ]
            }
          />
        </Stack>
      </Box>

      <Box sx={{ mt: 7 }}>
        <Typography sx={{ fontWeight: 800, color: "primary.main", mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
          <ClipboardCheck size={18} /> Listing Check
        </Typography>
        <ReviewChecks checks={checks} onJump={goTo} />
      </Box>

      <Box id="field-declaration" sx={{ mt: 6, p: 4, borderRadius: `${radii.md}px`, backgroundColor: err("declaration") ? "#FEF2F2" : "#F4F7F9" }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={declared}
              color="secondary"
              onChange={(e) => {
                setDeclared(e.target.checked);
                if (errors.declaration) setErrors((p) => ({ ...p, declaration: undefined }));
              }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: "text.primary" }}>
              I confirm these details are accurate and I'm the owner or authorised to list this property. I understand the listing goes live after ggnHome's review.
            </Typography>
          }
        />
        {err("declaration") && (
          <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 600, ml: 8 }} role="alert">
            {err("declaration")}
          </Typography>
        )}
      </Box>
      {submitError && (
        <Alert severity="error" sx={{ mt: 4 }} onClose={() => setSubmitError("")}>
          {submitError}
        </Alert>
      )}
    </>
  );

  const content = [stepBasics, stepLocation, stepProfile, stepPrice, stepPhotos, stepReview][step];
  const hasErrors = Object.values(errors).some(Boolean);
  const steps = STEPS.map((s, i) => ({ ...s, complete: i < STEP.review && !Object.keys(validateStep(i, f)).length }));

  const savedProperty = saved && (saved.property || saved);
  const openSaved = () => {
    const id = savedProperty?._id;
    if (!id) return navigate("/my-properties");
    navigate(rent ? `/Rentaldetails/${id}` : `/Saledetails/${id}`, { state: { preview: true } });
  };

  return (
    <>
      <PostFormLayout
        nav={<TopNavigationBar navItems={NAV_ITEMS} />}
        eyebrow="Post Property · Free"
        title={f.purpose === "Sale" ? "Sell Your Property Faster" : f.purpose === "Rent" ? "Rent Out Your Property" : "Post Your Property For Free"}
        subtitle="Reach tenants and buyers across Gurgaon. Fill in the details, preview your listing and post — our team reviews it before it goes live."
        badges={HEADER_BADGES}
        steps={steps}
        current={step}
        reached={reached}
        onStepClick={goTo}
        score={score}
        missing={missing}
        onBack={back}
        onNext={next}
        nextLabel={step === STEP.review ? "Post Property" : step === STEP.photos ? "Preview Listing" : "Continue"}
        nextIcon={step === STEP.review ? Send : undefined}
        loading={submitting}
        notice={
          <>
            {restored && (
              <Alert
                severity="info"
                icon={<RotateCcw size={18} />}
                sx={{ mb: 4, borderRadius: `${radii.md}px` }}
                action={
                  <Button color="inherit" size="small" onClick={startOver} sx={{ fontWeight: 700 }}>
                    Start Over
                  </Button>
                }
                onClose={() => setRestored(false)}
              >
                We restored your unfinished listing. Photos need to be added again.
              </Alert>
            )}
            {hasErrors && (
              <Alert severity="error" sx={{ mb: 4, borderRadius: `${radii.md}px` }}>
                Please fix the highlighted fields to continue.
              </Alert>
            )}
          </>
        }
        aside={
          <>
            <TrustPanel user={user} roleLabel={roleLabel} />
            <PostPromos type={f.purpose === "Sale" ? "sale" : f.purpose === "Rent" ? "rent" : ""} />
          </>
        }
      >
        {content}
      </PostFormLayout>

      <PanoramicImagesModal
        open={panoOpen}
        onClose={() => setPanoOpen(false)}
        initialItems={panoramas}
        onApply={(items) => {
          setPanoramas(items || []);
          setPanoOpen(false);
        }}
      />

      <Dialog open={Boolean(saved)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: `${radii.lg}px` } }}>
        <DialogContent sx={{ textAlign: "center", p: { xs: 6, sm: 8 } }}>
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
            <CheckCircle2 size={64} color="#16A34A" style={{ margin: "0 auto" }} />
          </motion.div>
          <Typography sx={{ mt: 3, fontWeight: 800, fontSize: "1.4rem", color: "primary.main" }}>Listing Submitted!</Typography>
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            Our team will review it shortly. It goes live as soon as it's approved — you can edit it any time from Manage Listings.
          </Typography>
          <Chip label={`Visibility score ${score}/100`} color="secondary" variant="outlined" sx={{ mt: 4, fontWeight: 700 }} />
          <Stack spacing={2} sx={{ mt: 6 }}>
            <Button variant="contained" color="secondary" onClick={openSaved} sx={{ fontWeight: 800, borderRadius: 999, py: 1.5 }}>
              Preview Listing
            </Button>
            <Button variant="outlined" onClick={() => navigate("/my-properties")} sx={{ fontWeight: 700, borderRadius: 999 }}>
              Manage Listings
            </Button>
            <Button
              onClick={() => {
                setSaved(null);
                setDeclared(false);
                startOver();
              }}
              sx={{ fontWeight: 700 }}
            >
              Post Another Property
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
