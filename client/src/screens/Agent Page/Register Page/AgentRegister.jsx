import React, { useEffect, useState } from "react";
import { Alert, Autocomplete, Avatar, Box, Button, ButtonBase, Chip, CircularProgress, Link, Stack, Step, StepLabel, Stepper, TextField, Typography } from "@mui/material";
import { BadgeCheck, CheckCircle2, Clock, FileText, Home, LayoutDashboard, PhoneCall, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../../../components/auth/AuthShell";
import MobileOtpForm from "../../../components/auth/MobileOtpForm";
import { ChoiceChips, FieldLabel } from "../../../components/postForm/ChoiceChips";
import { useAuth } from "../../../Context/AuthContext";
import { useAgentAuth } from "../../../Context/AgentAuthContext";
import { openAgentSessionFromUser, storeLoginTokens } from "../../../utils/agentSso";
import compressImage from "../../../utils/compressImage";
import { LOCALITY_OPTIONS } from "../../Add property/propertyFormConfig";
import { radii } from "../../../theme/theme";

const MAX_BYTES = 1024 * 1024; // server limit per file
const STEPS = ["Verify Mobile", "Your Details", "Documents"];
const EXPERIENCE = [
  { value: "0", label: "Under 1 yr" },
  { value: "1", label: "1–3 yrs" },
  { value: "3", label: "3–5 yrs" },
  { value: "5", label: "5–10 yrs" },
  { value: "10", label: "10+ yrs" },
];
const POINTS = [
  { icon: PhoneCall, title: "Verified Leads", text: "Get tenants and buyers in the sectors you choose." },
  { icon: LayoutDashboard, title: "Your Own Dashboard", text: "Track listings, enquiries and leads." },
  { icon: Home, title: "Free Listings", text: "Post client properties at no cost." },
  { icon: BadgeCheck, title: "Quick Approval", text: "Our team reviews new agents and activates your account." },
];

function maxDob() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

function FilePick({ label, hint, accept, file, onPick, error, avatar }) {
  const preview = file && /^image\//.test(file.type) ? URL.createObjectURL(file) : null;
  return (
    <Box>
      <FieldLabel required hint={hint}>
        {label}
      </FieldLabel>
      <ButtonBase
        component="label"
        sx={{ width: "100%", justifyContent: "flex-start", gap: 3, p: 3, borderRadius: `${radii.md}px`, border: "1.5px dashed", borderColor: error ? "#FCA5A5" : "#B9CFE0", backgroundColor: "#F7FAFC", "&:hover": { borderColor: "secondary.main" } }}
      >
        {avatar ? (
          <Avatar src={preview || undefined} sx={{ width: 52, height: 52, bgcolor: "#E6EDF3", color: "text.secondary" }}>
            <Upload size={20} />
          </Avatar>
        ) : (
          <Box sx={{ width: 52, height: 52, borderRadius: "12px", display: "grid", placeItems: "center", backgroundColor: "#E6EDF3", color: "text.secondary", overflow: "hidden" }}>
            {preview ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <FileText size={20} />}
          </Box>
        )}
        <Box sx={{ textAlign: "left", minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: "primary.main" }} noWrap>
            {file ? file.name : "Choose file"}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {file ? `${Math.round(file.size / 1024)} KB` : "Tap to upload"}
          </Typography>
        </Box>
        <input hidden type="file" accept={accept} onChange={(e) => onPick(e.target.files?.[0] || null)} />
      </ButtonBase>
      {error && (
        <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 600 }} role="alert">
          {error}
        </Typography>
      )}
    </Box>
  );
}

/**
 * /agent/register — verify your mobile with the usual 4-letter code, add a
 * few details and two documents. The agent code is assigned by ggnHome for
 * internal records; agents never need to type it.
 */
