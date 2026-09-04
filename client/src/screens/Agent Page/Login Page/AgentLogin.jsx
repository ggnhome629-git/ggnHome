import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Phone, Key, LogIn, ArrowRight } from "lucide-react";
import TopNavigationBar from "../Top Navigation Bar/AgentTopNavigationBar";

const AgentLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    mobileNumber: "",
    agentCode: "",
    otp: "",
    password: "",
    loginType: "otp", // "otp" | "password"
  });

  const [errors, setErrors] = useState({
    email: "",
    mobileNumber: "",
    agentCode: "",
    otp: "",
    password: ""
  });
  const [formError, setFormError] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false); // hide OTP button until we check session / server needs it
  const [prefilledFromSession, setPrefilledFromSession] = useState(false);
  const [agentVerified, setAgentVerified] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
const [forgotData, setForgotData] = useState({
  agentCode: "",
  dob: ""
});
  const [passwordState, setPasswordState] = useState(null);
// null | "SET_PASSWORD" | "PASSWORD_PRESENT"

const [newPassword, setNewPassword] = useState("");
const [setPasswordLoading, setSetPasswordLoading] = useState(false);
const [forgotMsg, setForgotMsg] = useState("");
const [forgotLoading, setForgotLoading] = useState(false);
  // show full-screen loader for 2s after successful login
  const [showFullLoader, setShowFullLoader] = useState(false);
  // Login button should be enabled only after agent is verified
  const isLoginDisabled =
    isLoading ||
    (
      (
        !agentVerified || // must pass "Check Agent"
        (formData.loginType === "otp" && !showOtp) || // OTP must be sent
        (formData.loginType === "otp" && !formData.otp) || // OTP must be entered
        (formData.loginType === "password" && !formData.password) // password required
      ));
  const isSetPasswordFlow =
    formData.loginType === "password" && passwordState === "SET_PASSWORD";
  const handleForgotChange = (e) => {
  const { name, value } = e.target;
  setForgotData((p) => ({
    ...p,
    [name]: name === "agentCode" ? value.toLowerCase() : value
  }));
};

