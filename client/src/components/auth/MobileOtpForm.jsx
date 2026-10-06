import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, InputAdornment, Link, Stack, TextField, Typography } from "@mui/material";
import { ArrowLeft, MessageSquareText, Smartphone } from "lucide-react";

const RESEND_AFTER = 30;

/**
 * Mobile number → 4-letter code, the same login every ggnHome user has.
 * Calls /login/request-otp and /login/verify-otp and hands the verified
 * response (tokens, user, agent status) to onVerified(data, mobile).
 */
export default function MobileOtpForm({ onVerified, submitLabel = "Verify & Continue", initialMobile = "" }) {
  const base = process.env.REACT_APP_Base_API || "";
  const [step, setStep] = useState("mobile");
  const [mobile, setMobile] = useState(initialMobile);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [wait, setWait] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => {
    if (!wait) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (e) => {
    e?.preventDefault();
    setError("");
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${base}/login/request-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ mobileNumber: mobile }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't send the code. Please try again.");
      setStep("code");
      setCode("");
      setWait(RESEND_AFTER);
      setInfo(`We sent a 4-letter code to ${data.maskedMobile || `+91 ${mobile}`}.`);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setError("");
    if (code.length !== 4) {
      setError("Enter all 4 letters of the code");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${base}/login/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ mobileNumber: mobile, otp: code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "That code didn't work. Please try again.");
      await onVerified(data, mobile);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (step === "mobile") {
    return (
      <Box component="form" onSubmit={send} noValidate>
        <TextField
          fullWidth
          autoFocus
          label="Mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputProps={{ inputMode: "numeric", autoComplete: "tel-national", "aria-label": "Mobile number" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
                  <Smartphone size={16} />
                  <span>+91</span>
                </Stack>
              </InputAdornment>
            ),
          }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}
        <Button type="submit" fullWidth variant="contained" color="secondary" size="large" disabled={busy} sx={{ mt: 4, py: 1.6, borderRadius: 999, fontWeight: 800 }}>
          {busy ? <CircularProgress size={20} color="inherit" /> : "Send Code"}
        </Button>
        <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary", textAlign: "center" }}>
          We'll text you a 4-letter code. No password needed.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={verify} noValidate>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3, color: "text.secondary" }}>
        <MessageSquareText size={16} />
        <Typography variant="body2">{info}</Typography>
      </Stack>
      <TextField
        inputRef={codeRef}
        fullWidth
        label="4-letter code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4))}
        inputProps={{ maxLength: 4, autoComplete: "one-time-code", "aria-label": "4-letter code", style: { letterSpacing: "0.6em", fontSize: 24, fontWeight: 800, textAlign: "center" } }}
      />
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}
      <Button type="submit" fullWidth variant="contained" color="secondary" size="large" disabled={busy || code.length !== 4} sx={{ mt: 4, py: 1.6, borderRadius: 999, fontWeight: 800 }}>
        {busy ? <CircularProgress size={20} color="inherit" /> : submitLabel}
      </Button>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
        <Link component="button" type="button" underline="hover" onClick={() => { setStep("mobile"); setError(""); }} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 600 }}>
          <ArrowLeft size={14} /> Change number
        </Link>
        <Button size="small" onClick={send} disabled={wait > 0 || busy} sx={{ fontWeight: 700 }}>
          {wait > 0 ? `Resend in ${wait}s` : "Resend Code"}
        </Button>
      </Stack>
    </Box>
  );
}