export default function AgentRegister() {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuth();
  const { fetchAgent } = useAgentAuth();
  const [step, setStep] = useState(user?.mobileNumber ? 1 : 0);
  const [mobile, setMobile] = useState(user?.mobileNumber || "");
  const [status, setStatus] = useState(null); // pending | done
  const [checking, setChecking] = useState(Boolean(localStorage.getItem("accessToken")));
  const [f, setF] = useState({ fullName: user?.name || "", email: user?.email || "", dob: "", experience: "", sectors: [], bio: "" });
  const [photo, setPhoto] = useState(null);
  const [idProof, setIdProof] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.mobileNumber && !mobile) {
      setMobile(user.mobileNumber);
      setStep((s) => (s === 0 ? 1 : s));
    }
  }, [user, mobile]);

  // Already signed in: if this number is already an agent, don't register twice.
  useEffect(() => {
    if (!localStorage.getItem("accessToken")) return;
    openAgentSessionFromUser().then(async (r) => {
      if (r.ok) {
        await fetchAgent?.({ force: true });
        navigate("/agent/dashboard", { replace: true });
        return;
      }
      if (r.status === 403) setStatus("pending");
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (v) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onVerified = async (data, number) => {
    storeLoginTokens(data);
    setMobile(number);
    try {
      await fetchUser?.({ force: true });
    } catch (e) {
      // ignore
    }
    if (data.agentAccessToken) {
      await fetchAgent?.({ force: true });
      return navigate("/agent/dashboard", { replace: true });
    }
    if (data.agent?.status === "pending") return setStatus("pending");
    setStep(1);
  };

  const checkDetails = () => {
    const e = {};
    if (f.fullName.trim().length < 3) e.fullName = "Enter your full name";
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "Enter a valid email or leave it empty";
    if (!f.dob) e.dob = "Enter your date of birth";
    else if (f.dob > maxDob()) e.dob = "You must be at least 18";
    if (!f.experience) e.experience = "Choose your experience";
    if (!f.sectors.length) e.sectors = "Pick at least one sector you work in";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const pick = (setter, key, { images }) => async (file) => {
    setErrors((e) => ({ ...e, [key]: undefined }));
    if (!file) return setter(null);
    const isImage = /^image\//.test(file.type);
    const isPdf = file.type === "application/pdf";
    if (!isImage && !(isPdf && !images)) {
      setErrors((e) => ({ ...e, [key]: images ? "Choose a photo (JPG or PNG)" : "Choose a photo or a PDF" }));
      return;
    }
    const ready = isImage ? await compressImage(file, MAX_BYTES) : file;
    if (ready.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, [key]: isPdf ? "This PDF is over 1 MB — upload a photo of the ID instead" : "This file is too large" }));
      return;
    }
    setter(ready);
  };

  const submit = async () => {
    const e = {};
    if (!photo) e.photo = "Add a profile photo";
    if (!idProof) e.idProof = "Add an ID proof (Aadhaar, PAN or RERA)";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("fullName", f.fullName.trim());
      if (f.email.trim()) body.append("email", f.email.trim());
      body.append("mobileNumber", mobile);
      body.append("dob", f.dob);
      body.append("experienceYears", f.experience);
      body.append("preferredSectors", JSON.stringify(f.sectors));
      body.append("availableDays", "[]");
      if (f.bio.trim()) body.append("bio", f.bio.trim());
      body.append("profilePhoto", photo);
      body.append("idProof", idProof);
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${process.env.REACT_APP_Base_API || ""}/api/agent/register`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setStep(0);
        throw new Error("Please verify your mobile number again.");
      }
      if (!res.ok) throw new Error(data.message || data.error || "Registration failed. Please try again.");
      setStatus("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (checking && !status) {
    body = (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress color="secondary" />
      </Stack>
    );
  } else if (status) {
    body = (
      <Stack spacing={3} alignItems="flex-start">
        <Box sx={{ width: 56, height: 56, borderRadius: "16px", display: "grid", placeItems: "center", backgroundColor: status === "done" ? "#DCFCE7" : "#FEF3C7", color: status === "done" ? "#15803D" : "#B45309" }}>
          {status === "done" ? <CheckCircle2 size={28} /> : <Clock size={28} />}
        </Box>
        <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.4rem" }}>{status === "done" ? "Registration Submitted!" : "Registration Under Review"}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Our team will verify your details and activate your agent account. Once approved, just log in with your mobile number{mobile ? ` (+91 ${mobile})` : ""} and the code we text you.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" color="secondary" onClick={() => navigate("/")} sx={{ borderRadius: 999, fontWeight: 800 }}>
            Go To ggnHome
          </Button>
          <Button onClick={() => navigate("/agent/login")} sx={{ fontWeight: 700 }}>
            Agent Login
          </Button>
        </Stack>
      </Stack>
    );
  } else {
    body = (
      <>
        <Typography component="h2" sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.6rem" }}>
          Become A ggnHome Agent
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, mb: 5 }}>
          Takes about 2 minutes. No password, no agent code to remember.
        </Typography>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 6, "& .MuiStepLabel-label": { fontSize: 12, fontWeight: 600 } }}>
          {STEPS.map((s) => (
            <Step key={s}>
              <StepLabel>{s}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 && <MobileOtpForm onVerified={onVerified} submitLabel="Verify Number" />}

        {step === 1 && (
          <Stack spacing={4}>
            {mobile && <Chip icon={<BadgeCheck size={15} />} color="secondary" variant="outlined" label={`Verified: +91 ${mobile}`} sx={{ alignSelf: "flex-start", fontWeight: 700 }} />}
            <TextField label="Full name" required value={f.fullName} onChange={(e) => set("fullName")(e.target.value)} error={Boolean(errors.fullName)} helperText={errors.fullName || " "} inputProps={{ maxLength: 80 }} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
              <TextField label="Email (optional)" type="email" value={f.email} onChange={(e) => set("email")(e.target.value)} error={Boolean(errors.email)} helperText={errors.email || "For your welcome email"} fullWidth />
              <TextField label="Date of birth" type="date" required value={f.dob} onChange={(e) => set("dob")(e.target.value)} error={Boolean(errors.dob)} helperText={errors.dob || " "} InputLabelProps={{ shrink: true }} inputProps={{ max: maxDob() }} fullWidth />
            </Stack>
            <Box>
              <FieldLabel required>Experience</FieldLabel>
              <ChoiceChips ariaLabel="Experience" options={EXPERIENCE} value={f.experience} onChange={set("experience")} size="sm" error={Boolean(errors.experience)} />
              {errors.experience && (
                <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 600 }}>
                  {errors.experience}
                </Typography>
              )}
            </Box>
            <Autocomplete
              multiple
              options={LOCALITY_OPTIONS}
              value={f.sectors}
              onChange={(e, v) => set("sectors")(v.slice(0, 10))}
              filterSelectedOptions
              renderInput={(params) => <TextField {...params} label="Sectors you work in" required error={Boolean(errors.sectors)} helperText={errors.sectors || "Up to 10 — leads are matched to these"} />}
            />
            <TextField label="About you (optional)" multiline minRows={2} value={f.bio} onChange={(e) => set("bio")(e.target.value)} inputProps={{ maxLength: 300 }} helperText={`${f.bio.length}/300`} />
            <Button variant="contained" color="secondary" size="large" onClick={() => checkDetails() && setStep(2)} sx={{ py: 1.6, borderRadius: 999, fontWeight: 800 }}>
              Continue
            </Button>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={4}>
            <FilePick avatar label="Profile Photo" hint="A clear photo of your face" accept="image/*" file={photo} onPick={pick(setPhoto, "photo", { images: true })} error={errors.photo} />
            <FilePick label="ID Proof" hint="Aadhaar, PAN or RERA certificate — photo or PDF" accept="image/*,application/pdf" file={idProof} onPick={pick(setIdProof, "idProof", { images: false })} error={errors.idProof} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Your documents are only used by the ggnHome team to verify you.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={2}>
              <Button onClick={() => setStep(1)} disabled={busy} sx={{ fontWeight: 700 }}>
                Back
              </Button>
              <Button variant="contained" color="secondary" size="large" onClick={submit} disabled={busy} sx={{ flex: 1, py: 1.6, borderRadius: 999, fontWeight: 800 }}>
                {busy ? <CircularProgress size={20} color="inherit" /> : "Submit Registration"}
              </Button>
            </Stack>
          </Stack>
        )}
      </>
    );
  }

  return (
    <AuthShell
      eyebrow="For Agents"
      title="Join ggnHome As An Agent"
      subtitle="Register once, get verified, and start receiving leads in your sectors."
      points={POINTS}
      wide
      footer={
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
          Already registered?{" "}
          <Link component="button" type="button" underline="hover" onClick={() => navigate("/agent/login")} sx={{ fontWeight: 700, color: "secondary.main" }}>
            Agent login
          </Link>
        </Typography>
      }
    >
      {body}
    </AuthShell>
  );
}
