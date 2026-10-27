import { API_BASE } from "../../utils/apiBase";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Divider,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Chip,
} from "@mui/material";
import { CheckCircle2, Phone, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";

const API = API_BASE || "";
const authHeaders = () => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) };
};

export default function AdminPartnerAccess() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(API + "/api/admin/partners/access", {
        headers: authHeaders(), credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not load Partner access.");
      setPartners(data.partners || []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load Partner access.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  async function submit(e) {
    e.preventDefault();
    setError(""); setNotice("");
    const mobile = mobileNumber.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(API + "/api/admin/partners/access", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ mobileNumber: mobile }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not register Partner access.");
      setMobileNumber("");
      setNotice("Partner access registered. The partner must verify this number by OTP before signing in.");
      await loadPartners();
    } catch (e2) {
      setError(e2.message || "Could not register Partner access.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto" }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ width: 52, height: 52, display: "grid", placeItems: "center", bgcolor: "#e4f5f0", color: "#0f766e", borderRadius: 3 }}>
            <ShieldCheck size={26} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 850, color: "#102a43", fontSize: { xs: 24, md: 30 } }}>Partner access</Typography>
            <Typography color="text.secondary" sx={{ mt: .5 }}>Only admins can register a mobile number for Partner Portal access.</Typography>
          </Box>
          <Button onClick={loadPartners} disabled={loading} startIcon={<RefreshCw size={16} />} sx={{ textTransform: "none" }}>Refresh</Button>
        </Stack>

        <Alert severity="info" icon={<ShieldCheck size={20} />}>
          Adding a number does not log the person in or bypass verification. The partner must request and verify an OTP sent to that mobile number. Self-registration is disabled.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
        {notice && <Alert severity="success" icon={<CheckCircle2 size={20} />}>{notice}</Alert>}

        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "#dce7ed" }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: "#102a43" }}>Register a partner mobile number</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: .5, mb: 2.5 }}>The mobile number is stored in the database as a Partner access record. No password is created.</Typography>
            <Box component="form" onSubmit={submit}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }}>
                <TextField
                  fullWidth
                  label="Indian mobile number"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  inputProps={{ inputMode: "numeric", maxLength: 10, autoComplete: "tel-national" }}
                  helperText="Only numbers beginning with 6, 7, 8 or 9 are accepted."
                  disabled={saving}
                />
                <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <UserPlus size={17} />} sx={{ minHeight: 56, px: 3, whiteSpace: "nowrap", bgcolor: "#0f766e" }}>
                  {saving ? "Registering…" : "Register Partner"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "#dce7ed", overflow: "hidden" }}>
          <CardContent sx={{ p: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 850, color: "#102a43" }}>Registered partners</Typography>
                <Typography variant="body2" color="text.secondary">{partners.length} recent access records (maximum 200)</Typography>
              </Box>
              <Chip label="Admin managed" size="small" sx={{ bgcolor: "#e4f5f0", color: "#0f766e", fontWeight: 800 }} />
            </Stack>
            <Divider />
            {loading ? (
              <Box sx={{ p: 5, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
            ) : partners.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Phone size={26} color="#94a3b8" />
                <Typography sx={{ mt: 1, fontWeight: 750 }}>No Partner access records yet</Typography>
                <Typography variant="body2" color="text.secondary">Register a mobile number above to grant Partner Portal access.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ minWidth: 520 }}>
                  <TableHead><TableRow>
                    <TableCell>Mobile number</TableCell><TableCell>Partner code</TableCell><TableCell>Status</TableCell><TableCell>Registered</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {partners.map(p => <TableRow key={p._id} hover>
                      <TableCell sx={{ fontWeight: 750 }}>{p.mobileNumber}</TableCell>
                      <TableCell>{p.agentCode || "—"}</TableCell>
                      <TableCell><Chip size="small" label={p.status || "unknown"} color={p.status === "active" ? "success" : p.status === "suspended" ? "error" : "default"} /></TableCell>
                      <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—"}</TableCell>
                    </TableRow>)}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
