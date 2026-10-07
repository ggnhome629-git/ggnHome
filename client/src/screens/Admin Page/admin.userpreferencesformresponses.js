import React, { useState, useEffect, useMemo } from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Grid, Typography, TextField,
  InputAdornment, Avatar, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Stack, Tooltip,
  Skeleton, Alert,
} from "@mui/material";
import { Search, RefreshCw, Filter, Phone, Mail, MessageSquare, Users, LogIn, LogOut, MapPin } from "lucide-react";
import { PageHeader, StatCard, StatusChip, ConfirmDialog, EmptyState, CopyField, MaskedPhone } from "./shell/adminUi";
import { AnimatedNumber } from "../../../components/motion";
import "../admin.css";

const AdminPreferencesDashboard = () => {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const navigate = useNavigate();

  const [stats, setStats] = useState({ total: 0, loggedIn: 0, notLoggedIn: 0 });
  const accessToken = localStorage.getItem("accessToken");
  // Agents dropdown / modal state
  const [agents, setAgents] = useState([]);
  const [agentsPage, setAgentsPage] = useState(1);
  const [agentsTotalPages, setAgentsTotalPages] = useState(0);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [openDropdownFor, setOpenDropdownFor] = useState(null); // prefId for which dropdown is open
  const [assigningLeadId, setAssigningLeadId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null); // agent object shown in modal
  const [agentDetailLoading, setAgentDetailLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    mobileNumber: "",
    bhkSize: "",
    preferredLocation: "",
  });

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [pagination.page, pagination.limit, filters]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      }).toString();

      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/admin/preferences-form/list?${queryParams}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data);
        setPagination((prev) => ({
          ...prev,
          total: data.meta.total,
          totalPages: data.meta.totalPages,
        }));
        calculateStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };
  // Fetch agents paginated (20 per page)
  const fetchAgents = async (page = 1) => {
    try {
      setAgentsLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '20' }).toString();
    const res = await fetch(`${process.env.REACT_APP_Base_API}/api/admin/agents?${params}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
      if (res.ok) {
        const json = await res.json();
        setAgents(json.agents || []);
        setAgentsPage(json.page || page);
        setAgentsTotalPages(json.pages || 0);
      } else {
        console.error('Failed to load agents', res.status);
      }
    } catch (e) {
      console.error('Error fetching agents', e);
    } finally {
      setAgentsLoading(false);
    }
  };

  const openAgentsDropdown = async (prefId) => {
    setOpenDropdownFor(prefId);
    setAssigningLeadId(prefId);
    await fetchAgents(1);
  };

  const closeAgentsDropdown = () => {
    setOpenDropdownFor(null);
    setAssigningLeadId(null);
  };

  const handleAgentClick = async (agent) => {
    setSelectedAgent({ ...agent, _leadAssigningId: assigningLeadId });
  };

  const handleFetchAgentDetails = async (agentId) => {
    try {
      setAgentDetailLoading(true);
      // We already have basic agent from list; if you need refreshed data, call the API for single agent (not provided). For now we reuse agent object.
    } finally {
      setAgentDetailLoading(false);
    }
  };

  const [assignSuccess, setAssignSuccess] = useState("");
  const [assignError, setAssignError] = useState("");

  const handleAssignAgent = async (leadId, agentId) => {
    try {
      setAssigning(true);
      setAssignError("");
      await axios.post(
        `${process.env.REACT_APP_Base_API}/api/admin/preferences/${leadId}/assign`,
        { agentId },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      // refresh preferences list and close modal/dropdown
      fetchPreferences();
      setSelectedAgent(null);
      setOpenDropdownFor(null);
      setAssignSuccess('Agent assigned successfully');
    } catch (err) {
      console.error('Error assigning agent', err);
      setAssignError('Failed to assign agent');
    } finally {
      setAssigning(false);
    }
  };



  const calculateStats = (data) => {
    const total = data.length;
    const loggedIn = data.filter((pref) => pref.hasLoggedIn).length;
    const notLoggedIn = total - loggedIn;
    setStats({ total, loggedIn, notLoggedIn });
  };

  // ---------- WhatsApp helper (added) ----------
  // Default message to send via WhatsApp. Change this to whatever default text you want.
  // const defaultWhatsAppMessage = `Hello  — thanks for submitting your requirements. We’ll contact you soon with curated listings to help find your dream home in Gurgaon . Contact:  9654131789 | support@ggnhome.com | https://www.ggnhome.com`;
const defaultWhatsAppMessage = `Hello,
Thank you for submitting your property requirements. Our team will review your preferences and contact you shortly with curated listings that match your needs in Gurgaon.
For assistance, please contact: 9654131789 | support@ggnhome.com`;
  // Format a phone number into WhatsApp friendly international format (digits only, no +).
  // Heuristic: if the number has 10 digits we assume India (+91). If it already looks international (length > 10) we keep it as-is.
  const formatPhoneForWhatsApp = (num) => {
    if (!num) return null;
    // remove non-digit characters
    let digits = String(num).replace(/[^0-9]/g, '');
    if (digits.length === 0) return null;
    // if number starts with 0, strip leading zeros
    digits = digits.replace(/^0+/, '');
    // if 10 digits assume India and prepend 91
    if (digits.length === 10) digits = '91' + digits;
    return digits;
  };

  const handleOpenWhatsApp = (mobileNumber, message = defaultWhatsAppMessage) => {
    try {
      const phone = formatPhoneForWhatsApp(mobileNumber);
      if (!phone) {
        setAssignError('Invalid phone number');
        return;
      }
      const encoded = encodeURIComponent(message || '');
      const url = `https://wa.me/${phone}?text=${encoded}`;
      window.open(url, '_blank');
    } catch (e) {
      console.error('Error opening WhatsApp', e);
      setAssignError('Could not open WhatsApp');
    }
  };
  // ---------- end WhatsApp helper ----------

  // Helper component for preference label/value rows
  const InfoLabel = ({ label, value, highlight, tone }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #F4F7F9' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: highlight ? 700 : 500,
          color: tone || (highlight ? '#003366' : '#1B2B3A'),
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  );

  const DeleteIcon = (props) => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );

  // Helper to render agent info (show agentCode if available, otherwise name or id)
  const renderAgentAssigned = (pref) => {
    const assigned = pref.agentAssigned;
    if (!assigned) return 'Unassigned';

    // If it's an array (multiple assigned agents)
    if (Array.isArray(assigned)) {
      if (assigned.length === 0) return 'Unassigned';
      const first = assigned[0];
      if (typeof first === 'object' && first !== null) return first.agentCode || first.name || first._id || 'Unassigned';
      return String(first);
    }

    // If it's an object
    if (typeof assigned === 'object' && assigned !== null) {
      return assigned.agentCode || assigned.name || assigned._id || 'Unassigned';
    }

    // Fallback (string id)
    return String(assigned);
  };

  const isAssignDisabledForLead = (leadId) => {
    const p = preferences.find((x) => x._id === leadId);
    return p && p.status === 'INACTIVE';
  };

  const handleMatchUsers = async () => {
    try {
      setMatching(true);
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/admin/preferences-form/match-users`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        const result = await response.json();
        fetchPreferences(); // Refresh the list
      }
    } catch (error) {
      console.error("Error matching users:", error);
      setAssignError("Error matching users");
    } finally {
      setMatching(false);
    }
  };

  const formatTimeLeft = (inactiveAt) => {
    if (!inactiveAt) return null;
    try {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const inactiveSince = Date.now() - new Date(inactiveAt).getTime();
      if (inactiveSince >= thirtyDaysMs) return 'Scheduled for permanent deletion (expired)';
      const remainingMs = Math.max(0, thirtyDaysMs - inactiveSince);
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      if (remainingDays <= 1) return 'Will be deleted in less than 1 day';
      return `Will be deleted in ${remainingDays} day(s)`;
    } catch (e) {
      return null;
    }
  };


  const [deleteMessage, setDeleteMessage] = useState("");
  const [showDeletedToast, setShowDeletedToast] = useState(false);

  const handleDeletePreference = async (id) => {
    setDeleting(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/admin/preferences-form/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      const text = await response.text();

      if (response.ok) {
        // server may return a message (e.g. 'marked INACTIVE' or 'permanently deleted')
        try {
          const json = JSON.parse(text || '{}');
          if (json.message) setDeleteMessage(json.message);
        } catch (e) {
          if (text) setDeleteMessage(text);
        }
        fetchPreferences(); // Refresh the list
        setTimeout(() => setDeleteMessage(""), 3000);
        setDeleteId(null);
        return;
      }

      console.error('Delete failed', response.status, text);
      setAssignError(`Delete failed: ${response.status} — ${text || 'No message'}`);
    } catch (error) {
      console.error('Error deleting preference:', error);
      setAssignError('Error deleting preference');
    } finally {
      setDeleting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };





  return (
    <>
      <PageHeader
        title="User Preferences Dashboard"
        description="Manage and analyze user property preferences"
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshCw size={16} />}
              onClick={fetchPreferences}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Filter size={16} />}
              onClick={handleMatchUsers}
              disabled={matching}
              sx={{ bgcolor: "#00A79D" }}
            >
              {matching ? "Matching..." : "Match Users"}
            </Button>
          </>
        }
      />
      <Box sx={{ mb: 4 }}>
        {/* Filters */}
        <Card className="admin-card">
          <CardContent sx={{ py: 2, "& .MuiTextField-root": { m: 1, width: 220 } }}>
            <TextField
              fullWidth
              placeholder="Filter by Mobile"
              value={filters.mobileNumber}
              onChange={(e) => handleFilterChange("mobileNumber", e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Phone size={18} color="#5B6B7B" /></InputAdornment> }}
            />
            <TextField
              fullWidth
              placeholder="Filter by Location"
              value={filters.preferredLocation}
              onChange={(e) => handleFilterChange("preferredLocation", e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><MapPin size={18} color="#5B6B7B" /></InputAdornment> }}
            />
            <FormControl fullWidth sx={{ minWidth: 150 }}>
              <InputLabel>BHK Size</InputLabel>
              <Select
                value={filters.bhkSize}
                label="BHK Size"
                onChange={(e) => handleFilterChange("bhkSize", e.target.value)}
              >
                <MenuItem value="">All BHK Sizes</MenuItem>
                <MenuItem value="1BHK">1 BHK</MenuItem>
                <MenuItem value="2BHK">2 BHK</MenuItem>
                <MenuItem value="3BHK">3 BHK</MenuItem>
                <MenuItem value="4BHK">4 BHK</MenuItem>
                <MenuItem value="4BHK+">4+ BHK</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>
        <Box sx={{ mt: 2, textAlign: "right" }}>
          <Button
            variant="contained"
            startIcon={<Filter size={16} />}
            onClick={handleMatchUsers}
            disabled={matching}
            sx={{ bgcolor: "#00A79D", borderRadius: 2 }}
          >
            {matching ? "Matching..." : "Match Users"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={fetchPreferences}
            sx={{ ml: 1, borderColor: "#00A79D", color: "#00A79D", borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      <Box sx={{ mb: 4 }}>
        {/* Stats */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <StatCard icon={Users} label="Total Preferences" value={stats.total} tone="#003366" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard icon={LogIn} label="Users Logged In" value={stats.loggedIn} tone="#00A79D" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard icon={LogOut} label="Not Logged In" value={stats.notLoggedIn} tone="#FF6B6B" />
          </Grid>
        </Grid>
      </Box>
      <Card className="admin-card" sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: "#00A79D1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Filter size={22} color="#00A79D" />
            </Box>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: "1rem", color: "primary.main" }}>
                User Login Status
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats.loggedIn} logged in · {stats.notLoggedIn} guests
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Box sx={{ flex: 1, height: 10, bgcolor: "#E5E9EE", borderRadius: 5, overflow: "hidden" }}>
              <Box
                sx={{
                  height: "100%",
                  width: `${stats.total > 0 ? (stats.loggedIn / stats.total) * 100 : 0}%`,
                  bgcolor: "#00A79D",
                  borderRadius: 5,
                  transition: "width 0.5s ease",
                }}
              />
            </Box>
            <Box sx={{ textAlign: "right", minWidth: 120 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#003366" }}>
                {stats.total > 0 ? Math.round((stats.loggedIn / stats.total) * 100) : 0}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Logged in ({stats.loggedIn})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Not logged in ({stats.notLoggedIn})
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, fontSize: "1.1rem", color: "primary.main", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Users size={20} color="#00A79D" /> Preferences ({pagination.total || preferences.length})
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            Page {pagination.page} of {pagination.totalPages || 1}
          </Typography>
          {pagination.totalPages > 1 && (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                sx={{ borderRadius: 2 }}
              >
                Previous
              </Button>
              <Button
                size="small"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                sx={{ borderRadius: 2 }}
              >
                Next
              </Button>
            </Stack>
          )}
        </Box>
      </Box>
      <div>

          {/* Statistics Cards */}
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: "#003366" }}>
                {stats.total}
              </div>
              <div style={styles.statLabel}>Total Preferences</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: "#00A79D" }}>
                {stats.loggedIn}
              </div>
              <div style={styles.statLabel}>Users Logged In</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: "#FF6B6B" }}>
                {stats.notLoggedIn}
              </div>
              <div style={styles.statLabel}>Not Logged In</div>
            </div>
          </div>

          {/* Graph */}
          <div style={styles.graphContainer}>
            <h3 style={styles.graphTitle}>User Login Status</h3>
            <div style={styles.graphBar}>
              <div
                style={{
                  ...styles.graphBarFill,
                  width: `${loggedInPercentage}%`,
                }}
              ></div>
            </div>
            <div style={styles.graphLabels}>
              <span>Not Logged In ({stats.notLoggedIn})</span>
              <span>Logged In ({stats.loggedIn})</span>
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controlsContainer}>
            <input
              type="text"
              placeholder="Filter by Mobile"
              value={filters.mobileNumber}
              onChange={(e) =>
                handleFilterChange("mobileNumber", e.target.value)
              }
              style={styles.filterInput}
            />
            <input
              type="text"
              placeholder="Filter by Location"
              value={filters.preferredLocation}
              onChange={(e) =>
                handleFilterChange("preferredLocation", e.target.value)
              }
              style={styles.filterInput}
            />
            <select
              value={filters.bhkSize}
              onChange={(e) => handleFilterChange("bhkSize", e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All BHK Sizes</option>
              <option value="1BHK">1 BHK</option>
              <option value="2BHK">2 BHK</option>
              <option value="3BHK">3 BHK</option>
              <option value="4BHK">4 BHK</option>
              <option value="4BHK+">4+ BHK</option>
            </select>
            <button
              onClick={handleMatchUsers}
              disabled={matching}
              style={{
                ...styles.matchButton,
                ...(matching && { opacity: 0.7, cursor: "not-allowed" }),
              }}
            >
              {matching ? "🔄 Matching..." : "🔗 Match Users"}
            </button>
            <button onClick={fetchPreferences} style={styles.refreshButton}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Preferences Cards */}
        {loading ? (
          <div style={styles.loadingSpinner}>
            <div style={styles.spinner}></div>
          </div>
        ) : (
          <>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {preferences.map((pref) => (
            <Card key={pref._id} className="admin-card">
              <CardContent sx={{ '&:last-child': { pb: 0 } }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, position: 'relative' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1rem', mb: 0.5 }}>
                      {pref.userName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                      <Phone size={12} />
                      <CopyField value={pref.mobileNumber} label="Mobile" />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: 32, height: 32, borderRadius: '50%',
                        bgcolor: pref.hasLoggedIn ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700,
                        bgcolor: pref.hasLoggedIn ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        color: pref.hasLoggedIn ? '#10B981' : '#F59E0B',
                      }}
                    >
                      {pref.hasLoggedIn ? '✓' : '✕'}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginRight: 2 }}>
                      <Tooltip title={`Message ${pref.mobileNumber} on WhatsApp`}>
                        <IconButton size="small" sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1EB55A' } }} onClick={() => handleOpenWhatsApp(pref.mobileNumber)}>
                          <MessageSquare size={16} color="#fff" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>

                {/* Preference items */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <InfoLabel label="Location" value={pref.preferredLocation} />
                  <InfoLabel label="Budget" value={`₹${pref.budgetRange}`} />
                  <InfoLabel label="BHK Size" value={pref.bhkSize} />
                  <InfoLabel label="Property Type" value={pref.propertyType} />
                  <InfoLabel label="Furnishing" value={pref.furnishingLevel?.replace('-', ' ') || 'Not specified'} />
                  <InfoLabel label="Move-in" value={pref.moveInDate} />
                  <InfoLabel label="Actual Brokerage" value={`₹ ${pref.brokerageAmount}`} highlight />
                  {typeof pref.brokerageAmount === 'number' && (
                    <InfoLabel label="Agent Brokerage" value={`₹ ${Math.max(0, Math.floor((pref.brokerageAmount - 500) / 2))}`} tone="#00A79D" />
                  )}
                </Box>

                {/* Footer */}
                <Box sx={{ pt: 2, borderTop: '1px solid #E5E9EE', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Created: {new Date(pref.createdAt).toLocaleDateString()}
                    </Typography>
                    {Array.isArray(pref.agentAssigned) && pref.agentAssigned.length > 0 && (
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mt: 0.5 }}>
                        Agents Assigned: {pref.agentAssigned.length}
                      </Typography>
                    )}
                    {pref.status === 'INACTIVE' && (
                      <Typography variant="caption" color="#FF6B6B" sx={{ display: 'block', mt: 0.5 }}>
                        {formatTimeLeft(pref.inactiveAt)}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <Button
                        size="small"
                        onClick={() => pref.status !== 'INACTIVE' && (openDropdownFor === pref._id ? closeAgentsDropdown() : openAgentsDropdown(pref._id))}
                        disabled={pref.status === 'INACTIVE'}
                        sx={{ borderRadius: 2, px: 2 }}
                      >
                        {openDropdownFor === pref._id ? 'Close Agents' : 'Assign Agent'}
                      </Button>

                      {openDropdownFor === pref._id && (
                        <Box
                          sx={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 1200,
                            width: 320, maxHeight: 300, overflowY: 'auto',
                            bgcolor: '#fff', border: '1px solid #E5E9EE', borderRadius: 2,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            mt: 1, p: 0.5,
                          }}
                        >
                          {agentsLoading ? (
                            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Loading agents...</Box>
                          ) : agents.length === 0 ? (
                            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>No agents found</Box>
                          ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: '4px' }}>
                              {agents.map((agent) => {
                                const alreadyAssigned =
                                  pref.agentAssigned &&
                                  Array.isArray(pref.agentAssigned) &&
                                  pref.agentAssigned.some(a =>
                                    (typeof a === 'string' && a === agent._id) ||
                                    (typeof a === 'object' && String(a._id || a) === String(agent._id))
                                  );
                                return (
                                  <li
                                    key={agent._id}
                                    style={{
                                      padding: '6px 8px',
                                      borderBottom: '1px solid #F4F7F9',
                                      cursor: alreadyAssigned ? 'not-allowed' : 'pointer',
                                      opacity: alreadyAssigned ? 0.6 : 1,
                                      bgcolor: alreadyAssigned ? '#E2E8F0' : 'transparent',
                                    }}
                                    onClick={() => { if (!alreadyAssigned) handleAgentClick(agent); }}
                                  >
                                    <Box sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{agent.agentCode}</Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxHeight: 40, overflow: 'hidden', textOverflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {(agent.preferredSectors || []).join(', ')}
                                    </Typography>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #F4F7F9' }}>
                            <Button size="small" disabled={agentsPage === 1} onClick={() => fetchAgents(Math.max(1, agentsPage - 1))} sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}>Prev</Button>
                            <Typography variant="caption" color="text.secondary">Page {agentsPage} / {agentsTotalPages || 1}</Typography>
                            <Button size="small" disabled={agentsPage === agentsTotalPages || agentsTotalPages === 0} onClick={() => fetchAgents(Math.min((agentsTotalPages || 1), agentsPage + 1))} sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}>Next</Button>
                          </Box>
                        </Box>
                      )}
                    </div>

                    <IconButton
                      size="small"
                      onClick={() => { if (pref.status !== 'INACTIVE') setDeleteId(pref._id); }}
                      disabled={pref.status === 'INACTIVE'}
                      sx={{ color: 'error.main' }}
                      aria-label="Delete preference"
                    >
                      <DeleteIcon size={16} />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        </Box>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 4 }}>
            <Button
              size="small"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              sx={{ borderRadius: 2, minWidth: 80 }}
            >
              Previous
            </Button>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 120, textAlign: 'center' }}>
              Page {pagination.page} of {pagination.totalPages}
            </Typography>
            <Button
              size="small"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              sx={{ borderRadius: 2, minWidth: 80 }}
            >
              Next
            </Button>
          </Box>
        )}
      </Box>

      {/* Alerts */}
      {assignSuccess && (
        <Alert severity="success" sx={{ mb: 2, position: 'fixed', bottom: 24, right: 24, zIndex: 2000 }}>
          <CheckCircle size={18} />
          {assignSuccess}
        </Alert>
      )}
      {assignError && (
        <Alert severity="error" sx={{ mb: 2, position: 'fixed', bottom: 24, right: 24, zIndex: 2000 }}>
          <AlertCircle size={18} />
          {assignError}
        </Alert>
      )}

      )}

      {/* Agent Details Modal */}
      <Dialog
        open={selectedAgent != null}
        onClose={() => setSelectedAgent(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {selectedAgent.name} ({selectedAgent.agentCode})
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ fontWeight: 600 }}><strong>Email:</strong> {selectedAgent.email}</Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ fontWeight: 600 }}><strong>Mobile:</strong> {selectedAgent.mobileNumber}</Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ fontWeight: 600 }}><strong>Agency:</strong> {selectedAgent.agencyName || '—'}</Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ fontWeight: 600 }}><strong>Experience (yrs):</strong> {selectedAgent.experienceYears || '—'}</Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ fontWeight: 600 }}><strong>Areas Covered:</strong> {(selectedAgent.areasCovered || []).join(', ')}</Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ fontWeight: 600 }}><strong>Preferred Sectors:</strong> {(selectedAgent.preferredSectors || []).join(', ')}</Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ fontWeight: 600 }}><strong>Property Types:</strong> {(selectedAgent.propertyTypes || []).join(', ')}</Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSelectedAgent(null)} sx={{ borderRadius: 2 }}>Close</Button>
          <Button
            onClick={() => handleAssignAgent(assigningLeadId, selectedAgent._id)}
            disabled={assigning || isAssignDisabledForLead(assigningLeadId)}
            variant="contained"
            sx={{ bgcolor: '#00A79D', borderRadius: 2 }}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteId != null}
        title="Delete preference"
        message="Are you sure you want to delete this preference? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={() => handleDeletePreference(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
};

export default AdminPreferencesDashboard;
