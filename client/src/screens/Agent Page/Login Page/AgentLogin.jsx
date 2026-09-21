import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowRight, Key, KeyRound, LogIn, Mail, Phone } from "lucide-react";
import TopNavigationBar from "../Top Navigation Bar/AgentTopNavigationBar";
import {
  AuthButton,
  AuthField,
  AuthLayout,
  AuthMessage,
  AuthTabs,
  OtpInput,
} from "../../../components/auth";

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
  // Full-page hand-off while the agent session is being established.
  if (showFullLoader) {
    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          backgroundColor: "background.paper",
        }}
      >
        <CircularProgress size={52} color="secondary" thickness={4} />
        <Typography variant="body1" sx={{ color: "primary.main", fontWeight: 600 }}>
          Taking you to your dashboard…
        </Typography>
      </Box>
    );
  }

  // The form's single submit path: set-password when that's the pending step,
  // otherwise the normal login. Previously the button carried an onClick while
  // the form also had onSubmit, so the handler's own preventDefault was the
  // only thing stopping it running twice.
  const onFormSubmit = (e) => (isSetPasswordFlow ? handleSetPassword(e) : handleSubmit(e));

  const submitLabel = isSetPasswordFlow
    ? "Set password"
    : formData.loginType === "otp"
    ? "Verify and sign in"
    : "Sign in";

  return (
    <>
      <TopNavigationBar />

      <AuthLayout
        eyebrow="Agent portal"
        heading="Sign in to your agent dashboard"
        subheading="Manage your listings, track enquiries and see how your properties are performing."
        icon={<LogIn size={28} color="#FFFFFF" />}
        benefits={[
          "Post and manage listings on ggnHome",
          "See verified enquiries as they arrive",
          "Track views, saves and engagement per property",
        ]}
        footer={
          <Stack spacing={4}>
            <Divider />
            <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary" }}>
              Not registered yet?{" "}
              <Link
                component="button"
                type="button"
                variant="body2"
                underline="hover"
                onClick={() => navigate("/agent/register")}
                sx={{ color: "secondary.main", fontWeight: 600 }}
              >
                Apply as an agent
              </Link>
            </Typography>
          </Stack>
        }
      >
        <Typography variant="h3" sx={{ color: "primary.main", mb: 1 }}>
          Agent sign in
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
          {prefilledFromSession
            ? "We recognised your session — confirm your agent code to continue."
            : "Enter your details, then verify your agent code to continue."}
        </Typography>

        <AuthMessage
          message={
            formError
              ? {
                  type: /pending|approval/i.test(formError) ? "warning" : "error",
                  text: formError,
                }
              : null
          }
          onClose={() => setFormError("")}
        />

        {agentVerified && !formError && (
          <AuthMessage
            message={{ type: "success", text: "Agent verified. Continue below to sign in." }}
          />
        )}

        <Box component="form" onSubmit={onFormSubmit} noValidate>
          <AuthField
            label="Email address"
            icon={Mail}
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            helperText="Optional — needed only to sign in with a one-time code"
            disabled={prefilledFromSession}
          />

          <AuthField
            label="Mobile number"
            icon={Phone}
            type="tel"
            name="mobileNumber"
            autoComplete="tel"
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
            helperText="10 digits, no country code"
            disabled={prefilledFromSession}
            inputProps={{ inputMode: "numeric", maxLength: 10 }}
          />

          <AuthField
            label="Agent code"
            icon={Key}
            name="agentCode"
            value={formData.agentCode}
            onChange={handleInputChange}
            error={errors.agentCode}
            helperText="The code issued when your application was approved"
          />

          {/* Identify the agent before offering a sign-in method — which
              methods are available depends on what the backend reports. */}
          {!prefilledFromSession && !agentVerified && (
            <AuthButton
              type="button"
              variant="outlined"
              loading={isLoading}
              loadingText="Checking…"
              onClick={checkAgentExists}
              sx={{
                mb: 5,
                borderColor: "secondary.main",
                color: "secondary.main",
                "&:hover": { borderColor: "secondary.dark", backgroundColor: "rgba(0,167,157,0.06)" },
              }}
            >
              Verify agent code
            </AuthButton>
          )}

          {!prefilledFromSession && agentVerified && (
            <AuthTabs
              value={formData.loginType}
              onChange={(next) =>
                setFormData((p) => ({
                  ...p,
                  loginType: next,
                  ...(next === "otp" ? { password: "" } : { otp: "" }),
                }))
              }
              ariaLabel="Agent sign-in method"
              options={[
                { value: "otp", label: "One-time code" },
                { value: "password", label: "Password" },
              ]}
            />
          )}

          {/* Existing password → sign in with it. */}
          {!prefilledFromSession &&
            agentVerified &&
            formData.loginType === "password" &&
            passwordState === "PASSWORD_PRESENT" && (
              <>
                <AuthField
                  label="Password"
                  icon={KeyRound}
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  error={errors.password}
                />
                <Box sx={{ mt: -2, mb: 4, textAlign: "right" }}>
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    underline="hover"
                    onClick={() => setShowForgotModal(true)}
                    sx={{ color: "secondary.main", fontWeight: 600 }}
                  >
                    Forgot password?
                  </Link>
                </Box>
              </>
            )}

          {/* No password on the account yet → create one. */}
          {!prefilledFromSession && isSetPasswordFlow && (
            <AuthField
              label="Create a password"
              icon={KeyRound}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="At least 6 characters"
            />
          )}

          {/* One-time code: request, then enter. */}
          {!prefilledFromSession && agentVerified && formData.loginType === "otp" && otpRequired && !showOtp && (
            <AuthButton
              type="button"
              variant="outlined"
              loading={isLoading}
              loadingText="Sending…"
              onClick={handleSendOtp}
              startIcon={<ArrowRight size={16} />}
              sx={{
                mb: 5,
                borderColor: "secondary.main",
                color: "secondary.main",
                "&:hover": { borderColor: "secondary.dark", backgroundColor: "rgba(0,167,157,0.06)" },
              }}
            >
              Send one-time code
            </AuthButton>
          )}

          {showOtp && (
            <Box sx={{ mb: 5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 4, textAlign: "center" }}>
                We sent a 6-digit code to the email registered on this agent account.
              </Typography>
              <OtpInput
                value={formData.otp}
                onChange={(next) =>
                  handleInputChange({ target: { name: "otp", value: next } })
                }
                error={errors.otp}
                disabled={isLoading}
              />
            </Box>
          )}

          <AuthButton
            loading={isSetPasswordFlow ? setPasswordLoading : isLoading}
            loadingText={isSetPasswordFlow ? "Saving…" : "Signing in…"}
            disabled={
              isSetPasswordFlow
                ? setPasswordLoading || newPassword.length < 6
                : isLoginDisabled
            }
          >
            {submitLabel}
          </AuthButton>

          {!agentVerified && !prefilledFromSession && (
            <Typography variant="caption" sx={{ display: "block", mt: 4, color: "text.secondary" }}>
              Verify your agent code first — we'll then show the sign-in methods
              available on your account.
            </Typography>
          )}
        </Box>
      </AuthLayout>

      {/* Password reset: agent code + date of birth. */}
      <Dialog
        open={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ p: 8 }}>
          <Typography variant="h3" sx={{ color: "primary.main", mb: 2 }}>
            Reset your password
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
            Confirm your agent code and date of birth and we'll reset it for you.
          </Typography>

          <AuthMessage
            message={
              forgotMsg
                ? {
                    type: forgotMsg.toLowerCase().includes("successful") ? "success" : "error",
                    text: forgotMsg,
                  }
                : null
            }
            onClose={() => setForgotMsg("")}
          />

          <AuthField
            label="Agent code"
            icon={Key}
            name="agentCode"
            value={forgotData.agentCode}
            onChange={handleForgotChange}
            helperText="Lowercase"
          />

          <AuthField
            label="Date of birth"
            type="date"
            name="dob"
            value={forgotData.dob}
            onChange={handleForgotChange}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <AuthButton
            type="button"
            loading={forgotLoading}
            loadingText="Resetting…"
            onClick={handleForgotSubmit}
            sx={{ mt: 3 }}
          >
            Reset password
          </AuthButton>

          <Button
            fullWidth
            variant="text"
            onClick={() => setShowForgotModal(false)}
            sx={{ mt: 3, color: "text.secondary" }}
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgentLogin;
