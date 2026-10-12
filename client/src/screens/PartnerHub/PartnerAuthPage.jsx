import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

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
  const normalizedMobile = mobileNumber.replace(/\D/g, "").slice(-10);

  useEffect(() => {
    if (location.pathname === "/partner/register") {
      navigate("/partner/login", { replace: true });
    }
  }, [location.pathname, navigate]);

  async function sendOtp() {
    setError(""); setNotice("");
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(API + "/login/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobileNumber: normalizedMobile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not send OTP.");
      setOtpSent(true);
      setNotice(data.message || "OTP sent. It is valid for 5 minutes.");
    } catch (e) {
      setError(e.message || "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setError(""); setNotice("");
    const code = otp.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) {
      setError("Enter the 4-letter OTP you received.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(API + "/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobileNumber: normalizedMobile, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "OTP verification failed.");

      if (data.agent?.role === "Agent") {
        throw new Error("This number is registered as a standard Agent, not a Partner. Contact GgnHome admin for help.");
      }
      if (data.agent?.role === "Partner") {
        if (data.agent.status === "suspended") throw new Error("This Partner account is suspended. Contact GgnHome support.");
        if (data.agent.status !== "active") throw new Error("This Partner account is not active yet. Contact GgnHome admin.");
        if (!data.agentAccessToken) throw new Error("OTP was verified, but a Partner session could not be created. Please try again.");
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("partnerAccessToken", data.agentAccessToken);
        navigate("/partner/dashboard", { replace: true });
        return;
      }

      throw new Error("This mobile number is not registered for Partner Portal access. Ask a GgnHome administrator to register it, then sign in with OTP.");
    } catch (e) {
      setError(e.message || "OTP verification failed.");
    } finally {
      setBusy(false);
    }
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
                Sign in using the mobile number registered by GgnHome admin. Access is granted only after OTP verification.
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
              <Button variant="contained" size="large" disabled={busy} onClick={sendOtp} sx={{ py: 1.4, bgcolor: "#0f766e", fontWeight: 800, textTransform: "none" }}>
                {busy ? "Sending OTP…" : "Send OTP"}
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
                <Button variant="contained" size="large" disabled={busy} onClick={verifyOtp} sx={{ py: 1.4, bgcolor: "#0f766e", fontWeight: 800, textTransform: "none" }}>
                  {busy ? "Verifying…" : "Verify OTP and sign in"}
                </Button>
                <Button disabled={busy} onClick={() => { setOtpSent(false); setOtp(""); setNotice(""); setError(""); }} sx={{ textTransform: "none" }}>
                  Change mobile number
                </Button>
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
