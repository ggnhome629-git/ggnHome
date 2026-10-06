import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogContent, FormControlLabel, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, Eye, HeartHandshake, MapPin, PencilLine, RotateCcw, Send, ShieldCheck, Sparkles, Wallet, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import { useAuth } from "../../Context/AuthContext";
import PostFormLayout from "../../components/postForm/PostFormLayout";
import { ChoiceChips, ChoiceTiles, FormSection } from "../../components/postForm/ChoiceChips";
import PhotoUploader from "../../components/postForm/PhotoUploader";
import TrustPanel from "../../components/postForm/TrustPanel";
import PostPromos from "../../components/postForm/PostPromos";
import ReviewChecks from "../../components/postForm/ReviewChecks";
import { computeScore, rupeesInWords, todayISO } from "../../components/postForm/scoring";
import FlatmateCard, { formatBudget } from "./FlatmateCard";
import { radii } from "../../theme/theme";
import {
  AMENITIES,
  CONTACT,
  FURNISHED,
  GENDERS,
  INITIAL,
  LOCALITY_OPTIONS,
  OCCUPANTS,
  SCORE_ITEMS,
  SPOTS,
  STEP,
  STEPS,
  buildFormData,
  firstInvalidStep,
  previewListing,
  reviewChecks,
  suggestDescription,
  suggestTitle,
  validateStep,
} from "./flatmateFormConfig";

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const DRAFT_KEY = "flatmateListingDraft:v2";
const HEADER_BADGES = [
  { icon: Wallet, label: "Free To Post" },
  { icon: ShieldCheck, label: "Reviewed Before Going Live" },
  { icon: HeartHandshake, label: "Gender Preference Filters" },
];
const TRUST_POINTS = [
  { icon: Wallet, title: "100% Free To Post", text: "No listing fee for room or flatmate posts." },
  { icon: ShieldCheck, title: "Reviewed Before Going Live", text: "Our team checks every listing to keep it genuine." },
  { icon: HeartHandshake, title: "Find The Right Match", text: "Seekers filter by gender, budget and move-in date." },
  { icon: Eye, title: "Contact Details Stay Private", text: "We keep phone numbers and emails out of listing text." },
];

function readDraft() {
  try {
    // Drop the old draft format (it held unserialisable photo blobs).
    localStorage.removeItem("flatmateListingDraft");
    localStorage.removeItem("flatmateListingCurrentStep");
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return d && d.f ? d : null;
  } catch (e) {
    return null;
  }
}

function SummaryBlock({ title, rows, onEdit }) {
  const shown = rows.filter(([, v]) => v !== "" && v != null);
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
            <Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 600, wordBreak: "break-word" }}>
              {v}
            </Typography>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}

