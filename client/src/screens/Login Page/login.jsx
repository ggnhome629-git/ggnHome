import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../Context/AuthContext";

// STEP 1: ADD COOKIE DETECTION HELPER
function areCookiesEnabled() {
  try {
    document.cookie = "ggn_cookie_test=1";
    const enabled = document.cookie.includes("ggn_cookie_test=");
    document.cookie = "ggn_cookie_test=1; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    return enabled;
  } catch {
    return false;
  }
}

export default function LoginModal() {
  // Authentication method selection
  const [authMethod, setAuthMethod] = useState("otp"); // "otp" or "password"
  
  // OTP flow states
  const [step, setStep] = useState("email"); // "email" or "otp"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState(null);
  const [time, setTime] = useState(180);

  // Recovery email modal states
  const [showRecoveryEmailModal, setShowRecoveryEmailModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  
  // Password flow states
  const [passwordStep, setPasswordStep] = useState("mobile"); // "mobile", "setPassword", or "login"
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Common states
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  // STEP 2: ADD STATE FOR COOKIE BANNER
  const [cookiesEnabled, setCookiesEnabled] = useState(true);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";
  const { fetchUser } = useAuth();
  // Hybrid auth: get token from localStorage
  const userToken = localStorage.getItem("accessToken");

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // OTP timer
  useEffect(() => {
    if (authMethod === "otp" && step === "otp" && time > 0) {
      const timer = setTimeout(() => setTime(time - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [authMethod, step, time]);

  // STEP 3: DETECT COOKIES ON MOUNT
  useEffect(() => {
    const enabled = areCookiesEnabled();
    setCookiesEnabled(enabled);
    if (!enabled) {
      setShowCookieBanner(true);
    }
  }, []);

  const formatTime = () => {
    const m = Math.floor(time / 60);
    const s = time % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ============ OTP FLOW HANDLERS ============
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setButtonLoading(true);
    setMessage(null);
    
    if (!email || !mobileNumber) {
      setMessage({ text: "Please enter both email and mobile number", type: "error" });
      setTimeout(() => setButtonLoading(false), 2000);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/login/request-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email , mobileNumber }),
          credentials: "include",
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        setStep("otp");
        setTime(180);
        // Save maskedEmail if OTP was sent to previously registered email
        if (data.sentToSavedEmail) {
          setMaskedEmail(data.maskedEmail || null);
          setMessage({
            text: data.message || "OTP has been sent to your previously registered email.",
            type: "success",
          });
        } else {
          setMaskedEmail(null);
          setMessage({
            text: data.message || "OTP sent successfully",
            type: "success",
          });
        }
      } else {
        setMessage({ text: data.message || "Error sending OTP", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Error sending OTP", type: "error" });
    } finally {
      setTimeout(() => setButtonLoading(false), 2000);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setButtonLoading(true);
    setMessage(null);
    
    if (!otp) {
      setMessage({ text: "Please enter OTP", type: "error" });
      setTimeout(() => setButtonLoading(false), 2000);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/login/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, mobileNumber }),
          credentials: "include",
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        if (data.accessToken) {
  localStorage.setItem("accessToken", data.accessToken);
}
        
        setMessage({ text: "OTP Verified!", type: "success" });
        
        try {
          if (typeof fetchUser === "function") {
            await fetchUser({ force: true });
            await sleep(400);
          }
        } catch (err) {
          console.warn("fetchUser after login failed:", err);
        }
        
        navigate(redirectTo);
      } else {
        setMessage({ text: data.message || "OTP verification failed", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Error verifying OTP", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setButtonLoading(false), 2000);
    }
  };

  const handleResendOtp = async () => {
    setButtonLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/login/request-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, mobileNumber }),
          credentials: "include",
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        setMaskedEmail(data.sentToSavedEmail ? data.maskedEmail || null : null);
        setMessage({
          text: data.message || "OTP resent successfully!",
          type: "success",
        });
        setTime(180);
        setOtp("");
      } else {
        setMessage({ text: data.message || "Error resending OTP", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error resending OTP", type: "error" });
    } finally {
      setTimeout(() => setButtonLoading(false), 2000);
    }
  };

  // ============ PASSWORD FLOW HANDLERS ============
  const handleMobileCheck = async (e) => {
    e.preventDefault();
    setButtonLoading(true);
    setMessage(null);
    
    if (!mobileNumber || mobileNumber.length !== 10) {
      setMessage({ text: "Please enter a valid 10-digit mobile number", type: "error" });
      setTimeout(() => setButtonLoading(false), 2000);
      return;
    }

    try {
      // Check if user exists with this mobile number
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/auth/check-mobile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobileNumber }),
          credentials: "include",
        }
      );
      
      // If endpoint doesn't exist, we'll handle it client-side by attempting login
      if (response.status === 404) {
        // Endpoint not found, assume new user or password not set
        setPasswordStep("setPassword");
      } else {
        const data = await response.json();
        
        if (data.passwordSet) {
          setPasswordStep("login");
        } else {
          setPasswordStep("setPassword");
        }
      }
    } catch (error) {
      // If check fails, allow setting password (new user flow)
      setPasswordStep("setPassword");
    } finally {
      setTimeout(() => setButtonLoading(false), 2000);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setButtonLoading(true);
    setMessage(null);
    
    if (!password || password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters", type: "error" });
      setTimeout(() => setButtonLoading(false), 2000);
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match", type: "error" });
      setTimeout(() => setButtonLoading(false), 2000);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/auth/set-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobileNumber, password }),
          credentials: "include",
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ text: "Password set successfully! Please login.", type: "success" });
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setPasswordStep("login");
        }, 1500);
      } else {
        setMessage({ text: data.message || "Error setting password", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Error setting password", type: "error" });
    } finally {
      setTimeout(() => setButtonLoading(false), 2000);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setButtonLoading(true);
    setMessage(null);
    
    if (!password) {
      setMessage({ text: "Please enter your password", type: "error" });
      setTimeout(() => setButtonLoading(false), 2000);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/login/password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobileNumber, password }),
          credentials: "include",
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ text: "Login successful!", type: "success" });
        if (data.accessToken) {
          localStorage.setItem("accessToken", data.accessToken);
        }

        if (data.requireEmailSetup) {
          setShowRecoveryEmailModal(true);
          return;
        }
        
        try {
          if (typeof fetchUser === "function") {
            await fetchUser({ force: true });
            await sleep(400);
          }
        } catch (err) {
          console.warn("fetchUser after login failed:", err);
        }
        
        navigate(redirectTo);
      } else {
        setMessage({ text: data.message || "Login failed", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Error during login", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setButtonLoading(false), 2000);
    }
  };

  // Reset handlers
  const resetToEmailStep = () => {
    setStep("email");
    setOtp("");
    setTime(180);
    setMessage(null);
    setMaskedEmail(null);
  };

  const resetToMobileStep = () => {
    setPasswordStep("mobile");
    setPassword("");
    setConfirmPassword("");
    setMessage(null);
  };

  const switchAuthMethod = (method) => {
    setAuthMethod(method);
    setMessage(null);
    if (method === "otp") {
      setStep("email");
      setOtp("");
      setTime(180);
    } else {
      setPasswordStep("mobile");
      setPassword("");
      setConfirmPassword("");
    }
  };

  // Loading spinner overlay
  if (loading && (step === "email" || passwordStep === "mobile")) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 51, 102, 0.4)",
        backdropFilter: "blur(8px)",
        zIndex: 50,
      }}>
        <div style={{
          border: "4px solid rgba(255,255,255,0.3)",
          borderTop: "4px solid #00A79D",
          borderRadius: "50%",
          width: "50px",
          height: "50px",
          animation: "spin 1s linear infinite"
        }} />
      </div>
    );
  }

  // Handler for saving recovery email (optional)
  const handleSaveRecoveryEmail = async () => {
    // Email is OPTIONAL — user may skip
    if (!recoveryEmail) {
      try {
        if (typeof fetchUser === "function") {
          await fetchUser({ force: true });
          await sleep(300);
        }
      } catch (err) {
        console.warn("fetchUser after password login failed:", err);
      }
      setShowRecoveryEmailModal(false);
      navigate(redirectTo);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/auth/set-recovery-email`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
          body: JSON.stringify({ email: recoveryEmail }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        try {
          if (typeof fetchUser === "function") {
            await fetchUser({ force: true });
            await sleep(300);
          }
        } catch (err) {
          console.warn("fetchUser after saving recovery email failed:", err);
        }

        setShowRecoveryEmailModal(false);
        setRecoveryEmail("");
        navigate(redirectTo);
      } else {
        setMessage({ text: data.message || "Failed to save email", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error saving recovery email", type: "error" });
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 51, 102, 0.4)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    }}>
      {buttonLoading && (
        <div style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.7)",
          zIndex: 100,
        }}>
          <div style={{
            width: "60px",
            height: "60px",
            border: "6px solid #f3f4f6",
            borderTop: "6px solid #003366",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
        </div>
      )}
      
      <div style={{
        background: "#F4F7F9",
        borderRadius: "16px",
        padding: "40px",
        width: "90%",
        maxWidth: "420px",
        boxShadow: "0 20px 60px rgba(0, 51, 102, 0.3)",
        position: "relative",
        backdropFilter: "blur(2px)",
        animation: "modalPop 0.4s ease",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* STEP 4: ADD COOKIE PROMPT UI (NON-BLOCKING) */}
        {showCookieBanner && !cookiesEnabled && (
          <div
            style={{
              background: "#FFF7ED",
              border: "1px solid #FDBA74",
              color: "#9A3412",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            Cookies are disabled in your browser.  
            To stay logged in securely, please allow cookies for this site.
            <div style={{ marginTop: "8px", display: "flex", gap: "8px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowCookieBanner(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9A3412",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Continue anyway
              </button>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#9A3412",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                How to enable cookies
              </a>
            </div>
          </div>
        )}
        {/* User/Agent Toggle */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button
            type="button"
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.03)";
              e.target.style.boxShadow = "0 6px 18px rgba(0,167,157,0.45)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 4px 12px rgba(0,167,157,0.35)";
            }}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "2px solid #00A79D",
              background: "linear-gradient(135deg, #00A79D, #22D3EE)",
              color: "#FFFFFF",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.25s ease",
              boxShadow: "0 4px 12px rgba(0,167,157,0.35)",
            }}
          >
            User Login
          </button>

          <button
            type="button"
            onClick={() => navigate("/agent/login")}
            onMouseEnter={(e) => {
              e.target.style.background = "#E6FFFB";
              e.target.style.boxShadow = "0 6px 16px rgba(0,167,157,0.25)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.boxShadow = "none";
            }}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "2px dashed #00A79D",
              background: "transparent",
              color: "#00A79D",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            Agent Login
          </button>
        </div>

        {/* OTP/Password Toggle */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          background: "#E6F7F6",
          padding: "4px",
          borderRadius: "10px",
        }}>
          <button
            type="button"
            onClick={() => switchAuthMethod("otp")}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: authMethod === "otp" ? "#00A79D" : "transparent",
              color: authMethod === "otp" ? "#FFFFFF" : "#00A79D",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Login with OTP
          </button>
          {/* <button
            type="button"
            onClick={() => switchAuthMethod("password")}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: authMethod === "password" ? "#00A79D" : "transparent",
              color: authMethod === "password" ? "#FFFFFF" : "#00A79D",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Login with Password
          </button> */}
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            color: message.type === "success" ? "#16a34a" : "#dc2626",
            background: message.type === "success" ? "#dcfce7" : "#fee2e2",
            fontSize: "14px",
            fontWeight: 600,
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            textAlign: "center",
          }}>
            {message.text}
          </div>
        )}

        {/* OTP FLOW */}
        <AnimatePresence mode="wait">
        {authMethod === "otp" && (
          <motion.div key="otp-flow" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25, ease: "easeOut" }}>
            {step === "email" ? (
              <form onSubmit={handleEmailSubmit}>
                <h2 style={{
                  color: "#003366",
                  fontSize: "28px",
                  fontWeight: "700",
                  marginBottom: "8px",
                  textAlign: "center",
                }}>
                  Welcome Back
                </h2>
                <p style={{
                  color: "#4A6A8A",
                  fontSize: "14px",
                  marginBottom: "24px",
                  textAlign: "center",
                }}>
                  Enter your details to continue
                </p>

                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  required
                  pattern="\d{10}"
                  maxLength={10}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #00A79D",
                    borderRadius: "8px",
                    fontSize: "16px",
                    marginBottom: "16px",
                    outline: "none",
                    background: "#FFFFFF",
                    color: "#333333",
                    transition: "border 0.3s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#22D3EE")}
                  onBlur={(e) => (e.target.style.borderColor = "#00A79D")}
                />

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #00A79D",
                    borderRadius: "8px",
                    fontSize: "16px",
                    marginBottom: "24px",
                    outline: "none",
                    background: "#FFFFFF",
                    color: "#333333",
                    transition: "border 0.3s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#22D3EE")}
                  onBlur={(e) => (e.target.style.borderColor = "#00A79D")}
                />

                <button
                  type="submit"
                  disabled={buttonLoading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "linear-gradient(135deg, #00A79D, #22D3EE)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: buttonLoading ? "not-allowed" : "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: "0 4px 12px rgba(0, 167, 157, 0.3)",
                    letterSpacing: "0.5px",
                    opacity: buttonLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!buttonLoading) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 20px rgba(0, 167, 157, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0, 167, 157, 0.3)";
                  }}
                >
                  {buttonLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit}>
                <h2 style={{
                  color: "#003366",
                  fontSize: "28px",
                  fontWeight: "700",
                  marginBottom: "8px",
                  textAlign: "center",
                }}>
                  Verify OTP
                </h2>
                <p style={{
                  color: "#4A6A8A",
                  fontSize: "14px",
                  marginBottom: "24px",
                  textAlign: "center",
                }}>
                  {maskedEmail
                    ? `Code sent to ${maskedEmail}`
                    : `Code sent to ${email}`}
                </p>

                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #00A79D",
                    borderRadius: "8px",
                    fontSize: "20px",
                    marginBottom: "16px",
                    outline: "none",
                    background: "#FFFFFF",
                    color: "#333333",
                    letterSpacing: "8px",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#22D3EE")}
                  onBlur={(e) => (e.target.style.borderColor = "#00A79D")}
                />

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "24px",
                }}>
                  <span style={{
                    color: time < 60 ? "#ef4444" : "#4A6A8A",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}>
                    {formatTime()}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={buttonLoading}
                    style={{
                      color: "#00A79D",
                      fontSize: "14px",
                      fontWeight: "600",
                      background: "none",
                      border: "none",
                      cursor: buttonLoading ? "not-allowed" : "pointer",
                      textDecoration: "underline",
                      opacity: buttonLoading ? 0.6 : 1,
                    }}
                  >
                    {buttonLoading ? "Resending..." : "Resend OTP"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={time === 0 || loading || buttonLoading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: time === 0 ? "#4A6A8A" : "linear-gradient(135deg, #00A79D, #22D3EE)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: time === 0 ? "not-allowed" : "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: "0 4px 12px rgba(0, 167, 157, 0.3)",
                    opacity: time === 0 ? 0.6 : 1,
                    letterSpacing: "0.5px",
                  }}
                  onMouseEnter={(e) => {
                    if (time !== 0 && !buttonLoading) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 20px rgba(0, 167, 157, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0, 167, 157, 0.3)";
                  }}
                >
                  {buttonLoading ? "Verifying..." : (loading ? "Processing..." : "Verify & Continue")}
                </button>

                <button
                  type="button"
                  onClick={resetToEmailStep}
                  style={{
                    width: "100%",
                    marginTop: "12px",
                    padding: "12px",
                    background: "transparent",
                    color: "#4A6A8A",
                    border: "2px solid #4A6A8A",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Back to Email
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* PASSWORD FLOW */}
        {authMethod === "password" && (
          <motion.div key="password-flow" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25, ease: "easeOut" }}>
            {passwordStep === "mobile" && (
              <form onSubmit={handleMobileCheck}>
                <h2 style={{
                  color: "#003366",
                  fontSize: "28px",
                  fontWeight: "700",
                  marginBottom: "8px",
                  textAlign: "center",
                }}>
                  Welcome Back
                </h2>
                <p style={{
                  color: "#4A6A8A",
                  fontSize: "14px",
                  marginBottom: "24px",
                  textAlign: "center",
                }}>
                  Enter your mobile number to continue
                </p>

                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  required
                  pattern="\d{10}"
                  maxLength={10}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #00A79D",
                    borderRadius: "8px",
                    fontSize: "16px",
                    marginBottom: "24px",
                    outline: "none",
                    background: "#FFFFFF",
                    color: "#333333",
                    transition: "border 0.3s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#22D3EE")}
                  onBlur={(e) => (e.target.style.borderColor = "#00A79D")}
                />

                <button
                  type="submit"
                  disabled={buttonLoading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "linear-gradient(135deg, #00A79D, #22D3EE)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: buttonLoading ? "not-allowed" : "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: "0 4px 12px rgba(0, 167, 157, 0.3)",
                    letterSpacing: "0.5px",
                    opacity: buttonLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!buttonLoading) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 20px rgba(0, 167, 157, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0, 167, 157, 0.3)";
                  }}
                >
                  {buttonLoading ? "Checking..." : "Continue"}
                </button>
              </form>
            )}

            {passwordStep === "setPassword" && (
              <form onSubmit={handleSetPassword}>
                <h2 style={{
                  color: "#003366",
                  fontSize: "28px",
                  fontWeight: "700",
                  marginBottom: "8px",
                  textAlign: "center",
                }}>
                  Set Password
                </h2>
                <p style={{
                  color: "#4A6A8A",
                  fontSize: "14px",
                  marginBottom: "24px",
                  textAlign: "center",
                }}>
                  Create a password for {mobileNumber}
                </p>

                <div style={{ position: "relative", marginBottom: "16px" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: "100%",
                      padding: "14px 48px 14px 16px",
                      border: "2px solid #00A79D",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      background: "#FFFFFF",
                      color: "#333333",
                      transition: "border 0.3s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#22D3EE")}
                    onBlur={(e) => (e.target.style.borderColor = "#00A79D")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#4A6A8A",
                      fontSize: "20px",
                    }}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>

                <div style={{ position: "relative", marginBottom: "24px" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: "100%",
                      padding: "14px 48px 14px 16px",
                      border: "2px solid #00A79D",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      background: "#FFFFFF",
                      color: "#333333",
                      transition: "border 0.3s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#22D3EE")}
                    onBlur={(e) => (e.target.style.borderColor = "#00A79D")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#4A6A8A",
                      fontSize: "20px",
                    }}
                  >
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={buttonLoading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "linear-gradient(135deg, #00A79D, #22D3EE)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: buttonLoading ? "not-allowed" : "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: "0 4px 12px rgba(0, 167, 157, 0.3)",
                    letterSpacing: "0.5px",
                    opacity: buttonLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!buttonLoading) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 20px rgba(0, 167, 157, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0, 167, 157, 0.3)";
                  }}
                >
                  {buttonLoading ? "Setting..." : "Set Password"}
                </button>

                <button
                  type="button"
                  onClick={resetToMobileStep}
                  style={{
                    width: "100%",
                    marginTop: "12px",
                    padding: "12px",
                    background: "transparent",
                    color: "#4A6A8A",
                    border: "2px solid #4A6A8A",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Back to Mobile
                </button>
              </form>
            )}

            {passwordStep === "login" && (
              <form onSubmit={handlePasswordLogin}>
                <h2 style={{
                  color: "#003366",
                  fontSize: "28px",
                  fontWeight: "700",
                  marginBottom: "8px",
                  textAlign: "center",
                }}>
                  Welcome Back
                </h2>
                <p style={{
                  color: "#4A6A8A",
                  fontSize: "14px",
                  marginBottom: "24px",
                  textAlign: "center",
                }}>
                  Enter password for {mobileNumber}
                </p>

                <div style={{ position: "relative", marginBottom: "24px" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 48px 14px 16px",
                      border: "2px solid #00A79D",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      background: "#FFFFFF",
                      color: "#333333",
                      transition: "border 0.3s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#22D3EE")}
                    onBlur={(e) => (e.target.style.borderColor = "#00A79D")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#4A6A8A",
                      fontSize: "20px",
                    }}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={buttonLoading || loading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "linear-gradient(135deg, #00A79D, #22D3EE)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: (buttonLoading || loading) ? "not-allowed" : "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: "0 4px 12px rgba(0, 167, 157, 0.3)",
                    letterSpacing: "0.5px",
                    opacity: (buttonLoading || loading) ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!buttonLoading && !loading) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 20px rgba(0, 167, 157, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0, 167, 157, 0.3)";
                  }}
                >
                  {buttonLoading ? "Logging in..." : (loading ? "Processing..." : "Login")}
                </button>

                <button
                  type="button"
                  onClick={resetToMobileStep}
                  style={{
                    width: "100%",
                    marginTop: "12px",
                    padding: "12px",
                    background: "transparent",
                    color: "#4A6A8A",
                    border: "2px solid #4A6A8A",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Change Mobile Number
                </button>
              </form>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        {/* Bottom Navigation Links */}
        <div style={{
          position: "absolute",
          bottom: "12px",
          left: "16px",
          right: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          fontWeight: "600",
        }}>
          <span
            onClick={() => navigate(redirectTo)}
            style={{
              color: "#4A6A8A",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Go to Dashboard
          </span>

          <span
            onClick={() => navigate("/agent/login")}
            style={{
              color: "#00A79D",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Want to become an Agent? Login here
          </span>
        </div>
      </div>

      {showRecoveryEmailModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
        }}>
          <div style={{
            background: "#FFFFFF",
            padding: "32px",
            borderRadius: "16px",
            width: "90%",
            maxWidth: "420px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            textAlign: "center",
          }}>
            <h2 style={{ color: "#003366", marginBottom: "12px" }}>
              Add Recovery Email
            </h2>
            <p style={{ color: "#4A6A8A", fontSize: "14px", marginBottom: "20px" }}>
              Enter a recovery email (optional) for future login with OTP.
            </p>

            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="Enter recovery email"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "8px",
                border: "2px solid #00A79D",
                marginBottom: "20px",
                fontSize: "16px",
              }}
            />

            <button
              onClick={handleSaveRecoveryEmail}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #00A79D, #22D3EE)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Save & Continue
            </button>
            <button
              onClick={async () => {
                try {
                  if (typeof fetchUser === "function") {
                    await fetchUser({ force: true });
                    await sleep(300);
                  }
                } catch (err) {
                  console.warn("fetchUser after skip failed:", err);
                }
                setShowRecoveryEmailModal(false);
                navigate(redirectTo);
              }}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "12px",
                background: "transparent",
                color: "#4A6A8A",
                border: "2px solid #4A6A8A",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes modalPop {
          0% {
            transform: scale(0.92) translateY(20px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}