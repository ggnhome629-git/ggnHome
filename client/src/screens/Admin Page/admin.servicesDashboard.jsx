import React, { useState, useEffect } from "react";
import {
  Box, Button, Card, CardContent, Grid, Typography, TextField,
  Select, MenuItem, FormControl, InputAdornment, InputBase,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Skeleton, Stack, Snackbar, Alert, InputLabel, useMediaQuery, useTheme,
} from "@mui/material";
import {
  Package, Clock, CheckCircle, AlertCircle, Home, Phone, Calendar,
  FileText, Wrench, X, ChevronRight, Filter, Search, Edit, Save,
  XCircle, User, Building, RefreshCw, MessageCircle,
} from "lucide-react";
import { PageHeader, StatCard, StatusChip, CopyField } from "./shell/adminUi";
import "./admin.css";

const SERVICE_TYPES = {
  cleaning:    { icon: "🧹", label: "Cleaning",        color: "#00A79D" },
  painting:    { icon: "🎨", label: "Painting",        color: "#8B5CF6" },
  termite:     { icon: "🐛", label: "Termite Control", color: "#DC2626" },
  plumbing:    { icon: "🚰", label: "Plumbing",        color: "#2563EB" },
  acService:   { icon: "❄️", label: "AC Service",      color: "#06B6D4" },
  carpenter:   { icon: "🪚", label: "Carpenter",       color: "#D97706" },
  electrical:  { icon: "⚡", label: "Electrical",      color: "#F59E0B" },
  moving:      { icon: "📦", label: "Moving",          color: "#10B981" },
  pestControl: { icon: "🦟", label: "Pest Control",    color: "#EF4444" },
  other:       { icon: "🔧", label: "Other",           color: "#6B7280" },
};

const STATUS_CONFIG = {
  pending: {
    icon: Clock, label: "Pending", color: "#F59E0B", bgColor: "#FEF3C7",
    description: "Request received, awaiting assignment",
  },
  "in-progress": {
    icon: Package, label: "In Progress", color: "#00A79D", bgColor: "#CCFBF1",
    description: "Service provider is working on this request",
  },
  completed: {
    icon: CheckCircle, label: "Completed", color: "#10B981", bgColor: "#D1FAE5",
    description: "Service completed successfully",
  },
};

const PROGRESS_MAP = { pending: 33, "in-progress": 66, completed: 100 };

