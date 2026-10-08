import React, { useState, useEffect } from "react";
import { Box, Button, Card, Grid, Typography, Chip, IconButton, Skeleton, Stack, Alert } from "@mui/material";
import { RefreshCw, Mail, Phone, MapPin, Home, Eye, Trash2, Calendar, DollarSign } from "lucide-react";
import { PageHeader, StatCard, ConfirmDialog, EmptyState } from "./shell/adminUi";
import { useNavigate } from "react-router-dom";
import "./admin.css";

export default function AdminEnquiryProperties() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEnquiries, setTotalEnquiries] = useState(0);
  const pageSize = 10;

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEnquiries = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.REACT_APP_Base_API}/api/enquiry?page=${page}&limit=${pageSize}`,
        {
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) throw new Error(`Error fetching enquiries: ${res.statusText}`);
      const data = await res.json();
      setEnquiries(data.enquiries || []);
      setTotalEnquiries(data.totalEnquiries || (Array.isArray(data.enquiries) ? data.enquiries.length : 0));
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries(currentPage);
  }, [currentPage]);

  // Stats (computed client-side from current page — matches original behaviour)
  const total = totalEnquiries;
  const thisMonth = enquiries.filter((e) => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const today = enquiries.filter((e) => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const deleteEnquiry = async (id) => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.REACT_APP_Base_API}/admin/api/deleteenquiry/${id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || `Error deleting enquiry: ${res.statusText}`);
      setEnquiries((prev) => prev.filter((enq) => enq._id !== id));
      setTotalEnquiries((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(`Failed to delete enquiry: ${err.message}`);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const goToProperty = (propertyId, type) => {
    if (type === "rental") navigate(`/Rentaldetails/${propertyId}`);
    else if (type === "sale") navigate(`/Saledetails/${propertyId}`);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString();
  const formatTime = (d) => new Date(d).toLocaleTimeString();

  return (
    <>
      <PageHeader
        title="Property Enquiries"
        description="Manage and track all customer enquiries"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={() => fetchEnquiries(currentPage)}
          >
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <StatCard icon={Home} label="Total Enquiries" value={total} tone="#003366" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard icon={Calendar} label="This Month" value={thisMonth} tone="#00A79D" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard icon={Eye} label="Today" value={today} tone="#22D3EE" />
        </Grid>
      </Grid>

      {/* Loading / error / empty */}
      {loading && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mx: "auto", mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Loading enquiries…</Typography>
        </Box>
      )}

      {error && !loading && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {!loading && enquiries.length === 0 && (
        <EmptyState
          icon={Mail}
          title="No enquiries yet"
          description="When customers submit enquiries, they will appear here."
        />
      )}

      {/* Table */}
      {!loading && enquiries.length > 0 && (
        <Card className="admin-card" sx={{ overflow: "hidden" }}>
          {/* Pagination info */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2, flexWrap: "wrap", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing page {currentPage} of {totalPages} — {totalEnquiries} enquiries total
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                sx={{
                  minWidth: 80, borderRadius: 2,
                  bgcolor: currentPage <= 1 ? "action.hover" : "primary.main",
                  color: currentPage <= 1 ? "text.secondary" : "white",
                }}
              >
                Previous
              </Button>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "primary.main", minWidth: 100, textAlign: "center" }}
              >
                Page {currentPage} of {totalPages}
              </Typography>
              <Button
                size="small"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                sx={{
                  minWidth: 80, borderRadius: 2,
                  bgcolor: currentPage >= totalPages ? "action.hover" : "primary.main",
                  color: currentPage >= totalPages ? "text.secondary" : "white",
                }}
              >
                Next
              </Button>
            </Stack>
          </Box>

          <Box className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Source</th>
                  <th>Owner</th>
                  <th>Customer</th>
                  <th>Message</th>
                  <th>Date &amp; Time</th>
                  <th className="admin-table-align-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry._id} className="admin-table-row">
                    <td>
                      <Box className="admin-flex admin-gap-2 admin-mb-2">
                        <MapPin size={15} color="#94a3b8" />
                        <Typography className="admin-font-semibold">
                          {enquiry.propertyAddress || "N/A"}
                        </Typography>
                      </Box>
                      <Box className="admin-flex admin-gap-2 admin-text-secondary">
                        <Home size={13} />
                        <Typography variant="body2">{enquiry.propertyType || "N/A"}</Typography>
                      </Box>
                      <Typography sx={{ color: "success.main", fontWeight: 700, mt: 0.5 }}>
                        <DollarSign size={13} style={{ marginRight: 4 }} />
                        {enquiry.propertyPrice ? enquiry.propertyPrice.toLocaleString() : "N/A"}
                      </Typography>
                    </td>
                    <td>
                      {enquiry.property?.sourcePortal ? (
                        <Chip size="small" label={`Scraped · ${enquiry.property.sourcePortal === "nobroker" ? "NoBroker" : "99acres"}`} sx={{ bgcolor: "rgba(245,158,11,0.15)", color: "#B45309", fontWeight: 700 }} />
                      ) : (
                        <Chip size="small" label={enquiry.property?.ownerType === "Agent" ? "Agent property" : "Normal · Owner property"} sx={{ bgcolor: "rgba(0,167,157,0.14)", color: "#00857D", fontWeight: 700 }} />
                      )}
                    </td>
                    <td>
                      {enquiry.owner ? (
                        <>
                          <Box className="admin-flex admin-gap-2 admin-mb-1">
                            <Mail size={13} color="#94a3b8" />
                            <Typography variant="body2">{enquiry.owner.email || "N/A"}</Typography>
                          </Box>
                          <Box className="admin-flex admin-gap-2">
                            <Phone size={13} color="#94a3b8" />
                            <Typography variant="body2">{enquiry.owner.mobileNumber || "N/A"}</Typography>
                          </Box>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.disabled" style={{ fontStyle: "italic" }}>
                          {enquiry.property?.sourcePortal ? "Scraped – admin only" : "No owner found"}
                        </Typography>
                      )}
                    </td>
                    <td>
                      <Box className="admin-flex admin-gap-2 admin-mb-1">
                        <Mail size={13} color="#94a3b8" />
                        <Typography variant="body2">{enquiry.userEmail || "N/A"}</Typography>
                      </Box>
                      <Box className="admin-flex admin-gap-2">
                        <Phone size={13} color="#94a3b8" />
                        <Typography variant="body2">{enquiry.userMobile || "N/A"}</Typography>
                      </Box>
                    </td>
                    <td>
                      <Box
                        className="admin-msg-box"
                        sx={{ maxHeight: 72, overflow: "auto" }}
                      >
                        {enquiry.message || "No message provided"}
                      </Box>
                    </td>
                    <td>
                      <Box className="admin-flex admin-gap-2 admin-text-secondary">
                        <Calendar size={13} />
                        <Typography variant="body2">{formatDate(enquiry.createdAt)}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: "text.disabled", ml: 1.75 }}>
                        {formatTime(enquiry.createdAt)}
                      </Typography>
                    </td>
                    <td className="admin-table-align-center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {enquiry.propertyId && (
                          <IconButton
                            size="small"
                            onClick={() => goToProperty(enquiry.propertyId, enquiry.propertyType)}
                            aria-label="View property"
                            sx={{ color: "#2563eb" }}
                          >
                            <Eye size={15} />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => setDeleteId(enquiry._id)}
                          aria-label="Delete enquiry"
                          sx={{ color: "error.main" }}
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </Stack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteId != null}
        title="Delete enquiry"
        message="Are you sure you want to delete this enquiry? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={() => deleteEnquiry(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
