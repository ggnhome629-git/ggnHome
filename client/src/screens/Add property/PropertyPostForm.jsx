import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import { ChevronDown, CheckCircle2, ClipboardCheck, Eye, MapPin, PencilLine, RotateCcw, Send, ShieldCheck, Sparkles, Wallet, Wand2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import PanoramicImagesModal from "./panaromicimagesadd.jsx";
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
  EXTRA,
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

// Wording that differs by who is posting. Agent and admin listings follow
// their own approval rules on the server, so their copy doesn't promise review.
const COPY = {
  owner: {
    eyebrow: "Post Property · Free",
    titles: { Sale: "Sell Your Property Faster", Rent: "Rent Out Your Property", "": "Post Your Property For Free" },
    done: "Listing Submitted!",
    badges: "owner",
    subtitle: "Reach tenants and buyers across Gurgaon. Fill in the details, preview your listing and post — our team reviews it before it goes live.",
    declaration: "I confirm these details are accurate and I'm the owner or authorised to list this property. I understand the listing goes live after ggnHome's review.",
    success: "Our team will review it shortly. It goes live as soon as it's approved — you can edit it any time from Manage Listings.",
  },
  agent: {
    eyebrow: "Agent · Post Property",
    titles: { Sale: "List A Property For Sale", Rent: "List A Property For Rent", "": "Post A Client Property" },
    done: "Listing Submitted!",
    subtitle: "Add a listing for your client. Fill in the details, preview it and post — then track it from My Properties.",
    declaration: "I confirm these details are accurate and I'm authorised by the owner to list this property.",
    success: "Your listing has been saved. Track its status and enquiries from My Properties.",
  },
  admin: {
    eyebrow: "Admin · Add Property",
    titles: { Sale: "Add A Property For Sale", Rent: "Add A Property For Rent", "": "Add A Property" },
    done: "Property Saved!",
    subtitle: "Add a property on behalf of an owner. Fill in the details, preview the listing and save it.",
    declaration: "I confirm these details were verified with the owner and are accurate.",
    success: "The property has been saved. You can review and manage it from the admin property manager.",
  },
};
const HEADER_BADGES = {
  owner: [
    { icon: Wallet, label: "Free Listing" },
    { icon: ShieldCheck, label: "Reviewed Before Going Live" },
    { icon: PencilLine, label: "Edit Anytime" },
  ],
  agent: [
    { icon: Wallet, label: "No Listing Fee" },
    { icon: Eye, label: "Live Preview" },
    { icon: PencilLine, label: "Edit Anytime" },
  ],
  admin: [
    { icon: Eye, label: "Live Preview" },
    { icon: ShieldCheck, label: "Owner Number Kept Private" },
    { icon: PencilLine, label: "Edit From Property Manager" },
  ],
};

function readDraft(draftKey) {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey) || "null");
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
      {!shown.length && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Nothing added yet.
        </Typography>
      )}
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

/**
 * The post-property form shared by owners (/add-property), agents
 * (/agent/add-property) and admins (/admin/add-property). Each page passes
 * its own nav, API endpoints, auth token and where to go afterwards.
 */
