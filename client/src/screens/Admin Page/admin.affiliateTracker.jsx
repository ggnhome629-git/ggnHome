import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import { ExternalLink, TrendingUp, AlertCircle } from "lucide-react";
import { radii } from "../../theme/theme";

/**
 * Affiliate Tracker - Monitor all scraped properties from external portals
 * Shows: Portal source, listing ID, status, last checked, removal tracking
 */
export default function AffiliateTracker() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPortal, setFilterPortal] = useState("");

  // Simulate loading affiliate properties from backend
  useEffect(() => {
    const loadAffiliates = async () => {
      try {
        setLoading(true);
        // In production: const res = await fetch('/api/admin/affiliates');
        // For now, we'll show a placeholder
        setTimeout(() => {
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    loadAffiliates();
  }, []);

  const filteredData = properties.filter((prop) => {
    const matchesSearch =
      prop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.sourceListingId?.includes(searchTerm);
    const matchesPortal = !filterPortal || prop.sourcePortal === filterPortal;
    return matchesSearch && matchesPortal;
  });

  const stats = {
    total: properties.length,
    active: properties.filter((p) => p.sourceStatus === "active").length,
    inactive: properties.filter((p) => p.sourceStatus === "inactive").length,
    removed: properties.filter((p) => p.sourceStatus === "removed").length,
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 3, md: 4 }, bgcolor: "background.default" }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography variant="h4" sx={{ fontSize: "1.25rem", fontWeight: 700, color: "primary.main", mb: 1 }}>
            Affiliate Tracker
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Monitor all properties scraped from external portals (99acres, NoBroker, etc.)
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          {[
            { label: "Total", value: stats.total, color: "#003366" },
            { label: "Active", value: stats.active, color: "#10B981" },
            { label: "Inactive", value: stats.inactive, color: "#F59E0B" },
            { label: "Removed", value: stats.removed, color: "#EF4444" },
          ].map((stat) => (
            <Card key={stat.label} sx={{ flex: 1, borderRadius: `${radii.lg}px` }}>
              <CardContent>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {stat.label}
                </Typography>
                <Typography variant="h3" sx={{ fontSize: "1.75rem", color: stat.color, fontWeight: 700, mt: 1 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Filters */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            placeholder="Search by title or listing ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{ style: { fontSize: "0.9rem" } }}
          />
          <TextField
            select
            value={filterPortal}
            onChange={(e) => setFilterPortal(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
            SelectProps={{ native: true }}
          >
            <option value="">All Portals</option>
            <option value="99acres">99acres</option>
            <option value="nobroker">NoBroker</option>
          </TextField>
        </Stack>

        {/* No Data State */}
        {filteredData.length === 0 && (
          <Alert severity="info" sx={{ borderRadius: `${radii.lg}px` }}>
            No affiliate properties found. Start syncing from portals to populate this tracker.
          </Alert>
        )}

        {/* Table */}
        {filteredData.length > 0 && (
          <TableContainer component={Paper} sx={{ borderRadius: `${radii.lg}px`, bgcolor: "background.paper" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "rgba(0,51,102,0.04)" }}>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main", px: 2 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main", px: 2 }}>Portal</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main", px: 2 }}>Listing ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main", px: 2 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main", px: 2 }}>Last Checked</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "primary.main", px: 2 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((prop) => (
                  <TableRow key={prop.sourceListingId} sx={{ "&:hover": { backgroundColor: "rgba(0,167,157,0.04)" } }}>
                    <TableCell>{prop.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={prop.sourcePortal === "99acres" ? "99acres" : "NoBroker"}
                        size="small"
                        sx={{
                          backgroundColor: prop.sourcePortal === "99acres" ? "#22D3EE" : "#00A79D",
                          color: prop.sourcePortal === "99acres" ? "#003366" : "#fff",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{prop.sourceListingId}</TableCell>
                    <TableCell>
                      <Chip
                        label={prop.sourceStatus}
                        size="small"
                        sx={{
                          backgroundColor:
                            prop.sourceStatus === "active"
                              ? "rgba(16,185,129,0.12)"
                              : prop.sourceStatus === "inactive"
                                ? "rgba(245,158,11,0.12)"
                                : "rgba(239,68,68,0.12)",
                          color:
                            prop.sourceStatus === "active"
                              ? "#10B981"
                              : prop.sourceStatus === "inactive"
                                ? "#F59E0B"
                                : "#EF4444",
                          textTransform: "capitalize",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.85rem" }}>
                      {prop.sourceCheckedAt ? new Date(prop.sourceCheckedAt).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Box
                        component="a"
                        href={prop.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "#00A79D", textDecoration: "none", cursor: "pointer" }}
                      >
                        <ExternalLink size={14} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Info Box */}
        <Box sx={{ p: 3, backgroundColor: "rgba(34,211,238,0.08)", borderRadius: `${radii.lg}px`, borderLeft: "4px solid #22D3EE" }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <AlertCircle size={20} color="#22D3EE" style={{ flexShrink: 0, marginTop: "2px" }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
                Sync Status
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                Syncs run automatically every 6 hours. Properties marked as "removed" on the source portal are kept in history for 30 days.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
