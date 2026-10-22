import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useResendCooldown from "../../utils/useResendCooldown";

const API = process.env.REACT_APP_Base_API || "";

export default function PartnerAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const resend = useResendCooldown(30);
  const normalizedMobile = mobileNumber.replace(/\D/g, "").slice(-10);

  useEffect(() => {
    if (location.pathname === "/partner/register") {
      navigate("/partner/login", { replace: true });
    }
  }, [location.pathname, navigate]);

  // The server checks that this number is a registered, active Partner BEFORE
  // it sends any OTP, so a non-partner number is rejected right here.
  async function sendOtp(isResend = false) {
    setError(""); setNotice("");
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(API + "/partner/login/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobileNumber: normalizedMobile }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429 && data.retryAfterSec) resend.start(Math.min(data.retryAfterSec, 120));
        throw new Error(data.message || "Could not send OTP.");
      }
      // Direct login is on: the server has already signed the partner in.
      if (data.channel === "direct") {
        await completePartnerLogin(data);
        return;
      }
      setOtpSent(true);
      setOtp("");
      resend.start(30);
      setNotice(isResend ? "A new OTP has been sent." : data.message || "OTP sent. It is valid for 5 minutes.");
    } catch (e) {
      setError(e.message || "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  // Opens the partner dashboard from a successful login response (OTP or direct login).
  async function completePartnerLogin(data) {
    // The server only accepts a Partner number here; these checks are a second guard.
    if (data.agent?.role !== "Partner") {
      throw new Error("This mobile number is not registered for Partner Portal access. Ask a GgnHome administrator to register it.");
    }
    if (data.agent.status === "suspended") throw new Error("This Partner account is suspended. Contact GgnHome support.");
    if (data.agent.status !== "active") throw new Error("This Partner account is not active yet. Contact GgnHome admin.");
    if (!data.agentAccessToken) throw new Error("OTP was verified, but a Partner session could not be created. Please try again.");

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("partnerAccessToken", data.agentAccessToken);
    navigate("/partner/dashboard", { replace: true });
  }

  async function verifyOtp(submitted) {
    setError(""); setNotice("");
    const code = String(typeof submitted === "string" ? submitted : otp).trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) {
      setError("Enter the 4-letter OTP you received.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(API + "/partner/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobileNumber: normalizedMobile, otp: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "OTP verification failed.");

      await completePartnerLogin(data);
    } catch (e) {
      setError(e.message || "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  function changeNumber() {
    setOtpSent(false); setOtp(""); setNotice(""); setError(""); resend.stop();
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#f5f7fb", px: 2, py: 5 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4, border: "1px solid #e2e8f0" }}>
          <Stack spacing={2.5}>
            <Box sx={{ width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 3, bgcolor: "#e4f5f0", color: "#0f766e" }}>
              <ShieldCheck size={26} />
            </Box>
            <Box>
              <Typography sx={{ color: "#0f766e", fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase" }}>GgnHome Partner Portal</Typography>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#0f172a", mt: 1 }}>Partner login</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Sign in using the mobile number registered by GgnHome admin. We check the number first, then send an OTP.
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {notice && <Alert severity="info">{notice}</Alert>}

            <TextField
              label="Mobile number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              disabled={otpSent || busy}
              fullWidth
              inputProps={{ inputMode: "numeric", maxLength: 10, autoComplete: "tel-national" }}
              placeholder="10-digit mobile number"
            />
            {!otpSent ? (
              <Button variant="contained" size="large" disabled={busy} onClick={() => sendOtp(false)} sx={{ py: 1.4, bgcolor: "#0f766e", fontWeight: 800, textTransform: "none" }}>
                {busy ? "Checking number…" : "Send OTP"}
              </Button>
            ) : (
              <>
                <TextField
                  label="OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
                  disabled={busy}
                  fullWidth
                  inputProps={{ maxLength: 4, autoComplete: "one-time-code", style: { textTransform: "uppercase", letterSpacing: 8, fontWeight: 800 } }}
                  placeholder="e.g. KQMX"
                />
                <Button variant="contained" size="large" disabled={busy} onClick={() => verifyOtp()} sx={{ py: 1.4, bgcolor: "#0f766e", fontWeight: 800, textTransform: "none" }}>
                  {busy ? "Verifying…" : "Verify OTP and sign in"}
                </Button>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button disabled={busy} onClick={changeNumber} sx={{ textTransform: "none" }}>
                    Change mobile number
                  </Button>
                  <Button disabled={busy || resend.remaining > 0} onClick={() => sendOtp(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
                    {resend.remaining > 0 ? `Resend OTP in ${resend.remaining}s` : "Resend OTP"}
                  </Button>
                </Stack>
              </>
            )}
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Need access? Contact a GgnHome administrator to register your mobile number.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
