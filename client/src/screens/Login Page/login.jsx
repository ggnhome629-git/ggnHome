import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Box, Button, Dialog, DialogContent, Divider, Link, Stack, Typography } from "@mui/material";
import { ArrowLeft, KeyRound, Mail, Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "../../Context/AuthContext";
import { AuthButton, AuthField, AuthLayout, AuthMessage, AuthTabs, OtpInput } from "../../components/auth";

const OTP_VALIDITY_SECONDS = 180;

// The password flow (and its /auth/check-mobile, /auth/set-password and
// /login/password endpoints) is built and working, but its tab was commented
// out before this redesign — so it stays hidden. Flip this to surface it.
const PASSWORD_LOGIN_ENABLED = false;

// Cookies back the refresh-token session; without them the user can sign in
// but silently loses the session on reload, so we say so up front.
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

const stepVariants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

export default function LoginModal() {
  // Authentication method selection
  const [authMethod, setAuthMethod] = useState("otp"); // "otp" or "password"

  // OTP flow states
  const [step, setStep] = useState("email"); // "email" or "otp"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState(null);
  const [time, setTime] = useState(OTP_VALIDITY_SECONDS);

  // Recovery email modal states
  const [showRecoveryEmailModal, setShowRecoveryEmailModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");

  // Password flow states
  const [passwordStep, setPasswordStep] = useState("mobile"); // "mobile" | "setPassword" | "login"
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Common states
  const [message, setMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
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
    return undefined;
  }, [authMethod, step, time]);

  useEffect(() => {
    const enabled = areCookiesEnabled();
    setCookiesEnabled(enabled);
    if (!enabled) setShowCookieBanner(true);
  }, []);

  const formatTime = () => {
    const m = Math.floor(time / 60);
    const s = time % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Clear message after 6 seconds
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  // Signing in refreshes the session, then hands the user wherever they were
  // headed before being bounced to /login.
  const completeLogin = useCallback(async () => {
    try {
      if (typeof fetchUser === "function") {
        await fetchUser({ force: true });
        await sleep(200);
      }
    } catch (err) {
      console.warn("fetchUser after login failed:", err);
    }
    navigate(redirectTo);
  }, [fetchUser, navigate, redirectTo]);

  // ============ OTP FLOW HANDLERS ============
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    // Validation reports against the specific field rather than a banner, and
    // never spins the button — nothing was sent.
    const errors = {};
    if (!mobileNumber || mobileNumber.length !== 10) {
      errors.mobileNumber = "Enter a valid 10-digit mobile number";
    }
    if (!email) errors.email = "Enter your email address";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/login/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mobileNumber }),
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        setStep("otp");
        setOtp("");
        setTime(OTP_VALIDITY_SECONDS);
        setMaskedEmail(data.sentToSavedEmail ? data.maskedEmail || null : null);
        setMessage({
          text:
            data.message ||
            (data.sentToSavedEmail
              ? "OTP has been sent to your previously registered email."
              : "OTP sent successfully"),
          type: "success",
        });
      } else {
        setMessage({ text: data.message || "Error sending OTP", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Error sending OTP", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (otp.length !== 6) {
      setFieldErrors({ otp: "Enter all 6 digits" });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/login/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, mobileNumber }),
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        if (data.accessToken) localStorage.setItem("accessToken", data.accessToken);
        setMessage({ text: "OTP verified — signing you in…", type: "success" });
        await completeLogin();
      } else {
        setMessage({ text: data.message || "OTP verification failed", type: "error" });
        setSubmitting(false);
      }
    } catch (error) {
      setMessage({ text: "Error verifying OTP", type: "error" });
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setMessage(null);
    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/login/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mobileNumber }),
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        setMaskedEmail(data.sentToSavedEmail ? data.maskedEmail || null : null);
        setMessage({ text: data.message || "OTP resent successfully!", type: "success" });
        setTime(OTP_VALIDITY_SECONDS);
        setOtp("");
      } else {
        setMessage({ text: data.message || "Error resending OTP", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error resending OTP", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ============ PASSWORD FLOW HANDLERS ============
  const handleMobileCheck = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!mobileNumber || mobileNumber.length !== 10) {
      setFieldErrors({ mobileNumber: "Enter a valid 10-digit mobile number" });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/auth/check-mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber }),
        credentials: "include",
      });

      // If the endpoint isn't deployed, fall back to the set-password flow.
      if (response.status === 404) {
        setPasswordStep("setPassword");
      } else {
        const data = await response.json();
        setPasswordStep(data.passwordSet ? "login" : "setPassword");
      }
    } catch (error) {
      setPasswordStep("setPassword");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setMessage(null);

    const errors = {};
    if (!password || password.length < 6) errors.password = "Password must be at least 6 characters";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber, password }),
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: "Password set successfully! Please log in.", type: "success" });
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordStep("login"), 1200);
      } else {
        setMessage({ text: data.message || "Error setting password", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Error setting password", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!password) {
      setFieldErrors({ password: "Enter your password" });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/login/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber, password }),
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        if (data.accessToken) localStorage.setItem("accessToken", data.accessToken);

        if (data.requireEmailSetup) {
          setShowRecoveryEmailModal(true);
          setSubmitting(false);
          return;
        }

        setMessage({ text: "Signing you in…", type: "success" });
        await completeLogin();
      } else {
        setMessage({ text: data.message || "Login failed", type: "error" });
        setSubmitting(false);
      }
    } catch (error) {
      setMessage({ text: "Error during login", type: "error" });
      setSubmitting(false);
    }
  };

  // Email here is optional — skipping must be as easy as saving.
  const handleSaveRecoveryEmail = async () => {
    if (!recoveryEmail) {
      setShowRecoveryEmailModal(false);
      await completeLogin();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/auth/set-recovery-email`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        setShowRecoveryEmailModal(false);
        setRecoveryEmail("");
        await completeLogin();
      } else {
        setMessage({ text: data.message || "Failed to save email", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error saving recovery email", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset handlers
  const resetToEmailStep = () => {
    setStep("email");
    setOtp("");
    setTime(OTP_VALIDITY_SECONDS);
    setMessage(null);
    setFieldErrors({});
    setMaskedEmail(null);
  };

  const resetToMobileStep = () => {
    setPasswordStep("mobile");
    setPassword("");
    setConfirmPassword("");
    setMessage(null);
    setFieldErrors({});
  };

  const switchAuthMethod = (method) => {
    setAuthMethod(method);
    setMessage(null);
    setFieldErrors({});
    if (method === "otp") {
      setStep("email");
      setOtp("");
      setTime(OTP_VALIDITY_SECONDS);
    } else {
      setPasswordStep("mobile");
      setPassword("");
      setConfirmPassword("");
    }
  };

  const otpExpired = time === 0;

  return (
    <>
      <AuthLayout
        eyebrow="ggnHome"
        heading="Find your next home in Gurgaon"
        subheading="Sign in to save listings, track your enquiries and get recommendations matched to what you're looking for."
        icon={<ShieldCheck size={30} color="#FFFFFF" />}
        benefits={[
          "Verified listings from owners and agents",
          "Save properties and revisit them anytime",
          "Sign in with a one-time code — no password to remember",
        ]}
        footer={
          <Stack spacing={4}>
            <Divider>
              <Typography variant="caption">or</Typography>
            </Divider>
            <Stack direction="row" spacing={3} justifyContent="space-between" alignItems="center">
              <Link component="button" type="button" variant="body2" underline="hover" onClick={() => navigate(redirectTo)} sx={{ color: "text.secondary" }}>
                Continue browsing
              </Link>
              <Link component="button" type="button" variant="body2" underline="hover" onClick={() => navigate("/agent/login")} sx={{ color: "secondary.main", fontWeight: 600 }}>
                I'm an agent
              </Link>
            </Stack>
          </Stack>
        }
      >
        {showCookieBanner && !cookiesEnabled && (
          <AuthMessage
            message={{
              type: "warning",
              text: "Cookies are disabled in your browser. You can still sign in, but you'll be signed out when you reload — allow cookies for this site to stay signed in.",
            }}
            onClose={() => setShowCookieBanner(false)}
          />
        )}

        {PASSWORD_LOGIN_ENABLED && (
          <AuthTabs
            value={authMethod}
            onChange={switchAuthMethod}
            ariaLabel="Sign-in method"
            options={[
              { value: "otp", label: "One-time code" },
              { value: "password", label: "Password" },
            ]}
          />
        )}

        <AuthMessage message={message} onClose={() => setMessage(null)} />

        <AnimatePresence mode="wait">
          {/* ------------------------------------------------- OTP FLOW -- */}
          {authMethod === "otp" && step === "email" && (
            <motion.form
              key="otp-email"
              onSubmit={handleEmailSubmit}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Typography variant="h3" sx={{ color: "primary.main", mb: 1 }}>
                Welcome back
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
                We'll send a one-time code to your email to confirm it's you.
              </Typography>

              <AuthField
                label="Mobile number"
                icon={Phone}
                type="tel"
                autoComplete="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                error={fieldErrors.mobileNumber}
                helperText="10 digits, no country code"
                inputProps={{ inputMode: "numeric", maxLength: 10 }}
              />

              <AuthField
                label="Email address"
                icon={Mail}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                helperText="Your code is sent here"
              />

              <AuthButton loading={submitting} loadingText="Sending code…" sx={{ mt: 3 }}>
                Send one-time code
              </AuthButton>
            </motion.form>
          )}

          {authMethod === "otp" && step === "otp" && (
            <motion.form
              key="otp-verify"
              onSubmit={handleOtpSubmit}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Typography variant="h3" sx={{ color: "primary.main", mb: 1 }}>
                Enter your code
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
                We sent a 6-digit code to <Box component="strong" sx={{ color: "text.primary" }}>{maskedEmail || email}</Box>
              </Typography>

              <OtpInput
                value={otp}
                onChange={(next) => {
                  setOtp(next);
                  if (fieldErrors.otp) setFieldErrors({});
                }}
                error={fieldErrors.otp}
                disabled={submitting}
              />

              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 5, mb: 5 }}>
                <Typography
                  variant="body2"
                  sx={{ color: otpExpired ? "error.main" : time < 60 ? "warning.main" : "text.secondary", fontWeight: 600 }}
                >
                  {otpExpired ? "Code expired" : `Expires in ${formatTime()}`}
                </Typography>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  underline="hover"
                  onClick={handleResendOtp}
                  disabled={submitting}
                  sx={{ color: "secondary.main", fontWeight: 600 }}
                >
                  Resend code
                </Link>
              </Stack>

              <AuthButton loading={submitting} loadingText="Verifying…" disabled={otpExpired}>
                Verify and continue
              </AuthButton>

              <Button
                fullWidth
                variant="text"
                startIcon={<ArrowLeft size={15} />}
                onClick={resetToEmailStep}
                sx={{ mt: 3, color: "text.secondary" }}
              >
                Use a different email
              </Button>
            </motion.form>
          )}

          {/* -------------------------------------------- PASSWORD FLOW -- */}
          {authMethod === "password" && passwordStep === "mobile" && (
            <motion.form
              key="password-mobile"
              onSubmit={handleMobileCheck}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Typography variant="h3" sx={{ color: "primary.main", mb: 1 }}>
                Welcome back
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
                Enter your mobile number to continue.
              </Typography>

              <AuthField
                label="Mobile number"
                icon={Phone}
                type="tel"
                autoComplete="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                error={fieldErrors.mobileNumber}
                helperText="10 digits, no country code"
                inputProps={{ inputMode: "numeric", maxLength: 10 }}
              />

              <AuthButton loading={submitting} loadingText="Checking…" sx={{ mt: 3 }}>
                Continue
              </AuthButton>
            </motion.form>
          )}

          {authMethod === "password" && passwordStep === "setPassword" && (
            <motion.form
              key="password-set"
              onSubmit={handleSetPassword}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Typography variant="h3" sx={{ color: "primary.main", mb: 1 }}>
                Create a password
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
                For {mobileNumber}
              </Typography>

              <AuthField
                label="Password"
                icon={KeyRound}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                helperText="At least 6 characters"
              />

              <AuthField
                label="Confirm password"
                icon={KeyRound}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={fieldErrors.confirmPassword}
              />

              <AuthButton loading={submitting} loadingText="Saving…" sx={{ mt: 3 }}>
                Set password
              </AuthButton>

              <Button
                fullWidth
                variant="text"
                startIcon={<ArrowLeft size={15} />}
                onClick={resetToMobileStep}
                sx={{ mt: 3, color: "text.secondary" }}
              >
                Change mobile number
              </Button>
            </motion.form>
          )}

          {authMethod === "password" && passwordStep === "login" && (
            <motion.form
              key="password-login"
              onSubmit={handlePasswordLogin}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Typography variant="h3" sx={{ color: "primary.main", mb: 1 }}>
                Welcome back
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
                Enter the password for {mobileNumber}
              </Typography>

              <AuthField
                label="Password"
                icon={KeyRound}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
              />

              <AuthButton loading={submitting} loadingText="Signing in…" sx={{ mt: 3 }}>
                Sign in
              </AuthButton>

              <Button
                fullWidth
                variant="text"
                startIcon={<ArrowLeft size={15} />}
                onClick={resetToMobileStep}
                sx={{ mt: 3, color: "text.secondary" }}
              >
                Change mobile number
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </AuthLayout>

      {/* Recovery email — optional, so "Skip" is a peer of "Save". */}
      <Dialog
        open={showRecoveryEmailModal}
        onClose={() => setShowRecoveryEmailModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ p: 8 }}>
          <Typography variant="h3" sx={{ color: "primary.main", mb: 2 }}>
            Add a recovery email
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
            Optional. Adding one lets you sign in with a one-time code if you
            ever forget your password.
          </Typography>

          <AuthField
            label="Email address"
            icon={Mail}
            type="email"
            autoComplete="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
          />

          <AuthButton
            type="button"
            loading={submitting}
            loadingText="Saving…"
            onClick={handleSaveRecoveryEmail}
            sx={{ mt: 3 }}
          >
            Save and continue
          </AuthButton>

          <Button
            fullWidth
            variant="text"
            onClick={async () => {
              setShowRecoveryEmailModal(false);
              await completeLogin();
            }}
            sx={{ mt: 3, color: "text.secondary" }}
          >
            Skip for now
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