export default function PropertyPostForm({
  mode = "owner",
  nav,
  user,
  roleLabel = "Owner",
  endpoints,
  token,
  loginPath = "/login",
  managePath = "/my-properties",
  manageLabel = "Manage Listings",
  draftKey = "postPropertyDraft:v2",
  askOwnerContact = false,
  extendedFields = false,
  extraFormFields,
  trustPoints,
  detailPath = (isRent, id) => (isRent ? `/Rentaldetails/${id}` : `/Saledetails/${id}`),
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const copy = COPY[mode] || COPY.owner;

  const initialDraft = useRef(readDraft(draftKey)).current;
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
        localStorage.setItem(draftKey, JSON.stringify({ f, step, reached }));
      } catch (e) {
        // storage full or blocked — the form still works, just without a draft
      }
    }, 600);
    return () => clearTimeout(t);
  }, [f, step, reached, saved, draftKey]);

  const set = (key) => (value) => {
    setF((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const onInput = (key) => (e) => set(key)(e.target.value);

  const { score, missing } = useMemo(() => computeScore(scoreItems(f.purpose), { f, photos }), [f, photos]);
  const rent = f.purpose !== "Sale";

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
      localStorage.removeItem(draftKey);
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
      const url = rent ? endpoints.rent : endpoints.sale;
      const res = await fetch(url, {
        method: "POST",
        body: (() => {
          const form = buildFormData(f, photos, panoramas);
          Object.entries(extraFormFields || {}).forEach(([k, v]) => form.append(k, v));
          return form;
        })(),
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        navigate(loginPath, { state: { from: location.pathname } });
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
        localStorage.removeItem(draftKey);
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
      {askOwnerContact && (
        <FormSection title="Owner's Mobile Number" hint="Kept private — used by the ggnHome team to reach the owner" id="field-ownerMobile">
          <TextField
            value={f.ownerMobile}
            onChange={onInput("ownerMobile")}
            placeholder="10-digit mobile number"
            error={Boolean(err("ownerMobile"))}
            helperText={err("ownerMobile") || " "}
            InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
            inputProps={{ inputMode: "tel", maxLength: 14 }}
            sx={{ width: { xs: "100%", sm: 320 } }}
          />
        </FormSection>
      )}
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

  const textField = (key, label, placeholder, rows = 2) => (
    <TextField
      id={`field-${key}`}
      fullWidth
      multiline={rows > 1}
      minRows={rows}
      label={label}
      value={f[key]}
      onChange={onInput(key)}
      placeholder={placeholder}
      error={Boolean(err(key))}
      helperText={err(key) || " "}
      inputProps={{ maxLength: 500 }}
    />
  );
  const extraGroup = (title, body, open = false) => (
    <Accordion defaultExpanded={open} disableGutters elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: `${radii.md}px !important`, "&:before": { display: "none" }, mb: 3 }}>
      <AccordionSummary expandIcon={<ChevronDown size={18} />}>
        <Typography sx={{ fontWeight: 700, color: "primary.main" }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>{body}</AccordionDetails>
    </Accordion>
  );
  const extendedSection = (
    <Box sx={{ mt: 2 }}>
      <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 2 }}>
        Additional Details (Admin)
      </Typography>
      {extraGroup(
        "Property Extras",
        <>
          {textField("layoutFeatures", "Key features", "What makes this property special…")}
          <FormSection title="Outdoor Space">
            <ChoiceChips ariaLabel="Outdoor space" options={EXTRA.outdoorSpace} value={f.outdoorSpace} onChange={set("outdoorSpace")} />
          </FormSection>
          <FormSection title="Property Age">
            <ChoiceChips ariaLabel="Property age" options={AGES} value={f.conditionAge} onChange={set("conditionAge")} />
          </FormSection>
          {textField("renovations", "Renovation history", "e.g. Kitchen redone in 2023")}
        </>,
        true
      )}
      {extraGroup(
        "Lease & Charges",
        <>
          <FormSection title="Lease Term">
            <ChoiceChips ariaLabel="Lease term" options={EXTRA.leaseTerm} value={f.leaseTerm} onChange={set("leaseTerm")} />
          </FormSection>
          <FormSection title="Utilities Included">
            <ChoiceChips multiple size="sm" ariaLabel="Utilities included" options={EXTRA.utilities} value={f.utilities} onChange={set("utilities")} />
          </FormSection>
          {textField("otherFees", "Additional fees", "e.g. ₹2,500/month society maintenance", 1)}
          {textField("maintenance", "Maintenance responsibilities", "Who handles repairs, cleaning…")}
          <FormSection title="Tenant Insurance">
            <ChoiceChips ariaLabel="Tenant insurance" options={EXTRA.insurance} value={f.insurance} onChange={set("insurance")} />
          </FormSection>
        </>
      )}
      {extraGroup(
        "House Rules",
        <>
          <FormSection title="Pet Policy">
            <ChoiceChips ariaLabel="Pet policy" options={EXTRA.petPolicy} value={f.petPolicy} onChange={set("petPolicy")} />
          </FormSection>
          <FormSection title="Smoking Policy">
            <ChoiceChips ariaLabel="Smoking policy" options={EXTRA.smokingPolicy} value={f.smokingPolicy} onChange={set("smokingPolicy")} />
          </FormSection>
        </>
      )}
      {extraGroup(
        "Neighbourhood",
        <>
          {textField("neighborhoodVibe", "Neighbourhood description", "Quiet, green, close to markets…")}
          {textField("transportation", "Transportation access", "e.g. 5 min walk to HUDA City Centre metro")}
          {textField("localAmenities", "Local amenities", "Schools, hospitals, malls nearby…")}
          <FormSection title="Community Features">
            <ChoiceChips multiple size="sm" ariaLabel="Community features" options={EXTRA.communityFeatures} value={f.communityFeatures} onChange={set("communityFeatures")} />
          </FormSection>
        </>
      )}
    </Box>
  );

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
      {rent && extendedFields && extendedSection}
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
              ...(askOwnerContact ? [["Owner mobile", f.ownerMobile]] : []),
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
          {rent && extendedFields && (
            <SummaryBlock
              title="Additional Details"
              onEdit={() => goTo(STEP.price)}
              rows={[
                ["Key features", f.layoutFeatures],
                ["Outdoor space", f.outdoorSpace],
                ["Property age", f.conditionAge],
                ["Renovations", f.renovations],
                ["Lease term", EXTRA.leaseTerm.find((x) => x.value === f.leaseTerm)?.label],
                ["Utilities included", f.utilities.join(", ")],
                ["Additional fees", f.otherFees],
                ["Maintenance", f.maintenance],
                ["Insurance", EXTRA.insurance.find((x) => x.value === f.insurance)?.label],
                ["Pets", EXTRA.petPolicy.find((x) => x.value === f.petPolicy)?.label],
                ["Smoking", EXTRA.smokingPolicy.find((x) => x.value === f.smokingPolicy)?.label],
                ["Neighbourhood", f.neighborhoodVibe],
                ["Transport", f.transportation],
                ["Local amenities", f.localAmenities],
                ["Community", f.communityFeatures.join(", ")],
              ]}
            />
          )}
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
              {copy.declaration}
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
    if (!id) return navigate(managePath);
    navigate(detailPath(rent, id), { state: { preview: true } });
  };

  return (
    <>
      <PostFormLayout
        nav={nav}
        eyebrow={copy.eyebrow}
        title={copy.titles[f.purpose] || copy.titles[""]}
        subtitle={copy.subtitle}
        badges={HEADER_BADGES[mode] || HEADER_BADGES.owner}
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
            <TrustPanel user={user} roleLabel={roleLabel} {...(trustPoints ? { points: trustPoints } : {})} />
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
          <Typography sx={{ mt: 3, fontWeight: 800, fontSize: "1.4rem", color: "primary.main" }}>{copy.done}</Typography>
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            {copy.success}
          </Typography>
          <Chip label={`Visibility score ${score}/100`} color="secondary" variant="outlined" sx={{ mt: 4, fontWeight: 700 }} />
          <Stack spacing={2} sx={{ mt: 6 }}>
            <Button variant="contained" color="secondary" onClick={openSaved} sx={{ fontWeight: 800, borderRadius: 999, py: 1.5 }}>
              Preview Listing
            </Button>
            <Button variant="outlined" onClick={() => navigate(managePath)} sx={{ fontWeight: 700, borderRadius: 999 }}>
              {manageLabel}
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
