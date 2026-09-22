import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  LinearProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  Hash,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Upload,
  User,
  X,
} from "lucide-react";
import { AuthButton, AuthField, AuthLayout } from "../../components/auth";
import { radii } from "../../theme/theme";

/**
 * Admin-side agent onboarding.
 *
 * Same two-step form as the public agent registration, but run by staff on
 * someone else's behalf: nothing is prefilled from the session, and every
 * request carries the admin's bearer token.
 */
const AgentRegistration = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    whatsappNumber: "",
    dob: "",
    bio: "", // kept for payload compatibility (no UI)
    experienceYears: "",
    availableDays: [], // kept for payload compatibility (no UI)
    availableFrom: "09:00",
    availableTo: "19:00",
    idProof: null,
    profilePhoto: null,
    areasCovered: [],
    preferredSectors: [],
  });

  const [profilePreview, setProfilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmSaved, setConfirmSaved] = useState(false);

  const [dobParts, setDobParts] = useState({ dd: "", mm: "", yyyy: "" });
  const [sectorDraft, setSectorDraft] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    mobileNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [settingPassword, setSettingPassword] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState({
    agentCode: "",
    mobileNumber: "",
  });

  const [errors, setErrors] = useState({});

  // 2 steps: 1 = Personal, 2 = Verification + Sectors
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const navigate = useNavigate();

  const completionPercent = (currentStep / totalSteps) * 100;

  const goToNext = () => setCurrentStep((s) => Math.min(totalSteps, s + 1));
  const goToPrev = () => setCurrentStep((s) => Math.max(1, s - 1));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: undefined }));

    setFormData((prev) => {
      if (name === "mobileNumber") {
        const wasWhatsSameAsOldMobile =
          !prev.whatsappNumber || prev.whatsappNumber === prev.mobileNumber;
        return {
          ...prev,
          mobileNumber: value,
          ...(wasWhatsSameAsOldMobile ? { whatsappNumber: value } : {}),
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleFileUpload = (e, fieldName) => {
    setErrors((prev) => ({ ...prev, [fieldName]: undefined }));

    if (fieldName === "profilePhoto") {
      const file = e.target.files[0];
      if (file) {
        const allowedProfileTypes = ["image/jpeg", "image/jpg"];
        if (!allowedProfileTypes.includes(file.type)) {
          setErrors((prev) => ({
            ...prev,
            profilePhoto: "Profile photo must be a JPG/JPEG image",
          }));
          return;
        }
        if (file.size > 1 * 1024 * 1024) {
          setErrors((prev) => ({
            ...prev,
            profilePhoto: "Profile photo must be under 1 MB",
          }));
          return;
        }
        setFormData((prev) => ({ ...prev, profilePhoto: file }));
        const reader = new FileReader();
        reader.onloadend = () => setProfilePreview(reader.result);
        reader.readAsDataURL(file);
      }
      return;
    }

    if (fieldName === "idProof") {
      const files = Array.from(e.target.files || []).slice(0, 3);
      if (files.length) {
        const allowed = [
          "image/jpeg",
          "image/jpg",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        for (const f of files) {
          if (!allowed.includes(f.type)) {
            setErrors((prev) => ({
              ...prev,
              idProof: "Each ID proof must be JPG, PDF, DOC or DOCX",
            }));
            return;
          }
          if (f.size > 1 * 1024 * 1024) {
            setErrors((prev) => ({
              ...prev,
              idProof: "Each ID proof must be under 1 MB",
            }));
            return;
          }
        }
        setFormData((prev) => ({ ...prev, idProof: files }));
      }
    }
  };

  const removeIdProof = (index) => {
    setFormData((prev) => {
      const list = Array.isArray(prev.idProof) ? [...prev.idProof] : [];
      if (index >= 0 && index < list.length) list.splice(index, 1);
      return { ...prev, idProof: list };
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let num = bytes;
    while (num >= 1024 && i < units.length - 1) {
      num /= 1024;
      i++;
    }
    return `${num.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const isFutureDate = (yyyy, mm, dd) => {
    if (!yyyy || !mm || !dd) return false;
    const selected = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected > today;
  };

  const normalizeSector = (input) => {
    const val = input.trim();
    if (!val) return null;
    const lower = val.toLowerCase();
    const sectorMatch = lower.match(/(sector|sec)\s*[-]?\s*(\d+)/i);
    if (sectorMatch) return `Sector-${sectorMatch[2]}`;
    if (lower.includes("dlf")) return val.toUpperCase();
    if (lower.includes("arjun vihar")) return val.toUpperCase();
    return val
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const isFieldValid = (name) => {
    if (errors[name]) return false;
    if (name === "mobileNumber") {
      return /^[0-9]{10}$/.test(String(formData.mobileNumber || ""));
    }
    if (name === "dob") {
      return Boolean(formData.dob);
    }
    if (name === "experienceYears") {
      // Number("") is 0, so without the empty check an untouched field
      // reported itself as valid.
      if (formData.experienceYears === "") return false;
      const v = Number(formData.experienceYears);
      return !Number.isNaN(v) && v >= 0 && v <= 50;
    }
    if (name === "profilePhoto") return !!formData.profilePhoto;
    if (name === "idProof")
      return formData.idProof && formData.idProof.length > 0;
    if (name === "fullName") return !!formData.fullName.trim();
    if (name === "preferredSectors")
      return formData.preferredSectors && formData.preferredSectors.length > 0;
    return false;
  };

  const validateAllFields = () => {
    const newErrors = {};

    if (!formData.fullName?.trim()) newErrors.fullName = "Full name is required";
    if (!formData.mobileNumber?.trim())
      newErrors.mobileNumber = "Mobile number is required";
    if (!formData.dob?.trim())
      newErrors.dob = "Date of birth is required (DD / MM / YYYY)";
    if (!formData.experienceYears)
      newErrors.experienceYears = "Experience is required";
    if (!formData.profilePhoto)
      newErrors.profilePhoto = "Profile photo is required";
    if (!formData.idProof || !formData.idProof.length)
      newErrors.idProof = "At least one ID proof is required";

    if (!formData.preferredSectors || formData.preferredSectors.length === 0) {
      newErrors.preferredSectors = "Add at least one preferred sector";
    }

    if (!/^\d{10}$/.test(String(formData.mobileNumber || ""))) {
      newErrors.mobileNumber = "Enter a valid 10-digit mobile number";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      const firstField = Object.keys(newErrors)[0];
      // Step 1 fields are unreachable while step 2 is showing, so send the
      // admin back to the step that actually holds the problem.
      const step1Fields = ["fullName", "mobileNumber", "dob", "experienceYears"];
      if (step1Fields.includes(firstField)) setCurrentStep(1);
      else setCurrentStep(2);
      return { ok: false, field: firstField };
    }
    return { ok: true };
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const v = validateAllFields();
    if (!v.ok) return;

    try {
      setSubmitting(true);
      let finalDob = formData.dob;

      if (!finalDob && dobParts.dd && dobParts.mm && dobParts.yyyy) {
        const dd = dobParts.dd.padStart(2, "0");
        const mm = dobParts.mm.padStart(2, "0");
        finalDob = `${dobParts.yyyy}-${mm}-${dd}`;
      }

      const bodyForm = new FormData();
      bodyForm.append("fullName", formData.fullName || "");
      bodyForm.append("email", formData.email || "");
      bodyForm.append("mobileNumber", formData.mobileNumber || "");
      bodyForm.append("dob", finalDob || "");
      if (formData.whatsappNumber)
        bodyForm.append("whatsappNumber", formData.whatsappNumber);
      if (formData.bio) bodyForm.append("bio", formData.bio);

      if (
        formData.experienceYears === "" ||
        isNaN(Number(formData.experienceYears))
      ) {
        setErrors((prev) => ({
          ...prev,
          experienceYears: "Please enter a valid experience in years",
        }));
        setSubmitting(false);
        return;
      }

      bodyForm.append(
        "experienceYears",
        String(Number(formData.experienceYears))
      );
      bodyForm.append(
        "availableDays",
        JSON.stringify(formData.availableDays || [])
      );
      bodyForm.append(
        "preferredSectors",
        JSON.stringify(formData.preferredSectors || [])
      );
      if (formData.availableFrom)
        bodyForm.append("availableFrom", formData.availableFrom);
      if (formData.availableTo)
        bodyForm.append("availableTo", formData.availableTo);

      if (formData.profilePhoto) {
        bodyForm.append("profilePhoto", formData.profilePhoto);
      }
      if (formData.idProof) {
        const idList = Array.isArray(formData.idProof)
          ? formData.idProof
          : [formData.idProof];
        for (let i = 0; i < idList.length; i++) {
          bodyForm.append("idProof", idList[i]);
        }
      }

      const accessToken = localStorage.getItem("accessToken");
      const base = process.env.REACT_APP_Base_API || "";

      const res = await fetch(`${base}/api/agent/register`, {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: bodyForm,
      });

      const data = await res.json();

      if (!res.ok && data.code === "SET_PASSWORD_REQUIRED") {
        setPasswordForm({
          mobileNumber: formData.mobileNumber,
          password: "",
          confirmPassword: "",
        });

        setSuccessData({
          agentCode: data.agentCode,
          mobileNumber: formData.mobileNumber,
        });

        setShowPasswordModal(true);
        return;
      }

      if (!res.ok) {
        setErrors({ submit: data.message || "Registration failed" });
        return;
      }

      setSuccessData({
        agentCode: data.agentCode,
        mobileNumber: formData.mobileNumber,
      });
      setShowSuccessModal(true);
      setFormData({
        fullName: "",
        email: "",
        mobileNumber: "",
        whatsappNumber: "",
        dob: "",
        bio: "",
        experienceYears: "",
        availableDays: [],
        availableFrom: "09:00",
        availableTo: "19:00",
        idProof: null,
        profilePhoto: null,
        areasCovered: [],
        preferredSectors: [],
      });
      setProfilePreview(null);
      setDobParts({ dd: "", mm: "", yyyy: "" });
      setErrors({});
      setCurrentStep(1);
    } catch (err) {
      console.error("submit error", err);
      setErrors({ submit: "An unexpected error occurred. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async () => {
    if (!passwordForm.password || !passwordForm.confirmPassword) {
      setErrors((prev) => ({ ...prev, password: "Fill both password fields" }));
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
      return;
    }

    try {
      setSettingPassword(true);
      const base = process.env.REACT_APP_Base_API;
      const accessToken = localStorage.getItem("accessToken");

      const res = await fetch(`${base}/auth/set-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          mobileNumber: passwordForm.mobileNumber,
          password: passwordForm.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          password: data.message || "Failed to set password",
        }));
        return;
      }

      setShowPasswordModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Set password error", err);
      setErrors((prev) => ({ ...prev, password: "Something went wrong" }));
    } finally {
      setSettingPassword(false);
    }
  };

  // One handler for all three date boxes.
  const handleDobPart = (part, raw) => {
    const maxLen = part === "yyyy" ? 4 : 2;
    let digits = raw.replace(/\D/g, "").slice(0, maxLen);

    if (part === "dd" && digits) {
      const n = Number(digits);
      if (n > 31) digits = "31";
      if (n < 1) digits = "";
    }
    if (part === "mm" && digits) {
      const n = Number(digits);
      if (n > 12) digits = "12";
      if (n < 1) digits = "";
    }

    const next = { ...dobParts, [part]: digits };
    setDobParts(next);
    setErrors((prev) => ({ ...prev, dob: undefined }));

    const { dd, mm, yyyy } = next;
    setFormData((f) => {
      if (yyyy && yyyy.length === 4 && mm && dd) {
        if (isFutureDate(yyyy, mm.padStart(2, "0"), dd.padStart(2, "0"))) {
          return { ...f, dob: "" };
        }
        return {
          ...f,
          dob: `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`,
        };
      }
      return { ...f, dob: "" };
    });
  };

  const addSector = () => {
    const normalized = normalizeSector(sectorDraft);
    if (!normalized) return;
    setErrors((prev) => ({ ...prev, preferredSectors: undefined }));
    setFormData((prev) => ({
      ...prev,
      preferredSectors: prev.preferredSectors.includes(normalized)
        ? prev.preferredSectors
        : [...prev.preferredSectors, normalized],
    }));
    setSectorDraft("");
  };

  const removeSector = (sector) =>
    setFormData((prev) => ({
      ...prev,
      preferredSectors: prev.preferredSectors.filter((s) => s !== sector),
    }));

  const SectionHeading = ({ icon: Icon, title, description }) => (
    <Stack direction="row" spacing={3} alignItems="flex-start" sx={{ mb: 5 }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: `${radii.md}px`,
          background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
        }}
      >
        <Icon size={18} color="#FFFFFF" />
      </Box>
      <Box>
        <Typography variant="h4" sx={{ color: "primary.main" }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
          {description}
        </Typography>
      </Box>
    </Stack>
  );

  const stepVariants = {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
  };

  return (
    <>
      <AuthLayout
        maxWidth="xl"
        cardWidth={640}
        eyebrow="Admin console"
        heading="Register a new agent"
        subheading="Onboard an agent on their behalf. They'll receive an agent code that's required at every sign-in."
        icon={<ShieldCheck size={28} color="#FFFFFF" />}
        benefits={[
          "Agent code issued on submission",
          "ID documents stored securely",
          "Sector coverage drives lead routing",
          "Agent appears in agent management straight away",
        ]}
        footer={
          <Stack spacing={4}>
            <Divider />
            <Typography
              variant="body2"
              sx={{ textAlign: "center", color: "text.secondary" }}
            >
              Managing existing agents?{" "}
              <Link
                component="button"
                type="button"
                variant="body2"
                underline="hover"
                onClick={() => navigate("/admin/agentsmanagement")}
                sx={{ color: "secondary.main", fontWeight: 600 }}
              >
                Agent management
              </Link>
            </Typography>
          </Stack>
        }
      >
        {/* Progress header */}
        <Box sx={{ mb: 6 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
            sx={{ mb: 2 }}
          >
            <Typography variant="h3" sx={{ color: "primary.main" }}>
              Agent registration
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Step {currentStep} of {totalSteps}
            </Typography>
          </Stack>

          <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
            Enter the agent's details, then upload their photo and ID proof.
          </Typography>

          <LinearProgress
            variant="determinate"
            value={completionPercent}
            aria-label={`Step ${currentStep} of ${totalSteps}`}
            sx={{
              height: 6,
              borderRadius: 999,
              backgroundColor: "background.default",
              "& .MuiLinearProgress-bar": {
                borderRadius: 999,
                background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
              },
            }}
          />
        </Box>

        {errors.submit && (
          <Alert severity="error" sx={{ mb: 5 }} onClose={() => setErrors((p) => ({ ...p, submit: undefined }))}>
            {errors.submit}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <AnimatePresence mode="wait">
            {/* ------------------------------------------- STEP 1 ------- */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <SectionHeading
                  icon={User}
                  title="Personal information"
                  description="Name, date of birth, experience and mobile number help us prevent fake accounts."
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    columnGap: 5,
                  }}
                >
                  <AuthField
                    label="Full name"
                    required
                    icon={User}
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    error={errors.fullName}
                    valid={isFieldValid("fullName")}
                    helperText="As it appears on their ID"
                  />

                  <AuthField
                    label="Email"
                    icon={Mail}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={errors.email}
                    helperText="Optional — used for notifications"
                  />

                  <AuthField
                    label="Mobile number"
                    required
                    icon={Phone}
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={(e) =>
                      handleInputChange({
                        target: {
                          name: "mobileNumber",
                          value: e.target.value.replace(/\D/g, "").slice(0, 10),
                        },
                      })
                    }
                    error={errors.mobileNumber}
                    valid={isFieldValid("mobileNumber")}
                    helperText="10 digits, no country code"
                    inputProps={{ inputMode: "numeric", maxLength: 10 }}
                  />

                  <AuthField
                    label="WhatsApp number"
                    icon={MessageCircle}
                    type="tel"
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={(e) =>
                      handleInputChange({
                        target: {
                          name: "whatsappNumber",
                          value: e.target.value.replace(/\D/g, "").slice(0, 10),
                        },
                      })
                    }
                    error={errors.whatsappNumber}
                    helperText="Defaults to their mobile number"
                    inputProps={{ inputMode: "numeric", maxLength: 10 }}
                  />

                  {/* Date of birth: three boxes, one value */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      component="label"
                      variant="body2"
                      sx={{
                        display: "block",
                        mb: 2,
                        color: errors.dob ? "error.main" : "text.secondary",
                      }}
                    >
                      Date of birth *
                    </Typography>
                    <Stack direction="row" spacing={3}>
                      {[
                        { part: "dd", label: "DD" },
                        { part: "mm", label: "MM" },
                        { part: "yyyy", label: "YYYY" },
                      ].map(({ part, label }) => (
                        <TextField
                          key={part}
                          value={dobParts[part]}
                          onChange={(e) => handleDobPart(part, e.target.value)}
                          error={Boolean(errors.dob)}
                          placeholder={label}
                          inputProps={{
                            // On the input, not the TextField root — otherwise
                            // it lands on the wrapper div and the box itself
                            // has no accessible name.
                            "aria-label":
                              part === "yyyy"
                                ? "Year of birth"
                                : part === "mm"
                                ? "Month of birth"
                                : "Day of birth",
                            inputMode: "numeric",
                            maxLength: part === "yyyy" ? 4 : 2,
                            style: { textAlign: "center" },
                          }}
                          sx={{ flex: part === "yyyy" ? 1.5 : 1 }}
                        />
                      ))}
                    </Stack>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 2,
                        minHeight: 20,
                        color: errors.dob ? "error.main" : "text.secondary",
                      }}
                    >
                      {errors.dob || "Used only for verification"}
                    </Typography>
                  </Box>

                  <AuthField
                    label="Experience (years)"
                    required
                    icon={Hash}
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={(e) =>
                      handleInputChange({
                        target: {
                          name: "experienceYears",
                          value: e.target.value.replace(/\D/g, "").slice(0, 2),
                        },
                      })
                    }
                    error={errors.experienceYears}
                    valid={isFieldValid("experienceYears")}
                    helperText="Whole years — round down"
                    inputProps={{ inputMode: "numeric", maxLength: 2 }}
                  />
                </Box>
              </motion.div>
            )}

            {/* ------------------------------------------- STEP 2 ------- */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <SectionHeading
                  icon={FileText}
                  title="Identity verification"
                  description="A clear profile photo and a valid ID document. JPG or PDF, under 1 MB each."
                />

                {/* Profile photo */}
                <Box sx={{ mb: 6 }}>
                  <Typography
                    component="label"
                    variant="body2"
                    sx={{ display: "block", mb: 3, color: "text.secondary" }}
                  >
                    Profile photo *
                  </Typography>

                  <Stack direction="row" spacing={4} alignItems="center">
                    <Avatar
                      src={profilePreview || undefined}
                      sx={{
                        width: 76,
                        height: 76,
                        border: "2px solid",
                        borderColor: errors.profilePhoto
                          ? "error.main"
                          : "divider",
                        backgroundColor: "background.default",
                      }}
                    >
                      <User size={30} color="#4A6A8A" />
                    </Avatar>

                    <Box>
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<Upload size={15} />}
                        sx={{
                          borderColor: "secondary.main",
                          color: "secondary.main",
                        }}
                      >
                        {formData.profilePhoto ? "Change photo" : "Upload photo"}
                        <input
                          hidden
                          type="file"
                          accept="image/jpeg,image/jpg"
                          onChange={(e) => handleFileUpload(e, "profilePhoto")}
                        />
                      </Button>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 2,
                          color: errors.profilePhoto
                            ? "error.main"
                            : "text.secondary",
                        }}
                      >
                        {errors.profilePhoto || "JPG or JPEG, under 1 MB"}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* ID proof */}
                <Box sx={{ mb: 6 }}>
                  <Typography
                    component="label"
                    variant="body2"
                    sx={{ display: "block", mb: 3, color: "text.secondary" }}
                  >
                    ID proof *
                  </Typography>

                  <Button
                    component="label"
                    variant="outlined"
                    fullWidth
                    startIcon={<Upload size={15} />}
                    sx={{
                      py: 4,
                      borderStyle: "dashed",
                      borderColor: errors.idProof ? "error.main" : "divider",
                      color: "text.secondary",
                    }}
                  >
                    Choose files — up to 3
                    <input
                      hidden
                      multiple
                      type="file"
                      accept="image/jpeg,image/jpg,application/pdf,.doc,.docx"
                      onChange={(e) => handleFileUpload(e, "idProof")}
                    />
                  </Button>

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 2,
                      color: errors.idProof ? "error.main" : "text.secondary",
                    }}
                  >
                    {errors.idProof || "JPG, PDF, DOC or DOCX — under 1 MB each"}
                  </Typography>

                  {Array.isArray(formData.idProof) &&
                    formData.idProof.length > 0 && (
                      <Stack spacing={2} sx={{ mt: 4 }}>
                        {formData.idProof.map((file, idx) => (
                          <Stack
                            key={`${file.name}-${idx}`}
                            direction="row"
                            alignItems="center"
                            spacing={3}
                            sx={{
                              px: 4,
                              py: 3,
                              borderRadius: `${radii.md}px`,
                              backgroundColor: "background.default",
                            }}
                          >
                            <FileText size={15} color="#4A6A8A" />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ fontWeight: 600 }}
                              >
                                {file.name}
                              </Typography>
                              <Typography variant="caption">
                                {formatFileSize(file.size)}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => removeIdProof(idx)}
                              aria-label={`Remove ${file.name}`}
                            >
                              <X size={15} />
                            </IconButton>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                </Box>

                <SectionHeading
                  icon={MapPin}
                  title="Areas they cover"
                  description="Add the sectors this agent works in — we use these to route matching leads to them."
                />

                <Stack direction="row" spacing={3} alignItems="flex-start">
                  <AuthField
                    label="Add a sector"
                    icon={MapPin}
                    value={sectorDraft}
                    onChange={(e) => setSectorDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSector();
                      }
                    }}
                    error={errors.preferredSectors}
                    valid={isFieldValid("preferredSectors")}
                    helperText="e.g. Sector 46, Sec-56, DLF Phase 2"
                    sx={{ flex: 1 }}
                  />
                  <Button
                    type="button"
                    variant="contained"
                    onClick={addSector}
                    disabled={!sectorDraft.trim()}
                    sx={{ mt: 2, flexShrink: 0, py: 3.5 }}
                  >
                    Add
                  </Button>
                </Stack>

                {formData.preferredSectors.length > 0 && (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    useFlexGap
                    spacing={2}
                    sx={{ mb: 4 }}
                  >
                    {formData.preferredSectors.map((sector) => (
                      <Chip
                        key={sector}
                        label={sector}
                        onDelete={() => removeSector(sector)}
                        deleteIcon={<X size={14} />}
                        sx={{
                          backgroundColor: "rgba(0,167,157,0.1)",
                          color: "secondary.dark",
                          fontWeight: 600,
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step navigation */}
          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={3}
            justifyContent="space-between"
            alignItems="stretch"
            sx={{
              mt: 7,
              pt: 6,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outlined"
                onClick={goToPrev}
                startIcon={<ArrowLeft size={15} />}
                sx={{ color: "text.secondary", borderColor: "divider" }}
              >
                Back
              </Button>
            ) : (
              <Box />
            )}

            {/* Distinct keys matter: without them React reconciles these two
                as one DOM node and only swaps `type`, so the click that
                advances the step lands on a button that has already become
                type="submit" — firing a real submit on every Continue. */}
            {currentStep < totalSteps ? (
              <AuthButton
                key="step-next"
                type="button"
                onClick={goToNext}
                sx={{ width: { xs: "100%", sm: "auto" }, px: 8 }}
              >
                Continue
              </AuthButton>
            ) : (
              <AuthButton
                key="step-submit"
                loading={submitting}
                loadingText="Submitting…"
                sx={{ width: { xs: "100%", sm: "auto" }, px: 8 }}
              >
                Register agent
              </AuthButton>
            )}
          </Stack>
        </Box>
      </AuthLayout>

      {/* Set a password after registering */}
      <Dialog open={showPasswordModal} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 8 }}>
          <Typography variant="h3" sx={{ color: "primary.main", mb: 2 }}>
            Set the agent's password
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
            For {passwordForm.mobileNumber}
          </Typography>

          <AuthField
            label="Password"
            icon={KeyRound}
            type="password"
            autoComplete="new-password"
            value={passwordForm.password}
            onChange={(e) => {
              setErrors((p) => ({ ...p, password: undefined }));
              setPasswordForm((p) => ({ ...p, password: e.target.value }));
            }}
            error={errors.password}
            helperText="At least 6 characters"
          />

          <AuthField
            label="Confirm password"
            icon={KeyRound}
            type="password"
            autoComplete="new-password"
            value={passwordForm.confirmPassword}
            onChange={(e) => {
              setErrors((p) => ({ ...p, confirmPassword: undefined }));
              setPasswordForm((p) => ({
                ...p,
                confirmPassword: e.target.value,
              }));
            }}
            error={errors.confirmPassword}
          />

          <AuthButton
            type="button"
            loading={settingPassword}
            loadingText="Saving…"
            onClick={handleSetPassword}
            sx={{ mt: 3 }}
          >
            Save password
          </AuthButton>
        </DialogContent>
      </Dialog>

      {/* Registration success — the agent code shown here is the one thing
          that must be kept, so the dialog can't be dismissed until it's
          confirmed as saved. */}
      <Dialog open={showSuccessModal} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 8, textAlign: "center" }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              mx: "auto",
              mb: 4,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              backgroundColor: "rgba(46,158,107,0.12)",
            }}
          >
            <Check size={28} color="#2E9E6B" />
          </Box>

          <Typography variant="h3" sx={{ color: "primary.main", mb: 4 }}>
            Agent registered
          </Typography>

          <Alert
            severity="warning"
            icon={<AlertCircle size={18} />}
            sx={{ mb: 5, textAlign: "left" }}
          >
            The agent needs this code every time they sign in. Pass it on and
            save it now — it can't easily be recovered.
          </Alert>

          <Stack
            spacing={4}
            sx={{
              p: 5,
              mb: 5,
              borderRadius: `${radii.md}px`,
              backgroundColor: "background.default",
            }}
          >
            <Box>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Agent code
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  color: "primary.main",
                  letterSpacing: "0.06em",
                  wordBreak: "break-all",
                }}
              >
                {successData.agentCode}
              </Typography>
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Registered mobile number
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  color: "primary.main",
                }}
              >
                {successData.mobileNumber}
              </Typography>
            </Box>
          </Stack>

          {!confirmSaved ? (
            <AuthButton type="button" onClick={() => setConfirmSaved(true)}>
              I've saved the agent code
            </AuthButton>
          ) : (
            <Stack spacing={3}>
              {/* The form resets itself on success, so closing the dialog
                  leaves a blank form ready for the next agent. */}
              <AuthButton
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setConfirmSaved(false);
                }}
              >
                Register another agent
              </AuthButton>
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setShowSuccessModal(false);
                  setConfirmSaved(false);
                  navigate("/admin/agentsmanagement");
                }}
                sx={{ color: "text.secondary", borderColor: "divider" }}
              >
                Go to agent management
              </Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgentRegistration;
