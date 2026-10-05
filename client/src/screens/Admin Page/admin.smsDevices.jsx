import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Admin → SMS phones. Every phone running the ggnhome-sms-service app shows up
 * here. New OTPs are handed to a randomly chosen phone that is online, enabled
 * and under its daily limit, so no single SIM carries all the traffic.
 */
const BASE = process.env.REACT_APP_Base_API;

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", headers: authHeaders(), ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

const STATUS_COLOR = { sent: "success", failed: "error", queued: "warning", sending: "info", expired: "default" };

const ago = (iso) => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

export default function AdminSmsDevices() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [testNumber, setTestNumber] = useState("");
  const [testMsg, setTestMsg] = useState(null);
  const [log, setLog] = useState([]);

  const load = useCallback(async () => {
    try {
      const [devices, logRes] = await Promise.all([api("/api/admin/sms-devices"), api("/api/admin/sms-log?limit=100")]);
      setData(devices);
      setLog(logRes.rows || []);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const toggle = async (d) => {
    try {
      await api(`/api/admin/sms-devices/${d.deviceId}`, { method: "PATCH", body: JSON.stringify({ enabled: !d.enabled }) });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Remove "${d.name}"? It re-registers itself if the app is still running.`)) return;
    try {
      await api(`/api/admin/sms-devices/${d.deviceId}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const sendTest = async (e) => {
    e.preventDefault();
    setTestMsg(null);
    try {
      const r = await api("/api/admin/sms-devices/test", { method: "POST", body: JSON.stringify({ phoneNumber: testNumber }) });
      setTestMsg({ severity: "success", text: r.message });
      load();
    } catch (err) {
      setTestMsg({ severity: "error", text: err.message });
    }
  };

  const devices = data?.devices || [];
  const onlineCount = devices.filter((d) => d.online && d.enabled).length;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F4F7F9", p: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Box component="img" src="/Logo2.jpg" alt="ggnHome" sx={{ width: 48, height: 48, borderRadius: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#003366" }}>
            SMS phones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ggnhome-sms-service · OTPs are sent from a random online phone
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate("/admin/Landingpage")}>
          Back
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Phones online
          </Typography>
          <Typography variant="h4">
            {onlineCount} / {devices.length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Waiting in queue
          </Typography>
          <Typography variant="h4">{data?.pending ?? "—"}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Daily limit per phone
          </Typography>
          <Typography variant="h4">{data?.dailyLimit ?? "—"}</Typography>
        </Paper>
      </Stack>

      {data && onlineCount === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No phone is online. OTPs will be emailed as a backup (where an email is on file) until one connects.
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Sent today</TableCell>
              <TableCell align="right">Sent total</TableCell>
              <TableCell align="right">Failed</TableCell>
              <TableCell>Last seen</TableCell>
              <TableCell>Enabled</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No phones yet. Install the ggnhome-sms-service app and tap “Start service”.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {devices.map((d) => (
              <TableRow key={d.deviceId}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {d.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {d.deviceId.slice(0, 8)} · v{d.appVersion || "?"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={!d.enabled ? "Disabled" : !d.online ? "Offline" : d.ready ? "Online" : "Cooling down"}
                    color={!d.enabled ? "default" : !d.online ? "warning" : d.ready ? "success" : "info"}
                  />
                </TableCell>
                <TableCell align="right">
                  {d.sentToday} / {data.dailyLimit}
                </TableCell>
                <TableCell align="right">{d.sentTotal}</TableCell>
                <TableCell align="right">
                  <Tooltip title={d.lastError || ""}>
                    <span>{d.failedTotal}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>{ago(d.lastSeen)}</TableCell>
                <TableCell>
                  <Switch checked={d.enabled} onChange={() => toggle(d)} />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => remove(d)} aria-label="Remove phone">
                    <Trash2 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Recent messages (last 100, kept 30 days)
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 420 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Queued at</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sent by</TableCell>
              <TableCell>Sent at</TableCell>
              <TableCell>Delivered to phone?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {log.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    No messages yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {log.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{fmtTime(m.createdAt)}</TableCell>
                <TableCell>{m.phoneNumber}</TableCell>
                <TableCell>{m.kind === "otp" ? "Login OTP" : "Test"}</TableCell>
                <TableCell>
                  <Tooltip title={m.error || ""}>
                    <Chip size="small" label={m.status} color={STATUS_COLOR[m.status] || "default"} />
                  </Tooltip>
                </TableCell>
                <TableCell>{m.deviceName || "—"}</TableCell>
                <TableCell>{fmtTime(m.sentAt)}</TableCell>
                <TableCell>
                  {m.delivery === "delivered" ? (
                    <Chip size="small" color="success" label="Delivered" />
                  ) : m.delivery === "undelivered" ? (
                    <Tooltip title={m.deliveryDetail || ""}>
                      <Chip size="small" color="error" label="Not delivered" />
                    </Tooltip>
                  ) : m.status === "sent" ? (
                    <Tooltip title="No delivery report from the carrier (yet). Some carriers never send one.">
                      <Chip size="small" variant="outlined" label="No report" />
                    </Tooltip>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper sx={{ p: 2, maxWidth: 480 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Send a test SMS
        </Typography>
        <Stack component="form" direction="row" spacing={1} onSubmit={sendTest}>
          <TextField
            size="small"
            label="Mobile number"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputProps={{ inputMode: "numeric" }}
            sx={{ flex: 1 }}
          />
          <Button type="submit" variant="contained" disabled={testNumber.length !== 10}>
            Send
          </Button>
        </Stack>
        {testMsg && (
          <Alert severity={testMsg.severity} sx={{ mt: 2 }}>
            {testMsg.text}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
