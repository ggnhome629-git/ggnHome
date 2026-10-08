import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Activity,
  AlertCircle,
  Award,
  Bookmark,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  Home,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { AnimatedNumber } from "../../components/motion";
import { EmptyState, PageHeader, StatCard, StatusChip } from "./shell/adminUi";
import "./admin.css";

/** Shared card chrome from the admin design tokens, applied via sx (never inline style objects). */
const CARD = {
  borderRadius: "12px",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 2px 8px rgba(0,51,102,0.05)",
};

/** Collapsible section header — a real button so it is fully keyboard accessible. */
function SectionHeader({ icon: Icon, title, expanded, onToggle }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: 3,
        py: 2,
        minHeight: 56,
        border: "none",
        borderBottom: expanded ? "1px solid" : "none",
        borderColor: "divider",
        bgcolor: "background.paper",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
        "&:hover": { bgcolor: "action.hover" },
        "&:focus-visible": { outline: "2px solid #00A79D", outlineOffset: -2 },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
        <Box className="stat-card-icon teal" sx={{ width: 36, height: 36, flexShrink: 0 }}>
          <Icon size={18} color="#00A79D" />
        </Box>
        <Typography variant="h2" component="span" sx={{ fontSize: "1.125rem", fontWeight: 700, color: "primary.main" }}>
          {title}
        </Typography>
      </Stack>
      {expanded ? <ChevronUp size={20} color="#00A79D" /> : <ChevronDown size={20} color="#00A79D" />}
    </Box>
  );
}

/** Previous / Next footer shared by the two paginated tables (44px tap targets). */
function Pager({ page, onPrev, onNext, canNext, totalLabel }) {
  const btn = (disabled) => ({
    minHeight: 44,
    minWidth: 96,
    borderRadius: 2,
    px: 2,
    bgcolor: disabled ? "action.hover" : "primary.main",
    color: disabled ? "text.secondary" : "white",
  });
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
        px: 3,
        py: 2,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Showing page {page}
        {totalLabel ? ` — ${totalLabel}` : ""}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={onPrev} disabled={page <= 1} sx={btn(page <= 1)}>
          Previous
        </Button>
        <Button size="small" onClick={onNext} disabled={!canNext} sx={btn(!canNext)}>
          Next
        </Button>
      </Stack>
    </Box>
  );
}

/** Horizontal progress bar with the brand gradient. */
function Bar({ pct, gradient }) {
  return (
    <Box sx={{ height: 8, borderRadius: 1, bgcolor: "#E5E9EE", overflow: "hidden" }}>
      <Box
        sx={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: "100%",
          background: gradient,
          borderRadius: 1,
          transition: "width .5s ease",
        }}
      />
    </Box>
  );
}

