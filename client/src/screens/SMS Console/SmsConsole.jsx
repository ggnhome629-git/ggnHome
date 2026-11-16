import { API_BASE } from "../../utils/apiBase";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";

/**
 * SMS Service console — hidden page (/sms-service/app/manage). Opened with the shared SMS key; it manages both services:
 * phones (which service each one sends for), GGN Home limits and a log. Shine One's limits, times and sheets are managed in Stashr → SMS sender.
 * A test send is on the log tab. GGN Home OTP delivery can be switched between SMS and app display here.
 */
const BASE = API_BASE;
const TOKEN_KEY = "smsConsoleToken";

// Kept on this device (not just this tab), so the key is typed once.
const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch (e) {
    return "";
  }
};
const setToken = (t) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    /* private mode: stay signed in for this page view only */
  }
};

async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}/api/sms-console${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/login") {
    setToken("");
    window.dispatchEvent(new Event("sms-console-signed-out"));
  }
  if (!res.ok) throw new Error(data.message || (data.error && data.error.message) || `Request failed (${res.status})`);
  return data;
}

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const ago = (iso) => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
const STATUS_COLOR = { sent: "success", delivered: "success", failed: "error", queued: "warning", pending: "warning", sending: "info", expired: "default" };

// ------------------------------------------------------------------ login ----

function Login({ onDone }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token } = await api("/login", { method: "POST", body: JSON.stringify({ password }) });
      setToken(token);
      onDone();
    } catch (err) {
      setError(err.message === "Not found" ? "This page is not set up." : err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "#f4f6fb" }}>
      <Paper component="form" onSubmit={submit} sx={{ p: 4, width: "100%", maxWidth: 380 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          SMS Service
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter the SMS key
        </Typography>
        <TextField fullWidth type="password" label="SMS key" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Button fullWidth type="submit" variant="contained" disabled={busy || !password} sx={{ mt: 2 }}>
          {busy ? "Checking…" : "Sign in"}
        </Button>
      </Paper>
    </Box>
  );
}

// ----------------------------------------------------------------- phones ----

