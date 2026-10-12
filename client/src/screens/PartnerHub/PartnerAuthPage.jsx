import React, { useState } from "react";
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_Base_API;

export default function PartnerAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRegistration = location.pathname === "/partner/register";
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState("");
  const [canRegister, setCanRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedMobile = mobileNumber.replace(/\D/g, "").slice(-10);

  async function sendOtp() {
    setError(""); setNotice("");
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/login/request-otp`, {
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
    } finally { setBusy(false); }
  }

  async function registerPartner(token) {
    setError(""); setNotice(""); setBusy(true);
    try {
      const res = await fetch(`${API}/api/partner/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Partner registration failed.");
      if (data.agentAccessToken) localStorage.setItem("partnerAccessToken", data.agentAccessToken);
      localStorage.setItem("accessToken", token);
      setNotice("Partner account is ready. Opening PartnerHub…");
      navigate("/partner/dashboard", { replace: true });
    } catch (e) {
      setError(e.message || "Partner registration failed.");
    } finally { setBusy(false); }
  }

  async function verifyOtp() {
    setError(""); setNotice("");
    if (!/^[A-Z]{4}$/.test(otp.trim().toUpperCase())) {
      setError("Enter the 4-letter OTP you received.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/login/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobileNumber: normalizedMobile, otp: otp.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "OTP verification failed.");
      const userToken = data.accessToken;
      if (!userToken) throw new Error("Verified, but no login token was returned. Please try again.");

      localStorage.setItem("accessToken", userToken);
      if (data.agent?.role === "Partner") {
        if (data.agent.status !== "active") {
          throw new Error(data.agent.status === "suspended" ? "This partner account is suspended. Contact ggnHome support." : "Your partner account is awaiting activation. Please contact ggnHome support.");
        }
        if (data.agentAccessToken) {
          localStorage.setItem("partnerAccessToken", data.agentAccessToken);
          navigate("/partner/dashboard", { replace: true });
          return;
        }
      }
      if (data.agent && data.agent.role === "Agent") {
        throw new Error("This mobile number is registered as an Agent, not a Partner. Contact ggnHome support to change the account role.");
      }
      if (data.agent && data.agent.status === "suspended") {
        throw new Error("This partner account is suspended. Contact ggnHome support.");
      }

      setVerifiedToken(userToken);
      setCanRegister(true);
      if (isRegistration) {
        await registerPartner(userToken);
      } else {
        setNotice("Mobile verified. If this is your first time, finish creating your Partner account below.");
      }
    } catch (e) {
      setError(e.message || "OTP verification failed.");
    } finally { setBusy(false); }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#f5f7fb", px: 2, py: 5 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4, border: "1px solid #e2e8f0" }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ color: "#0f766e", fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase" }}>ggnHome PartnerHub</Typography>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#0f172a", mt: 1 }}>
                {isRegistration ? "Become a Partner" : "Partner Login"}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Use only your mobile number and OTP. No password, email, or documents are required to create the basic partner account.
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
              inputProps={{ inputMode: "numeric", maxLength: 10 }}
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
                  disabled={busy || Boolean(verifiedToken)}
                  fullWidth
                  inputProps={{ maxLength: 4, style: { textTransform: "uppercase", letterSpacing: 8, fontWeight: 800 } }}
                  placeholder="e.g. KQMX"
                />
                {!verifiedToken && <Button variant="contained" size="large" disabled={busy} onClick={verifyOtp} sx={{ py: 1.4, bgcolor: "#0f766e", fontWeight: 800, textTransform: "none" }}>{busy ? "Verifying…" : "Verify OTP"}</Button>}
                {canRegister && verifiedToken && (
                  <Button variant="contained" size="large" disabled={busy} onClick={() => registerPartner(verifiedToken)} sx={{ py: 1.4, bgcolor: "#0f766e", fontWeight: 800, textTransform: "none" }}>
                    {busy ? "Creating account…" : "Complete Partner Registration"}
                  </Button>
                )}
                {!verifiedToken && <Button disabled={busy} onClick={() => { setOtpSent(false); setOtp(""); setNotice(""); setError(""); }} sx={{ textTransform: "none" }}>Change mobile number</Button>}
              </>
            )}
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {isRegistration ? "Already registered? " : "New to ggnHome PartnerHub? "}
              <Box component="span" onClick={() => navigate(isRegistration ? "/partner/login" : "/partner/register")} sx={{ color: "#0f766e", fontWeight: 800, cursor: "pointer" }}>
                {isRegistration ? "Login" : "Register"}
              </Box>
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