const handleForgotSubmit = async () => {
  setForgotMsg("");
  setForgotLoading(true);
  try {
    const base = process.env.REACT_APP_Base_API || "";
    const res = await fetch(`${base}/api/agent/reset-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentCode: forgotData.agentCode,
        dob: forgotData.dob
      })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setForgotMsg(json.message || "Password reset failed");
      return;
    }

    setForgotMsg(json.message || "Password reset successful");
  } catch {
    setForgotMsg("Network error. Please try again.");
  } finally {
    setForgotLoading(false);
  }
};
  useEffect(() => {
    // console.log("[AgentLogin] mounted");
    // On mount, try to fetch logged-in user (cookie-based first, then token-based)
    // and prefill email and mobileNumber so they appear fixed on the login form.
    let mounted = true;
    const fetchLoggedInUser = async () => {
      // console.log("[AgentLogin] useEffect mounted – checking existing session");
      try {
        const base = process.env.REACT_APP_Base_API || "";
        if (!base) {
          console.warn("REACT_APP_Base_API not set — /auth/me call skipped");
          return;
        }

        // Try cookie-based session first
        try {
          const res = await fetch(`${base}/auth/me`, {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          // console.log("[AgentLogin] /auth/me (cookie) status:", res.status);
          if (!mounted) return;
          const data = await res.json().catch(() => null);
          // console.log("[AgentLogin] /auth/me (cookie) response:", data);
          if (
            res.ok &&
            data &&
            (data.user || data.email || data.mobileNumber)
          ) {
            const user = data.user || data;
            const { email, mobileNumber } = user;
            if (mounted && (email || mobileNumber)) {
              setFormData((prev) => ({
                ...prev,
                email: email || prev.email,
                mobileNumber: mobileNumber || prev.mobileNumber,
              }));
              setPrefilledFromSession(true);
            }
            return;
          }
        } catch (err) {
          console.warn("cookie-based /auth/me failed:", err);
        }

        // Fallback: token-based
        try {
          const token = localStorage.getItem("agentAccessToken");
          if (!token) return;
          const res2 = await fetch(`${base}/auth/me`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (!mounted) return;
          const data2 = await res2.json().catch(() => null);
          if (
            res2.ok &&
            data2 &&
            (data2.user || data2.email || data2.mobileNumber)
          ) {
            const user = data2.user || data2;
            const { email, mobileNumber } = user;
            if (mounted && (email || mobileNumber)) {
              setFormData((prev) => ({
                ...prev,
                email: email || prev.email,
                mobileNumber: mobileNumber || prev.mobileNumber,
              }));
              setPrefilledFromSession(true);
            }
            return;
          }
        } catch (err) {
          // ignore
        }
      } catch (e) {
        // ignore top-level
      }
    };

    fetchLoggedInUser();
    return () => {
      mounted = false;
    };
  }, []);

  // 🔄 Ensure page reloads ONCE after login success
  // 🔄 SPA navigation to dashboard with loader
  const navigateToDashboard = () => {
    // console.log("[AgentLogin] navigateToDashboard called");
    // console.log("[AgentLogin] navigating to dashboard (SPA)");
    try {
      try {
        sessionStorage.setItem("justLoggedIn", "1");
      } catch (e) {}
      setShowFullLoader(true);
      setTimeout(() => {
        navigate("/agent/dashboard", { replace: true });
      }, 800);
    } catch (e) {
      // fallback: do nothing
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (formError) setFormError("");
    // SAFETY: RESET OTP STATE ON EMAIL CHANGE
    if (name === "email") {
      setOtpRequired(false);
      setShowOtp(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email — OPTIONAL for agent login
    if (formData.email) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) {
        newErrors.email = "Invalid email address";
      }
    }

    if (formData.loginType === "password") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      }
    }

    // Validate mobile number (10 digits)
    if (!formData.mobileNumber) {
      newErrors.mobileNumber = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = "Invalid mobile number. Please enter 10 digits";
    }

    // Validate agent code
    if (!formData.agentCode) {
      newErrors.agentCode = "Agent code is required";
    } else if (formData.agentCode.length < 6) {
      newErrors.agentCode = "Agent code must be at least 6 characters";
    }

    // If OTP is visible, validate it
    if (showOtp) {
      if (!formData.otp) {
        newErrors.otp = "OTP is required";
      } else if (!/^\d{6}$/.test(formData.otp)) {
        newErrors.otp = "OTP must be 6 digits";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if agent exists (DB match only)
  const checkAgentExists = async () => {
    const base = process.env.REACT_APP_Base_API || "";
    if (!base) {
      console.error("[AgentLogin] REACT_APP_Base_API is NOT defined");
      setFormError("Internal configuration error. Please reload.");
      return;
    }
    setFormError("");
    setAgentVerified(false);

    if (!formData.mobileNumber || !formData.agentCode) {
      setFormError("Please enter Mobile Number and Agent Code.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[AgentLogin][checkAgentExists] Base API:", base);
      console.log("[AgentLogin][checkAgentExists] Payload:", {
        mobileNumber: formData.mobileNumber,
        agentCode: formData.agentCode,
        email: formData.email || null
      });
      console.log("[AgentLogin][checkAgentExists] URL:", `${base}/api/agentcheck`);
      const res = await fetch(`${base}/api/agentcheck`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: formData.mobileNumber,
          agentCode: formData.agentCode,
          email: formData.email || null
        }),
      });
      console.log(
        "[AgentLogin][checkAgentExists] Response status:",
        res.status,
        res.statusText
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(
          json.message ||
            json.error ||
            "Agent not found. Please check your details."
        );
        return;
      }

      // ✅ Agent exists – handle backend decision matrix
      setAgentVerified(true);

      // EMAIL MISMATCH → BLOCK
      if (json.code === "EMAIL_MISMATCH") {
        setOtpRequired(false);
        setShowOtp(false);
        setFormError("Email does not match registered email.");
        setFormData((p) => ({ ...p, loginType: "password" }));
        return;
      }

      // OTP ALLOWED (email matched)
      if (json.code === "OTP_ALLOWED") {
        setPasswordState(json.passwordSet ? "PASSWORD_PRESENT" : "SET_PASSWORD");
        setOtpRequired(true);      // ✅ allow OTP always when email matches
        setShowOtp(false);
        setFormError("");
        setFormData((p) => ({
          ...p,
          loginType: "otp",
          password: ""
        }));
        return;
      }

      // PASSWORD ONLY (no email provided)
      if (json.code === "PASSWORD_ONLY") {
        setPasswordState("PASSWORD_PRESENT");
        setOtpRequired(false);
        setShowOtp(false);
        setFormData((p) => ({
          ...p,
          loginType: "password",
          otp: ""
        }));
        return;
      }

      // SET PASSWORD REQUIRED (no email + no password)
      if (json.code === "SET_PASSWORD_REQUIRED") {
        setPasswordState("SET_PASSWORD");
        setOtpRequired(false);
        setShowOtp(false);
        setFormData((p) => ({
          ...p,
          loginType: "password",
          otp: "",
          password: ""
        }));
        return;
      }
    } catch {
      setFormError("Network error while verifying agent.");
    } finally {
      setIsLoading(false);
    }
  };

  // NOTE:
  // Mobile number + agentCode identify the agent.
  // OTP email is sent by backend using agent.email from DB.
  // Frontend does NOT control OTP email destination.
  // Send OTP only (no existence logic)
  const handleSendOtp = async () => {
    setFormError("");
    setIsLoading(true);

    try {
      const base = process.env.REACT_APP_Base_API || "";
      const res = await fetch(`${base}/api/agent/send-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          mobileNumber: formData.mobileNumber,
          agentCode: formData.agentCode,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(json.message || json.error || "Unable to send OTP.");
        return;
      }

      setShowOtp(true);
    } catch {
      setFormError("Network error while sending OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🔐 Set password for agent when password is not set
  const handleSetPassword = async (e) => {
    e && e.preventDefault && e.preventDefault();
    setFormError("");
    setSetPasswordLoading(true);

    try {
      const base = process.env.REACT_APP_Base_API || "";
      if (!base) {
        setFormError("Configuration error. Please reload.");
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        setFormError("Password must be at least 6 characters long");
        return;
      }

      const res = await fetch(`${base}/auth/set-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: formData.mobileNumber,
          password: newPassword
        })
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(json.message || "Failed to set password");
        return;
      }

      // ✅ Password successfully set → switch to normal password login
      setPasswordState("PASSWORD_PRESENT");
      setFormData((p) => ({
        ...p,
        password: "",
        loginType: "password"
      }));
      setNewPassword("");
    } catch (err) {
      setFormError("Network error while setting password");
    } finally {
      setSetPasswordLoading(false);
    }
  };

  // Hydrate agent session & fire agent:login event
  const hydrateAgentSession = async () => {
    try {
      const base = process.env.REACT_APP_Base_API || "";
      const token = localStorage.getItem("agentAccessToken");

      if (!token) return null;

      const res = await fetch(`${base}/agent/me`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.warn("[AgentLogin] hydrateAgentSession failed:", res.status);
        return null;
      }

      const data = await res.json();
      const agent = data?.agent || data;

      if (agent) {
        sessionStorage.setItem("agent", JSON.stringify(agent));
        window.dispatchEvent(new CustomEvent("agent:login", { detail: agent }));
        return agent;
      }
    } catch (e) {
      console.warn("[AgentLogin] hydrateAgentSession error", e);
    }
    return null;
  };

  // Session-based agent login helper
  const loginAgentViaSession = async () => {
    const base = process.env.REACT_APP_Base_API || "";
    if (!base) throw new Error("Base API not configured");

    const res = await fetch(`${base}/api/agent/login/session`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentCode: formData.agentCode
      })
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (json && (json.message || json.error)) ||
        (res.status === 403
          ? "Your agent account is not active."
          : "Agent session login failed");
      throw new Error(msg);
    }
    // Store agent tokens for incognito / cookies-off
    if (json.agentAccessToken) {
      localStorage.setItem("agentAccessToken", json.agentAccessToken);
    }
    console.log(
  "[AgentLogin] stored agentAccessToken:",
  localStorage.getItem("agentAccessToken")
);
    return true;
  };

  const handleSubmit = async (e) => {
    let loginSucceeded = false;
    e && e.preventDefault && e.preventDefault();
    setErrors({});
    setFormError("");
    setIsLoading(true);

    try {
      // ✅ USER SESSION → AGENT SESSION UPGRADE
      if (prefilledFromSession && agentVerified) {
        if (!formData.agentCode) {
          setFormError("Agent Code is required");
          setIsLoading(false);
          return;
        }

        await loginAgentViaSession();
        await hydrateAgentSession();
        navigateToDashboard();
        return;
      }

      const base = process.env.REACT_APP_Base_API || "";

      // Validate form first
      if (!validateForm()) {
        setIsLoading(false);
        return;
      }

      // Determine endpoint and payload based on loginType
      const endpoint =
        formData.loginType === "password"
          ? "/api/agent/login/password"
          : "/api/agent/login/otp";

      const payload =
        formData.loginType === "password"
          ? {
              mobileNumber: formData.mobileNumber,
              agentCode: formData.agentCode,
              password: formData.password,
            }
          : {
              mobileNumber: formData.mobileNumber,
              agentCode: formData.agentCode,
              otp: formData.otp,
            };

      console.log("[AgentLogin][login] endpoint:", endpoint);
      console.log("[AgentLogin][login] payload:", payload);
      console.log("[AgentLogin][login] full URL:", `${base}${endpoint}`);

      const res = await fetch(`${base}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Prefer explicit backend message
        if (json && (json.message || json.error)) {
          setFormError(json.message || json.error);
        } else if (res.status === 403) {
          setFormError("You are not allowed to login at this time.");
        } else if (res.status === 401) {
          setFormError("Invalid credentials. Please try again.");
        } else {
          setFormError("Login failed. Please check your details.");
        }

        setIsLoading(false);
        return;
      }

      if (res.ok) {
        // ✅ Store agent tokens for incognito / cookies-off
        if (json.agentAccessToken) {
          localStorage.setItem("agentAccessToken", json.agentAccessToken);
        }
        setOtpRequired(false);
        setShowOtp(false);
        loginSucceeded = true;
      }
    } catch (err) {
      console.error("Agent login error", err);
      setFormError(err.message || "Network error while attempting to login");
    } finally {
      setIsLoading(false);
    }
    if (loginSucceeded) {
      await hydrateAgentSession(); // ✅ hydrate agent BEFORE navigation
      navigateToDashboard();
      return;
    }
  };
  if (showFullLoader) {
    // console.log("[AgentLogin] showing full-screen redirect loader");
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.95)",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            border: "6px solid rgba(0,167,157,0.25)",
            borderTopColor: "#00A79D",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ color: "#003366", fontWeight: 600 }}>
          Redirecting to dashboard...
        </div>

        <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
      </div>
    );
  }

  return (
    <>
      {" "}
      <TopNavigationBar />
      <div
        style={{
          background:
            "linear-gradient(135deg, #003366 0%, #4A6A8A 50%, #00A79D 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated background elements */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "10%",
            width: "300px",
            height: "300px",
            background: "rgba(34, 211, 238, 0.1)",
            borderRadius: "50%",
            filter: "blur(80px)",
            animation: "float 6s ease-in-out infinite",
          }}
        ></div>

        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: "250px",
            height: "250px",
            background: "rgba(0, 167, 157, 0.15)",
            borderRadius: "50%",
            filter: "blur(80px)",
            animation: "float 8s ease-in-out infinite reverse",
          }}
        ></div>

        <style>
          {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}
        </style>

        {/* Login Card */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            padding: "50px 40px",
            maxWidth: "450px",
            width: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Logo/Brand Section */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "70px",
                height: "70px",
                background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 10px 30px rgba(0, 167, 157, 0.3)",
              }}
            >
              <LogIn size={35} color="#FFFFFF" />
            </div>

            <h1
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#003366",
                marginBottom: "10px",
              }}
            >
              Agent Login
            </h1>

            <p
              style={{
                fontSize: "15px",
                color: "#4A6A8A",
                lineHeight: "1.5",
              }}
            >
              Access your GGNHome Agent Dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            {formError && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  borderRadius: "8px",
                  background:
                    formError.toLowerCase().includes("pending")
                      ? "#FFF7ED"
                      : formError.toLowerCase().includes("suspended")
                      ? "#FEF2F2"
                      : "#FEF2F2",
                  color: "#DC2626",
                  fontSize: "14px",
                  fontWeight: 600,
                  border:
                    formError.toLowerCase().includes("pending")
                      ? "1px solid #FDBA74"
                      : "1px solid #FCA5A5",
                }}
              >
                {formError}
              </div>
            )}
            {/* Email Field (OTP login only) */}
            {(formData.loginType === "otp" || prefilledFromSession) && (
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "10px",
                    color: "#333333",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  readOnly={prefilledFromSession}
                  placeholder="Enter email address"
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: `2px solid ${errors.email ? "#EF4444" : "#F4F7F9"}`,
                    borderRadius: "12px",
                    fontSize: "15px",
                    background: prefilledFromSession ? "#F4F7F9" : "#FFFFFF",
                    cursor: prefilledFromSession ? "not-allowed" : "text",
                  }}
                  onFocus={(e) => {
                    if (!errors.email) {
                      e.target.style.borderColor = "#00A79D";
                      e.target.style.background = "#FFFFFF";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.email
                      ? "#EF4444"
                      : "#F4F7F9";
                    e.target.style.background = "#F4F7F9";
                  }}
                />
                {errors.email && (
                  <div
                    style={{
                      color: "#EF4444",
                      fontSize: "13px",
                      marginTop: "8px",
                    }}
                  >
                    {errors.email}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Number Field */}
            <div style={{ marginBottom: "25px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "#333333",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                Mobile Number
              </label>

              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                >
                  <Phone size={20} color="#4A6A8A" />
                </div>

                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  readOnly={prefilledFromSession}
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                  style={{
                    width: "100%",
                    padding: "16px 16px 16px 50px",
                    border: `2px solid ${
                      errors.mobileNumber ? "#EF4444" : "#F4F7F9"
                    }`,
                    borderRadius: "12px",
                    fontSize: "16px",
                    transition: "all 0.3s",
                    outline: "none",
                    boxSizing: "border-box",
                    background: prefilledFromSession ? "#F4F7F9" : "#FFFFFF",
                    cursor: prefilledFromSession ? "not-allowed" : "text",
                  }}
                  onFocus={(e) => {
                    if (!errors.mobileNumber) {
                      e.target.style.borderColor = "#00A79D";
                      e.target.style.background = "#FFFFFF";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.mobileNumber
                      ? "#EF4444"
                      : "#F4F7F9";
                    e.target.style.background = "#F4F7F9";
                  }}
                />
              </div>

              {errors.mobileNumber && (
                <div
                  style={{
                    color: "#EF4444",
                    fontSize: "13px",
                    marginTop: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span>⚠</span>
                  <span>{errors.mobileNumber}</span>
                </div>
              )}
            </div>

            {/* Agent Code Field */}
            <div style={{ marginBottom: "30px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  color: "#333333",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                Agent Code
              </label>

              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                >
                  <Key size={20} color="#4A6A8A" />
                </div>

                <input
                  type="text"
                  name="agentCode"
                  value={formData.agentCode}
                  onChange={handleInputChange}
                  placeholder="Enter your agent code"
                  style={{
                    width: "100%",
                    padding: "16px 16px 16px 50px",
                    border: `2px solid ${
                      errors.agentCode ? "#EF4444" : "#F4F7F9"
                    }`,
                    borderRadius: "12px",
                    fontSize: "16px",
                    transition: "all 0.3s",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#F4F7F9",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                  onFocus={(e) => {
                    if (!errors.agentCode) {
                      e.target.style.borderColor = "#00A79D";
                      e.target.style.background = "#FFFFFF";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.agentCode
                      ? "#EF4444"
                      : "#F4F7F9";
                    e.target.style.background = "#F4F7F9";
                  }}
                />
              </div>

              {errors.agentCode && (
                <div
                  style={{
                    color: "#EF4444",
                    fontSize: "13px",
                    marginTop: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span>⚠</span>
                  <span>{errors.agentCode}</span>
                </div>
              )}
            </div>
            {!prefilledFromSession && (
              <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      loginType: "otp",
                      password: "",
                    }))
                  }
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    border: "2px solid #00A79D",
                    background:
                      formData.loginType === "otp" ? "#00A79D" : "transparent",
                    color: formData.loginType === "otp" ? "#FFFFFF" : "#00A79D",
                    fontWeight: 700,
                  }}
                >
                  Login via OTP
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      loginType: "password",
                      otp: "",
                    }))
                  }
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    border: "2px solid #00A79D",
                    background:
                      formData.loginType === "password"
                        ? "#00A79D"
                        : "transparent",
                    color:
                      formData.loginType === "password" ? "#FFFFFF" : "#00A79D",
                    fontWeight: 700,
                  }}
                >
                  Login via Password
                </button>
              </div>
            )}


            {/* Multi-state: Check Agent / Send OTP */}
            { !prefilledFromSession && !agentVerified && (
              <div style={{ marginBottom: "18px", textAlign: "right" }}>
                <button
                  type="button"
                  onClick={checkAgentExists}
                  disabled={isLoading}
                  style={{
                    padding: "10px 14px",
                    background: "transparent",
                    border: "2px solid #00A79D",
                    color: "#00A79D",
                    borderRadius: "10px",
                    fontWeight: 700,
                    cursor: isLoading ? "not-allowed" : "pointer",
                  }}
                >
                  Check Agent
                </button>
              </div>
            )}
            {/* PASSWORD PRESENT → LOGIN */}
            {!prefilledFromSession &&
              formData.loginType === "password" &&
              passwordState === "PASSWORD_PRESENT" && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontWeight: 600 }}>Password</label>
                  <div style={{ textAlign: "right", marginBottom: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#00A79D",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password || ""}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "2px solid #F4F7F9"
                    }}
                  />
                </div>
            )}

            {/* PASSWORD NOT SET → CREATE PASSWORD */}
            {!prefilledFromSession &&
              formData.loginType === "password" &&
              passwordState === "SET_PASSWORD" && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontWeight: 600 }}>
                    Create New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create password"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "2px solid #F4F7F9"
                    }}
                  />
                  {newPassword && newPassword.length < 6 && (
                    <div style={{ color: "#DC2626", fontSize: "13px", marginTop: "6px" }}>
                      Password must be at least 6 characters
                    </div>
                  )}
                </div>
            )}

            { agentVerified && otpRequired && formData.loginType === "otp" && (
              <div style={{ marginBottom: "18px", textAlign: "right" }}>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  style={{
                    padding: "10px 14px",
                    background: "transparent",
                    border: "2px solid #00A79D",
                    color: "#00A79D",
                    borderRadius: "10px",
                    fontWeight: 700,
                    cursor: isLoading ? "not-allowed" : "pointer",
                  }}
                >
                  Send OTP
                </button>
              </div>
            )}

            {showOtp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{ marginBottom: "20px", overflow: "hidden" }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: "10px",
                    color: "#333333",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  OTP
                </label>
                <input
                  type="tel"
                  name="otp"
                  value={formData.otp}
                  onChange={handleInputChange}
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: `2px solid ${errors.otp ? "#EF4444" : "#F4F7F9"}`,
                    borderRadius: "12px",
                    fontSize: "15px",
                    background: "#F4F7F9",
                  }}
                  onFocus={(e) => {
                    if (!errors.otp) {
                      e.target.style.borderColor = "#00A79D";
                      e.target.style.background = "#FFFFFF";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.otp
                      ? "#EF4444"
                      : "#F4F7F9";
                    e.target.style.background = "#F4F7F9";
                  }}
                />
                {errors.otp && (
                  <div
                    style={{
                      color: "#EF4444",
                      fontSize: "13px",
                      marginTop: "8px",
                    }}
                  >
                    {errors.otp}
                  </div>
                )}
              </motion.div>
            )}

            {/* Login Button */}
            <button
              onClick={isSetPasswordFlow ? handleSetPassword : handleSubmit}
              disabled={
                isSetPasswordFlow
                  ? setPasswordLoading || newPassword.length < 6
                  : isLoginDisabled
              }
              style={{
                width: "100%",
                padding: "18px",
                background: isSetPasswordFlow
                  ? (setPasswordLoading || newPassword.length < 6
                      ? "#94A3B8"
                      : "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)")
                  : isLoginDisabled
                  ? "#94A3B8"
                  : "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontSize: "17px",
                fontWeight: "700",
                cursor: isSetPasswordFlow
                  ? (setPasswordLoading || newPassword.length < 6 ? "not-allowed" : "pointer")
                  : isLoginDisabled
                  ? "not-allowed"
                  : "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 15px rgba(0, 167, 157, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
              onMouseEnter={(e) => {
                const disabled =
                  isSetPasswordFlow
                    ? setPasswordLoading || newPassword.length < 6
                    : isLoginDisabled;
                if (!disabled) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow =
                    "0 6px 20px rgba(0, 167, 157, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                const disabled =
                  isSetPasswordFlow
                    ? setPasswordLoading || newPassword.length < 6
                    : isLoginDisabled;
                if (!disabled) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow =
                    "0 4px 15px rgba(0, 167, 157, 0.3)";
                }
              }}
            >
              {(isLoading && passwordState !== "SET_PASSWORD") ||
              (setPasswordLoading && passwordState === "SET_PASSWORD") ? (
                <>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "3px solid rgba(255, 255, 255, 0.3)",
                      borderTopColor: "#FFFFFF",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  ></div>
                  <style>
                    {`
                    @keyframes spin {
                      to { transform: rotate(360deg); }
                    }
                  `}
                  </style>
                  Processing...
                </>
              ) : (
                <>
                  {formData.loginType === "password" && passwordState === "SET_PASSWORD"
                    ? "Set Password"
                    : "Login"}
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {/* Info Text */}
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "#F4F7F9",
                borderRadius: "10px",
                borderLeft: "4px solid #00A79D",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  color: "#4A6A8A",
                  margin: 0,
                  lineHeight: "1.6",
                }}
              >
                💡 We'll send you an OTP to verify your identity. Make sure your
                agent code is correct.
              </p>
            </div>

            {/* Registration Link */}
            <div
              style={{
                marginTop: "30px",
                textAlign: "center",
                paddingTop: "25px",
                borderTop: "1px solid #F4F7F9",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "#4A6A8A",
                  margin: 0,
                }}
              >
                Not registered yet?{" "}
                <a
                  href="/agent/register"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/agent/register";
                  }}
                  style={{
                    color: "#00A79D",
                    fontWeight: "600",
                    textDecoration: "none",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = "#22D3EE";
                    e.target.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = "#00A79D";
                    e.target.style.textDecoration = "none";
                  }}
                >
                  Apply as an agent
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
      {showForgotModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000
    }}
    onClick={() => setShowForgotModal(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#FFFFFF",
        borderRadius: "16px",
        padding: "30px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
      }}
    >
      <h3 style={{ marginBottom: "20px", color: "#003366" }}>
        Reset Password
      </h3>

      <label style={{ fontWeight: 600 }}>Agent Code</label>
      <input
        name="agentCode"
        value={forgotData.agentCode}
        onChange={handleForgotChange}
        placeholder="agent code (lowercase)"
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
          borderRadius: "10px",
          border: "2px solid #F4F7F9",
          textTransform: "lowercase"
        }}
      />

      <label style={{ fontWeight: 600 }}>Date of Birth</label>
      <input
        type="date"
        name="dob"
        value={forgotData.dob}
        onChange={handleForgotChange}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
          borderRadius: "10px",
          border: "2px solid #F4F7F9"
        }}
      />

      {forgotMsg && (
        <div
          style={{
            marginBottom: "15px",
            fontWeight: 600,
            color: forgotMsg.toLowerCase().includes("successful")
              ? "#059669"
              : "#DC2626"
          }}
        >
          {forgotMsg}
        </div>
      )}

      <button
        onClick={handleForgotSubmit}
        disabled={forgotLoading}
        style={{
          width: "100%",
          padding: "14px",
          background: "#00A79D",
          color: "#FFFFFF",
          borderRadius: "12px",
          border: "none",
          fontWeight: 700,
          cursor: forgotLoading ? "not-allowed" : "pointer"
        }}
      >
        {forgotLoading ? "Processing..." : "Reset Password"}
      </button>
    </div>
  </div>
)}
    </>
  );
};

export default AgentLogin;
