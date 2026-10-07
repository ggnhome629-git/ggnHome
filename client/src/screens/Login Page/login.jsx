import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Link, Stack, Typography } from "@mui/material";
import { ArrowRight, Gift, KeyRound, Lock, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import AuthShell from "../../components/auth/AuthShell";
import MobileOtpForm from "../../components/auth/MobileOtpForm";
import { AuthButton, AuthField, AuthMessage, AuthTabs } from "../../components/auth";
import { useAuth } from "../../Context/AuthContext";
import { storeLoginTokens } from "../../utils/agentSso";

const POINTS = [
  { icon: ShieldCheck, title: "Verified Owners", text: "Every listing is confirmed by a real person." },
  { icon: Gift, title: "Rewards On Every Visit", text: "Points, redemptions and exclusive promos." },
  { icon: Sparkles, title: "No Spam", text: "Only what you actually asked for — ever." },
];

const METHODS = [
  { value: "otp", label: "Mobile Code" },
  { value: "password", label: "Password" },
];

function intentLabel(from) {
  const path = from.split("?")[0];
  if (path.includes("/property")) return "Sign in to continue to this property.";
  if (path.includes("/visit")) return "Sign in to continue your booking.";
  if (path.includes("/preference")) return "Sign in to save this home.";
  return "Sign in to continue where you left off.";
}

/**
 * /login — mobile number + 4-letter code (creates the account on first use),
 * or mobile + password for users who have set one.
 */
export default function LoginModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";
  const hasIntent = Boolean(location.state?.from) && location.state.from !== "/";
  const { fetchUser } = useAuth();

  const [method, setMethod] = useState("otp");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const completeLogin = async (data) => {
    storeLoginTokens(data);
    try {
      await fetchUser?.({ force: true });
    } catch (err) {
      console.warn("fetchUser after login failed:", err);
    }
    navigate(redirectTo, { replace: true });
  };

  const switchMethod = (next) => {
    setMethod(next);
    setErrors({});
    setMessage(null);
  };

  const signInWithPassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    const nextErrors = {};
    if (!/^[6-9]\d{9}$/.test(mobile)) nextErrors.mobile = "Enter a valid 10-digit mobile number";
    if (!password) nextErrors.password = "Enter your password";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/login/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobileNumber: mobile, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ text: data.message || "Login failed. Please try again.", type: "error" });
        setBusy(false);
        return;
      }
      await completeLogin(data);
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Gurgaon-first"
      title="Safe, Verified Homes In Gurgaon"
      subtitle="Save listings, track enquiries and get matched to homes that fit what you want."
      points={POINTS}
      footer={
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={() => navigate(redirectTo)}
            sx={{ display: "inline-flex", alignItems: "center", gap: 1, fontWeight: 600, color: "text.secondary" }}
          >
            Continue browsing <ArrowRight size={14} />
          </Link>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Are you an agent?{" "}
            <Link component="button" type="button" underline="hover" onClick={() => navigate("/agent/login")} sx={{ fontWeight: 700, color: "secondary.main" }}>
              Agent login
            </Link>
          </Typography>
        </Stack>
      }
    >
      <Typography component="h2" sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.6rem" }}>
        Welcome To ggnHome
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, mb: 5 }}>
        {hasIntent ? intentLabel(location.state.from) : "Sign in or create your account in seconds."}
      </Typography>

      <AuthTabs value={method} onChange={switchMethod} options={METHODS} />

      {method === "otp" ? (
        <MobileOtpForm onVerified={completeLogin} submitLabel="Verify & Continue" initialMobile={mobile} />
      ) : (
        <Box component="form" onSubmit={signInWithPassword} noValidate>
          <AuthMessage message={message} onClose={() => setMessage(null)} />
          <AuthField
            autoFocus
            label="Mobile number"
            icon={Smartphone}
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
              if (errors.mobile) setErrors((p) => ({ ...p, mobile: undefined }));
            }}
            error={errors.mobile}
            slotProps={{ htmlInput: { inputMode: "numeric", autoComplete: "tel-national", maxLength: 10 } }}
          />
          <AuthField
            label="Password"
            type="password"
            icon={Lock}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
            }}
            error={errors.password}
            slotProps={{ htmlInput: { autoComplete: "current-password" } }}
          />
          <AuthButton loading={busy} loadingText="Signing in…" startIcon={<KeyRound size={18} />} sx={{ borderRadius: 999, fontWeight: 800 }}>
            Sign In
          </AuthButton>
          <Typography variant="caption" sx={{ display: "block", mt: 3, color: "text.secondary", textAlign: "center" }}>
            No password yet or forgot it?{" "}
            <Link component="button" type="button" underline="hover" onClick={() => switchMethod("otp")} sx={{ fontWeight: 700, color: "secondary.main", fontSize: "inherit" }}>
              Sign in with a mobile code
            </Link>
          </Typography>
        </Box>
      )}

      <Typography variant="caption" sx={{ display: "block", mt: 5, color: "text.secondary", textAlign: "center" }}>
        By continuing you agree to the ggnHome terms and conditions. Your information is stored securely and never sold.
      </Typography>
    </AuthShell>
  );
}
