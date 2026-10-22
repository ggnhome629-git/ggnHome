import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import useResendCooldown from "../../utils/useResendCooldown";

const API = process.env.REACT_APP_Base_API || "";
const ADMIN_HOME = "/admin/Landingpage";

/**
 * Separate sign-in for the admin console. The server checks that the number
 * belongs to an admin BEFORE sending an OTP, and only accepts the OTP for an
 * admin, so this page can only ever open the admin area.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loading, fetchUser } = useAuth();
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const resend = useResendCooldown(30);
  const normalizedMobile = mobileNumber.replace(/\D/g, "").slice(-10);

  // Already signed in as an admin: go straight to the console.
  useEffect(() => {
    if (!loading && user?.role === "admin") navigate(ADMIN_HOME, { replace: true });
  }, [loading, user, navigate]);

  async function sendOtp(isResend = false) {
    setError(""); setNotice("");
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(API + "/admin/login/request-otp", {
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

  // Opens the admin console from a successful login response.
  async function completeAdminLogin(data) {
    // Second guard: never keep a session that is not an admin's.
    if (data.user?.role !== "admin") throw new Error("This account does not have admin access.");

    if (data.accessToken) localStorage.setItem("accessToken", data.accessToken);
    await fetchUser?.({ force: true });
    navigate(ADMIN_HOME, { replace: true });
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
      const res = await fetch(API + "/admin/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobileNumber: normalizedMobile, otp: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "OTP verification failed.");
      await completeAdminLogin(data);
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
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2, py: 5, background: "linear-gradient(135deg,#002244 0%,#003366 45%,#0B7A85 100%)" }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4, boxShadow: "0 24px 60px rgba(0,20,45,0.35)" }}>
          <Stack spacing={2.5}>
            <Box sx={{ width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 3, bgcolor: "#e6eef7", color: "#003366" }}>
              <LockKeyhole size={26} />
            </Box>
            <Box>
              <Typography sx={{ color: "#003366", fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase" }}>GgnHome Admin Console</Typography>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#0f172a", mt: 1 }}>Admin login</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Only administrator accounts can sign in here. We check your number first, then send an OTP.
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {notice && <Alert severity="info">{notice}</Alert>}

            <TextField
              label="Admin mobile number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              disabled={otpSent || busy}
              fullWidth
              inputProps={{ inputMode: "numeric", maxLength: 10, autoComplete: "tel-national" }}
              placeholder="10-digit mobile number"
            />
            {!otpSent ? (
              <Button variant="contained" size="large" disabled={busy} onClick={() => sendOtp(false)} sx={{ py: 1.4, bgcolor: "#003366", fontWeight: 800, textTransform: "none", "&:hover": { bgcolor: "#002244" } }}>
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
                  placeholder="e.g. ABCF"
                />
                <Button variant="contained" size="large" disabled={busy} onClick={() => verifyOtp()} sx={{ py: 1.4, bgcolor: "#003366", fontWeight: 800, textTransform: "none", "&:hover": { bgcolor: "#002244" } }}>
                  {busy ? "Verifying…" : "Verify OTP and open admin"}
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
            <Button onClick={() => navigate("/")} sx={{ textTransform: "none", color: "text.secondary" }}>
              Back to ggnhome.com
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
