import { API_BASE } from "../../../utils/apiBase";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Container, Paper, Skeleton, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import { RefreshCw, Users, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PartnerHubEnquiries() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, totalEnquiries: 0 });
  const limit = 10;

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("partnerAccessToken");
      if (!token) {
        navigate("/partner/login");
        return;
      }
      const response = await fetch(
        `${API_BASE}/api/partner/enquiries?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, credentials: "include" }
      );
      if (!response.ok) throw new Error("Could not load enquiries. Please refresh and try again.");
      const data = await response.json();
      setItems(data.enquiries || []);
      setMeta({ totalPages: data.totalPages || 1, totalEnquiries: data.totalEnquiries || 0 });
    } catch (err) {
      setError(err.message || "Could not load enquiries.");
    } finally {
      setLoading(false);
    }
  }, [navigate, page]);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN") : "—";
  const formatPrice = (value, type) => {
    if (value == null || value === "") return "—";
    const amount = Number(value).toLocaleString("en-IN");
    return type === "rental" ? `₹${amount}/mo` : `₹${amount}`;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>All Enquiries</Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
            All property enquiries received on ggnHome. Source platforms and source URLs are hidden in the partner view.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Users size={16} />} onClick={() => navigate("/partner/leads")} sx={{ textTransform: "none" }}>Preference Leads</Button>
          <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={fetchEnquiries} sx={{ textTransform: "none" }}>Refresh</Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <MessageSquare size={22} color="#0d9488" />
          <Box>
            <Typography variant="caption" color="text.secondary">Total enquiries</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{meta.totalEnquiries}</Typography>
          </Box>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              {["Customer", "Contact", "Property / Address", "Owner", "Type & Price", "Message", "Received"].map((label) => (
                <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)
              : items.length === 0
                ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No enquiries found.</Typography></TableCell></TableRow>
                : items.map((item) => (
                  <TableRow key={item._id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{item.customerName || item.user?.name || item.userName || "Customer"}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.userMobile || "—"}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.userEmail || "—"}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 190 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.property?.title || item.propertyAddress || "Property enquiry"}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.property?.Sector || item.propertyAddress || "Address not available"}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>{item.ownerName || "No owner of this property present."}</TableCell>
                    <TableCell>
                      <Stack alignItems="flex-start" spacing={0.75}>
                        <Chip size="small" label={item.propertyType === "rental" ? "Rent" : "Sale"} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatPrice(item.propertyPrice, item.propertyType)}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280, minWidth: 180 }}>{item.message || "No message"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(item.createdAt)}</TableCell>
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
