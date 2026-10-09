import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
 * phones (which service each one sends for), limits, Shine One sending times, per-sheet message + Auto-send, a log
 * and a test send. The Android app only shows status; everything is changed here.
 */
const BASE = process.env.REACT_APP_Base_API;
const TOKEN_KEY = "smsConsoleToken";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

// ----------------------------------------------------------------- limits ----

const num = (v) => (v === "" || v === undefined || v === null ? "" : String(v));

function LimitFields({ form, setForm, disabled, withQuota }) {
  const field = (key, label, help) => (
    <TextField
      key={key}
      size="small"
      type="number"
      label={label}
      helperText={help}
      value={num(form[key])}
      disabled={disabled}
      onChange={(e) => setForm({ ...form, [key]: e.target.value === "" ? "" : Number(e.target.value) })}
      sx={{ width: 190 }}
    />
  );
  return (
    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
      {field("dailyLimit", "SMS per day", "per phone")}
      {field("hourlyLimit", "SMS per hour", "per phone")}
      {field("gapMinSec", "Gap min (sec)", "between two SMS")}
      {field("gapMaxSec", "Gap max (sec)", "random between min & max")}
      {withQuota && field("lunchQuota", "Lunch batch", "SMS in the lunch window")}
    </Stack>
  );
}

function ModeSwitch({ mode, setMode }) {
  return (
    <ToggleButtonGroup exclusive size="small" value={mode} onChange={(e, v) => v && setMode(v)}>
      <ToggleButton value="auto">Auto</ToggleButton>
      <ToggleButton value="custom">Custom</ToggleButton>
    </ToggleButtonGroup>
  );
}

