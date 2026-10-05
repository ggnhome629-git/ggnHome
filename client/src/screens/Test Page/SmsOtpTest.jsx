import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";

/**
 * /test — checks the SMS OTP delivery end to end using the same two endpoints
 * as the real login (`/login/request-otp` and `/login/verify-otp`).
 *
 * Note: a successful verify is a real login (it sets the session cookies),
 * exactly like the login page does.
 */
const BASE = process.env.REACT_APP_Base_API;

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function SmsOtpTest() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [needsEmail, setNeedsEmail] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { severity, text, raw }

  const show = (severity, text, raw) => setResult({ severity, text, raw });

  const sendOtp = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!/^\d{10}$/.test(mobileNumber)) return show("error", "Enter a 10-digit mobile number");
    setBusy(true);
    try {
      const r = await post("/login/request-otp", email ? { email, mobileNumber } : { mobileNumber });
      if (r.ok) {
        setSent(true);
        setNeedsEmail(false);
        show(
          r.data.smsSent ? "success" : "warning",
          r.data.smsSent
            ? "OTP queued for SMS (and email). Check the phone running the gateway app."
            : "OTP created but NOT queued for SMS (email only) — SMS gateway not active on the server.",
          r.data
        );
      } else if (r.status === 400 && !email) {
        setNeedsEmail(true);
        show("info", "New number — enter an email too, then send again.", r.data);
      } else {
        show("error", r.data.message || `Request failed (${r.status})`, r.data);
      }
    } catch (err) {
      show("error", `Network error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!/^\d{6}$/.test(otp)) return show("error", "Enter the 6-digit OTP");
    setBusy(true);
    try {
      const r = await post("/login/verify-otp", { email, otp, mobileNumber });
      show(r.ok ? "success" : "error", r.ok ? "OTP verified ✔ — the SMS OTP works." : r.data.message || "Verification failed", r.ok ? { message: r.data.message, user: r.data.user } : r.data);
    } catch (err) {
      show("error", `Network error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "#F4F7F9" }}>
      <Paper sx={{ p: 3, width: "100%", maxWidth: 420 }} elevation={3}>
        <Typography variant="h6" gutterBottom>
          SMS OTP test
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Uses the same flow as login. Make sure the gateway app is running on the phone.
        </Typography>

        <Stack component="form" spacing={2} onSubmit={sendOtp}>
          <TextField
            label="Mobile number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputProps={{ inputMode: "numeric" }}
          />
          {needsEmail && (
            <TextField label="Email (new number)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
          <Button type="submit" variant="contained" disabled={busy}>
            {sent ? "Resend OTP" : "Send OTP"}
          </Button>
        </Stack>

        {sent && (
          <Stack component="form" spacing={2} onSubmit={verifyOtp} sx={{ mt: 3 }}>
            <TextField
              label="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputProps={{ inputMode: "numeric" }}
            />
            <Button type="submit" variant="outlined" disabled={busy}>
              Verify OTP
            </Button>
          </Stack>
        )}

        {result && (
          <Alert severity={result.severity} sx={{ mt: 3 }}>
            {result.text}
            {result.raw && (
              <Box component="pre" sx={{ m: 0, mt: 1, fontSize: 12, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(result.raw, null, 2)}
              </Box>
            )}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
