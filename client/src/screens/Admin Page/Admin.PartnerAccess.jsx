import { API_BASE } from "../../utils/apiBase";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Divider,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Chip,
} from "@mui/material";
import { Phone, RefreshCw, ShieldCheck } from "lucide-react";

const API = API_BASE || "";
const authHeaders = () => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) };
};

export default function AdminPartnerAccess() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto" }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ width: 52, height: 52, display: "grid", placeItems: "center", bgcolor: "#e4f5f0", color: "#0f766e", borderRadius: 3 }}>
            <ShieldCheck size={26} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 850, color: "#102a43", fontSize: { xs: 24, md: 30 } }}>Partner access</Typography>
            <Typography color="text.secondary" sx={{ mt: .5 }}>Partners sign in with mobile number and OTP. No registration needed.</Typography>
          </Box>
          <Button onClick={loadPartners} disabled={loading} startIcon={<RefreshCw size={16} />} sx={{ textTransform: "none" }}>Refresh</Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

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
                <Typography sx={{ mt: 1, fontWeight: 750 }}>No partners yet</Typography>
                <Typography variant="body2" color="text.secondary">Partners appear here after their first OTP sign-in.</Typography>
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