function GgnhomeTab({ data, reload, notify }) {
  const s = data.ggnhome.settings;
  const [form, setForm] = useState(null);
  useEffect(() => {
    setForm({ mode: s.mode, dailyLimit: s.dailyLimit ?? s.effective.dailyLimit, hourlyLimit: s.hourlyLimit ?? s.effective.hourlyLimit, gapMinSec: s.gapMinSec ?? s.effective.gapMinSec, gapMaxSec: s.gapMaxSec ?? s.effective.gapMaxSec });
  }, [s.mode, s.dailyLimit, s.hourlyLimit, s.gapMinSec, s.gapMaxSec, s.effective]);
  if (!form) return null;
  const save = async () => {
    try {
      await api("/ggnhome/settings", { method: "PUT", body: JSON.stringify(form) });
      notify("GGN Home limits saved", "success");
      reload();
    } catch (e) {
      notify(e.message, "error");
    }
  };
  const eff = s.effective;
  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">Login OTPs for the ggnHome website and app are sent from these phones, straight away at any hour.</Typography>
      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography fontWeight={600}>Limits</Typography>
            <ModeSwitch mode={form.mode} setMode={(mode) => setForm({ ...form, mode })} />
            {data.ggnhome.pending > 0 && <Chip size="small" color="warning" label={`${data.ggnhome.pending} waiting to be sent`} />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {form.mode === "auto"
              ? `Auto uses the safe defaults: ${eff.dailyLimit}/day, ${eff.hourlyLimit}/hour, ${eff.gapMinSec}–${eff.gapMaxSec} s between SMS.`
              : `Custom values are capped at ${s.hardCaps.daily}/day and ${s.hardCaps.hourly}/hour.`}
          </Typography>
          <LimitFields form={form} setForm={setForm} disabled={form.mode === "auto"} />
          <Box>
            <Button variant="contained" onClick={save}>
              Save
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

// --------------------------------------------------------------- Shine One ----

function ShineTab({ data, reload, notify }) {
  const sh = data.shine;
  const settings = sh && sh.ok ? sh.settings : null;
  const [form, setForm] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [askNew, setAskNew] = useState(null);

  useEffect(() => {
    if (!settings) return;
    const e = settings.effective;
    setForm({
      mode: settings.mode,
      paused: !!settings.paused,
      dailyLimit: settings.mode === "custom" ? settings.dailyLimit : e.dailyLimit,
      hourlyLimit: settings.mode === "custom" ? settings.hourlyLimit : e.hourlyLimit,
      gapMinSec: settings.mode === "custom" ? settings.gapMinSec : e.gapMinSec,
      gapMaxSec: settings.mode === "custom" ? settings.gapMaxSec : e.gapMaxSec,
      lunchQuota: settings.mode === "custom" ? settings.lunchQuota : e.lunchQuota,
      lunchStart: e.lunchStart,
      lunchEnd: e.lunchEnd,
      nightStart: e.nightStart,
      nightEnd: e.nightEnd,
      days: e.days,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings && settings.updatedAt]);

  if (!sh) return null;
  if (!sh.ok) return <Alert severity="error">The Shine One server did not answer: {sh.error}. It may be waking up — try again in a minute.</Alert>;
  if (!form) return <CircularProgress />;

  const save = async (override) => {
    try {
      await api("/shine/settings", { method: "PUT", body: JSON.stringify({ ...form, ...override }) });
      notify("Shine One settings saved", "success");
      reload();
    } catch (e) {
      notify(e.message, "error");
    }
  };
  const toggleDay = (d) => setForm({ ...form, days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d].sort() });
  const time = (key, label) => (
    <TextField size="small" type="time" label={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
  );

  const saveSheet = async (sheet, body) => {
    try {
      await api("/shine/sheets", { method: "PUT", body: JSON.stringify({ sheet, ...body }) });
      setDrafts((d) => {
        const { [sheet]: _gone, ...rest } = d;
        return rest;
      });
      notify(body.auto === undefined ? "Message saved" : body.auto ? "Auto-send is on" : "Auto-send is off", "success");
      reload();
    } catch (e) {
      notify(e.message, "error");
    }
  };
  const eff = settings.effective;

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography fontWeight={600}>When to send</Typography>
            <FormControlLabel control={<Switch checked={form.paused} onChange={(e) => setForm({ ...form, paused: e.target.checked })} />} label={form.paused ? "Paused (nothing is sent)" : "Running"} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            The lunch batch goes out in the lunch window; the rest of the day's limit goes out at night. Times are India time.
          </Typography>
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center">
            <Typography sx={{ width: 60 }}>Lunch</Typography>
            {time("lunchStart", "From")}
            {time("lunchEnd", "To")}
            <Typography sx={{ width: 60, ml: 2 }}>Night</Typography>
            {time("nightStart", "From")}
            {time("nightEnd", "To")}
          </Stack>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography sx={{ mr: 1 }}>Days</Typography>
            {DAYS.map((d, i) => (
              <FormControlLabel key={d} control={<Checkbox size="small" checked={form.days.includes(i)} onChange={() => toggleDay(i)} />} label={d} />
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography fontWeight={600}>Limits</Typography>
            <ModeSwitch mode={form.mode} setMode={(mode) => setForm({ ...form, mode })} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {form.mode === "auto"
              ? `Auto uses the safe defaults: ${eff.dailyLimit}/day, ${eff.hourlyLimit}/hour, ${eff.lunchQuota} in the lunch window, ${eff.gapMinSec}–${eff.gapMaxSec} s between SMS.`
              : `Custom values are capped at ${settings.hardCaps.daily}/day and ${settings.hardCaps.hourly}/hour. Limits apply to each phone.`}
          </Typography>
          <LimitFields form={form} setForm={setForm} disabled={form.mode === "auto"} withQuota />
        </Stack>
      </Paper>
      <Box>
        <Button variant="contained" onClick={() => save()}>
          Save times and limits
        </Button>
      </Box>

      <Typography variant="h6">Sheets</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
        Write the message for a sheet and switch Auto-send on. It texts one lead at a time, within the times and limits above, until the sheet is done — even if that takes days. Use {"{name}"} for the lead's name.
      </Typography>
      {sh.sheets.length === 0 && <Alert severity="info">No lead sheets yet.</Alert>}
      {sh.sheets.map((s) => {
        const draft = drafts[s.sheet] ?? s.text;
        const dirty = draft !== s.text;
        const done = s.sent + s.failed + s.invalid;
        return (
          <Paper key={s.sheet} sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={600} sx={{ flexGrow: 1 }}>
                  {s.sheet}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={s.auto}
                      onChange={(e) => {
                        if (!e.target.checked) return saveSheet(s.sheet, { auto: false });
                        if (!draft.trim()) return notify("Write the message first", "warning");
                        setAskNew({ sheet: s.sheet, text: draft, hasOld: s.remaining > 0 });
                      }}
                    />
                  }
                  label="Auto-send"
                />
              </Stack>
              <LinearProgress variant="determinate" value={s.total ? Math.min(100, (done / s.total) * 100) : 0} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" color="success" label={`Sent ${s.sent}`} />
                <Chip size="small" label={`Remaining ${s.remaining}`} />
                {s.failed > 0 && <Chip size="small" color="error" label={`Failed ${s.failed}`} />}
                {s.invalid > 0 && <Chip size="small" color="warning" label={`Bad number ${s.invalid}`} />}
                {s.auto && s.etaDays != null && <Chip size="small" color="info" label={`About ${s.etaDays} day${s.etaDays === 1 ? "" : "s"} left`} />}
                {s.onlyNewSince && <Chip size="small" variant="outlined" label={`New leads since ${fmt(s.onlyNewSince)}`} />}
              </Stack>
              <TextField
                multiline
                minRows={2}
                fullWidth
                label="Message"
                value={draft}
                inputProps={{ maxLength: 600 }}
                helperText={`${draft.length}/600 · {name} becomes the lead's name`}
                onChange={(e) => setDrafts({ ...drafts, [s.sheet]: e.target.value })}
              />
              {dirty && (
                <Box>
                  <Button size="small" variant="outlined" onClick={() => saveSheet(s.sheet, { text: draft })}>
                    Save message
                  </Button>
                </Box>
              )}
            </Stack>
          </Paper>
        );
      })}

      <Dialog open={!!askNew} onClose={() => setAskNew(null)}>
        <DialogTitle>Switch on Auto-send for {askNew && askNew.sheet}?</DialogTitle>
        <DialogContent>
          <Typography>
            {askNew && askNew.hasOld
              ? "This sheet has leads that have not been texted yet. Text all of them, or only leads that arrive from now on?"
              : "Leads added to this sheet from now on will be texted."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAskNew(null)}>Cancel</Button>
          {askNew && askNew.hasOld && (
            <Button
              onClick={() => {
                const a = askNew;
                setAskNew(null);
                saveSheet(a.sheet, { text: a.text, auto: true, onlyNew: true });
              }}
            >
              Only new leads
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => {
              const a = askNew;
              setAskNew(null);
              saveSheet(a.sheet, { text: a.text, auto: true, onlyNew: false });
            }}
          >
            {askNew && askNew.hasOld ? "All unsent leads" : "Switch on"}
          </Button>
        </DialogActions>
      </Dialog>
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
        {data && tab === 2 && <ShineTab data={data} reload={reload} notify={notify} />}
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
