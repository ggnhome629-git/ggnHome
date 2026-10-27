import { API_BASE } from "../../../utils/apiBase";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Container, Paper, Skeleton, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import { RefreshCw, Search, Users, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PartnerAiLeads from "./PartnerAiLeads";

export default function PartnerHubLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [searches, setSearches] = useState([]);
  const [searchMeta, setSearchMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const limit = 20;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("partnerAccessToken");
      if (!token) {
        navigate("/partner/login");
        return;
      }
      const response = await fetch(
        `${API_BASE}/api/partner/leads/preferences?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, credentials: "include" }
      );
      if (!response.ok) throw new Error("Could not load preference leads. Please refresh and try again.");
      const payload = await response.json();
      setLeads(payload.data || []);
      setMeta({ total: payload.meta?.total || 0, totalPages: payload.meta?.totalPages || 1 });

      const searchResponse = await fetch(
        `${API_BASE}/api/partner/leads/searches?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, credentials: "include" }
      );
      if (!searchResponse.ok) throw new Error("Could not load AI Assistant search leads.");
      const searchPayload = await searchResponse.json();
      setSearches(searchPayload.data || []);
      setSearchMeta({ total: searchPayload.meta?.total || 0 });
    } catch (err) {
      setError(err.message || "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }, [navigate, page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>Leads</Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
            AI Assistant property search and customer requirements submitted through the User Preference Form.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="contained" startIcon={<Search size={16} />} onClick={() => navigate("/AIassistant")} sx={{ textTransform: "none" }}>
            Open AI Assistant
          </Button>
          <Button variant="outlined" startIcon={<MessageSquare size={16} />} onClick={() => navigate("/partner/enquiries")} sx={{ textTransform: "none" }}>
            All Enquiries
          </Button>
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={fetchLeads} sx={{ textTransform: "none" }}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <PartnerAiLeads />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2, mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Search size={22} color="#0d9488" />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>AI Assistant Search</Typography>
              <Typography variant="body2" color="text.secondary">Open the property-search assistant to explore buyer and tenant requirements.</Typography>
            </Box>
          </Stack>
          <Button onClick={() => navigate("/AIassistant")} sx={{ mt: 1.5, textTransform: "none" }}>Launch search assistant</Button>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Users size={22} color="#2563eb" />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>User Preference Form Leads</Typography>
              <Typography variant="body2" color="text.secondary">Customer-submitted location, budget, BHK and move-in requirements.</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{meta.total}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>AI Assistant Search Leads ({searchMeta.total})</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              {["Search query", "Customer", "Contact", "Searched on"].map((label) => (
                <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 4 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)
              : searches.length === 0
                ? <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No AI Assistant searches recorded yet.</Typography></TableCell></TableRow>
                : searches.map((item) => (
                  <TableRow key={item._id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{item.query || "—"}</TableCell>
                    <TableCell>{item.user?.name || "Guest / unavailable"}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.user?.mobileNumber || "—"}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.user?.email || ""}</Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "—"}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>User Preference Form Leads ({meta.total})</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              {["Customer", "Mobile", "Preferred Location", "Budget", "BHK / Type", "Furnishing", "Move-in", "Status", "Submitted"].map((label) => (
                <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 9 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)
              : leads.length === 0
                ? <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No preference-form leads found.</Typography></TableCell></TableRow>
                : leads.map((lead) => (
                  <TableRow key={lead._id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{lead.userName || "Customer"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{lead.mobileNumber || "—"}</TableCell>
                    <TableCell>{lead.preferredLocation || "—"}</TableCell>
                    <TableCell>{lead.budgetRange || "—"}</TableCell>
                    <TableCell>{[lead.bhkSize, lead.propertyType].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell>{lead.furnishingLevel || "—"}</TableCell>
                    <TableCell>{lead.moveInDate || "Flexible / not set"}</TableCell>
                    <TableCell><Chip size="small" label={lead.status || "ACTIVE"} color={lead.status === "INACTIVE" ? "default" : "success"} /></TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "—"}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">Page {page} of {meta.totalPages}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="outlined" disabled={page >= meta.totalPages || loading} onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}>Next</Button>
        </Stack>
      </Stack>
    </Container>
  );
}
