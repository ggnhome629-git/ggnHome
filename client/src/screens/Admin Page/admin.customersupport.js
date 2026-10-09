import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Grid, Typography, TextField, InputAdornment, Avatar, Chip, IconButton, Skeleton, Stack, Alert } from "@mui/material";
import { Search, RefreshCw, Phone, CheckCircle, Calendar, ArrowUpRight } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "./shell/adminUi";
import { useNavigate } from "react-router-dom";
import "./admin.css";

const STATUS_COLORS = {
  pending: "#F59E0B",
  "in-progress": "#2196F3",
  resolved: "#10B981",
};

export default function CallbackRequestsDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [status, setStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    fetchCallbackRequests();
  }, [status, dateRange, sortBy, order, page]);

  const fetchCallbackRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (searchTerm) params.append("search", searchTerm);
      if (dateRange) params.append("dateRange", dateRange);
      if (sortBy) params.append("sortBy", sortBy);
      if (order) params.append("order", order);
      params.append("page", String(page));
      params.append("limit", String(limit));

      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.REACT_APP_ADMIN_CALLBACK_REQUESTS_API}?${params}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch callback requests");
      const data = await res.json();
      setRequests(data.data || []);
      setMetadata(data.metadata || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const formatDateTime = (d) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const total = metadata?.totalRequests ?? 0;
  const pending = metadata?.pendingCount ?? 0;
  const inProgress = metadata?.inProgressCount ?? 0;
  const resolved = metadata?.resolvedCount ?? 0;

  const tabs = [
    { key: "", label: `All (${total})` },
    { key: "pending", label: `Pending (${pending})` },
    { key: "in-progress", label: `In Progress (${inProgress})` },
    { key: "resolved", label: `Resolved (${resolved})` },
  ];

  return (
    <>
      <PageHeader
        title="Callback Requests"
        description="Manage and track all customer callback requests"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={() => { setPage(1); fetchCallbackRequests(); }}
          >
            Refresh
          </Button>
        }
        tabs={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {tabs.map((t) => (
              <Button
                key={t.key}
                size="small"
                variant={status === t.key ? "contained" : "outlined"}
                color={status === t.key ? "primary" : "inherit"}
                onClick={() => { setStatus(t.key); setPage(1); }}
                sx={{ borderRadius: 2 }}
              >
                {t.label}
              </Button>
            ))}
          </Box>
        }
      />

      {/* Filters card */}
      <Card className="_admin-card" sx={{ mb: 4 }}>
        <CardContent sx={{ py: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "flex-end" }}>
            <TextField
              fullWidth
              placeholder="Search by name, phone, email, or issue…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} color="#5B6B7B" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 260 }}
            />
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ minWidth: 150 }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </TextField>
            <TextField
              select
              label="Sort by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ minWidth: 140 }}
            >
              <option value="createdAt">Date Created</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
            </TextField>
            <TextField
              select
              label="Order"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ minWidth: 130 }}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </TextField>
            <Button
              variant="outlined"
              onClick={() => { setPage(1); fetchCallbackRequests(); }}
              startIcon={<RefreshCw size={16} />}
              sx={{ minWidth: 120 }}
            >
              Apply Filters
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: "Total Requests", value: total, color: "primary.main", icon: Phone },
          { label: "Pending", value: pending, color: "#F59E0B", icon: ClockIcon },
          { label: "In Progress", value: inProgress, color: "#2196F3", icon: RefreshCw },
          { label: "Resolved", value: resolved, color: "#10B981", icon: CheckCircle },
        ].map((s, i) => (
          <Grid size={{ xs: 6, sm: 3 }} key={i}>
            <StatCard
              icon={s.icon}
              label={s.label}
              value={s.value}
              tone={s.color}
            />
          </Grid>
        ))}
      </Grid>

      {/* Loading */}
      {loading && requests.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Stack direction="row" justifyContent="center" spacing={2}>
            <Skeleton variant="circular" width={24} height={24} />
            <Typography variant="body1" color="text.secondary">
              Loading callback requests…
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Error */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Empty */}
      {!loading && requests.length === 0 && (
        <EmptyState
          icon={ArrowUpRight}
          title="No callback requests found"
          description={
            searchTerm
              ? "Try a different search term or clear the filters."
              : "Callback requests from customers will appear here."
          }
          action={
            searchTerm ? (
              <Button variant="outlined" onClick={() => { setSearchTerm(""); setStatus(""); }}>
                Clear filters
              </Button>
            ) : null
          }
        />
      )}

      {/* Request list */}
      {!loading && requests.length > 0 && (
        <Box className="admin-scroll">
          {requests.map((req) => {
            const isExpanded = expandedId === req._id;
            const statusColor = STATUS_COLORS[req.status] ?? "#64748B";
            return (
              <Card
                key={req._id}
                className="admin-card"
                sx={{
                  mb: 2,
                  border: isExpanded ? "2px solid #22D3EE" : "1px solid #E5E9EE",
                  boxShadow: isExpanded
                    ? "0 8px 24px rgba(34,211,238,0.18)"
                    : "0 2px 8px rgba(0,51,102,0.05)",
                  transition: "box-shadow .15s ease, border-color .15s ease",
                }}
              >
                {/* Collapsed row */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2.5,
                    cursor: "pointer",
                    bgcolor: "action.hover",
                    transition: "background-color .15s ease",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                  onClick={() => toggleExpand(req._id)}
                >
                  <Avatar
                    sx={{
                      width: 44, height: 44,
                      bgcolor: "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
                      fontSize: "0.95rem", fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {req.name ? req.name.charAt(0).toUpperCase() : "U"}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                      <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: "primary.main", fontSize: "1rem" }}>
                        {req.name || "Unknown"}
                      </Typography>
                      <Chip
                        label={req.userRole || "Unknown"}
                        size="small"
                        sx={{
                          height: 20, fontSize: "0.7rem", fontWeight: 700,
                          bgcolor: "rgba(0,51,102,0.08)", color: "primary.main",
                        }}
                      />
                      <Chip
                        label={req.status || "pending"}
                        size="small"
                        sx={{
                          height: 20, fontSize: "0.7rem", fontWeight: 700,
                          bgcolor: `${statusColor}1A`,
                          color: statusColor,
                          "& .MuiChip-dot": { bgcolor: statusColor },
                        }}
                      />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                      <Phone size={13} color="#9AA7B4" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {req.phone || "No phone"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(req.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {req.updatedAt ? `Updated ${formatDateTime(req.updatedAt)}` : ""}
                    </Typography>
                  </Box>
                  <IconButton size="small" sx={{ color: "text.secondary" }}>
                    {isExpanded ? <ExpandIconOpen size={18} /> : <ExpandIconClosed size={18} />}
                  </IconButton>
                </Box>

                {/* Expanded details */}
                {isExpanded && (
                  <Box sx={{ px: 3, pb: 3, pt: 0, borderTop: "1px solid #E5E9EE" }}>
                    <Grid container spacing={2} sx={{ mt: 3 }}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box className="admin-info-row">
                          <Box className="admin-info-label">
                            <User size={13} /> Full Name
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {req.name || "N/A"}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box className="admin-info-row">
                          <Box className="admin-info-label">
                            <Phone size={13} /> Phone Number
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {req.phone || "N/A"}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box className="admin-info-row">
                          <Box className="admin-info-label">
                            <MailIcon size={13} /> Email Address
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {req.email || "N/A"}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box className="admin-info-row">
                          <Box className="admin-info-label">
                            <Calendar size={13} /> Created At
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatDateTime(req.createdAt)}
                          </Typography>
                        </Box>
                      </Grid>
                      {req.updatedAt && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Box className="admin-info-row">
                            <Box className="admin-info-label">
                              <Calendar size={13} /> Last Updated
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatDateTime(req.updatedAt)}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>

                    {req.issue && (
                      <Box
                        sx={{
                          mt: 3, p: 2.5,
                          bgcolor: "rgba(245,158,11,0.08)",
                          border: "1px solid #F59E0B",
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#B45309", fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.05em",
                            display: "flex", alignItems: "center", gap: 1, mb: 1,
                          }}
                        >
                          <MessageSquare size={13} /> Issue / Message
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#1B2B3A", lineHeight: 1.6 }}>
                          {req.issue}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Card>
            );
          })}

          {/* Pagination */}
          {metadata && metadata.totalPages > 1 && (
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center", alignItems: "center", gap: 2 }}>
              <Button
                size="small"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                sx={{
                  minWidth: 80,
                  bgcolor: page === 1 ? "action.hover" : "primary.main",
                  color: page === 1 ? "text.secondary" : "white",
                  borderRadius: 2,
                }}
              >
                Previous
              </Button>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", minWidth: 100, textAlign: "center" }}>
                Page {metadata.page} of {metadata.totalPages}
              </Typography>
              <Button
                size="small"
                onClick={() => setPage((p) => Math.min(metadata.totalPages, p + 1))}
                disabled={page === metadata.totalPages}
                sx={{
                  minWidth: 80,
                  bgcolor: page === metadata.totalPages ? "action.hover" : "primary.main",
                  color: page === metadata.totalPages ? "text.secondary" : "white",
                  borderRadius: 2,
                }}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      )}
    </>
  );
}

/* ---- 아이콘 헬퍼 (lucide 미수입 대체) ---- */
function ClockIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function ExpandIconOpen({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#5B6B7B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}
function ExpandIconClosed({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#5B6B7B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function MailIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    </svg>
  );
}
function MessageSquare({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function User({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