export default function CreateFlatmateListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userToken = localStorage.getItem("accessToken");

  const initialDraft = useRef(readDraft()).current;
  const [f, setF] = useState(() => ({ ...INITIAL, ...(initialDraft?.f || {}) }));
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  const [reached, setReached] = useState(initialDraft?.reached ?? 0);
  const [restored, setRestored] = useState(Boolean(initialDraft));
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (saved) return undefined;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ f, step, reached }));
      } catch (e) {
        // storage unavailable — no draft, form still works
      }
    }, 600);
    return () => clearTimeout(t);
  }, [f, step, reached, saved]);

  const set = (key) => (value) => {
    setF((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const onInput = (key) => (e) => set(key)(e.target.value);

  const { score, missing } = useMemo(() => computeScore(SCORE_ITEMS, { f, photos }), [f, photos]);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const showErrors = (errs) => {
    setErrors(errs);
    const first = Object.keys(errs)[0];
    setTimeout(() => document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

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
      const res = await fetch(`${process.env.REACT_APP_Base_API}/api/flatmates/listings`, {
        method: "POST",
        body: buildFormData(f, photos),
        credentials: "include",
        headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
      });
      if (res.status === 401) {
        navigate("/login", { state: { from: "/flatmateslistingform" } });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSubmitError((data && data.message) || "We couldn't post your listing. Please try again.");
        return;
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        // ignore
      }
      setSaved(data?.data || data || {});
    } catch (err) {
      setSubmitError(`Network error: ${err.message}. Your details are saved — try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  const err = (k) => errors[k];

  const stepRoom = (
    <>
      <FormSection title="Who Can Apply?" required error={err("preferredGender")} id="field-preferredGender">
        <ChoiceTiles ariaLabel="Preferred gender" options={GENDERS} value={f.preferredGender} onChange={set("preferredGender")} columns={{ xs: 1, sm: 3 }} error={Boolean(err("preferredGender"))} />
      </FormSection>
      <FormSection title="Spots Open" required error={err("occupancyWanted")} id="field-occupancyWanted">
        <ChoiceChips ariaLabel="Spots open" options={SPOTS} value={f.occupancyWanted} onChange={set("occupancyWanted")} />
      </FormSection>
      <FormSection title="People Living There Now">
        <ChoiceChips ariaLabel="Current flatmates" options={OCCUPANTS} value={f.currentOccupants} onChange={set("currentOccupants")} />
      </FormSection>
      <FormSection title="Room Furnishing">
        <ChoiceChips ariaLabel="Furnishing" options={FURNISHED} value={f.furnished} onChange={set("furnished")} />
      </FormSection>
    </>
  );

  const stepLocation = (
    <>
      <FormSection title="City">
        <Chip icon={<MapPin size={14} />} label="Gurgaon (Gurugram)" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
      </FormSection>
      <FormSection title="Sector / Locality" required hint="e.g. Sector 46, DLF Phase 3, Sohna Road" id="field-area">
        <Autocomplete
          freeSolo
          options={LOCALITY_OPTIONS}
          inputValue={f.area}
          onInputChange={(e, v) => set("area")(v || "")}
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
              error={Boolean(err("area"))}
              helperText={err("area") || " "}
              InputProps={{ ...params.InputProps, startAdornment: <MapPin size={18} color="#00A79D" style={{ marginLeft: 6 }} /> }}
            />
          )}
        />
      </FormSection>
    </>
  );

  const stepRent = (
    <>
      <FormSection title="Monthly Rent For The Room" required hint="Add an upper amount if rent varies by room (optional)">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
          <TextField
            id="field-minRent"
            type="number"
            label="Rent"
            value={f.minRent}
            onChange={onInput("minRent")}
            error={Boolean(err("minRent"))}
            helperText={err("minRent") || rupeesInWords(f.minRent) || " "}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment>, endAdornment: <InputAdornment position="end">/mo</InputAdornment> }}
            inputProps={{ min: 0, inputMode: "numeric" }}
            fullWidth
          />
          <TextField
            id="field-maxRent"
            type="number"
            label="Up to (optional)"
            value={f.maxRent}
            onChange={onInput("maxRent")}
            error={Boolean(err("maxRent"))}
            helperText={err("maxRent") || rupeesInWords(f.maxRent) || " "}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment>, endAdornment: <InputAdornment position="end">/mo</InputAdornment> }}
            inputProps={{ min: 0, inputMode: "numeric" }}
            fullWidth
          />
        </Stack>
      </FormSection>
      <FormSection title="Available From" required id="field-moveInDate">
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
    </>
  );

  const stepDetails = (
    <>
      <FormSection title="Amenities" hint="Tick everything flatmates get">
        <ChoiceChips multiple size="sm" ariaLabel="Amenities" options={AMENITIES} value={f.amenities} onChange={set("amenities")} />
      </FormSection>
      <FormSection title="Listing Title" required id="field-title">
        <TextField fullWidth value={f.title} onChange={onInput("title")} placeholder="e.g. Furnished Room Available for Women in Sector 46" error={Boolean(err("title"))} helperText={err("title") || `${f.title.length}/100`} inputProps={{ maxLength: 100 }} />
        <Button size="small" startIcon={<Sparkles size={14} />} onClick={() => set("title")(suggestTitle(f))} sx={{ mt: 1, fontWeight: 700 }}>
          Suggest a title
        </Button>
      </FormSection>
      <FormSection title="About The Room & Household" required hint="Room size, light, routine, food habits, house rules, what's nearby" id="field-description">
        <TextField
          fullWidth
          multiline
          minRows={5}
          value={f.description}
          onChange={onInput("description")}
          placeholder="Describe the room and the people you live with…"
          error={Boolean(err("description"))}
          helperText={err("description") || `${f.description.length}/2000 · Don't add phone numbers — people contact you through ggnHome`}
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
      <FormSection title="How Should People Reach You?">
        <ChoiceChips multiple ariaLabel="Contact methods" options={CONTACT} value={f.contact} onChange={set("contact")} />
      </FormSection>
    </>
  );

  const stepPhotos = (
    <PhotoUploader
      value={photos}
      onChange={setPhotos}
      max={8}
      privacyNotice="For everyone's safety, please don't upload photos showing people, the building entrance or your flat number. Room, bathroom, kitchen and balcony photos work best."
      tips={["Photograph the room in daylight", "Include the bathroom, kitchen and common areas", "The first photo is the cover — choose the room itself"]}
    />
  );

  const genderLabel = GENDERS.find((g) => g.value === f.preferredGender)?.label;
  const stepReview = (
    <>
      <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 340px) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Eye size={14} /> Preview
          </Typography>
          <Box sx={{ maxWidth: 360, pointerEvents: "none" }}>
            <FlatmateCard listing={previewListing(f, photos)} />
          </Box>
        </Box>
        <Stack spacing={4}>
          <SummaryBlock
            title="Room & Flatmates"
            onEdit={() => goTo(STEP.room)}
            rows={[
              ["Who can apply", genderLabel],
              ["Spots open", f.occupancyWanted],
              ["Living there now", f.currentOccupants === "" ? "" : OCCUPANTS.find((o) => o.value === f.currentOccupants)?.label],
              ["Furnishing", FURNISHED.find((o) => o.value === f.furnished)?.label],
            ]}
          />
          <SummaryBlock title="Location" onEdit={() => goTo(STEP.location)} rows={[["Locality", f.area ? `${f.area}, Gurgaon` : ""]]} />
          <SummaryBlock
            title="Rent & Details"
            onEdit={() => goTo(STEP.details)}
            rows={[
              ["Rent", f.minRent ? formatBudget({ min: f.minRent, max: f.maxRent || f.minRent }) : ""],
              ["Available from", f.moveInDate ? new Date(f.moveInDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""],
              ["Amenities", f.amenities.join(", ")],
              ["Contact by", f.contact.map((c) => CONTACT.find((x) => x.value === c)?.label).join(", ")],
              ["Title", f.title],
              ["Description", f.description],
            ]}
          />
        </Stack>
      </Box>
      <Box sx={{ mt: 7 }}>
        <Typography sx={{ fontWeight: 800, color: "primary.main", mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
          <ClipboardCheck size={18} /> Listing Check
        </Typography>
        <ReviewChecks checks={reviewChecks(f, photos)} onJump={goTo} />
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
            <Typography variant="body2">
              I confirm these details are accurate and the room is genuinely available. I understand the listing goes live after ggnHome's review.
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

  const content = [stepRoom, stepLocation, stepRent, stepDetails, stepPhotos, stepReview][step];
  const steps = STEPS.map((s, i) => ({ ...s, complete: i < STEP.review && !Object.keys(validateStep(i, f)).length }));
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <>
      <PostFormLayout
        nav={<TopNavigationBar navItems={NAV_ITEMS} />}
        eyebrow="Flatmates · Post Free"
        title="List Your Room, Find A Flatmate"
        subtitle="Share a room in your flat with the right person. Fill in the details, preview your listing and post — we review it before it goes live."
        badges={HEADER_BADGES}
        steps={steps}
        current={step}
        reached={reached}
        onStepClick={goTo}
        score={score}
        missing={missing}
        onBack={back}
        onNext={next}
        nextLabel={step === STEP.review ? "Post Listing" : step === STEP.photos ? "Preview Listing" : "Continue"}
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
            <TrustPanel user={user} roleLabel="Flatmate Host" points={TRUST_POINTS} />
            <PostPromos type="rent" />
          </>
        }
      >
        {content}
      </PostFormLayout>

      <Dialog open={Boolean(saved)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: `${radii.lg}px` } }}>
        <DialogContent sx={{ textAlign: "center", p: { xs: 6, sm: 8 } }}>
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
            <CheckCircle2 size={64} color="#16A34A" style={{ margin: "0 auto" }} />
          </motion.div>
          <Typography sx={{ mt: 3, fontWeight: 800, fontSize: "1.4rem", color: "primary.main" }}>Listing Submitted!</Typography>
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            Our team will review it shortly. Once approved it shows up in flatmate search.
          </Typography>
          <Chip label={`Visibility score ${score}/100`} color="secondary" variant="outlined" sx={{ mt: 4, fontWeight: 700 }} />
          <Stack spacing={2} sx={{ mt: 6 }}>
            <Button variant="contained" color="secondary" onClick={() => navigate("/flatmatesmylistings")} sx={{ fontWeight: 800, borderRadius: 999, py: 1.5 }}>
              My Listings
            </Button>
            <Button variant="outlined" onClick={() => navigate("/flatmatesdashboard")} sx={{ fontWeight: 700, borderRadius: 999 }}>
              Back To Flatmates
            </Button>
            <Button
              onClick={() => {
                setSaved(null);
                setDeclared(false);
                startOver();
              }}
              sx={{ fontWeight: 700 }}
            >
              Post Another Room
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