export default function AdminServiceTracking() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [requests, setRequests] = useState([]);
  const [userdetails, setUserdetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);

  const fetchServiceRequests = async () => {
    setLoading(true);
    setModalError("");
    try {
      const statusQuery = filterStatus !== "all" ? `&status=${filterStatus}` : "";
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.REACT_APP_Base_API}/api/services?page=${currentPage}&limit=12${statusQuery}`,
        {
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to fetch service requests");
      }
      const data = await res.json();
      setRequests(Array.isArray(data.items) ? data.items : []);
      setTotalPages(Number.isFinite(data.totalPages) ? data.totalPages : 1);
      setTotalRequests(
        Number.isFinite(data.total) ? data.total : (Array.isArray(data.items) ? data.items.length : 0)
      );
    } catch (err) {
      setModalError(err.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceRequests();
  }, [currentPage, filterStatus]);

  const handleEditRequest = (request) => {
    setSelectedRequest(request);
    setEditData({
      userRole: request.userRole,
      propertyType: request.propertyType || "",
      propertyId: request.propertyId?._id || "",
      address: request.address,
      serviceType: request.serviceType,
      contactNumber: request.contactNumber,
      preferredDate: request.preferredDate ? new Date(request.preferredDate).toISOString().slice(0, 16) : "",
      notes: request.notes || "",
      status: request.status,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setModalError("");
    setModalSuccess("");
    try {
      const payload = {
        userRole: editData.userRole,
        serviceType: editData.serviceType,
        contactNumber: editData.contactNumber,
        preferredDate: editData.preferredDate || null,
        notes: editData.notes,
        status: editData.status,
        address: editData.address,
      };
      if (editData.userRole === "owner") {
        if (editData.propertyType) payload.propertyType = editData.propertyType;
        if (editData.propertyId) payload.propertyId = editData.propertyId;
      }
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.REACT_APP_Base_API}/api/admin/services/${selectedRequest._id}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update service request");
      }
      const data = await res.json();
      setModalSuccess("Service request updated successfully! ✅");
      setUserdetails(data.request.createdBy || {});
      setIsEditing(false);
      setSelectedRequest(data.request);
      fetchServiceRequests();
      setTimeout(() => setModalSuccess(""), 3000);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const filteredRequests = requests.filter((req) => {
    const q = searchQuery.toLowerCase();
    return (
      req.address?.toLowerCase().includes(q) ||
      SERVICE_TYPES[req.serviceType]?.label.toLowerCase().includes(q) ||
      req.createdBy?.name?.toLowerCase().includes(q) ||
      req.createdBy?.email?.toLowerCase().includes(q)
    );
  });

  const statusTabs = [
    { key: "all", label: `All (${totalRequests})`, color: "#003366" },
    { key: "pending", label: `Pending`, color: "#F59E0B" },
    { key: "in-progress", label: `In Progress`, color: "#00A79D" },
    { key: "completed", label: `Completed`, color: "#10B981" },
  ];

  return (
    <>
      <PageHeader
        title="Admin Service Management"
        description="Manage and track all service requests across the platform"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={fetchServiceRequests}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={Package} label="Total Requests" value={totalRequests} tone="#003366" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={Clock}
            label="Pending"
            value={requests.filter((r) => r.status === "pending").length}
            tone="#F59E0B"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={Package}
            label="In Progress"
            value={requests.filter((r) => r.status === "in-progress").length}
            tone="#00A79D"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={requests.filter((r) => r.status === "completed").length}
            tone="#10B981"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Card className="admin-card" sx={{ mb: 4 }}>
        <CardContent sx={{ py: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "flex-end" }}>
            <TextField
              fullWidth
              placeholder="Search by address, service type, or user…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} color="#5B6B7B" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 260 }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {statusTabs.map((tab) => (
                <Chip
                  key={tab.key}
                  label={tab.label}
                  onClick={() => setFilterStatus(tab.key)}
                  color={filterStatus === tab.key ? "primary" : "default"}
                  variant={filterStatus === tab.key ? "filled" : "outlined"}
                  sx={{
                    borderRadius: 2,
                    borderColor: filterStatus === tab.key ? tab.color : "divider",
                    fontWeight: 600,
                    bgcolor: filterStatus === tab.key ? `${tab.color}1A` : "transparent",
                    color: filterStatus === tab.key ? tab.color : "text.secondary",
                    "& .MuiChip-icon": { color: filterStatus === tab.key ? tab.color : "inherit" },
                  }}
                  icon={<Filter size={14} />}
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Error alert */}
      {modalError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertCircle size={18} />
          {modalError}
        </Alert>
      )}

      {/* Loading skeletons */}
      {loading && requests.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mx: "auto", mb: 2 }} />
          <Typography color="text.secondary">Loading service requests…</Typography>
        </Box>
      )}

      {/* Empty state */}
      {!loading && filteredRequests.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "rgba(0,167,157,0.10)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
            <MessageCircle size={26} color="#94a3b8" />
          </Box>
          <Typography sx={{ color: "primary.main", fontWeight: 700 }}>No service requests found</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {searchQuery ? "Try adjusting your search criteria" : "No requests available at this time"}
          </Typography>
        </Box>
      )}

      {/* Request cards */}
      {!loading && filteredRequests.length > 0 && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {filteredRequests.map((request) => {
              const service = SERVICE_TYPES[request.serviceType];
              const status = STATUS_CONFIG[request.status];
              const progress = PROGRESS_MAP[request.status] ?? 0;
              const btnBase = {
                border: "none", borderRadius: 2, fontWeight: 600, cursor: "pointer",
                transition: "all .2s ease", fontSize: "0.85rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5,
              };

              return (
                <Grid item xs={12} sm={6} md={4} key={request._id}>
                  <Card
                    className="admin-card"
                    sx={{
                      height: "100%",
                      border: "1px solid",
                      borderColor: "divider",
                      transition: "box-shadow .15s ease, border-color .15s ease",
                      "&:hover": {
                        boxShadow: "0 8px 24px rgba(0,51,102,0.12)",
                        borderColor: status?.color ?? "divider",
                      },
                    }}
                  >
                    <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                      {/* Header */}
                      <Box
                        sx={{
                          display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2,
                          position: "relative",
                        }}
                      >
                        <Box
                          sx={{
                            width: 42, height: 42, borderRadius: 2, flexShrink: 0,
                            bgcolor: `${service?.color || "#6B7280"}15`,
                            border: `2px solid ${service?.color || "#6B7280"}30`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "1.4rem",
                          }}
                        >
                          {service?.icon || "🔧"}
                        </Box>
                        <Chip
                          label={status?.label || "Unknown"}
                          size="small"
                          sx={{
                            bgcolor: status?.bgColor || "#E5E7EB",
                            color: status?.color || "#6B7280",
                            fontWeight: 700,
                          }}
                          icon={status?.icon ? <status.icon size={12} /> : undefined}
                        />
                      </Box>

                      {/* User info */}
                      <Box
                        sx={{
                          bgcolor: "#F4F7F9", p: 1.5, borderRadius: 1.5, mb: 2, fontSize: "0.8rem",
                        }}
                      >
                        <strong style={{ color: "#003366" }}>User:</strong>{" "}
                        {request.createdBy?.mobileNumber || "Unknown"} ({request.userRole})
                        <br />
                        <strong style={{ color: "#003366" }}>Email:</strong>{" "}
                        {request.createdBy?.email || "N/A"}
                      </Box>

                      {/* Details */}
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                          <Home size={14} color="#5B6B7B" style={{ flexShrink: 0, marginTop: 1 }} />
                          <Typography variant="body2" sx={{ lineHeight: 1.4, fontWeight: 500 }}>
                            {request.address}
                          </Typography>
                        </Box>
                        {request.propertyId && (
                          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <Building size={14} color="#5B6B7B" />
                            <Typography variant="body2" color="text.secondary">
                              {request.propertyId.title || "Property"} ({request.propertyType})
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                          <Calendar size={14} color="#5B6B7B" />
                          <Typography variant="body2" color="text.secondary">
                            Requested: {formatDate(request.createdAt)}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Progress */}
                      <Box sx={{ width: "100%", height: 6, bgcolor: "#E5E9EE", borderRadius: 3, overflow: "hidden", mb: 2 }}>
                        <Box
                          sx={{
                            height: "100%", width: `${progress}%`,
                            bgcolor: `linear-gradient(90deg, ${status?.color || "#00A79D"} 0%, ${status?.color || "#00A79D"}cc 100%)`,
                            borderRadius: 3,
                            transition: "width .5s ease",
                          }}
                        />
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: "flex", gap: 1, mt: "auto" }}>
                        <Button
                          sx={{ flex: 1, ...btnBase, color: "#00A79D", border: "2px solid #00A79D" }}
                          onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); setIsEditing(false); }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#00A79D"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#00A79D"; }}
                        >
                          View Details <ChevronRight size={14} />
                        </Button>
                        <Button
                          sx={{ flex: 1, ...btnBase, color: "#F59E0B", border: "2px solid #F59E0B" }}
                          onClick={(e) => { e.stopPropagation(); handleEditRequest(request); }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F59E0B"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#F59E0B"; }}
                        >
                          <Edit size={14} /> Edit
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mb: 4 }}>
              <Button
                size="small"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                sx={{
                  minWidth: 80, borderRadius: 2,
                  bgcolor: currentPage === 1 ? "action.hover" : "primary.main",
                  color: currentPage === 1 ? "text.secondary" : "white",
                }}
              >
                Previous
              </Button>
              <Typography sx={{ fontWeight: 600, color: "text.secondary", px: 2 }}>
                Page {currentPage} of {totalPages}
              </Typography>
              <Button
                size="small"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                sx={{
                  minWidth: 80, borderRadius: 2,
                  bgcolor: currentPage === totalPages ? "action.hover" : "primary.main",
                  color: currentPage === totalPages ? "text.secondary" : "white",
                }}
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Detail / Edit modal */}
      <Dialog
        open={selectedRequest != null}
        onClose={() => { setSelectedRequest(null); setIsEditing(false); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <Box
          sx={{
            position: "relative",
            bgcolor: `linear-gradient(135deg, ${STATUS_CONFIG[selectedRequest?.status]?.color || "#003366"} 0%, ${STATUS_CONFIG[selectedRequest?.status]?.color || "#003366"}cc 100%)`,
            px: 4, py: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center",
            borderRadius: "3px 3px 0 0",
          }}
        >
          <Typography variant="h2" sx={{ fontWeight: 700, color: "#fff", ml: 1 }}>
            {SERVICE_TYPES[selectedRequest?.serviceType]?.icon}{" "}
            {SERVICE_TYPES[selectedRequest?.serviceType]?.label} Service
          </Typography>
          <IconButton
            onClick={() => { setSelectedRequest(null); setIsEditing(false); }}
            sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.2)" }}
          >
            <X size={20} />
          </IconButton>
        </Box>

        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {modalSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <CheckCircle size={18} />
              {modalSuccess}
            </Alert>
          )}
          {modalError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertCircle size={18} />
              {modalError}
            </Alert>
          )}

          {isEditing ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>User Role *</InputLabel>
                    <Select
                      value={editData.userRole}
                      label="User Role *"
                      onChange={(e) => setEditData({ ...editData, userRole: e.target.value })}
                    >
                      <MenuItem value="owner">Owner</MenuItem>
                      <MenuItem value="renter">Renter</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Service Type *</InputLabel>
                    <Select
                      value={editData.serviceType}
                      label="Service Type *"
                      onChange={(e) => setEditData({ ...editData, serviceType: e.target.value })}
                    >
                      {Object.entries(SERVICE_TYPES).map(([key, svc]) => (
                        <MenuItem key={key} value={key}>{svc.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status *</InputLabel>
                    <Select
                      value={editData.status}
                      label="Status *"
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Contact Number *"
                    type="tel"
                    value={editData.contactNumber}
                    onChange={(e) => setEditData({ ...editData, contactNumber: e.target.value })}
                  />
                </Grid>
                {editData.userRole === "owner" && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Property Type</InputLabel>
                        <Select
                          value={editData.propertyType}
                          label="Property Type"
                          onChange={(e) => setEditData({ ...editData, propertyType: e.target.value })}
                        >
                          <MenuItem value="">Select Type</MenuItem>
                          <MenuItem value="RentalProperty">Rental Property</MenuItem>
                          <MenuItem value="SaleProperty">Sale Property</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Property ID"
                        value={editData.propertyId}
                        InputProps={{ readOnly: true }}
                        placeholder="Property ObjectId (fixed)"
                        sx={{ bgcolor: "#F9FAFB" }}
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Preferred Date"
                    type="datetime-local"
                    value={editData.preferredDate}
                    onChange={(e) => setEditData({ ...editData, preferredDate: e.target.value })}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Address *"
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                sx={{ mt: 1 }}
              />
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="Add any additional notes or instructions…"
              />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* User info */}
              <Box
                sx={{
                  p: 2, bgcolor: "#F4F7F9", borderRadius: 2,
                  display: "flex", gap: 2, alignItems: "flex-start",
                }}
              >
                <User size={18} color="#00A79D" />
                <Box>
                  <Typography variant="caption" sx={{ color: "#9AA7B4", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                    User Information
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2">
                      <strong>Name:</strong> {selectedRequest?.createdBy?.name || "Unknown"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Email:</strong> {selectedRequest?.createdBy?.email || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Phone:</strong> {selectedRequest?.createdBy?.mobileNumber || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Role:</strong>{" "}
                      <span style={{ fontWeight: 600, textTransform: "capitalize", color: selectedRequest?.userRole === "owner" ? "#00A79D" : "#8B5CF6" }}>
                        {selectedRequest?.userRole}
                      </span>
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Service details */}
              <Box
                sx={{
                  p: 2, bgcolor: "#F4F7F9", borderRadius: 2,
                  display: "flex", gap: 2, alignItems: "flex-start",
                }}
              >
                <Home size={18} color="#00A79D" />
                <Box>
                  <Typography variant="caption" sx={{ color: "#9AA7B4", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                    Service Details
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRequest?.address}</Typography>
                    {selectedRequest?.propertyId && (
                      <>
                        <Typography variant="body2">
                          <strong>Property:</strong> {selectedRequest.propertyId.title || "Unnamed Property"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Type:</strong> {selectedRequest.propertyType}
                        </Typography>
                        {selectedRequest.propertyId.Sector && (
                          <Typography variant="body2">
                            <strong>Sector:</strong> {selectedRequest.propertyId.Sector}
                          </Typography>
                        )}
                      </>
                    )}
                    <Typography variant="body2">
                      <strong>Contact:</strong> {selectedRequest?.contactNumber}
                    </Typography>
                    {selectedRequest?.preferredDate && (
                      <Typography variant="body2">
                        <strong>Preferred Date:</strong> {formatDate(selectedRequest.preferredDate)}
                      </Typography>
                    )}
                    {selectedRequest?.notes && (
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                        <strong>Notes:</strong> {selectedRequest.notes}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Timeline */}
              {selectedRequest?.timeline && selectedRequest.timeline.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#9AA7B4", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Calendar size={13} /> Request Timeline
                  </Typography>
                  <Box sx={{ position: "relative", pl: 6 }}>
                    {selectedRequest.timeline.map((item, idx) => {
                      const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                      const isLast = idx === selectedRequest.timeline.length - 1;
                      return (
                        <Box
                          key={idx}
                          sx={{
                            position: "relative", pb: isLast ? 0 : 2,
                            opacity: isLast ? 1 : 0.6,
                          }}
                        >
                          {!isLast && (
                            <Box
                              sx={{
                                position: "absolute", left: 11, top: 20, bottom: 0,
                                width: 2, bgcolor: "#E5E9EE",
                              }}
                            />
                          )}
                          <Box
                            sx={{
                              position: "absolute", left: 0, top: 6,
                              width: 22, height: 22, borderRadius: "50%",
                              bgcolor: cfg.color, border: `3px solid ${isLast ? cfg.color : "#9CA3AF"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {isLast && cfg.icon ? <cfg.icon size={10} color="#fff" /> : null}
                          </Box>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                              {cfg.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(item.date)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
                              {item.description}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Current status pill */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: STATUS_CONFIG[selectedRequest?.status]?.bgColor || "#E5E7EB",
                  borderLeft: `4px solid ${STATUS_CONFIG[selectedRequest?.status]?.color || "#003366"}`,
                  borderRadius: 1.5,
                }}
              >
                <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.5 }}>
                  Current Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {STATUS_CONFIG[selectedRequest?.status]?.description || ""}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 4, py: 2.5, borderTop: "1px solid #E5E9EE" }}>
          {isEditing ? (
            <>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                variant="contained"
                startIcon={<Save size={18} />}
                sx={{ bgcolor: "#00A79D", borderRadius: 2 }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                sx={{ borderRadius: 2 }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => handleEditRequest(selectedRequest)}
                variant="contained"
                startIcon={<Edit size={18} />}
                sx={{ bgcolor: "#00A79D", borderRadius: 2 }}
              >
                Edit Request
              </Button>
              <Button
                onClick={() => { setSelectedRequest(null); setIsEditing(false); }}
                sx={{ borderRadius: 2 }}
              >
                Close
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
