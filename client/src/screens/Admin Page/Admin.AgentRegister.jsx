import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  User,
  FileText,
  X,
  Check,
  AlertCircle,
  Hash,
} from "lucide-react";


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
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmSaved, setConfirmSaved] = useState(false);
  const [showOptionalFields] = useState(false); // kept but unused now

  const [dobParts, setDobParts] = useState({ dd: "", mm: "", yyyy: "" });

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

  // responsive flag
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("resize", onResize);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", onResize);
      }
    };
  }, []);

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
      return;
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

    if (!formData.fullName?.trim())
      newErrors.fullName = "Full name is required";
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

    if (
      !formData.preferredSectors ||
      formData.preferredSectors.length === 0
    ) {
      newErrors.preferredSectors = "Add at least one preferred sector";
    }

    if (!/^\d{10}$/.test(String(formData.mobileNumber || ""))) {
      newErrors.mobileNumber = "Enter a valid 10-digit mobile number";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      const firstField = Object.keys(newErrors)[0];
      const el = document.querySelector(`[data-field="${firstField}"]`);
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
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
        alert(data.message || "Registration failed");
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
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async () => {
    if (!passwordForm.password || !passwordForm.confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      alert("Passwords do not match");
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
        alert(data.message || "Failed to set password");
        return;
      }

      alert("Password set successfully. Agent registration completed.");
      setShowPasswordModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Set password error", err);
      alert("Something went wrong");
    } finally {
      setSettingPassword(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #4A6A8A 100%)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
     

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: isMobile ? "16px 12px 80px" : "32px 16px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 16 : 30,
            alignItems: "stretch",
          }}
        >
          {/* Left Branding Panel: hidden on mobile */}
          {!isMobile && (
            <div
              style={{
                flex: "0 0 360px",
                maxWidth: 420,
                background: "linear-gradient(180deg, #003366 0%, #00A79D 100%)",
                padding: "32px 28px",
                borderRadius: "24px",
                color: "#FFFFFF",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                alignSelf: "flex-start",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                  backdropFilter: "blur(10px)",
                }}
              >
                <User size={36} color="#FFFFFF" />
              </div>

              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  marginBottom: "16px",
                  lineHeight: "1.2",
                }}
              >
                Register as a Verified Agent
              </h1>

              <p
                style={{
                  fontSize: "14px",
                  lineHeight: "1.6",
                  opacity: 0.95,
                  marginBottom: "20px",
                }}
              >
                Join Gurgaon's fastest-growing property platform. Get verified
                leads, post listings, and access your exclusive agent dashboard.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 10,
                  marginBottom: 20,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(15, 23, 42, 0.35)",
                    border: "1px solid rgba(148, 163, 184, 0.5)",
                  }}
                >
                  <strong>Bank-grade security.</strong> Your data is encrypted
                  and never sold to third parties.
                </div>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(15, 23, 42, 0.35)",
                    border: "1px solid rgba(148, 163, 184, 0.5)",
                  }}
                >
                  <strong>Phone-first login.</strong> Only your mobile number +
                  Agent Code are used to log in.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {[
                  "Verified Lead Access",
                  "Exclusive Dashboard",
                  "Direct Client Connect",
                  "Performance Analytics",
                ].map((benefit, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px",
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <Check size={18} color="#22D3EE" />
                    <span style={{ fontSize: "13px", fontWeight: "500" }}>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right Panel: Form */}
          <div
            style={{
              flex: "1 1 0%",
              background: "#FFFFFF",
              borderRadius: "24px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Header with progress */}
            <div
              style={{
                padding: isMobile ? "16px 16px 12px" : "20px 32px 16px",
                borderBottom: "1px solid #E3EDF5",
                background: "linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  alignItems: isMobile ? "flex-start" : "center",
                  gap: 12,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: isMobile ? 20 : 24,
                      fontWeight: "700",
                      color: "#003366",
                      margin: 0,
                      marginBottom: 4,
                    }}
                  >
                    Agent Registration
                  </h2>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#4A6A8A",
                      margin: 0,
                    }}
                  >
                    Step {currentStep} of {totalSteps} · Takes ~2 minutes to
                    complete
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                      margin: "4px 0 0",
                    }}
                  >
                    You&apos;ll receive your Agent Code immediately after
                    successful verification.
                  </p>
                </div>
                <div style={{ minWidth: isMobile ? "100%" : 180 }}>
                  <div
                    style={{
                      background: "#E6EEF5",
                      borderRadius: 999,
                      height: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${completionPercent}%`,
                        height: "100%",
                        background:
                          "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                        transition: "width 0.25s ease-out",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 10,
                      color: "#64748B",
                      textAlign: "right",
                    }}
                  >
                    {Math.round(completionPercent)}% completed
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                padding: isMobile ? "16px 12px 84px" : "32px",
              }}
            >
              {/* STEP 1: Personal */}
              <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step-1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25, ease: "easeOut" }} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                      paddingBottom: 10,
                      borderBottom: "2px solid #F4F7F9",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        background:
                          "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={18} color="#FFFFFF" />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#003366",
                          margin: 0,
                        }}
                      >
                        Personal Information
                      </h3>
                      <p
                        style={{
                          fontSize: 11,
                          color: "#64748B",
                          margin: "4px 0 0",
                        }}
                      >
                        Complete these mandatory details to create your agent
                        profile.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 16,
                      padding: 12,
                      background: "#F8FAFC",
                      marginBottom: 14,
                      fontSize: 11,
                      color: "#0F172A",
                    }}
                  >
                    <strong>Required to verify you.</strong> Name, DOB,
                    experience, and mobile number help us prevent fake accounts.
                  </div>

                  {/* Grid: 2 columns on desktop, 1 column on mobile */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))",
                      gap: 14,
                    }}
                  >
                    {/* Full Name */}
                    <div data-field="fullName">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: 4,
                            color: "#111827",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Full Name *
                        </label>
                        {isFieldValid("fullName") && (
                          <Check
                            size={14}
                            color="#059669"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </div>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        data-field="fullName"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: `2px solid ${
                            errors.fullName ? "#F97373" : "#E5E7EB"
                          }`,
                          fontSize: 14,
                          outline: "none",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "#00A79D")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = errors.fullName
                            ? "#F97373"
                            : "#E5E7EB")
                        }
                      />
                      {errors.fullName && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "#B91C1C",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <AlertCircle size={12} />
                          {errors.fullName}
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: 4,
                          color: "#111827",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "2px solid #E5E7EB",
                          borderRadius: 12,
                          fontSize: 14,
                          outline: "none",
                          background: "inherit",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "#00A79D")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "#E5E7EB")
                        }
                      />
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          marginTop: 3,
                        }}
                      >
                        Used to send your Agent Code and important alerts.
                      </div>
                    </div>

                    {/* Mobile */}
                    <div data-field="mobileNumber">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: 4,
                            color: "#111827",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Mobile Number *
                        </label>
                        {isFieldValid("mobileNumber") && (
                          <Check
                            size={14}
                            color="#059669"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </div>
                      <input
                        type="tel"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleInputChange}
                        pattern="[0-9]{10}"
                        inputMode="numeric"
                        required
                        data-field="mobileNumber"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: `2px solid ${
                            errors.mobileNumber ? "#F97373" : "#E5E7EB"
                          }`,
                          fontSize: 14,
                          outline: "none",
                          background: "inherit",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "#00A79D")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = errors.mobileNumber
                            ? "#F97373"
                            : "#E5E7EB")
                        }
                      />
                      {errors.mobileNumber && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "#B91C1C",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <AlertCircle size={12} />
                          {errors.mobileNumber}
                        </div>
                      )}
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: 4,
                          color: "#111827",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        name="whatsappNumber"
                        value={formData.whatsappNumber}
                        onChange={handleInputChange}
                        inputMode="numeric"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "2px solid #E5E7EB",
                          borderRadius: 12,
                          fontSize: 14,
                          outline: "none",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "#00A79D")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "#E5E7EB")
                        }
                      />
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          marginTop: 3,
                        }}
                      >
                        Used only for lead and booking updates.
                      </div>
                    </div>
                  </div>

                  {/* DOB + Experience */}
                  <div
                    style={{
                      marginTop: 18,
                      display: "grid",
                      gap: 14,
                      gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr",
                    }}
                  >
                    {/* DOB */}
                    <div data-field="dob">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: 4,
                            color: "#111827",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Date of Birth *
                        </label>
                        {isFieldValid("dob") && (
                          <Check
                            size={14}
                            color="#059669"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: isMobile ? "column" : "row",
                          gap: 8,
                        }}
                      >
                        <input
                          type="text"
                          placeholder="DD"
                          maxLength={2}
                          inputMode="numeric"
                          value={dobParts.dd}
                          data-field="dob"
                          onChange={(e) => {
                            let dd = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 2);
                            if (dd) {
                              const n = Number(dd);
                              if (n > 31) dd = "31";
                              if (n < 1) dd = "";
                            }
                            setDobParts((p) => ({ ...p, dd }));
                            setErrors((prev) => ({ ...prev, dob: undefined }));

                            setFormData((f) => {
                              const yyyy = dobParts.yyyy;
                              const mm = dobParts.mm;
                              if (yyyy && mm && dd) {
                                if (isFutureDate(yyyy, mm, dd))
                                  return { ...f, dob: "" };
                                return {
                                  ...f,
                                  dob: `${yyyy}-${mm.padStart(
                                    2,
                                    "0"
                                  )}-${dd.padStart(2, "0")}`,
                                };
                              }
                              return f;
                            });
                          }}
                          style={{
                            width: isMobile ? "100%" : 72,
                            padding: "10px 10px",
                            borderRadius: 12,
                            border: `2px solid ${
                              errors.dob ? "#F97373" : "#E5E7EB"
                            }`,
                            fontSize: 14,
                            textAlign: "center",
                            outline: "none",
                          }}
                        />
                        <input
                          type="text"
                          placeholder="MM"
                          maxLength={2}
                          inputMode="numeric"
                          value={dobParts.mm}
                          onChange={(e) => {
                            let mm = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 2);
                            if (mm) {
                              const mmNum = Number(mm);
                              if (mmNum > 12) mm = "12";
                              if (mmNum < 1) mm = "";
                            }
                            setDobParts((p) => ({ ...p, mm }));
                            setErrors((prev) => ({ ...prev, dob: undefined }));

                            setFormData((f) => {
                              const yyyy = dobParts.yyyy;
                              const dd = dobParts.dd;
                              if (yyyy && mm && dd) {
                                if (isFutureDate(yyyy, mm, dd))
                                  return { ...f, dob: "" };
                                return {
                                  ...f,
                                  dob: `${yyyy}-${mm.padStart(
                                    2,
                                    "0"
                                  )}-${dd.padStart(2, "0")}`,
                                };
                              }
                              return f;
                            });
                          }}
                          style={{
                            width: isMobile ? "100%" : 72,
                            padding: "10px 10px",
                            borderRadius: 12,
                            border: `2px solid ${
                              errors.dob ? "#F97373" : "#E5E7EB"
                            }`,
                            fontSize: 14,
                            textAlign: "center",
                            outline: "none",
                          }}
                        />
                        <input
                          type="text"
                          placeholder="YYYY"
                          maxLength={4}
                          inputMode="numeric"
                          value={dobParts.yyyy}
                          onChange={(e) => {
                            const yyyy = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 4);
                            setDobParts((p) => ({ ...p, yyyy }));
                            setErrors((prev) => ({ ...prev, dob: undefined }));

                            setFormData((f) => {
                              const mm = dobParts.mm;
                              const dd = dobParts.dd;
                              if (yyyy.length === 4 && mm && dd) {
                                if (isFutureDate(yyyy, mm, dd))
                                  return { ...f, dob: "" };
                                return {
                                  ...f,
                                  dob: `${yyyy}-${mm.padStart(
                                    2,
                                    "0"
                                  )}-${dd.padStart(2, "0")}`,
                                };
                              }
                              return f;
                            });
                          }}
                          onBlur={() => {
                            if (dobParts.yyyy.length === 2) {
                              const expanded = `20${dobParts.yyyy}`;
                              setDobParts((p) => ({ ...p, yyyy: expanded }));
                              setFormData((f) => {
                                const mm = dobParts.mm;
                                const dd = dobParts.dd;
                                if (mm && dd) {
                                  if (isFutureDate(expanded, mm, dd))
                                    return { ...f, dob: "" };
                                  return {
                                    ...f,
                                    dob: `${expanded}-${mm.padStart(
                                      2,
                                      "0"
                                    )}-${dd.padStart(2, "0")}`,
                                  };
                                }
                                return f;
                              });
                            }
                          }}
                          style={{
                            width: isMobile ? "100%" : 96,
                            padding: "10px 10px",
                            borderRadius: 12,
                            border: `2px solid ${
                              errors.dob ? "#F97373" : "#E5E7EB"
                            }`,
                            fontSize: 14,
                            textAlign: "center",
                            outline: "none",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          marginTop: 3,
                        }}
                      >
                        Format: DD / MM / YYYY · Used only for verification.
                      </div>
                      {errors.dob && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "#B91C1C",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <AlertCircle size={12} />
                          {errors.dob}
                        </div>
                      )}
                    </div>

                    {/* Experience */}
                    <div data-field="experienceYears">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: 4,
                            color: "#111827",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Experience (Years) *
                        </label>
                        {isFieldValid("experienceYears") && (
                          <Check
                            size={14}
                            color="#059669"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </div>
                      <input
                        type="number"
                        name="experienceYears"
                        value={formData.experienceYears}
                        onChange={handleInputChange}
                        min="0"
                        max="50"
                        inputMode="numeric"
                        data-field="experienceYears"
                        required
                        style={{
                          width: isMobile ? "100%" : 160,
                          padding: "10px 12px",
                          border: `2px solid ${
                            errors.experienceYears ? "#F97373" : "#E5E7EB"
                          }`,
                          borderRadius: 12,
                          fontSize: 14,
                          outline: "none",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "#00A79D")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor =
                            errors.experienceYears ? "#F97373" : "#E5E7EB")
                        }
                      />
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          marginTop: 3,
                        }}
                      >
                        Only full years count. Round down partial experience.
                      </div>
                      {errors.experienceYears && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "#B91C1C",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <AlertCircle size={12} />
                          {errors.experienceYears}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Identity + REQUIRED Preferred Sectors */}
              {currentStep === 2 && (
                <motion.div key="step-2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                  {/* Identity Verification */}
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 16,
                        paddingBottom: 10,
                        borderBottom: "2px solid #F4F7F9",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          background:
                            "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FileText size={18} color="#FFFFFF" />
                      </div>
                      <div>
                        <h3
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#003366",
                            margin: 0,
                          }}
                        >
                          Identity Verification
                        </h3>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#64748B",
                            margin: "4px 0 0",
                          }}
                        >
                          Upload a clear profile photo and valid ID documents
                          for KYC-style verification.
                        </p>
                      </div>
                    </div>

                    {/* Profile Photo */}
                    <div style={{ marginBottom: 16 }} data-field="profilePhoto">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: 6,
                            color: "#111827",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Profile Photo *
                        </label>
                        {isFieldValid("profilePhoto") && (
                          <Check
                            size={14}
                            color="#059669"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: isMobile ? "column" : "row",
                          gap: 12,
                          alignItems: isMobile ? "stretch" : "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <label
                          htmlFor="profilePhotoInput"
                          style={{
                            cursor: "pointer",
                            padding: "12px 16px",
                            border: `2px dashed ${
                              errors.profilePhoto ? "#F97373" : "#00A79D"
                            }`,
                            borderRadius: 16,
                            background: "#00A79D0A",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            transition: "all 0.3s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#00A79D15";
                            e.currentTarget.style.borderColor = "#22D3EE";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#00A79D0A";
                            e.currentTarget.style.borderColor =
                              errors.profilePhoto ? "#F97373" : "#00A79D";
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              background: "#00A79D",
                              borderRadius: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Upload size={20} color="#FFFFFF" />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#003366",
                                marginBottom: 2,
                              }}
                            >
                              Choose Photo
                            </div>
                            <div
                              style={{ fontSize: 11, color: "#4B5563" }}
                            >
                              JPG/JPEG · Max 1 MB
                            </div>
                          </div>
                          <input
                            id="profilePhotoInput"
                            type="file"
                            accept=".jpg,.jpeg"
                            onChange={(e) =>
                              handleFileUpload(e, "profilePhoto")
                            }
                            style={{ display: "none" }}
                          />
                        </label>

                        {profilePreview && (
                          <div
                            style={{
                              padding: 10,
                              background: "#F9FAFB",
                              borderRadius: 16,
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <img
                              src={profilePreview}
                              alt="Preview"
                              style={{
                                width: 64,
                                height: 64,
                                borderRadius: 12,
                                objectFit: "cover",
                                border: "2px solid #00A79D",
                              }}
                            />
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#003366",
                                }}
                              >
                                {formData.profilePhoto &&
                                  formData.profilePhoto.name}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    profilePhoto: null,
                                  }));
                                  setProfilePreview(null);
                                }}
                                style={{
                                  padding: "6px 10px",
                                  background: "#FFFFFF",
                                  color: "#EF4444",
                                  border: "1px solid #FEE2E2",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  fontSize: 11,
                                  fontWeight: 500,
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {errors.profilePhoto && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "#B91C1C",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <AlertCircle size={12} />
                          {errors.profilePhoto}
                        </div>
                      )}
                    </div>

                    {/* ID Proofs */}
                    <div data-field="idProof">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: 6,
                            color: "#111827",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          ID Proof Upload * (up to 3 files)
                        </label>
                        {isFieldValid("idProof") && (
                          <Check
                            size={14}
                            color="#059669"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </div>
                      <label
                        htmlFor="idProofInput"
                        style={{
                          cursor: "pointer",
                          padding: "12px 16px",
                          border: `2px dashed ${
                            errors.idProof ? "#F97373" : "#00A79D"
                          }`,
                          borderRadius: 16,
                          background: "#00A79D0A",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 12,
                          transition: "all 0.3s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#00A79D15";
                          e.currentTarget.style.borderColor = "#22D3EE";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#00A79D0A";
                          e.currentTarget.style.borderColor = errors.idProof
                            ? "#F97373"
                            : "#00A79D";
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            background: "#00A79D",
                            borderRadius: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Upload size={20} color="#FFFFFF" />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#003366",
                              marginBottom: 2,
                            }}
                          >
                            Upload ID Proofs
                          </div>
                          <div
                            style={{ fontSize: 11, color: "#4B5563" }}
                          >
                            JPG, PDF, DOC, DOCX · Max 1 MB each
                          </div>
                        </div>
                        <input
                          id="idProofInput"
                          type="file"
                          accept=".jpg,.jpeg,.pdf,.doc,.docx"
                          onChange={(e) => handleFileUpload(e, "idProof")}
                          multiple
                          style={{ display: "none" }}
                        />
                      </label>

                      {formData.idProof && formData.idProof.length > 0 && (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "repeat(auto-fill, minmax(180px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {formData.idProof.map((f, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: 10,
                                background: "#F9FAFB",
                                borderRadius: 16,
                                border: "1px solid #E5E7EB",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                              }}
                            >
                              {f.type && f.type.startsWith("image/") ? (
                                <img
                                  src={URL.createObjectURL(f)}
                                  alt={f.name}
                                  style={{
                                    width: "100%",
                                    height: 105,
                                    objectFit: "cover",
                                    borderRadius: 12,
                                    marginBottom: 8,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "100%",
                                    height: 105,
                                    background:
                                      "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
                                    borderRadius: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 18,
                                      fontWeight: 700,
                                      color: "#FFFFFF",
                                    }}
                                  >
                                    {f.name.split(".").pop().toUpperCase()}
                                  </div>
                                </div>
                              )}

                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#111827",
                                  marginBottom: 3,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {f.name}
                              </div>

                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6B7280",
                                  marginBottom: 6,
                                }}
                              >
                                {formatFileSize(f.size)}
                              </div>

                              <button
                                type="button"
                                onClick={() => removeIdProof(idx)}
                                style={{
                                  width: "100%",
                                  padding: 6,
                                  background: "#FFFFFF",
                                  color: "#EF4444",
                                  border: "1px solid #FEE2E2",
                                  borderRadius: 10,
                                  cursor: "pointer",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 4,
                                }}
                              >
                                <X size={12} />
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {errors.idProof && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "#B91C1C",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <AlertCircle size={12} />
                          {errors.idProof}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* REQUIRED Preferred Sectors */}
                  <div
                    style={{
                      marginTop: 8,
                      marginBottom: 16,
                    }}
                    data-field="preferredSectors"
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottom: "2px solid #F4F7F9",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          background:
                            "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Hash size={16} color="#FFFFFF" />
                      </div>
                      <div>
                        <h3
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#003366",
                            margin: 0,
                          }}
                        >
                          Preferred Sectors *
                        </h3>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                            margin: "4px 0 0",
                          }}
                        >
                          Add at least one sector you actively cover so we can
                          send you relevant leads.
                        </p>
                      </div>
                      {isFieldValid("preferredSectors") && (
                        <Check size={14} color="#059669" />
                      )}
                    </div>

                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        color: "#111827",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Add sectors
                    </label>
                    <input
                      type="text"
                      id="sectorInput"
                      placeholder="e.g. Sector 46, Sec-56, DLF Phase 2"
                      data-field="preferredSectors"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: `2px solid ${
                          errors.preferredSectors ? "#F97373" : "#E5E7EB"
                        }`,
                        borderRadius: 12,
                        fontSize: 14,
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "#00A79D")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor =
                          errors.preferredSectors ? "#F97373" : "#E5E7EB")
                      }
                    />
                    <button
                      type="button"
                      style={{
                        marginTop: 6,
                        padding: "8px 14px",
                        background:
                          "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        const input = document.getElementById("sectorInput");
                        if (!input || !input.value.trim()) return;
                        const normalized = normalizeSector(input.value);
                        if (!normalized) return;
                        setErrors((prev) => ({
                          ...prev,
                          preferredSectors: undefined,
                        }));
                        setFormData((prev) => ({
                          ...prev,
                          preferredSectors: prev.preferredSectors.includes(
                            normalized
                          )
                            ? prev.preferredSectors
                            : [...prev.preferredSectors, normalized],
                        }));
                        input.value = "";
                      }}
                    >
                      Add Sector
                    </button>

                    {formData.preferredSectors.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {formData.preferredSectors.map((sector, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "5px 10px",
                              background: "#E6FFFA",
                              color: "#065F46",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {sector}
                            <X
                              size={11}
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  preferredSectors:
                                    prev.preferredSectors.filter(
                                      (_, i) => i !== idx
                                    ),
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {errors.preferredSectors && (
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 11,
                          color: "#B91C1C",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <AlertCircle size={12} />
                        {errors.preferredSectors}
                      </div>
                    )}
                  </div>

                  {/* Trust copy */}
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: "#F9FAFB",
                      border: "1px solid #E5E7EB",
                      fontSize: 11,
                      color: "#4B5563",
                    }}
                  >
                    Your documents are stored securely and never shown publicly.
                    They are used only for internal verification.
                  </div>
                </motion.div>
              )}
              </AnimatePresence>

              {/* Navigation + submit */}
              <div
                style={{
                  marginTop: 22,
                  padding: 12,
                  background:
                    "linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)",
                  borderRadius: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: isMobile ? "stretch" : "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={goToPrev}
                    disabled={currentStep === 1}
                    style={{
                      padding: "9px 14px",
                      minWidth: isMobile ? "100%" : 100,
                      borderRadius: 999,
                      border: "1px solid #E5E7EB",
                      background:
                        currentStep === 1 ? "#F9FAFB" : "#FFFFFF",
                      color: "#4B5563",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: currentStep === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    Previous
                  </button>

                  {currentStep < totalSteps && (
                    <button
                      type="button"
                      onClick={goToNext}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 999,
                        border: "none",
                        background:
                          "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 6px 18px rgba(0, 167, 157, 0.35)",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      Continue
                    </button>
                  )}

                  {currentStep === totalSteps && (
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 999,
                        border: "none",
                        background: submitting
                          ? "#4A6A8A"
                          : "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: submitting ? "not-allowed" : "pointer",
                        boxShadow: "0 6px 18px rgba(0, 167, 157, 0.35)",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      {submitting ? "Submitting..." : "Register Now"}
                    </button>
                  )}
                </div>

                <p
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: "#6B7280",
                    marginTop: 8,
                    marginBottom: 0,
                  }}
                >
                  By registering, you agree to the GGNHome Agent Terms &
                  Conditions.
                </p>
                <p
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    color: "#9CA3AF",
                    marginTop: 3,
                    marginBottom: 0,
                  }}
                >
                  Your information is stored securely and used only to operate
                  your agent account.
                </p>
              </div>
            </form>

            {/* Sticky submit on mobile */}
            {isMobile && currentStep === totalSteps && (
              <div
                style={{
                  position: "fixed",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: "10px 12px",
                  background:
                    "linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.9) 40%)",
                  zIndex: 999,
                }}
              >
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "11px",
                    borderRadius: 999,
                    border: "none",
                    background: submitting
                      ? "#4A6A8A"
                      : "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 8px 20px rgba(0, 167, 157, 0.4)",
                  }}
                >
                  {submitting ? "Submitting..." : "Register Now"}
                </button>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    color: "#E5E7EB",
                    marginTop: 4,
                  }}
                >
                  Your data is encrypted & never shared.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              padding: 24,
              borderRadius: 16,
              width: 360,
              maxWidth: "90vw",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ marginBottom: 16, color: "#003366" }}>
              Set Your Password
            </h3>

            <input
              type="tel"
              value={passwordForm.mobileNumber}
              readOnly
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 10,
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                background: "#F8FAFC",
                fontSize: 14,
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={passwordForm.password}
              onChange={(e) =>
                setPasswordForm((p) => ({ ...p, password: e.target.value }))
              }
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 10,
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                fontSize: 14,
              }}
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((p) => ({
                  ...p,
                  confirmPassword: e.target.value,
                }))
              }
              style={{
                width: "100%",
                padding: 10,
                marginBottom: 16,
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                fontSize: 14,
              }}
            />

            <button
              onClick={handleSetPassword}
              disabled={settingPassword}
              style={{
                width: "100%",
                padding: 12,
                background: "#00A79D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: settingPassword ? "not-allowed" : "pointer",
              }}
            >
              {settingPassword ? "Setting Password..." : "Set Password"}
            </button>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              padding: 24,
              borderRadius: 20,
              width: 420,
              maxWidth: "92vw",
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#003366", marginBottom: 10 }}>
              Registration Successful
            </h2>

            <p
              style={{
                color: "#7C2D12",
                fontWeight: 800,
                fontSize: 14,
                background: "#FEF3C7",
                padding: 10,
                borderRadius: 10,
                border: "2px solid #F59E0B",
                marginBottom: 14,
              }}
            >
              IMPORTANT: This Agent Code will be required every time you log in.
              Please save it carefully. It cannot be recovered easily.
            </p>

            <div
              style={{
                background: "#F4F7F9",
                padding: 14,
                borderRadius: 14,
                marginBottom: 12,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong>Agent Code</strong>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#003366",
                    letterSpacing: 1,
                    marginTop: 4,
                    wordBreak: "break-all",
                  }}
                >
                  {successData.agentCode}
                </div>
              </div>

              <div>
                <strong>Registered Mobile Number</strong>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#003366",
                    marginTop: 4,
                  }}
                >
                  {successData.mobileNumber}
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: 11,
                color: "#4B5563",
                marginBottom: 10,
              }}
            >
              We do not email or text your Agent Code again. Store it in a safe
              place now.
            </p>

            {!confirmSaved && (
              <div style={{ marginTop: 4 }}>
                <p
                  style={{
                    fontWeight: 700,
                    color: "#003366",
                    marginBottom: 10,
                  }}
                >
                  Have you safely saved your Agent Code?
                </p>
                <button
                  onClick={() => setConfirmSaved(true)}
                  style={{
                    width: "100%",
                    padding: 12,
                    background: "#DC2626",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  YES, I HAVE SAVED IT
                </button>
              </div>
            )}

            {confirmSaved && (
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setConfirmSaved(false);
                  navigate("/agent/login");
                }}
                style={{
                  width: "100%",
                  padding: 12,
                  background:
                    "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: 8,
                }}
              >
                Go to Agent Login
              </button>
            )}
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AgentRegistration;