/** One leaderboard row: property details on the left, metric with icon on the right. */
function LeaderRow({ item, icon: Icon, color, render }) {
  if (!item || !item.property) return null;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        bgcolor: "#F4F7F9",
        borderRadius: "8px",
        p: 3,
        mb: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {item.property.propertyType || "Property"}
        </Typography>
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
          {item.property.Sector || item.property.address || "N/A"}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
        <Icon size={16} color={color} />
        <Typography variant="body2" sx={{ fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
          {render(item)}
        </Typography>
      </Stack>
    </Box>
  );
}

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    topProperties: false,
    recentActivity: true,
    approvedPayments: false,
    searchInsights: false,
    rewards: false,
  });

  // Pagination state for dashboard paginated sections
  const [approvedPage, setApprovedPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
  const [pageSize] = useState(5); // default page size coming from backend

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedPage, recentPage, pageSize]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch admin overview data with pagination params for approved payments and recent activity
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/admin/overview?approvedPage=${approvedPage}&recentPage=${recentPage}&limit=${pageSize}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const json = await response.json();
      setData(json);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error("Error fetching admin overview:", err);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <>
        <PageHeader
          title="Admin Dashboard Overview"
          description="Loading dashboard data…"
          actions={
            <Button variant="outlined" startIcon={<RefreshCw size={16} />} disabled sx={{ minHeight: 44 }}>
              Refresh
            </Button>
          }
        />
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[...Array(8)].map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card sx={CARD}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton variant="rounded" width={52} height={22} sx={{ borderRadius: "999px" }} />
                  </Stack>
                  <Skeleton variant="rounded" width="60%" height={34} />
                  <Skeleton variant="rounded" width="45%" height={18} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Card sx={{ ...CARD, mb: 4 }}>
          <CardContent>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={44} sx={{ mb: 1, borderRadius: "8px" }} />
            ))}
          </CardContent>
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Admin Dashboard Overview"
          description="Something went wrong while loading the dashboard"
          actions={
            <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={fetchDashboardData} sx={{ minHeight: 44 }}>
              Retry
            </Button>
          }
        />
        <Box className="error-state">
          <Box className="error-state-icon">
            <AlertCircle size={26} color="#DC2626" />
          </Box>
          <Typography className="error-state-title">Error Loading Dashboard</Typography>
          <Typography className="error-state-description">{error}</Typography>
          <Button
            variant="contained"
            onClick={fetchDashboardData}
            startIcon={<RefreshCw size={16} />}
            sx={{ minHeight: 44, bgcolor: "#00A79D", "&:hover": { bgcolor: "#008f85" } }}
          >
            Retry
          </Button>
        </Box>
      </>
    );
  }

  if (!data) return null;

  // Normalize incoming data and provide strong safe defaults
  const raw = data || {};
  const recentActivity = Array.isArray(raw.recentActivity) ? raw.recentActivity : [];
  const approvedPayments = Array.isArray(raw.approvedPayments) ? raw.approvedPayments : [];

  const summaryDefaults = {
    totalUsers: 0, renters: 0, owners: 0, admins: 0,
    totalProperties: 0, rentalCount: 0, saleCount: 0,
    pendingPayments: 0, approvedPayments: 0, approvedPaymentsThisMonth: 0,
    completedPayments: 0, totalRevenue: 0, totalPreferences: 0, totalSearches: 0,
    averagePropertyRating: 0, aiUsersCount: 0, activeUsersCount: 0, inactiveUsersCount: 0,
    totalRewardsDistributed: 0, totalRevenuePending: 0, totalRevenueCompleted: 0, totalRevenueApproved: 0,
    avgTransactionAmount: 0,
  };

  const engagementDefaults = { totalViews: 0, totalSaves: 0, totalRatings: 0, avgEngagementTime: 0 };
  const splitDefaults = { totalViews: 0, totalSaves: 0, avgEngagementTime: 0 };
  const chartsDefaults = {
    engagement: engagementDefaults,
    rewards: { totalRewards: 0, unclaimedRewards: 0, recentRewards: [] },
    searchInsights: { topSearches: [], mostSearchedLocations: [], avgSearchesPerUser: 0 },
    propertyStats: {
      topViewedRental: [], topSavedRental: [], topRatedRental: [],
      topViewedSale: [], topSavedSale: [], topRatedSale: [],
      rental: splitDefaults, sale: splitDefaults,
    },
    revenueByMethod: {},
    userGrowth: [],
    aiUsageByRole: {},
  };

  // Merge provided values with defaults
  const summary = Object.assign({}, summaryDefaults, (raw.summary && typeof raw.summary === "object") ? raw.summary : {});
  const charts = Object.assign({}, chartsDefaults, (raw.charts && typeof raw.charts === "object") ? raw.charts : {});

  const headlineStats = [
    {
      label: "Total Users",
      value: summary.totalUsers,
      icon: Users,
      tone: "#003366",
      hint: `${summary.renters} Renters • ${summary.owners} Owners • ${summary.admins} Admins`,
    },
    {
      label: "Properties",
      value: summary.totalProperties,
      icon: Home,
      tone: "#00A79D",
      hint: `${summary.rentalCount} Rental • ${summary.saleCount} Sale`,
    },
    {
      label: "Total Revenue",
      value: summary.totalRevenue,
      prefix: "₹",
      icon: DollarSign,
      tone: "#22D3EE",
      hint: `${summary.completedPayments + summary.approvedPayments} Transactions`,
    },
    {
      label: "Active Users",
      value: summary.activeUsersCount,
      icon: Activity,
      tone: "#10B981",
      hint: `${summary.inactiveUsersCount} Inactive`,
    },
    {
      label: "AI Users",
      value: summary.aiUsersCount,
      icon: Search,
      tone: "#003366",
      hint: `${summary.totalSearches} Total Searches`,
    },
    {
      label: "Rewards",
      value: summary.totalRewardsDistributed,
      icon: Award,
      tone: "#00A79D",
      hint: `${charts.rewards.unclaimedRewards} Unclaimed`,
    },
    {
      label: "Avg Rating",
      value: summary.averagePropertyRating,
      decimals: 1,
      icon: Star,
      tone: "#22D3EE",
      hint: `${charts.engagement.totalRatings} Total Ratings`,
    },
    {
      label: "Property Views",
      value: charts.engagement.totalViews,
      icon: Eye,
      tone: "#003366",
      hint: `${charts.engagement.totalSaves} Saves`,
    },
  ];

  const paymentTiles = [
    { status: "pending", count: summary.pendingPayments, amount: summary.totalRevenuePending, color: "#B45309", border: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
    { status: "approved", count: summary.approvedPayments, amount: summary.totalRevenueApproved, color: "#047857", border: "#10B981", bg: "rgba(16,185,129,0.08)" },
    { status: "completed", count: summary.completedPayments, amount: summary.totalRevenueCompleted, color: "#047857", border: "#00A79D", bg: "rgba(0,167,157,0.08)" },
  ];

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenueMethods = Object.entries(charts.revenueByMethod);
  const maxRevenue = Math.max(...revenueMethods.map(([, d]) => d.totalAmount || 0)) || 1;
  const userGrowth = Array.isArray(charts.userGrowth) ? charts.userGrowth : [];
  const maxUsers = Math.max(...userGrowth.map((d) => d.count || 0)) || 1;
  const topSearches = Array.isArray(charts.searchInsights?.topSearches) ? charts.searchInsights.topSearches : [];
  const topLocations = Array.isArray(charts.searchInsights?.mostSearchedLocations) ? charts.searchInsights.mostSearchedLocations : [];
  const maxSearchCount = Math.max(...topSearches.map((s) => s.count || 0)) || 1;
  const propertyStats = charts.propertyStats || {};
  const recentRewards = Array.isArray(charts.rewards.recentRewards) ? charts.rewards.recentRewards : [];
  const aiUsageByRole = charts.aiUsageByRole || {};

  const leaderboard = (heading, items, Icon, color, render) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1.5 }}>
        {heading}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          No data for this period
        </Typography>
      ) : (
        items.map((item, index) => <LeaderRow key={index} item={item} icon={Icon} color={color} render={render} />)
      )}
    </Box>
  );

  return (
    <>
      <PageHeader
        title="Admin Dashboard Overview"
        description={
          `Last updated: ${new Date().toLocaleString("en-IN")}` +
          (data?.lastUpdated ? ` • ${data.lastUpdated}` : "")
        }
        actions={
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={fetchDashboardData} sx={{ minHeight: 44 }}>
            Refresh
          </Button>
        }
      />

      {/* Headline stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {headlineStats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <StatCard
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              prefix={stat.prefix || ""}
              decimals={stat.decimals ?? 0}
              hint={stat.hint}
              tone={stat.tone}
            />
          </Grid>
        ))}
      </Grid>

      {/* Payment Status Overview */}
      <Card sx={{ ...CARD, mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <Box className="stat-card-icon teal" sx={{ width: 36, height: 36 }}>
              <DollarSign size={18} color="#00A79D" />
            </Box>
            <Typography variant="h2" sx={{ fontSize: "1.125rem", fontWeight: 700 }}>
              Payment Overview
            </Typography>
          </Stack>

          <Grid container spacing={3}>
            {paymentTiles.map((tile) => (
              <Grid item xs={12} sm={4} key={tile.status}>
                <Box
                  sx={{
                    p: 4,
                    textAlign: "center",
                    borderRadius: "8px",
                    border: "2px solid",
                    borderColor: tile.border,
                    backgroundColor: tile.bg,
                    height: "100%",
                  }}
                >
                  <StatusChip status={tile.status} />
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{ fontSize: "1.75rem", fontWeight: 800, color: tile.color, mt: 2, mb: 1, fontVariantNumeric: "tabular-nums" }}
                  >
                    <AnimatedNumber value={tile.count} />
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: tile.color }}>
                    {formatCurrency(tile.amount)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Revenue by method + user growth */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ ...CARD, height: "100%" }}>
            <CardContent>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
                Revenue by Payment Method
              </Typography>
              {revenueMethods.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                  No data for this period
                </Typography>
              ) : (
                <Stack spacing={3}>
                  {revenueMethods.map(([method, methodData]) => (
                    <Box key={method}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {method}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#00A79D", fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(methodData.totalAmount)}
                        </Typography>
                      </Box>
                      <Bar pct={(methodData.totalAmount / maxRevenue) * 100} gradient="linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)" />
                      <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                        {methodData.count} transactions • Avg: {formatCurrency(methodData.avgAmount)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ ...CARD, height: "100%" }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <TrendingUp size={18} color="#003366" />
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  User Growth (Last 12 Months)
                </Typography>
              </Stack>
              {userGrowth.slice(-6).length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                  No data for this period
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {userGrowth.slice(-6).map((item, index) => (
                    <Box key={index}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {monthNames[item.month - 1]} {item.year}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", fontVariantNumeric: "tabular-nums" }}>
                          {item.count} users
                        </Typography>
                      </Box>
                      <Bar pct={(item.count / maxUsers) * 100} gradient="linear-gradient(90deg, #003366 0%, #4A6A8A 100%)" />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Insights */}
      <Card sx={{ ...CARD, mb: 4 }}>
        <SectionHeader
          icon={Search}
          title="Search Insights"
          expanded={expandedSections.searchInsights}
          onToggle={() => toggleSection("searchInsights")}
        />
        <Collapse in={expandedSections.searchInsights}>
          <Box sx={{ p: 3 }}>
            {topSearches.length === 0 && topLocations.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No searches yet"
                description="Top search queries and locations will appear here once users start searching."
              />
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                  <Typography variant="h3" sx={{ fontSize: "1rem", color: "primary.main", mb: 2 }}>
                    Top Search Queries
                  </Typography>
                  {topSearches.slice(0, 10).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No data for this period
                    </Typography>
                  ) : (
                    topSearches.slice(0, 10).map((search, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                          bgcolor: "#F4F7F9",
                          borderRadius: "8px",
                          p: 2.5,
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {index + 1}. {search.query}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${search.count} searches`}
                          sx={{ bgcolor: "#22D3EE", color: "#FFFFFF", fontWeight: 700, height: 24 }}
                        />
                      </Box>
                    ))
                  )}
                </Grid>

                <Grid item xs={12} lg={6}>
                  <Typography variant="h3" sx={{ fontSize: "1rem", color: "primary.main", mb: 2 }}>
                    Most Searched Locations
                  </Typography>
                  {topLocations.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No data for this period
                    </Typography>
                  ) : (
                    topLocations.map((location, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                          bgcolor: "#F4F7F9",
                          borderRadius: "8px",
                          p: 2.5,
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {index + 1}. {location.location}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${location.count} searches`}
                          sx={{ bgcolor: "#00A79D", color: "#FFFFFF", fontWeight: 700, height: 24 }}
                        />
                      </Box>
                    ))
                  )}

                  <Box sx={{ mt: 3, p: 3, bgcolor: "#F4F7F9", borderRadius: "8px" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
                      Average Searches per User
                    </Typography>
                    <Typography variant="h3" sx={{ fontSize: "1.5rem", fontWeight: 800, color: "primary.main" }}>
                      {Number(charts.searchInsights?.avgSearchesPerUser || 0).toFixed(2)}
                    </Typography>
                  </Box>

                  <Typography variant="h3" sx={{ fontSize: "1rem", color: "primary.main", mt: 4, mb: 2 }}>
                    Top 5 Searches (Graph)
                  </Typography>
                  {topSearches.slice(0, 5).map((search, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {search.query}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#00A79D", fontVariantNumeric: "tabular-nums" }}>
                          {search.count}
                        </Typography>
                      </Box>
                      <Bar pct={(search.count / maxSearchCount) * 100} gradient="linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)" />
                    </Box>
                  ))}
                </Grid>
              </Grid>
            )}
          </Box>
        </Collapse>
      </Card>

      {/* Recent Activity */}
      <Card sx={{ ...CARD, mb: 4 }}>
        <SectionHeader
          icon={Activity}
          title="Recent Activity"
          expanded={expandedSections.recentActivity}
          onToggle={() => toggleSection("recentActivity")}
        />
        <Collapse in={expandedSections.recentActivity}>
          <Box>
            {recentActivity.length === 0 ? (
              <Box sx={{ px: 3, pb: 3 }}>
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  description="User and property activity from the last few days will appear here."
                />
              </Box>
            ) : (
              <>
                <Box sx={{ px: 3, pt: 3, pb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Latest platform events, page {recentPage}
                  </Typography>
                </Box>
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table sx={{ minWidth: 640 }}>
                    <TableHead>
                      <TableRow>
                        {["Type", "User", "Action", "Details", "Time"].map((heading) => (
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
                      {recentActivity.slice(0, 15).map((activity, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Chip
                              label={activity.type}
                              size="small"
                              sx={{
                                bgcolor:
                                  activity.type === "user"
                                    ? "#003366"
                                    : activity.type === "property"
                                    ? "#00A79D"
                                    : "#22D3EE",
                                color: "white",
                                fontWeight: 700,
                                height: 24,
                                fontSize: "0.7rem",
                              }}
                            />
                          </TableCell>
                          <TableCell>{activity.user}</TableCell>
                          <TableCell>{activity.action}</TableCell>
                          <TableCell>{activity.location}</TableCell>
                          <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{formatDate(activity.time)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Pager
                  page={recentPage}
                  onPrev={() => setRecentPage((p) => Math.max(1, p - 1))}
                  onNext={() => setRecentPage((p) => p + 1)}
                  canNext={Boolean(data?.recentActivity?.length === pageSize)}
                />
              </>
            )}
          </Box>
        </Collapse>
      </Card>

      {/* Approved Payments */}
      {approvedPayments.length > 0 && (
        <Card sx={{ ...CARD, mb: 4 }}>
          <SectionHeader
            icon={DollarSign}
            title={`Approved Payments (${summary.approvedPaymentsThisMonth} this month)`}
            expanded={expandedSections.approvedPayments}
            onToggle={() => toggleSection("approvedPayments")}
          />
          <Collapse in={expandedSections.approvedPayments}>
            <Box>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main", bgcolor: "#F4F7F9", borderBottom: "2px solid #00A79D" }}>Resident</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main", bgcolor: "#F4F7F9", borderBottom: "2px solid #00A79D" }}>Property</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "primary.main", bgcolor: "#F4F7F9", borderBottom: "2px solid #00A79D" }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main", bgcolor: "#F4F7F9", borderBottom: "2px solid #00A79D" }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "primary.main", bgcolor: "#F4F7F9", borderBottom: "2px solid #00A79D" }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvedPayments.map((payment, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{payment.resident?.email || "N/A"}</TableCell>
                        <TableCell>
                          {payment.property
                            ? `${payment.property.propertyType || "Property"} - ${payment.property.Sector || payment.property.address || "N/A"}`
                            : "N/A"}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#00A79D", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{payment.paymentMethod || "N/A"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(payment.paymentDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Pager
                page={approvedPage}
                onPrev={() => setApprovedPage((p) => Math.max(1, p - 1))}
                onNext={() => setApprovedPage((p) => p + 1)}
                canNext={Boolean(data?.approvedPayments?.length === pageSize)}
                totalLabel={`${summary.approvedPayments} approved`}
              />
            </Box>
          </Collapse>
        </Card>
      )}

      {/* Top Performing Properties */}
      <Card sx={{ ...CARD, mb: 4 }}>
        <SectionHeader
          icon={Star}
          title="Top Performing Properties"
          expanded={expandedSections.topProperties}
          onToggle={() => toggleSection("topProperties")}
        />
        <Collapse in={expandedSections.topProperties}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main", mb: 3 }}>
                  Top Rental Properties
                </Typography>
                {leaderboard("Most Viewed", propertyStats.topViewedRental || [], Eye, "#00A79D", (i) => i.viewsCount)}
                {leaderboard("Most Saved", propertyStats.topSavedRental || [], Bookmark, "#22D3EE", (i) => i.savesCount)}
                {leaderboard("Top Rated", propertyStats.topRatedRental || [], Star, "#F59E0B", (i) => Number(i.avgRating || 0).toFixed(1))}
              </Grid>
              <Grid item xs={12} lg={6}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main", mb: 3 }}>
                  Top Sale Properties
                </Typography>
                {leaderboard("Most Viewed", propertyStats.topViewedSale || [], Eye, "#00A79D", (i) => i.viewsCount)}
                {leaderboard("Most Saved", propertyStats.topSavedSale || [], Bookmark, "#22D3EE", (i) => i.savesCount)}
                {leaderboard("Top Rated", propertyStats.topRatedSale || [], Star, "#F59E0B", (i) => Number(i.avgRating || 0).toFixed(1))}
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Card>

      {/* Engagement Metrics */}
      <Card sx={{ ...CARD, mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <Box className="stat-card-icon teal" sx={{ width: 36, height: 36 }}>
              <Activity size={18} color="#00A79D" />
            </Box>
            <Typography variant="h2" sx={{ fontSize: "1.125rem", fontWeight: 700 }}>
              Engagement Metrics
            </Typography>
          </Stack>
          <Grid container spacing={3}>
            {[
              { label: "Total Views", value: charts.engagement.totalViews, icon: Eye, color: "#00A79D" },
              { label: "Total Saves", value: charts.engagement.totalSaves, icon: Bookmark, color: "#22D3EE" },
              { label: "Total Ratings", value: charts.engagement.totalRatings, icon: Star, color: "#F59E0B" },
              {
                label: "Avg Engagement Time",
                value: charts.engagement.avgEngagementTime ? `${Math.round(charts.engagement.avgEngagementTime)}s` : "N/A",
                icon: Activity,
                color: "#4A6A8A",
              },
            ].map((metric) => (
              <Grid item xs={12} sm={6} md={3} key={metric.label}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    bgcolor: "#F4F7F9",
                    borderRadius: "8px",
                    p: 3,
                    height: "100%",
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
                      {metric.label}
                    </Typography>
                    <Typography variant="h3" sx={{ fontSize: "1.75rem", fontWeight: 800, color: "primary.main", fontVariantNumeric: "tabular-nums" }}>
                      {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
                    </Typography>
                  </Box>
                  <metric.icon size={32} color={metric.color} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Property Statistics */}
      <Card sx={{ ...CARD, mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <Box className="stat-card-icon teal" sx={{ width: 36, height: 36 }}>
              <Home size={18} color="#00A79D" />
            </Box>
            <Typography variant="h2" sx={{ fontSize: "1.125rem", fontWeight: 700 }}>
              Property Statistics
            </Typography>
          </Stack>
          <Grid container spacing={3}>
            {[
              { title: "Rental Properties", total: summary.rentalCount, stats: propertyStats.rental || {} },
              { title: "Sale Properties", total: summary.saleCount, stats: propertyStats.sale || {} },
            ].map((group) => (
              <Grid item xs={12} md={6} key={group.title}>
                <Typography variant="h3" sx={{ fontSize: "1rem", color: "primary.main", mb: 2 }}>
                  {group.title}
                </Typography>
                {[
                  { label: "Total Properties", value: group.total, color: "primary.main" },
                  { label: "Total Views", value: group.stats.totalViews || 0, color: "#00A79D" },
                  { label: "Total Saves", value: group.stats.totalSaves || 0, color: "#22D3EE" },
                  {
                    label: "Avg Engagement Time",
                    value: group.stats.avgEngagementTime ? `${Math.round(group.stats.avgEngagementTime)}s` : "N/A",
                    color: "#4A6A8A",
                  },
                ].map((row) => (
                  <Box
                    key={row.label}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      bgcolor: "#F4F7F9",
                      borderRadius: "8px",
                      p: 2.5,
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {row.label}
                    </Typography>
                    <Typography variant="h3" sx={{ fontSize: "1.25rem", fontWeight: 700, color: row.color, fontVariantNumeric: "tabular-nums" }}>
                      {typeof row.value === "number" ? row.value.toLocaleString() : row.value}
                    </Typography>
                  </Box>
                ))}
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Rewards System */}
      <Card sx={{ ...CARD, mb: 4 }}>
        <SectionHeader
          icon={Award}
          title="Rewards System"
          expanded={expandedSections.rewards}
          onToggle={() => toggleSection("rewards")}
        />
        <Collapse in={expandedSections.rewards}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <Box className="stat-card" sx={{ textAlign: "center", p: 4 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                    Total Rewards
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: "1.75rem", fontWeight: 800, color: "primary.main" }}>
                    {charts.rewards.totalRewards}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="stat-card" sx={{ textAlign: "center", p: 4 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                    Unclaimed Rewards
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: "1.75rem", fontWeight: 800, color: "#00A79D" }}>
                    {charts.rewards.unclaimedRewards}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
              Recent Rewards
            </Typography>
            {recentRewards.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No rewards distributed yet"
                description="Rewards sent to users will be listed here."
              />
            ) : (
              recentRewards.map((reward, index) => (
                <Box
                  key={index}
                  className="card"
                  sx={{
                    p: 3,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {reward.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {formatDate(reward.createdAt)}
                    </Typography>
                  </Box>
                  <Award size={20} color="#00A79D" />
                </Box>
              ))
            )}
          </Box>
        </Collapse>
      </Card>

      {/* AI Usage by Role */}
      {Object.keys(aiUsageByRole).length > 0 && (
        <Card sx={{ ...CARD, mb: 4 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
              <Box className="stat-card-icon teal" sx={{ width: 36, height: 36 }}>
                <Users size={18} color="#00A79D" />
              </Box>
              <Typography variant="h2" sx={{ fontSize: "1.125rem", fontWeight: 700 }}>
                AI Assistant Usage by Role
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              {Object.entries(aiUsageByRole).map(([role, count]) => {
                const totalAIUsers = Object.values(aiUsageByRole).reduce((a, b) => a + b, 0) || 1;
                const percentage = (count / totalAIUsers) * 100;
                return (
                  <Grid item xs={12} sm={6} md={4} key={role}>
                    <Box sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: "8px" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
                          {role}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#00A79D", fontVariantNumeric: "tabular-nums" }}>
                          {count} users ({percentage.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <Bar
                        pct={percentage}
                        gradient={
                          role === "admin"
                            ? "linear-gradient(90deg, #003366 0%, #4A6A8A 100%)"
                            : role === "owner"
                            ? "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)"
                            : "linear-gradient(90deg, #22D3EE 0%, #4A6A8A 100%)"
                        }
                      />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Footer Stats */}
      <Box
        sx={{
          mt: 4,
          p: { xs: 3, md: 5 },
          bgcolor: "primary.main",
          borderRadius: 2,
          color: "white",
          textAlign: "center",
        }}
      >
        <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
          Platform Overview
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 600, mb: 1 }}>
          {summary.totalUsers.toLocaleString()} Users • {summary.totalProperties.toLocaleString()} Properties •{" "}
          {formatCurrency(summary.totalRevenue)} Revenue
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Average Transaction: {formatCurrency(summary.avgTransactionAmount)}
        </Typography>
      </Box>
    </>
  );
};

export default AdminDashboard;