function PhonesTab({ data, reload, notify }) {
  const [names, setNames] = useState({});
  const patch = async (deviceId, body, msg) => {
    try {
      await api(`/phones/${encodeURIComponent(deviceId)}`, { method: "PATCH", body: JSON.stringify(body) });
      notify(msg || "Saved", "success");
      reload();
    } catch (e) {
      notify(e.message, "error");
    }
  };
  const remove = async (p) => {
    if (!window.confirm(`Remove "${p.name}" from the list? It comes back if the app is still running.`)) return;
    try {
      await api(`/phones/${encodeURIComponent(p.deviceId)}`, { method: "DELETE" });
      reload();
    } catch (e) {
      notify(e.message, "error");
    }
  };
  const shineDown = data.shine && !data.shine.ok;
  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Every phone that has the SMS Service app installed. Use the switches to choose which service each phone sends for — a
        phone can do both.
      </Typography>
      {shineDown && <Alert severity="warning">Shine One server: {data.shine.error}. Its switches are unavailable until it answers.</Alert>}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">GGN Home</TableCell>
              <TableCell align="center">Shine One Estate</TableCell>
              <TableCell>Last error</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.phones.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                    No phones yet. Install the app, tap Start, and it appears here within seconds.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {data.phones.map((p) => (
              <TableRow key={p.deviceId} hover>
                <TableCell sx={{ minWidth: 200 }}>
                  <TextField
                    size="small"
                    variant="standard"
                    value={names[p.deviceId] ?? p.name}
                    onChange={(e) => setNames({ ...names, [p.deviceId]: e.target.value })}
                    onBlur={() => {
                      const v = (names[p.deviceId] ?? p.name).trim();
                      if (v && v !== p.name) patch(p.deviceId, { name: v }, "Renamed");
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    {p.appVersion ? `v${p.appVersion} · ` : ""}seen {ago(p.lastSeen)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" color={p.online ? "success" : "default"} label={p.online ? "Online" : "Offline"} />
                </TableCell>
                <TableCell align="center">
                  {p.ggnhome ? (
                    <>
                      <Switch checked={p.ggnhome.enabled} onChange={(e) => patch(p.deviceId, { ggnhome: e.target.checked })} />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {p.ggnhome.sentToday} today · {p.ggnhome.sentTotal} total
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      not seen yet
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  {p.shine ? (
                    <>
                      <Switch checked={p.shine.enabled} onChange={(e) => patch(p.deviceId, { shine: e.target.checked })} />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {p.shine.sentToday} today · {p.shine.sentTotal} total
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {shineDown ? "unavailable" : "not seen yet"}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography variant="caption" color="error">
                    {(p.shine && p.shine.lastError) || (p.ggnhome && p.ggnhome.lastError) || ""}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => remove(p)} aria-label="Remove phone">
                    <Trash2 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

// ----------------------------------------------------------------- GGN Home ----

// GGN Home's SMS limits (per day, per hour, the gap between two SMS) are not set here: they are managed in Stashr → SMS sender.
// This tab only keeps the OTP delivery switch.
function GgnhomeTab({ data, reload, notify }) {
  const s = data.ggnhome.settings;
  const [showOtp, setShowOtp] = useState(!!s.showOtpOnAndroid);
  useEffect(() => { setShowOtp(!!s.showOtpOnAndroid); }, [s.showOtpOnAndroid]);
  const save = async () => {
    try {
      await api("/ggnhome/settings", { method: "PUT", body: JSON.stringify({ showOtpOnAndroid: showOtp }) });
      notify("Saved", "success");
      reload();
    } catch (e) {
      notify(e.message, "error");
    }
  };
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        The SMS limits (per day, per hour, gap between SMS) are managed in <b>Stashr → SMS sender</b>. Nothing is limited from here.
      </Alert>
      <Typography color="text.secondary">Choose how GGN Home login codes are delivered. SMS mode keeps the existing SMS gateway and SIM sending. App mode shows OTPs in the Android app instead of sending SMS.</Typography>
      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={600}>OTP delivery</Typography>
            <FormControlLabel
              control={<Switch checked={showOtp} onChange={(e) => setShowOtp(e.target.checked)} />}
              label={showOtp ? "Show OTP in app (no SMS)" : "Send OTP as SMS"}
            />
            {data.ggnhome.pending > 0 && <Chip size="small" color="warning" label={`${data.ggnhome.pending} waiting to be sent`} />}
          </Stack>
          <Box>
            <Button variant="contained" onClick={save}>Save</Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

// --------------------------------------------------------------- Shine One ----

// Shine One's SMS (limits, sending times, days, sheets, messages and Auto-send) is managed in Stashr now: Stashr → SMS sender.
// The We Three server still does the sending; the phones and the log stay here.
function ShineTab() {
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Shine One Estate SMS is now managed in Stashr: open <b>Stashr → SMS sender</b> (
        <a href="https://stashr.tanush.qd.je/sms" target="_blank" rel="noreferrer noopener">stashr.tanush.qd.je/sms</a>
        ). The limits, sending times, days, the sheets, their messages and Auto-send are set there.
      </Alert>
      <Typography variant="body2" color="text.secondary">
        Which phones send for Shine One is still chosen on the Phones tab, and its messages still show in Log &amp; test.
      </Typography>
    </Stack>
  );
}

// -------------------------------------------------------------------- log ----

function LogTab({ notify }) {
  const [service, setService] = useState("ggnhome");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      setRows((await api(`/log?service=${service}&limit=100`)).rows);
    } catch (e) {
      setRows([]);
      setError(e.message);
    }
  }, [service]);
  useEffect(() => {
    setRows(null);
    load();
  }, [load]);
  const sendTest = async () => {
    try {
      await api("/test", { method: "POST", body: JSON.stringify({ service, phoneNumber: phone, message }) });
      notify("Test SMS queued — it should arrive in a few seconds", "success");
      setTimeout(load, 4000);
    } catch (e) {
      notify(e.message, "error");
    }
  };
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup exclusive size="small" value={service} onChange={(e, v) => v && setService(v)}>
          <ToggleButton value="ggnhome">GGN Home</ToggleButton>
          <ToggleButton value="shine">Shine One Estate</ToggleButton>
        </ToggleButtonGroup>
        <Button onClick={load}>Refresh</Button>
      </Stack>
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="flex-start">
          <TextField size="small" label="Mobile (10 digits)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
          <TextField size="small" label="Test message" value={message} onChange={(e) => setMessage(e.target.value)} sx={{ minWidth: 260 }} />
          <Button variant="outlined" disabled={phone.length !== 10} onClick={sendTest}>
            Send test SMS
          </Button>
        </Stack>
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Number</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Note</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows === null && (
              <TableRow>
                <TableCell colSpan={6}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            )}
            {(rows || []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{fmt(r.createdAt)}</TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell>{r.sheet ? r.sheet : r.kind}</TableCell>
                <TableCell>
                  <Chip size="small" color={STATUS_COLOR[r.status] || "default"} label={r.delivery === "delivered" ? "delivered" : r.status} />
                </TableCell>
                <TableCell>{r.deviceName || "—"}</TableCell>
                <TableCell sx={{ maxWidth: 240 }}>
                  <Typography variant="caption" color="error">
                    {r.error}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {rows && rows.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                    Nothing sent yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

// ------------------------------------------------------------------- page ----

export default function SmsConsole() {
  const [signedIn, setSignedIn] = useState(!!getToken());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState(null);

  // Keep this page out of search results, and out of any shared link preview.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow,noarchive";
    document.head.appendChild(meta);
    const prev = document.title;
    document.title = "SMS Service";
    return () => {
      document.head.removeChild(meta);
      document.title = prev;
    };
  }, []);

  useEffect(() => {
    const out = () => setSignedIn(false);
    window.addEventListener("sms-console-signed-out", out);
    return () => window.removeEventListener("sms-console-signed-out", out);
  }, []);

  const notify = useCallback((message, severity = "info") => {
    setToast({ message, severity, key: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.key >= 3500 ? null : t)), 3600);
  }, []);

  const reload = useCallback(async () => {
    try {
      setData(await api("/overview"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return undefined;
    reload();
    const t = setInterval(() => document.visibilityState === "visible" && reload(), 15000);
    return () => clearInterval(t);
  }, [signedIn, reload]);

  const online = useMemo(() => (data ? data.phones.filter((p) => p.online).length : 0), [data]);

  if (!signedIn) return <Login onDone={() => setSignedIn(true)} />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6fb", pb: 6 }}>
      <Box sx={{ bgcolor: "#fff", borderBottom: "1px solid #e5e8f0", px: { xs: 2, md: 4 }, py: 1.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
          SMS Service
        </Typography>
        {data && <Chip size="small" color={online ? "success" : "default"} label={`${online} of ${data.phones.length} phones online`} />}
        <Button
          size="small"
          onClick={() => {
            setToken("");
            setSignedIn(false);
            setData(null);
          }}
        >
          Sign out
        </Button>
      </Box>
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, md: 3 }, pt: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
          <Tab label="Phones" />
          <Tab label="GGN Home" />
          <Tab label="Shine One Estate" />
          <Tab label="Log & test" />
        </Tabs>
        {error && !data && <Alert severity="error">{error}</Alert>}
        {!data && !error && <LinearProgress />}
        {data && tab === 0 && <PhonesTab data={data} reload={reload} notify={notify} />}
        {data && tab === 1 && <GgnhomeTab data={data} reload={reload} notify={notify} />}
        {tab === 2 && <ShineTab />}
        {tab === 3 && <LogTab notify={notify} />}
      </Box>
      {toast && (
        <Box sx={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 2000 }}>
          <Alert severity={toast.severity} variant="filled">
            {toast.message}
          </Alert>
        </Box>
      )}
    </Box>
  );
}
