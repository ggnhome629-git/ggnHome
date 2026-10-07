import React, { useState, useEffect } from 'react';
import { AnimatedNumber } from '../../components/motion';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  useMediaQuery,
  useTheme,
  LinearProgress,
  Collapse,
  Skeleton,
  Alert,
  Paper,
} from "@mui/material";
import {
  TrendingUp,
  Users,
  Home,
  DollarSign,
  Search,
  Award,
  Activity,
  Eye,
  Bookmark,
  Star,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import './admin.css';

const AdminDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    topProperties: false,
    recentActivity: true,
    approvedPayments: false,
    searchInsights: false,
    rewards: false
  });

  // Pagination state for dashboard paginated sections
  const [approvedPage, setApprovedPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // default page size coming from backend

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedPage, recentPage, pageSize]);

  const handleLogout = async () => {
    const token = localStorage.getItem("accessToken");
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    setUser(null);
    navigate('/login');
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (res.ok) setUser(data);
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, []);

  const navItems = ['For Buyers', 'For Tenants', 'For Owners', 'For Dealers / Builders', 'Insights'];

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
      console.log('✅ Admin Overview Data:', json);
      setData(json);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('❌ Error fetching admin overview:', err);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#F4F7F9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#003366',
      color: '#FFFFFF',
      padding: '24px 32px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    headerTitle: {
      fontSize: '28px',
      fontWeight: '700',
      margin: '0 0 8px 0'
    },
    headerSubtitle: {
      fontSize: '14px',
      opacity: '0.9',
      margin: 0
    },
    main: {
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    statCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer'
    },
    statCardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
    },
    statHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    statTitle: {
      fontSize: '14px',
      color: '#4A6A8A',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    statIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#333333',
      marginBottom: '8px'
    },
    statLabel: {
      fontSize: '13px',
      color: '#4A6A8A'
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      cursor: 'pointer',
      userSelect: 'none'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      backgroundColor: '#F4F7F9',
      color: '#003366',
      fontWeight: '600',
      fontSize: '13px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      borderBottom: '2px solid #00A79D'
    },
    td: {
      padding: '16px 12px',
      borderBottom: '1px solid #F4F7F9',
      fontSize: '14px',
      color: '#333333'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600'
    },
    chartGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '24px',
      marginBottom: '32px'
    },
    chartBar: {
      height: '32px',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: '14px',
      marginBottom: '12px',
      transition: 'transform 0.2s'
    },
    propertyCard: {
      backgroundColor: '#F4F7F9',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#F4F7F9'
    },
    spinner: {
      width: '50px',
      height: '50px',
      border: '4px solid #F4F7F9',
      borderTop: '4px solid #003366',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    errorContainer: {
      padding: '32px',
      textAlign: 'center'
    },
    errorCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '48px',
      maxWidth: '600px',
      margin: '0 auto',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    button: {
      backgroundColor: '#00A79D',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    }
  };

  if (loading) {
    return (
      <Box className="admin-dashboard">
        <Box className="admin-container">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <Skeleton variant="rounded" width={200} height={48} sx={{ mb: 3 }} />
            <Skeleton variant="rounded" width={120} height={32} />
          </Box>
          <Grid container spacing={3} sx={{ mt: 4 }}>
            {[...Array(8)].map((_, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card className="stat-card">
                  <CardContent>
                    <Box className="stat-card-header">
                      <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: '50%' }} />
                      <Skeleton variant="rounded" width={50} height={22} sx={{ borderRadius: '999px' }} />
                    </Box>
                    <Skeleton variant="rounded" width="60%" height={34} />
                    <Skeleton variant="rounded" width="40%" height={18} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="admin-dashboard">
        <Box className="admin-container">
          <Box className="error-state">
            <Box className="error-state-icon">
              <AlertCircle size={26} color="#DC2626" />
            </Box>
            <Typography className="error-state-title">
              Error Loading Dashboard
            </Typography>
            <Typography className="error-state-description">
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={fetchDashboardData}
              startIcon={<RefreshCw size={16} />}
              className="btn-teal"
            >
              Retry
            </Button>
          </Box>
        </Box>
      </Box>
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
    avgTransactionAmount: 0
  };

  const chartsDefaults = {
    engagement: { totalViews: 0, totalSaves: 0, totalRatings: 0, avgEngagementTime: 0 },
    rewards: { totalRewards: 0, unclaimedRewards: 0, recentRewards: [] },
    searchInsights: { topSearches: [], mostSearchedLocations: [], avgSearchesPerUser: 0 },
    propertyStats: { topViewedRental: [], topSavedRental: [], topRatedRental: [], topViewedSale: [], topSavedSale: [], topRatedSale: [] },
    revenueByMethod: {},
    userGrowth: []
  };

  // Merge provided values with defaults
  const summary = Object.assign({}, summaryDefaults, (raw.summary && typeof raw.summary === 'object') ? raw.summary : {});
  const charts = Object.assign({}, chartsDefaults, (raw.charts && typeof raw.charts === 'object') ? raw.charts : {});

  const StatCardMUI = ({ title, numericValue, subtitle, icon: Icon, iconColor = '#003366' }) => (
    <Card className="stat-card">
      <CardContent>
        <Box className="stat-card-header">
          <Typography className="stat-card-label text-secondary">{title}</Typography>
          <Box className="stat-card-icon" style={{ color: iconColor }}>
            {Icon && <Icon size={20} color={iconColor} />}
          </Box>
        </Box>
        {numericValue !== undefined ? (
          <Typography className="stat-card-value">
            <AnimatedNumber value={numericValue} />
          </Typography>
        ) : null}
        {subtitle && (
          <Typography className="stat-card-label text-secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box className="admin-dashboard">
      <Box className="admin-container">
        {/* Header */}
        <Box className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <Box>
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: '24px', md: '28px' }, fontWeight: 700 }}
            >
              Admin Dashboard Overview
            </Typography>
            <Typography variant="body2" className="text-secondary mt-1">
              Last updated: {new Date().toLocaleString('en-IN')}
              {data?.lastUpdated && ` • ${data.lastUpdated}`}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={fetchDashboardData}
            className="btn-outlined"
            size="small"
          >
            Refresh
          </Button>
        </Box>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label text-secondary">Total Users</Typography>
                  <Box className="stat-card-icon">
                    <Users size={20} color="#003366" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  <AnimatedNumber value={summary.totalUsers} />
                </Typography>
                <Typography className="stat-card-label text-secondary text-center">
                  {summary.renters} Renters • {summary.owners} Owners • {summary.admins} Admins
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label text-secondary">Properties</Typography>
                  <Box className="stat-card-icon teal">
                    <Home size={20} color="#00A79D" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  <AnimatedNumber value={summary.totalProperties} />
                </Typography>
                <Typography className="stat-card-label text-secondary">
                  {summary.rentalCount} Rental • {summary.saleCount} Sale
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label text-secondary">Total Revenue</Typography>
                  <Box className="stat-card-icon cyan">
                    <DollarSign size={20} color="#22D3EE" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  {formatCurrency(summary.totalRevenue)}
                </Typography>
                <Typography className="stat-card-label text-secondary">
                  {summary.completedPayments + summary.approvedPayments} Transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label text-secondary">Active Users</Typography>
                  <Box className="stat-card-icon success">
                    <Activity size={20} color="#10B981" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  <AnimatedNumber value={summary.activeUsersCount} />
                </Typography>
                <Typography className="stat-card-label text-secondary">
                  {summary.inactiveUsersCount} Inactive
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label text-secondary">AI Users</Typography>
                  <Box className="stat-card-icon">
                    <Search size={20} color="#003366" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  <AnimatedNumber value={summary.aiUsersCount} />
                </Typography>
                <Typography className="stat-card-label text-secondary">
                  {summary.totalSearches} Total Searches
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label text-secondary">Rewards</Typography>
                  <Box className="stat-card-icon teal">
                    <Award size={20} color="#00A79D" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  <AnimatedNumber value={summary.totalRewardsDistributed} />
                </Typography>
                <Typography className="stat-card-label text-secondary">
                  {charts.rewards.unclaimedRewards} Unclaimed
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label text-secondary">Avg Rating</Typography>
                  <Box className="stat-card-icon cyan">
                    <Star size={20} color="#22D3EE" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  <AnimatedNumber value={summary.averagePropertyRating} decimals={1} />
                </Typography>
                <Typography className="stat-card-label text-secondary">
                  {charts.engagement.totalRatings} Total Ratings
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card">
              <CardContent>
                <Box className="stat-card-header">
                  <Typography className="stat-card-label text-secondary">Views</Typography>
                  <Box className="stat-card-icon">
                    <Eye size={20} color="#003366" />
                  </Box>
                </Box>
                <Typography className="stat-card-value">
                  <AnimatedNumber value={charts.engagement.totalViews} />
                </Typography>
                <Typography className="stat-card-label text-secondary">
                  {charts.engagement.totalSaves} Saves
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Payment Status Overview */}
        <Card className="mb-5">
          <CardContent>
            <Box className="flex items-center gap-3 mb-4">
              <Box className="stat-card-icon teal" sx={{ width: 36, height: 36 }}>
                <DollarSign size={18} color="#00A79D" />
              </Box>
              <Typography variant="h2" sx={{ fontSize: '18px', fontWeight: 700 }}>
                Payment Overview
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box
                  className="card"
                  sx={{
                    p: 4,
                    bgcolor: 'rgba(255, 245, 230, 0.5)',
                    border: '2px solid #FFC107',
                    borderRadius: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography className="text-secondary mb-1">Pending</Typography>
                  <Typography variant="h3" className="font-bold" sx={{ color: 'warning.main', mb: 1 }}>
                    {summary.pendingPayments}
                  </Typography>
                  <Typography className="font-semibold" sx={{ color: 'warning.dark' }}>
                    {formatCurrency(summary.totalRevenuePending)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box
                  className="card"
                  sx={{
                    p: 4,
                    bgcolor: 'rgba(230, 247, 255, 0.5)',
                    border: '2px solid #22D3EE',
                    borderRadius: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography className="text-secondary mb-1">Approved</Typography>
                  <Typography variant="h3" className="font-bold" sx={{ color: 'info.main', mb: 1 }}>
                    {summary.approvedPayments}
                  </Typography>
                  <Typography className="font-semibold" sx={{ color: 'info.dark' }}>
                    {formatCurrency(summary.totalRevenueApproved)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box
                  className="card"
                  sx={{
                    p: 4,
                    bgcolor: 'rgba(230, 255, 249, 0.5)',
                    border: '2px solid #00A79D',
                    borderRadius: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography className="text-secondary mb-1">Completed</Typography>
                  <Typography variant="h3" className="font-bold" sx={{ color: 'teal.main', mb: 1 }}>
                    {summary.completedPayments}
                  </Typography>
                  <Typography className="font-semibold" sx={{ color: 'teal.dark' }}>
                    {formatCurrency(summary.totalRevenueCompleted)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} lg={6}>
            <Card className="mb-5">
              <CardContent>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
                  Revenue by Payment Method
                </Typography>
                <Stack spacing={3}>
                  {Object.entries(charts.revenueByMethod).map(([method, data]) => {
                    const maxRevenue = Math.max(...Object.values(charts.revenueByMethod).map(d => d.totalAmount || 0)) || 1;
                    const percentage = (data.totalAmount / maxRevenue) * 100;
                    
                    return (
                      <Box key={method}>
                        <Box className="flex justify-between items-center mb-2">
                          <Typography variant="body2" className="font-semibold">
                            {method}
                          </Typography>
                          <Typography variant="body2" className="font-semibold" sx={{ color: 'teal.main' }}>
                            {formatCurrency(data.totalAmount)}
                          </Typography>
                        </Box>
                        <Box className="skeleton" sx={{ bgcolor: 'divider', height: 8, borderRadius: 1, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              width: `${percentage}%`,
                              height: '100%',
                              bgcolor: 'linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)',
                              borderRadius: 1,
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </Box>
                        <Typography variant="caption" className="text-secondary mt-1">
                          {data.count} transactions • Avg: {formatCurrency(data.avgAmount)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card className="mb-5">
              <CardContent>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
                  User Growth (Last 12 Months)
                </Typography>
                <Stack spacing={2}>
                  {charts.userGrowth.slice(-6).map((item, index) => {
                    const maxUsers = Math.max(...charts.userGrowth.map(d => d.count || 0)) || 1;
                    const percentage = (item.count / maxUsers) * 100;
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    
                    return (
                      <Box key={index}>
                        <Box className="flex justify-between items-center mb-2">
                          <Typography variant="body2" className="font-semibold">
                            {monthNames[item.month - 1]} {item.year}
                          </Typography>
                          <Typography variant="body2" className="font-semibold" sx={{ color: 'primary.main' }}>
                            {item.count} users
                          </Typography>
                        </Box>
                        <Box className="skeleton" sx={{ bgcolor: 'divider', height: 8, borderRadius: 1, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              width: `${percentage}%`,
                              height: '100%',
                              bgcolor: 'linear-gradient(90deg, #003366 0%, #4A6A8A 100%)',
                              borderRadius: 1,
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Top Searches */}
        <div style={styles.card}>
          <div 
            style={styles.cardHeader}
            onClick={() => toggleSection('searchInsights')}
          >
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
              <Search size={24} color="#00A79D" />
              Search Insights
            </h2>
            {expandedSections.searchInsights ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
          
          {expandedSections.searchInsights && (
            <div style={styles.chartGrid}>
              <div>
                <h3 style={{ fontSize: '16px', color: '#003366', marginBottom: '16px' }}>Top Search Queries</h3>
                {charts.searchInsights.topSearches.slice(0, 10).map((search, index) => (
                  <div key={index} style={{ ...styles.propertyCard, marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#333333' }}>
                      {index + 1}. {search.query}
                    </span>
                    <span style={{ ...styles.badge, backgroundColor: '#22D3EE', color: '#FFFFFF' }}>
                      {search.count} searches
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#003366', marginBottom: '16px' }}>Most Searched Locations</h3>
                {charts.searchInsights.mostSearchedLocations.map((location, index) => (
                  <div key={index} style={{ ...styles.propertyCard, marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#333333' }}>
                      {index + 1}. {location.location}
                    </span>
                    <span style={{ ...styles.badge, backgroundColor: '#00A79D', color: '#FFFFFF' }}>
                      {location.count} searches
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#F4F7F9', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#4A6A8A', marginBottom: '4px' }}>
                    Average Searches per User
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#003366' }}>
                    {charts.searchInsights.avgSearchesPerUser.toFixed(2)}
                  </div>
                </div>
                {/* Top 5 Searches (Graph) */}
                <h3 style={{ fontSize: '16px', color: '#003366', margin: '24px 0 16px' }}>Top 5 Searches (Graph)</h3>
                {charts.searchInsights.topSearches.slice(0, 5).map((search, index) => {
                  const maxCount = Math.max(...charts.searchInsights.topSearches.map(s => s.count));
                  const percentage = (search.count / maxCount) * 100;

                  return (
                    <div key={index} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#333333' }}>{search.query}</span>
                        <span style={{ color: '#00A79D', fontWeight: '600' }}>{search.count}</span>
                      </div>
                      <div style={{ backgroundColor: '#F4F7F9', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)',
                            borderRadius: '8px',
                            transition: 'width 0.5s ease'
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <Card className="mb-5">
          <Box
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => toggleSection('recentActivity')}
            sx={{ borderBottom: '1px solid divider', bgcolor: 'background.paper' }}
          >
            <Box className="flex items-center gap-3">
              <Box className="stat-card-icon teal" sx={{ width: 36, height: 36 }}>
                <Activity size={18} color="#00A79D" />
              </Box>
              <Typography variant="h2" sx={{ fontSize: '18px', fontWeight: 700 }}>
                Recent Activity
              </Typography>
            </Box>
            {expandedSections.recentActivity ? <ChevronUp size={20} color="#00A79D" /> : <ChevronDown size={20} color="#00A79D" />}
          </Box>
          
          <Collapse in={expandedSections.recentActivity}>
            <Box sx={{ px: 3, pb: 3 }}>
              <Box className="flex justify-between items-center mb-3">
                <Typography variant="body2" className="text-secondary">
                  Showing page {recentPage}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    onClick={() => setRecentPage(p => Math.max(1, p - 1))}
                    disabled={recentPage <= 1}
                    variant={recentPage <= 1 ? 'outlined' : 'contained'}
                    sx={{
                      px: 2,
                      minWidth: 80,
                      bgcolor: recentPage <= 1 ? 'action.hover' : 'primary.main',
                      color: recentPage <= 1 ? 'text.secondary' : 'white',
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setRecentPage(p => p + 1)}
                    disabled={!(data && data.recentActivity && data.recentActivity.length === pageSize)}
                    variant={(data && data.recentActivity && data.recentActivity.length === pageSize) ? 'contained' : 'outlined'}
                    sx={{
                      px: 2,
                      minWidth: 80,
                      bgcolor: (data && data.recentActivity && data.recentActivity.length === pageSize) ? 'primary.main' : 'action.hover',
                      color: (data && data.recentActivity && data.recentActivity.length === pageSize) ? 'white' : 'text.secondary',
                    }}
                  >
                    Next
                  </Button>
                </Stack>
              </Box>
              
              <TableContainer component={Paper} className="table-container">
                <Table className="table">
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-semibold">Type</TableCell>
                      <TableCell className="font-semibold">User</TableCell>
                      <TableCell className="font-semibold">Action</TableCell>
                      <TableCell className="font-semibold">Details</TableCell>
                      <TableCell className="font-semibold">Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivity.slice(0, 15).map((activity, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip
                            label={activity.type}
                            size="small"
                            sx={{
                              bgcolor: activity.type === 'user' ? '#003366' : 
                                       activity.type === 'property' ? '#00A79D' : '#22D3EE',
                              color: 'white',
                              fontWeight: 600,
                              height: 24,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>{activity.user}</TableCell>
                        <TableCell>{activity.action}</TableCell>
                        <TableCell>{activity.location}</TableCell>
                        <TableCell className="text-secondary">{formatDate(activity.time)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Collapse>
        </Card>

        {/* Approved Payments */}
        {approvedPayments && approvedPayments.length > 0 && (
          <div style={styles.card}>
            <div 
              style={styles.cardHeader}
              onClick={() => toggleSection('approvedPayments')}
            >
              <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
                <DollarSign size={24} color="#00A79D" />
                Approved Payments ({summary.approvedPaymentsThisMonth} this month)
              </h2>
              {expandedSections.approvedPayments ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </div>
            
            {expandedSections.approvedPayments && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: '#64748b' }}>Showing page {approvedPage}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setApprovedPage(p => Math.max(1, p - 1))}
                      disabled={approvedPage <= 1}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E0E7EE', background: approvedPage <= 1 ? '#F4F7F9' : '#003366', color: '#FFFFFF', cursor: approvedPage <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setApprovedPage(p => p + 1)}
                      disabled={!(data && data.approvedPayments && data.approvedPayments.length === pageSize)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E0E7EE', background: (data && data.approvedPayments && data.approvedPayments.length === pageSize) ? '#003366' : '#F4F7F9', color: '#FFFFFF', cursor: (data && data.approvedPayments && data.approvedPayments.length === pageSize) ? 'pointer' : 'not-allowed' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Resident</th>
                        <th style={styles.th}>Property</th>
                        <th style={styles.th}>Amount</th>
                        <th style={styles.th}>Method</th>
                        <th style={styles.th}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedPayments.map((payment, index) => (
                        <tr key={index}>
                          <td style={styles.td}>{payment.resident?.email || 'N/A'}</td>
                          <td style={styles.td}>
                            {payment.property ? 
                              `${payment.property.propertyType || 'Property'} - ${payment.property.Sector || payment.property.address || 'N/A'}` 
                              : 'N/A'}
                          </td>
                          <td style={styles.td}>
                            <strong style={{ color: '#00A79D' }}>{formatCurrency(payment.amount)}</strong>
                          </td>
                          <td style={styles.td}>{payment.paymentMethod || 'N/A'}</td>
                          <td style={styles.td}>{formatDate(payment.paymentDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Top Properties */}
        <div style={styles.card}>
          <div 
            style={styles.cardHeader}
            onClick={() => toggleSection('topProperties')}
          >
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
              <Star size={24} color="#00A79D" />
              Top Performing Properties
            </h2>
            {expandedSections.topProperties ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
          
          {expandedSections.topProperties && (
            <div style={styles.chartGrid}>
              {/* Rental Properties */}
              <div>
                <h3 style={{ fontSize: '16px', color: '#003366', marginBottom: '16px' }}>
                  Top Rental Properties
                </h3>
                
                <h4 style={{ fontSize: '14px', color: '#4A6A8A', marginBottom: '12px' }}>Most Viewed</h4>
                {charts.propertyStats.topViewedRental.map((item, index) => (
                  item.property && (
                    <div key={index} style={styles.propertyCard}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333333', marginBottom: '4px' }}>
                          {item.property.propertyType || 'Property'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#4A6A8A' }}>
                          {item.property.Sector || item.property.address || 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Eye size={16} color="#00A79D" />
                        <span style={{ fontWeight: '600', color: '#00A79D' }}>
                          {item.viewsCount}
                        </span>
                      </div>
                    </div>
                  )
                ))}

                <h4 style={{ fontSize: '14px', color: '#4A6A8A', margin: '20px 0 12px' }}>Most Saved</h4>
                {charts.propertyStats.topSavedRental.map((item, index) => (
                  item.property && (
                    <div key={index} style={styles.propertyCard}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333333', marginBottom: '4px' }}>
                          {item.property.propertyType || 'Property'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#4A6A8A' }}>
                          {item.property.Sector || item.property.address || 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bookmark size={16} color="#22D3EE" />
                        <span style={{ fontWeight: '600', color: '#22D3EE' }}>
                          {item.savesCount}
                        </span>
                      </div>
                    </div>
                  )
                ))}

                <h4 style={{ fontSize: '14px', color: '#4A6A8A', margin: '20px 0 12px' }}>Top Rated</h4>
                {charts.propertyStats.topRatedRental.map((item, index) => (
                  item.property && (
                    <div key={index} style={styles.propertyCard}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333333', marginBottom: '4px' }}>
                          {item.property.propertyType || 'Property'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#4A6A8A' }}>
                          {item.property.Sector || item.property.address || 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Star size={16} color="#FFD700" />
                        <span style={{ fontWeight: '600', color: '#FFD700' }}>
                          {item.avgRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )
                ))}
              </div>

              {/* Sale Properties */}
              <div>
                <h3 style={{ fontSize: '16px', color: '#003366', marginBottom: '16px' }}>
                  Top Sale Properties
                </h3>
                
                <h4 style={{ fontSize: '14px', color: '#4A6A8A', marginBottom: '12px' }}>Most Viewed</h4>
                {charts.propertyStats.topViewedSale.map((item, index) => (
                  item.property && (
                    <div key={index} style={styles.propertyCard}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333333', marginBottom: '4px' }}>
                          {item.property.propertyType || 'Property'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#4A6A8A' }}>
                          {item.property.Sector || item.property.address || 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Eye size={16} color="#00A79D" />
                        <span style={{ fontWeight: '600', color: '#00A79D' }}>
                          {item.viewsCount}
                        </span>
                      </div>
                    </div>
                  )
                ))}

                <h4 style={{ fontSize: '14px', color: '#4A6A8A', margin: '20px 0 12px' }}>Most Saved</h4>
                {charts.propertyStats.topSavedSale.map((item, index) => (
                  item.property && (
                    <div key={index} style={styles.propertyCard}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333333', marginBottom: '4px' }}>
                          {item.property.propertyType || 'Property'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#4A6A8A' }}>
                          {item.property.Sector || item.property.address || 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bookmark size={16} color="#22D3EE" />
                        <span style={{ fontWeight: '600', color: '#22D3EE' }}>
                          {item.savesCount}
                        </span>
                      </div>
                    </div>
                  )
                ))}

                <h4 style={{ fontSize: '14px', color: '#4A6A8A', margin: '20px 0 12px' }}>Top Rated</h4>
                {charts.propertyStats.topRatedSale.map((item, index) => (
                  item.property && (
                    <div key={index} style={styles.propertyCard}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333333', marginBottom: '4px' }}>
                          {item.property.propertyType || 'Property'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#4A6A8A' }}>
                          {item.property.Sector || item.property.address || 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Star size={16} color="#FFD700" />
                        <span style={{ fontWeight: '600', color: '#FFD700' }}>
                          {item.avgRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Engagement Metrics */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            <Activity size={24} color="#00A79D" />
            Engagement Metrics
          </h2>
          <div style={styles.statsGrid}>
            <div style={styles.propertyCard}>
              <div>
                <div style={{ fontSize: '14px', color: '#4A6A8A', marginBottom: '4px' }}>
                  Total Views
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#003366' }}>
                  {charts.engagement.totalViews.toLocaleString()}
                </div>
              </div>
              <Eye size={32} color="#00A79D" />
            </div>
            <div style={styles.propertyCard}>
              <div>
                <div style={{ fontSize: '14px', color: '#4A6A8A', marginBottom: '4px' }}>
                  Total Saves
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#003366' }}>
                  {charts.engagement.totalSaves.toLocaleString()}
                </div>
              </div>
              <Bookmark size={32} color="#22D3EE" />
            </div>
            <div style={styles.propertyCard}>
              <div>
                <div style={{ fontSize: '14px', color: '#4A6A8A', marginBottom: '4px' }}>
                  Total Ratings
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#003366' }}>
                  {charts.engagement.totalRatings.toLocaleString()}
                </div>
              </div>
              <Star size={32} color="#FFD700" />
            </div>
            <div style={styles.propertyCard}>
              <div>
                <div style={{ fontSize: '14px', color: '#4A6A8A', marginBottom: '4px' }}>
                  Avg Engagement Time
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#003366' }}>
                  {charts.engagement.avgEngagementTime ? 
                    `${Math.round(charts.engagement.avgEngagementTime)}s` : 'N/A'}
                </div>
              </div>
              <Activity size={32} color="#4A6A8A" />
            </div>
          </div>
        </div>

        {/* Property Statistics */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            <Home size={24} color="#00A79D" />
            Property Statistics
          </h2>
          <div style={styles.chartGrid}>
            <div>
              <h3 style={{ fontSize: '16px', color: '#003366', marginBottom: '16px' }}>
                Rental Properties
              </h3>
              <div style={{ ...styles.propertyCard, marginBottom: '12px' }}>
                <span style={{ color: '#4A6A8A' }}>Total Properties</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#003366' }}>
                  {summary.rentalCount}
                </span>
              </div>
              <div style={{ ...styles.propertyCard, marginBottom: '12px' }}>
                <span style={{ color: '#4A6A8A' }}>Total Views</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#00A79D' }}>
                  {charts.propertyStats.rental.totalViews.toLocaleString()}
                </span>
              </div>
              <div style={{ ...styles.propertyCard, marginBottom: '12px' }}>
                <span style={{ color: '#4A6A8A' }}>Total Saves</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#22D3EE' }}>
                  {charts.propertyStats.rental.totalSaves.toLocaleString()}
                </span>
              </div>
              <div style={{ ...styles.propertyCard, marginBottom: '12px' }}>
                <span style={{ color: '#4A6A8A' }}>Avg Engagement Time</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#4A6A8A' }}>
                  {charts.propertyStats.rental.avgEngagementTime ? 
                    `${Math.round(charts.propertyStats.rental.avgEngagementTime)}s` : 'N/A'}
                </span>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', color: '#003366', marginBottom: '16px' }}>
                Sale Properties
              </h3>
              <div style={{ ...styles.propertyCard, marginBottom: '12px' }}>
                <span style={{ color: '#4A6A8A' }}>Total Properties</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#003366' }}>
                  {summary.saleCount}
                </span>
              </div>
              <div style={{ ...styles.propertyCard, marginBottom: '12px' }}>
                <span style={{ color: '#4A6A8A' }}>Total Views</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#00A79D' }}>
                  {charts.propertyStats.sale.totalViews.toLocaleString()}
                </span>
              </div>
              <div style={{ ...styles.propertyCard, marginBottom: '12px' }}>
                <span style={{ color: '#4A6A8A' }}>Total Saves</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#22D3EE' }}>
                  {charts.propertyStats.sale.totalSaves.toLocaleString()}
                </span>
              </div>
              <div style={{ ...styles.propertyCard, marginBottom: '12px' }}>
                <span style={{ color: '#4A6A8A' }}>Avg Engagement Time</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#4A6A8A' }}>
                  {charts.propertyStats.sale.avgEngagementTime ? 
                    `${Math.round(charts.propertyStats.sale.avgEngagementTime)}s` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rewards Section */}
        <Card className="mb-5">
          <Box
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => toggleSection('rewards')}
            sx={{ borderBottom: '1px solid divider', bgcolor: 'background.paper' }}
          >
            <Box className="flex items-center gap-3">
              <Box className="stat-card-icon teal" sx={{ width: 36, height: 36 }}>
                <Award size={18} color="#00A79D" />
              </Box>
              <Typography variant="h2" sx={{ fontSize: '18px', fontWeight: 700 }}>
                Rewards System
              </Typography>
            </Box>
            {expandedSections.rewards ? <ChevronUp size={20} color="#00A79D" /> : <ChevronDown size={20} color="#00A79D" />}
          </Box>
          
          <Collapse in={expandedSections.rewards}>
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6}>
                  <Box className="stat-card" sx={{ textAlign: 'center' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography className="text-secondary mb-2">Total Rewards</Typography>
                      <Typography variant="h2" className="font-bold" sx={{ color: 'primary.main', mb: 1 }}>
                        {charts.rewards.totalRewards}
                      </Typography>
                    </CardContent>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="stat-card" sx={{ textAlign: 'center' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography className="text-secondary mb-2">Unclaimed Rewards</Typography>
                      <Typography variant="h2" className="font-bold" sx={{ color: 'teal.main', mb: 1 }}>
                        {charts.rewards.unclaimedRewards}
                      </Typography>
                    </CardContent>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
                Recent Rewards
              </Typography>
              {charts.rewards.recentRewards.map((reward, index) => (
                <Box
                  key={index}
                  className="card"
                  sx={{
                    p: 3,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography className="font-semibold mb-1">
                      {reward.message}
                    </Typography>
                    <Typography variant="caption" className="text-secondary">
                      {formatDate(reward.createdAt)}
                    </Typography>
                  </Box>
                  <Award size={20} color="#00A79D" />
                </Box>
              ))}
            </Box>
          </Collapse>
        </Card>

        {/* AI Usage by Role */}
        {Object.keys(charts.aiUsageByRole).length > 0 && (
          <Card className="mb-5">
            <CardContent>
              <Box className="flex items-center gap-3 mb-4">
                <Box className="stat-card-icon teal" sx={{ width: 36, height: 36 }}>
                  <Users size={18} color="#00A79D" />
                </Box>
                <Typography variant="h2" sx={{ fontSize: '18px', fontWeight: 700 }}>
                  AI Assistant Usage by Role
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                {Object.entries(charts.aiUsageByRole).map(([role, count]) => {
                  const totalAIUsers = Object.values(charts.aiUsageByRole).reduce((a, b) => a + b, 0);
                  const percentage = (count / totalAIUsers) * 100;
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={role}>
                      <Box className="card" sx={{ p: 4 }}>
                        <Box className="flex justify-between items-center mb-3">
                          <Typography variant="body2" className="font-semibold" sx={{ textTransform: 'capitalize' }}>
                            {role}
                          </Typography>
                          <Typography variant="body2" className="font-semibold" sx={{ color: 'teal.main' }}>
                            {count} users ({percentage.toFixed(1)}%)
                          </Typography>
                        </Box>
                        <Box
                          className="skeleton"
                          sx={{
                            bgcolor: 'divider',
                            height: 10,
                            borderRadius: 1,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: role === 'admin' 
                                ? 'linear-gradient(90deg, #003366 0%, #4A6A8A 100%)' 
                                : role === 'owner' 
                                  ? 'linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)' 
                                  : 'linear-gradient(90deg, #22D3EE 0%, #4A6A8A 100%)',
                              borderRadius: 1,
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </Box>
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
            bgcolor: 'primary.main',
            borderRadius: 2,
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            Platform Overview
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 600, mb: 1 }}>
            {summary.totalUsers.toLocaleString()} Users • {summary.totalProperties.toLocaleString()} Properties • {formatCurrency(summary.totalRevenue)} Revenue
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Average Transaction: {formatCurrency(summary.avgTransactionAmount)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard;