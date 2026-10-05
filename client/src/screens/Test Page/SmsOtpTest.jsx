import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";

/**
 * /test — checks OTP delivery end to end with the same endpoints as the real
 * login (`/login/request-otp`, `/login/verify-otp`).
 *
 *   Mobile (default): OTP goes by SMS through the ggnhome-sms-service phones.
 *   Email:            OTP goes by email, for an account that already has one.
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
  const [channel, setChannel] = useState("mobile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { severity, text, raw }

  const show = (severity, text, raw) => setResult({ severity, text, raw });
  const identity = () => (channel === "email" ? { email: email.trim() } : { mobileNumber });

  const sendOtp = async (e) => {
    e.preventDefault();
    setResult(null);
    if (channel === "mobile" && !/^\d{10}$/.test(mobileNumber)) return show("error", "Enter a 10-digit mobile number");
    if (channel === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return show("error", "Enter a valid email");
    setBusy(true);
    try {
      const r = await post("/login/request-otp", identity());
      if (r.ok) {
        setSent(true);
        const sms = channel === "mobile";
        show(
          sms && !r.data.smsSent ? "warning" : "success",
          sms
            ? r.data.smsSent
              ? "OTP queued for SMS. It should reach the phone in a few seconds."
              : "No SMS was queued — " + (r.data.message || "see response below")
            : "OTP emailed.",
          r.data
        );
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
    if (!/^[A-Za-z]{4}$/.test(otp)) return show("error", "Enter the 4-letter code");
    setBusy(true);
    try {
      const r = await post("/login/verify-otp", { ...identity(), otp });
      show(
        r.ok ? "success" : "error",
        r.ok ? "OTP verified ✔ — delivery and login work." : r.data.message || "Verification failed",
        r.ok ? { message: r.data.message, user: r.data.user } : r.data
      );
    } catch (err) {
      show("error", `Network error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const switchChannel = () => {
    setChannel((c) => (c === "mobile" ? "email" : "mobile"));
    setSent(false);
    setOtp("");
    setResult(null);
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "#F4F7F9" }}>
      <Paper sx={{ p: 3, width: "100%", maxWidth: 420 }} elevation={3}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Box component="img" src="/Logo2.jpg" alt="ggnHome" sx={{ width: 48, height: 48, borderRadius: 2 }} />
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              OTP delivery test
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Same flow as login · ggnhome-sms-service
            </Typography>
          </Box>
        </Stack>

        <Stack component="form" spacing={2} onSubmit={sendOtp}>
          {channel === "mobile" ? (
            <TextField
              label="Mobile number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputProps={{ inputMode: "numeric" }}
            />
          ) : (
            <TextField label="Email (existing account)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
          <Button type="submit" variant="contained" disabled={busy}>
            {sent ? "Resend OTP" : "Send OTP"}
          </Button>
          <Button type="button" size="small" onClick={switchChannel}>
            {channel === "mobile" ? "Test email OTP instead" : "Test SMS OTP instead"}
          </Button>
        </Stack>

        {sent && (
          <Stack component="form" spacing={2} onSubmit={verifyOtp} sx={{ mt: 3 }}>
            <TextField
              label="4-letter code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4))}
              inputProps={{ inputMode: "text", autoCapitalize: "characters" }}
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
