import React, { useState, useEffect } from "react";
import {
  Box, Button, Card, CardContent, Grid, Typography, TextField,
  Select, MenuItem, FormControl, InputAdornment, IconButton,
  Skeleton, Stack, Chip, Tooltip, Alert,
} from "@mui/material";
import {
  CheckCircle, XCircle, Clock, User, DollarSign, Calendar, Home,
  Bell, Gift, RefreshCw, Eye, Copy, AlertCircle,
} from "lucide-react";
import { PageHeader, StatCard, StatusChip, CopyField, MaskedPhone } from "../shell/adminUi";
import "./admin.css";

export default function AdminProperties() {
  const [activeTab, setActiveTab] = useState("approvals");
  const [approvals, setApprovals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const accessToken = localStorage.getItem("accessToken");

  useEffect(() => {
    if (activeTab === "rewards") fetchApprovedPayments();
    else fetchPendingPayments();
  }, [activeTab]);

  const fetchApprovedPayments = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_ADMIN_APPROVED_PAYMENTS_API}`,
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      setRewards(
        res.data.map((p, index) => ({
          id: index + 1,
          paymentId: p._id,
          email: p.resident?.email || "N/A",
          residentName: p.resident?.name || "N/A",
          residentId: p.resident?._id,
          propertyName: p.property?.title || "N/A",
          amount: p.amount,
          createdAt: p.createdAt,
          points: 0,
          tier: "New",
          eligible: true,
        }))
      );
    } catch (err) {
      console.error("Error fetching approved payments:", err);
      setError("Error fetching approved payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_ADMIN_PENDING_PAYMENTS_API}`,
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      setApprovals(res.data);
    } catch (err) {
      console.error("Error fetching pending payments:", err);
      setError("Error fetching pending payments");
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id, action) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_ADMIN_UPDATE_PAYMENT_STATUS_API}`,
        { paymentId: id, status: action },
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      fetchPendingPayments();
      setSuccessMsg(action === "approved" ? "Payment approved" : "Payment rejected");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error updating payment status:", err);
      setError("Error updating payment status");
    }
  };

  const distributeReward = async (id) => {
    try {
      const selected = rewards.find((r) => r.id === id);
      if (!selected) return;
      await axios.post(
        `${process.env.REACT_APP_ADMIN_DISTRIBUTE_REWARD_API}`,
        { email: selected.email },
        {
          withCredentials: true,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      setRewards(rewards.map((r) => (r.id === id ? { ...r, eligible: false } : r)));
      setSuccessMsg(`Reward distributed to ${selected.email}`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error distributing reward:", err);
      setError("Failed to distribute reward");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

  const tabs = [
    { id: "approvals", label: "Pending Approvals", icon: Bell },
    { id: "rewards", label: "Rewards", icon: Gift },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Review pending payments and distribute rewards"
        actions={
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => { if (activeTab === "approvals") fetchPendingPayments(); else fetchApprovedPayments(); }}>
            Refresh
          </Button>
        }
        tabs={
          <Box sx={{ display: "flex", gap: 1 }}>
            {tabs.map((t) => (
              <Button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                sx={{
                  borderRadius: 2,
                  borderBottom: activeTab === t.id ? "3px solid #00A79D" : "3px solid transparent",
                  fontWeight: 600,
                  color: activeTab === t.id ? "primary.main" : "text.secondary",
                  borderColor: activeTab === t.id ? "primary.main" : "divider",
                  borderStyle: "solid",
                  borderWidth: 1,
                  px: 2,
                }}
              >
                <t.icon size={16} />
                {t.label}
              </Button>
            ))}
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertCircle size={18} />
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <CheckCircle size={18} />
          {successMsg}
        </Alert>
      )}

      {loading && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mx: "auto", mb: 2 }} />
          <Typography color="text.secondary">Loading…</Typography>
        </Box>
      )}

      {/* Approvals tab */}
      {activeTab === "approvals" && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={Clock}
                label="Pending Payments"
                value={approvals.length}
                tone="#F59E0B"
                loading={loading}
              />
            </Grid>
          </Grid>

          {!loading && approvals.length > 0 ? (
            <Grid container spacing={3}>
              {approvals.map((a) => (
                <Grid item xs={12} sm={6} md={4} key={a._id}>
                  <Card className="admin-card">
                    <CardContent sx={{ "&:last-child": { pb: 3 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, pb: 2, borderBottom: "1px solid #E5E9EE" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <User size={18} color="#00A79D" />
                          <Typography sx={{ fontWeight: 700, color: "primary.main" }}>
                            {a.resident?.name || a.residentName || "N/A"}
                          </Typography>
                        </Box>
                        <Chip
                          label="PENDING"
                          size="small"
                          sx={{
                            bgcolor: "rgba(245,158,11,0.12)",
                            color: "#B45309",
                            fontWeight: 700,
                            "& .MuiChip-dot": { bgcolor: "#F59E0B" },
                          }}
                        />
                      </Box>

                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2.5 }}>
                        <InfoRow icon={Home} label="Property" value={a.property?.title || a.propertyName || "N/A"} />
                        <InfoRow icon={DollarSign} label="Amount" value={`₹${a.amount?.toLocaleString() || "N/A"}`} highlight />
                        <InfoRow icon={Calendar} label="Method" value={a.paymentMethod || "N/A"} />
                        {a.resident?.email && (
                          <InfoRow icon={User} label="Email" value={a.resident.email} />
                        )}
                      </Box>

                      {a.status === "pending" && (
                        <Box sx={{ display: "flex", gap: 2, pt: 2, borderTop: "1px solid #E5E9EE" }}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            onClick={() => handleApproval(a._id, "approved")}
                            startIcon={<CheckCircle size={16} />}
                            sx={{ borderRadius: 2 }}
                          >
                            Approve
                          </Button>
                          <Button
                            fullWidth
                            variant="contained"
                            color="error"
                            onClick={() => handleApproval(a._id, "rejected")}
                            startIcon={<XCircle size={16} />}
                            sx={{ borderRadius: 2 }}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : !loading ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "rgba(0,167,157,0.10)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                <Clock size={26} color="#00A79D" />
              </Box>
              <Typography sx={{ color: "primary.main", fontWeight: 700 }}>No pending payments</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>All payments have been reviewed.</Typography>
            </Box>
          ) : null}
        </>
      )}

      {/* Rewards tab */}
      {activeTab === "rewards" && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <StatCard icon={Gift} label="Approved Payments" value={rewards.length} tone="#22D3EE" loading={loading} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <StatCard
                icon={CheckCircle}
                label="Eligible for Rewards"
                value={rewards.filter((r) => r.eligible).length}
                tone="#00A79D"
                loading={loading}
              />
            </Grid>
          </Grid>

          {!loading && rewards.length > 0 ? (
            <Grid container spacing={3}>
              {rewards.map((r) => (
                <Grid item xs={12} sm={6} md={4} key={r.id}>
                  <Card className="admin-card">
                    <CardContent sx={{ "&:last-child": { pb: 3 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, pb: 2, borderBottom: "1px solid #E5E9EE" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <User size={18} color="#00A79D" />
                          <Typography sx={{ fontWeight: 700, color: "primary.main" }}>
                            {r.residentName}
                          </Typography>
                        </Box>
                        <Chip
                          label="APPROVED"
                          size="small"
                          sx={{
                            bgcolor: "rgba(16,185,129,0.12)",
                            color: "#047857",
                            fontWeight: 700,
                            "& .MuiChip-dot": { bgcolor: "#10B981" },
                          }}
                        />
                      </Box>

                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2.5 }}>
                        <InfoRow icon={Home} label="Property" value={r.propertyName} />
                        <InfoRow icon={DollarSign} label="Amount" value={`₹${r.amount?.toLocaleString() || "N/A"}`} highlight />
                        <InfoRow icon={Calendar} label="Date" value={formatDate(r.createdAt)} />
                        <InfoRow icon={User} label="Email" value={r.email} />
                        <InfoRow icon={Gift} label="Tier" value={r.tier} />
                      </Box>

                      <Box sx={{ pt: 2, borderTop: "1px solid #E5E9EE" }}>
                        <Button
                          fullWidth
                          variant={r.eligible ? "contained" : "outlined"}
                          disabled={!r.eligible}
                          onClick={() => distributeReward(r.id)}
                          startIcon={<Gift size={16} />}
                          sx={{
                            borderRadius: 2,
                            bgcolor: r.eligible ? "#00A79D" : "transparent",
                            color: r.eligible ? "#fff" : "text.secondary",
                            borderColor: r.eligible ? "#00A79D" : "divider",
                          }}
                        >
                          {r.eligible ? "Distribute Reward" : "Reward Distributed"}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : !loading ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "rgba(0,167,157,0.10)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                <Gift size={26} color="#00A79D" />
              </Box>
              <Typography sx={{ color: "primary.main", fontWeight: 700 }}>No approved payments</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Approved payments will appear here for reward distribution.
              </Typography>
            </Box>
          ) : null}
        </>
      )}
    </>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      {Icon && <Icon size={14} color={highlight ? "#00A79D" : "#5B6B7B"} />}
      <Typography
        variant="body2"
        sx={{
          color: "#5B6B7B",
          fontWeight: 500,
          flex: highlight ? 1 : "none",
          [highlight ? "& > span" : ""]: { fontWeight: 600, marginLeft: "auto" },
        }}
      >
        {label}
        <span style={{ marginLeft: "auto", fontWeight: highlight ? 700 : 600, color: highlight ? "#003366" : "#1B2B3A" }}>
          {value}
        </span>
      </Typography>
    </Box>
  );
}
