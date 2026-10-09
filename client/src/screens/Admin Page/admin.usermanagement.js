import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  AlertCircle,
  Award,
  BarChart3,
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Home,
  Mail,
  Phone,
  RefreshCw,
  Search,
  User,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, PageHeader, StatusChip } from "./shell/adminUi";
import "./admin.css";

/** Shared card chrome from the admin design tokens, applied via sx (never inline style objects). */
const CARD = {
  borderRadius: "12px",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 2px 8px rgba(0,51,102,0.05)",
  overflow: "hidden",
  "&:before": { display: "none" },
};

/** Titled block inside an expanded user row (matches the original section style). */
function Section({ icon: Icon, title, children }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, pb: 1.5, borderBottom: "2px solid #22D3EE" }}
      >
        <Icon size={18} color="#003366" />
        <Typography variant="h3" component="h3" sx={{ fontSize: "1rem", fontWeight: 700, color: "primary.main" }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

/** Label / value tile used across the expanded profile. */
function InfoItem({ icon, label, children }) {
  return (
    <Box sx={{ bgcolor: "#F4F7F9", border: "1px solid", borderColor: "divider", borderRadius: "10px", p: 2.5, height: "100%" }}>
      <Typography
        variant="caption"
        sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}
      >
        {icon}
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", wordBreak: "break-word" }}>
        {children}
      </Typography>
    </Box>
  );
}

/** Gradient counter tile used for reward and engagement totals. */
function StatTile({ value, label, danger = false }) {
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
        color: "#FFFFFF",
        textAlign: "center",
        p: 3,
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,167,157,0.3)",
      }}
    >
      <Typography
        component="div"
        sx={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.1, mb: 1, color: danger ? "#DC2626" : "inherit", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, opacity: 0.9 }}>
        {label}
      </Typography>
    </Box>
  );
}

/** Responsive grid of InfoItem tiles (replaces the old auto-fit info grid). */
function InfoGrid({ children }) {
  return (
    <Grid container spacing={2}>
      {children}
    </Grid>
  );
}

function InfoGridItem({ span, children }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: span || 4 }}>
      {children}
    </Grid>
  );
}

const UserManagementDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedProperties, setExpandedProperties] = useState({});

  // Pagination state for admin user listing
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10); // fixed page size

  // Access token for admin API calls
  const accessToken = localStorage.getItem("accessToken");

  // Toggle state for expanded AI Assistant preferences per user
  const [expandedAIUsers, setExpandedAIUsers] = useState({});

  // State to store each user's reward activity summary
  const [userRewards, setUserRewards] = useState({});
  // Visible property counts per user (for Load More)
  const [visiblePropertyCounts, setVisiblePropertyCounts] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_ADMIN_GET_USERS_API}?page=${page}&limit=${pageSize}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "Unable to read response body");
        console.error("fetchUsers: non-OK response", response.status, text);
        throw new Error("Failed to fetch users");
      }

      const data = await response.json().catch(() => null);
      if (!data || !Array.isArray(data.users)) {
        console.warn("fetchUsers: unexpected response shape", data);
        setUsers([]);
        setError(null);
        setTotalPages(1);
        return;
      }

      // Normalize aiAssistantUsage into expected shape for the UI.
      // Backend may return:
      //  - null/undefined
      //  - an object already shaped like { rentalPreferences: {...}, salePreferences: {...}, ... }
      //  - an array of assistant documents [{ assistantType: 'rental', preferences: {...}, ... }, ...]
      const normalized = (data.users || []).map((u) => {
        let aiUsage = u.aiAssistantUsage || null;

        if (Array.isArray(aiUsage)) {
          // convert array of assistant docs into object with rentalPreferences and salePreferences
          const combined = { rentalPreferences: {}, salePreferences: {}, email: u.email };
          aiUsage.forEach((doc) => {
            const type = (doc.assistantType || "").toString().toLowerCase();
            if (type === "rental") combined.rentalPreferences = doc.preferences || {};
            else if (type === "sale") combined.salePreferences = doc.preferences || {};
            else combined[type] = doc.preferences || {};
          });
          aiUsage = combined;
        } else if (aiUsage && aiUsage.assistantType && aiUsage.preferences) {
          // single assistant document returned as an object
          const obj = { rentalPreferences: {}, salePreferences: {} };
          const type = (aiUsage.assistantType || "").toString().toLowerCase();
          if (type === "rental") obj.rentalPreferences = aiUsage.preferences || {};
          else if (type === "sale") obj.salePreferences = aiUsage.preferences || {};
          aiUsage = obj;
        } else if (aiUsage && (aiUsage.rentalPreferences || aiUsage.salePreferences)) {
          // already shaped correctly — nothing to normalize
        } else {
          aiUsage = aiUsage || null;
        }

        return {
          ...u,
          aiAssistantUsage: aiUsage,
        };
      });

      setUsers(normalized);
      setTotalPages(data.totalPages || 1);

      // If backend returned page, update currentPage (keeps client/server in sync)
      if (typeof data.page === "number" && data.page !== currentPage) setCurrentPage(data.page);

      // Log summary for debugging: number of users and first user's aiUsage
      console.log("fetched users count:", normalized.length);
      if (normalized.length > 0) console.log("first user aiAssistantUsage:", normalized[0].aiAssistantUsage);

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reward activity summary for a specific user
  const fetchUserRewards = async (userId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BASE_API}/api/admin/rewards/${userId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );
      const data = await response.json();
      setUserRewards((prev) => ({
        ...prev,
        [userId]: {
          active: data.activeCount || 0,
          inactive: data.inactiveCount || 0,
          rewards: data.rewards || [],
        },
      }));
    } catch (error) {
      console.error("Error fetching rewards:", error);
    }
  };

  // Toggle expansion and fetch rewards if expanding
  const toggleUserExpansion = (index) => {
    setExpandedUsers((prev) => {
      const isExpanding = !prev[index];
      if (isExpanding) {
        fetchUserRewards(users[index]._id);
      }
      return {
        ...prev,
        [index]: isExpanding,
      };
    });
  };

  const togglePropertyExpansion = (userIndex, propertyIndex) => {
    const key = `${userIndex}-${propertyIndex}`;
    setExpandedProperties((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatNumber = (n) => {
    try {
      return Number(n || 0).toLocaleString("en-IN");
    } catch (e) {
      return "0";
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader
          title="User Management Dashboard"
          description="Comprehensive overview of all registered users and their activities"
          actions={
            <Button variant="outlined" startIcon={<RefreshCw size={16} />} disabled sx={{ minHeight: 44 }}>
              Refresh
            </Button>
          }
        />
        <Stack spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Box key={i} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px", bgcolor: "background.paper", p: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Skeleton variant="circular" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="40%" height={26} />
                  <Skeleton variant="text" width="20%" height={20} />
                </Box>
                <Skeleton variant="circular" width={24} height={24} />
              </Stack>
            </Box>
          ))}
        </Stack>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="User Management Dashboard"
          description="Comprehensive overview of all registered users and their activities"
          actions={
            <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => fetchUsers(currentPage)} sx={{ minHeight: 44 }}>
              Retry
            </Button>
          }
        />
        <Box className="error-state">
          <Box className="error-state-icon">
            <AlertCircle size={26} color="#DC2626" />
          </Box>
          <Typography className="error-state-title">Error Loading Users</Typography>
          <Typography className="error-state-description">{error}</Typography>
          <Button
            variant="contained"
            startIcon={<RefreshCw size={16} />}
            onClick={() => fetchUsers(currentPage)}
            sx={{ minHeight: 44, bgcolor: "#00A79D", "&:hover": { bgcolor: "#008f85" } }}
          >
            Retry
          </Button>
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="User Management Dashboard"
        description="Comprehensive overview of all registered users and their activities"
        actions={
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => fetchUsers(currentPage)} sx={{ minHeight: 44 }}>
            Refresh
          </Button>
        }
      />

      {/* Pagination */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent={{ xs: "space-between", sm: "flex-end" }}
        sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}
      >
        <Button
          size="small"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          sx={{
            minHeight: 44,
            minWidth: 96,
            borderRadius: 2,
            bgcolor: currentPage <= 1 ? "action.hover" : "primary.main",
            color: currentPage <= 1 ? "text.secondary" : "white",
          }}
        >
          Previous
        </Button>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", minWidth: 110, textAlign: "center" }}>
          Page {currentPage} of {totalPages}
        </Typography>
        <Button
          size="small"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages || users.length < pageSize}
          sx={{
            minHeight: 44,
            minWidth: 96,
            borderRadius: 2,
            bgcolor: currentPage >= totalPages || users.length < pageSize ? "action.hover" : "primary.main",
            color: currentPage >= totalPages || users.length < pageSize ? "text.secondary" : "white",
          }}
        >
          Next
        </Button>
      </Stack>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Registered users will appear here. If you expect to see users, try another page or refresh."
          action={
            <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={() => fetchUsers(currentPage)} sx={{ minHeight: 44 }}>
              Refresh
            </Button>
          }
        />
      ) : (
        <Stack spacing={2}>
          {users.map((user, userIndex) => {
            const propertiesPosted = Array.isArray(user.propertiesPosted) ? user.propertiesPosted : [];
            const aiUsage = user.aiAssistantUsage;
            const hasPrefs =
              aiUsage &&
              (Object.keys(aiUsage.rentalPreferences || {}).length > 0 ||
                Object.keys(aiUsage.salePreferences || {}).length > 0);
            const aiLastUsed = aiUsage
              ? aiUsage.updatedAt
                ? formatDate(aiUsage.updatedAt)
                : aiUsage.createdAt
                ? formatDate(aiUsage.createdAt)
                : "N/A"
              : "N/A";
            const rewardActivity = userRewards[user._id];

            return (
              <Accordion key={userIndex} expanded={Boolean(expandedUsers[userIndex])} onChange={() => toggleUserExpansion(userIndex)} sx={CARD}>
                <AccordionSummary
                  expandIcon={<ChevronDown size={20} color="#003366" />}
                  sx={{ minHeight: 72, px: 3, "& .MuiAccordionSummary-content": { my: 2 } }}
                >
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      mr: 2,
                      flexShrink: 0,
                      background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                      fontWeight: 700,
                    }}
                  >
                    {user.mobileNumber ? user.mobileNumber.slice(-1) : "U"}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: "primary.main", fontSize: "1rem" }}>
                      {user.mobileNumber || "No Mobile Number"}
                    </Typography>
                    <Chip
                      label={user.role || "User"}
                      size="small"
                      sx={{
                        mt: 0.5,
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        borderRadius: "999px",
                        bgcolor: "rgba(34,211,238,0.20)",
                        color: "primary.main",
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 3, px: 3 }}>
                  {/* Basic Information */}
                  <Section icon={User} title="Basic Information">
                    <InfoGrid>
                      <InfoGridItem span={6}>
                        <InfoItem icon={<Phone size={13} />} label="Mobile Number">
                          {user.mobileNumber || "Not provided"}
                        </InfoItem>
                      </InfoGridItem>
                      <InfoGridItem span={6}>
                        <InfoItem icon={<Calendar size={13} />} label="Registered At">
                          {formatDate(user.registeredAt)}
                        </InfoItem>
                      </InfoGridItem>
                    </InfoGrid>
                  </Section>

                  {/* AI Assistant Usage */}
                  <Section icon={Bot} title="AI Assistant Usage">
                    <InfoGrid>
                      <InfoGridItem span={6}>
                        <InfoItem icon={<Mail size={13} />} label="Email">
                          {(aiUsage && aiUsage.email) || user.email || "N/A"}
                        </InfoItem>
                      </InfoGridItem>
                      <InfoGridItem span={6}>
                        <InfoItem icon={<Calendar size={13} />} label="Last Used">
                          {aiLastUsed}
                        </InfoItem>
                      </InfoGridItem>
                    </InfoGrid>

                    <Accordion
                      expanded={Boolean(expandedAIUsers[user._id])}
                      onChange={() =>
                        setExpandedAIUsers((prev) => ({
                          ...prev,
                          [user._id]: !prev[user._id],
                        }))
                      }
                      sx={{
                        mt: 2,
                        bgcolor: "#FFFFFF",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "10px !important",
                        boxShadow: "none",
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary expandIcon={<ChevronDown size={18} color="#003366" />} sx={{ minHeight: 52, bgcolor: "#F4F7F9", px: 2.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                          User Preferences
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ py: 3 }}>
                        {hasPrefs ? (
                          <Grid container spacing={2}>
                            {[
                              { title: "Rental Preferences", prefs: (aiUsage && aiUsage.rentalPreferences) || {}, empty: "No rental preferences available" },
                              { title: "Sale Preferences", prefs: (aiUsage && aiUsage.salePreferences) || {}, empty: "No sale preferences available" },
                            ].map((pref) => (
                              <Grid size={{ xs: 12, md: 6 }} key={pref.title}>
                                <Box sx={{ bgcolor: "#F9FAFB", border: "1px solid", borderColor: "divider", borderRadius: "8px", p: 2, height: "100%" }}>
                                  <Typography variant="h4" sx={{ color: "primary.main", fontWeight: 700, mb: 1.5 }}>
                                    {pref.title}
                                  </Typography>
                                  {Object.keys(pref.prefs).length > 0 ? (
                                    <Table size="small" aria-label={pref.title}>
                                      <TableBody>
                                        {Object.entries(pref.prefs).map(([key, value]) => (
                                          <TableRow key={key}>
                                            <TableCell
                                              sx={{
                                                fontWeight: 600,
                                                color: "primary.main",
                                                textTransform: "capitalize",
                                                borderBottom: "1px solid #E5E9EE",
                                                pl: 0,
                                                width: "45%",
                                              }}
                                            >
                                              {key}
                                            </TableCell>
                                            <TableCell sx={{ color: "text.secondary", borderBottom: "1px solid #E5E9EE", pr: 0 }}>
                                              {Array.isArray(value) ? value.join(", ") : value || "N/A"}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  ) : (
                                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                      {pref.empty}
                                    </Typography>
                                  )}
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Box sx={{ bgcolor: "#F4F7F9", borderRadius: "8px", p: 2.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", mb: 0.5 }}>
                              No preferences available
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              This user has not saved any AI assistant preferences yet.
                            </Typography>
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </Section>

                  {/* Rewards & Achievements */}
                  <Section icon={Award} title="Rewards & Achievements">
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <StatTile value={user.rewards?.count || 0} label="Total Rewards" />
                      </Grid>
                      {user.rewards?.latestMessage && (
                        <Grid size={{ xs: 12, sm: 6, md: 9 }}>
                          <InfoItem label="Latest Reward">{user.rewards.latestMessage}</InfoItem>
                        </Grid>
                      )}
                    </Grid>
                  </Section>

                  {/* Reward Activity */}
                  {rewardActivity && (
                    <Section icon={Award} title="Reward Activity">
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <StatTile value={rewardActivity.active} label="Active Rewards" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <StatTile value={rewardActivity.inactive} label="Inactive Rewards" danger />
                        </Grid>
                      </Grid>

                      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px", p: 3, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main", mb: 2 }}>
                          Reward Details
                        </Typography>
                        {rewardActivity.rewards && rewardActivity.rewards.length > 0 ? (
                          <TableContainer sx={{ overflowX: "auto" }}>
                            <Table sx={{ minWidth: 480 }} aria-label="Reward details">
                              <TableHead>
                                <TableRow>
                                  {["Message", "Distributed At", "Status"].map((heading) => (
                                    <TableCell
                                      key={heading}
                                      sx={{ fontWeight: 700, color: "primary.main", bgcolor: "#F4F7F9", borderBottom: "2px solid #00A79D", whiteSpace: "nowrap" }}
                                    >
                                      {heading}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {rewardActivity.rewards.map((reward, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{reward.message}</TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>{formatDate(reward.distributedAt)}</TableCell>
                                    <TableCell>
                                      <StatusChip status={reward.isActive ? "active" : "inactive"} />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : (
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            No rewards available
                          </Typography>
                        )}
                      </Box>
                    </Section>
                  )}

                  {/* Engagement Statistics */}
                  <Section icon={BarChart3} title="Engagement Statistics">
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <StatTile value={user.engagementStats?.totalViews || 0} label="Total Views" />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <StatTile value={user.engagementStats?.totalSaves || 0} label="Total Saves" />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <StatTile value={user.engagementStats?.ratingsCount || 0} label="Ratings Count" />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <StatTile value={user.averageRatingGiven ? user.averageRatingGiven.toFixed(1) : "N/A"} label="Avg Rating Given" />
                      </Grid>
                    </Grid>
                  </Section>

                  {/* Search History */}
                  {user.searchHistory && user.searchHistory.length > 0 && (
                    <Section icon={Search} title={`Search History (${user.searchHistory.length})`}>
                      <Box sx={{ maxHeight: 300, overflowY: "auto", pr: 1 }}>
                        {user.searchHistory.map((search, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 2,
                              bgcolor: "#FFFFFF",
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: "8px",
                              p: 2,
                              mb: 1.5,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
                              {search.query}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                              {formatDate(search.timestamp)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Section>
                  )}

                  {/* Properties Posted */}
                  {propertiesPosted.length > 0 && (
                    <Section icon={Home} title={`Properties Posted (${propertiesPosted.length})`}>
                      {propertiesPosted
                        .slice(0, visiblePropertyCounts[user._id] || 10)
                        .map((property, propIndex) => {
                          const key = `${userIndex}-${propIndex}`;
                          const dpt = (property.defaultpropertytype || "").toLowerCase();
                          const isRental = dpt ? dpt === "rental" : property.monthlyRent !== undefined;
                          const isPropExpanded = Boolean(expandedProperties[key]);

                          return (
                            <Box
                              key={propIndex}
                              sx={{
                                bgcolor: "#F4F7F9",
                                border: "1px solid",
                                borderColor: isPropExpanded ? "#00A79D" : "divider",
                                borderRadius: "12px",
                                mb: 2,
                                overflow: "hidden",
                                transition: "border-color .2s ease",
                              }}
                            >
                              <Box
                                component="button"
                                type="button"
                                onClick={() => togglePropertyExpansion(userIndex, propIndex)}
                                aria-expanded={isPropExpanded}
                                sx={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 2,
                                  p: 2.5,
                                  minHeight: 56,
                                  border: "none",
                                  bgcolor: "transparent",
                                  font: "inherit",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  "&:hover": { bgcolor: "action.hover" },
                                  "&:focus-visible": { outline: "2px solid #00A79D", outlineOffset: -2 },
                                }}
                              >
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                                  <Home size={18} color="#003366" />
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", whiteSpace: "nowrap" }}>
                                    Property {propIndex + 1}
                                  </Typography>
                                  {(property.title || property.propertyType) && (
                                    <Typography
                                      variant="body2"
                                      sx={{ color: "text.secondary", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                    >
                                      — {property.title || property.propertyType}
                                    </Typography>
                                  )}
                                  <Chip
                                    size="small"
                                    label={isRental ? "RENTAL" : "SALE"}
                                    sx={{
                                      height: 22,
                                      fontWeight: 700,
                                      borderRadius: "6px",
                                      bgcolor: isRental ? "#00A79D" : "#22D3EE",
                                      color: isRental ? "#FFFFFF" : "#003366",
                                      flexShrink: 0,
                                    }}
                                  />
                                </Stack>
                                {isPropExpanded ? <ChevronUp size={20} color="#003366" /> : <ChevronDown size={20} color="#003366" />}
                              </Box>

                              <Collapse in={isPropExpanded}>
                                <Box sx={{ px: 2.5, pb: 2.5 }}>
                                  <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const isSale = property.defaultpropertytype === "sale" || (!property.defaultpropertytype && !isRental);
                                        navigate(isSale ? `/Saledetails/${property._id}` : `/Rentaldetails/${property._id}`);
                                      }}
                                      sx={{ minHeight: 44, borderRadius: 2 }}
                                    >
                                      Open Details
                                    </Button>
                                  </Stack>
                                  <InfoGrid>
                                    {isRental ? (
                                      <>
                                        <InfoGridItem span={6}>
                                          <InfoItem label="Monthly Rent">₹{property.monthlyRent ? formatNumber(property.monthlyRent) : "N/A"}</InfoItem>
                                        </InfoGridItem>
                                        <InfoGridItem span={6}>
                                          <InfoItem label="Address">{property.address + property.Sector || "N/A"}</InfoItem>
                                        </InfoGridItem>
                                        {property.totalArea?.sqft !== undefined && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="Total Area (sqft)">{property.totalArea.sqft}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        {property.totalArea?.configuration && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="Configuration">{property.totalArea.configuration}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        {typeof property.cloudinaryAccountIndex === "number" && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="Cloudinary Account">#{property.cloudinaryAccountIndex + 1}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        {property.cloudinaryFolder && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="Cloudinary Folder">{property.cloudinaryFolder}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        {property.propertyType && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="Property Type">{property.propertyType}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        {property.bhkType && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="BHK Type">{property.bhkType}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        <InfoGridItem span={6}>
                                          <InfoItem label="Listing By">{property.ownerType || "Owner"}</InfoItem>
                                        </InfoGridItem>
                                      </>
                                    ) : (
                                      <>
                                        <InfoGridItem span={6}>
                                          <InfoItem label="Price">₹{property.price ? formatNumber(property.price) : "N/A"}</InfoItem>
                                        </InfoGridItem>
                                        <InfoGridItem span={6}>
                                          <InfoItem label="Location">{property.location || "N/A"}</InfoItem>
                                        </InfoGridItem>
                                        {property.totalArea?.sqft !== undefined && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="Total Area (sqft)">{property.totalArea.sqft}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        {property.totalArea?.configuration && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="Configuration">{property.totalArea.configuration}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        {property.propertyType && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="Property Type">{property.propertyType}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        {property.bhkType && (
                                          <InfoGridItem span={6}>
                                            <InfoItem label="BHK Type">{property.bhkType}</InfoItem>
                                          </InfoGridItem>
                                        )}
                                        <InfoGridItem span={6}>
                                          <InfoItem label="Listing By">{property.ownerType || "Owner"}</InfoItem>
                                        </InfoGridItem>
                                      </>
                                    )}
                                    {property.createdAt && (
                                      <InfoGridItem span={6}>
                                        <InfoItem label="Posted On">{formatDate(property.createdAt)}</InfoItem>
                                      </InfoGridItem>
                                    )}
                                  </InfoGrid>
                                </Box>
                              </Collapse>
                            </Box>
                          );
                        })}

                      {propertiesPosted.length > (visiblePropertyCounts[user._id] || 20) && (
                        <Box sx={{ textAlign: "center", mt: 2 }}>
                          <Button
                            variant="contained"
                            onClick={() =>
                              setVisiblePropertyCounts((prev) => ({
                                ...prev,
                                [user._id]: (prev[user._id] || 20) + 20,
                              }))
                            }
                            sx={{ minHeight: 44, borderRadius: 2 }}
                          >
                            Load more properties
                          </Button>
                        </Box>
                      )}
                    </Section>
                  )}

                  {/* Payments */}
                  {user.payments && user.payments.length > 0 && (
                    <Section icon={DollarSign} title={`Payment History (${user.payments.length})`}>
                      <Box sx={{ maxHeight: 400, overflowY: "auto", pr: 1 }}>
                        {user.payments.map((payment, idx) => (
                          <Box key={idx} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px", p: 3, mb: 2, bgcolor: "#FFFFFF" }}>
                            <InfoGrid>
                              <InfoGridItem span={6}>
                                <InfoItem label="Amount">₹{payment.amount ? formatNumber(payment.amount) : "N/A"}</InfoItem>
                              </InfoGridItem>
                              <InfoGridItem span={6}>
                                <InfoItem label="Status">
                                  {payment.status ? <StatusChip status={payment.status} /> : "N/A"}
                                </InfoItem>
                              </InfoGridItem>
                              <InfoGridItem span={6}>
                                <InfoItem label="Payment Date">{formatDate(payment.createdAt)}</InfoItem>
                              </InfoGridItem>
                              <InfoGridItem span={6}>
                                <InfoItem label="Property Type">{payment.propertyModel || "N/A"}</InfoItem>
                              </InfoGridItem>
                            </InfoGrid>
                            {payment.property && (
                              <Box sx={{ mt: 2.5, pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", mb: 1.5 }}>
                                  Property Details:
                                </Typography>
                                <InfoGrid>
                                  {payment.property.address && (
                                    <InfoGridItem span={6}>
                                      <InfoItem label="Address">{payment.property.address}</InfoItem>
                                    </InfoGridItem>
                                  )}
                                  {payment.property.location && (
                                    <InfoGridItem span={6}>
                                      <InfoItem label="Location">{payment.property.location}</InfoItem>
                                    </InfoGridItem>
                                  )}
                                  {payment.property.monthlyRent && (
                                    <InfoGridItem span={6}>
                                      <InfoItem label="Monthly Rent">
                                        ₹{payment.property.monthlyRent ? formatNumber(payment.property.monthlyRent) : "N/A"}
                                      </InfoItem>
                                    </InfoGridItem>
                                  )}
                                  {payment.property.price && (
                                    <InfoGridItem span={6}>
                                      <InfoItem label="Price">₹{payment.property.price ? formatNumber(payment.property.price) : "N/A"}</InfoItem>
                                    </InfoGridItem>
                                  )}
                                </InfoGrid>
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Section>
                )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}
    </>
  );
};

export default UserManagementDashboard;
