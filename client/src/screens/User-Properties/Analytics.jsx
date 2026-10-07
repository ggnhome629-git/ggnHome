import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Container, Grid, Stack, Typography, Tab, Tabs, Chip, LineChart } from "@mui/material";
import { Eye, Heart, Phone, Share2, TrendingUp, MapPin, Calendar, Home } from "lucide-react";
import { radii, elevationShadows } from "../../theme/theme";

/**
 * Analytics Page - Property performance analytics for owners/agents
 * Shows: views, saves, enquiries, shares, engagement metrics
 */
export default function Analytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState({
    totalViews: 1240,
    totalSaves: 89,
    totalEnquiries: 34,
    totalShares: 156,
    avgEngagementTime: 240, // seconds
    recentViews: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // In production: const res = await fetch('/api/user/analytics');
      // For now, load mock data
      setTimeout(() => setLoading(false), 500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, trend, color = "primary.main" }) => (
    <Card sx={{ boxShadow: elevationShadows[1] }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 1 }}>
              {label}
            </Typography>
            <Typography variant="h3" sx={{ fontSize: "2rem", color, fontWeight: 700 }}>
              {typeof value === "number" && value >= 3600 ? `${Math.floor(value / 60)}m` : value}
            </Typography>
            {trend && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <TrendingUp size={14} color="#10B981" />
                <Typography variant="caption" sx={{ color: "#10B981", fontWeight: 600 }}>
                  {trend}
                </Typography>
              </Stack>
            )}
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: `${color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={20} color={color} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, px: { xs: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h2" sx={{ fontSize: "2rem", fontWeight: 700, color: "primary.main", mb: 1 }}>
          Analytics
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Track how your listings are performing. Monitor views, saves, and engagement.
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ mb: 6, borderBottom: "1px solid", borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
              py: 2,
              px: 0,
              mr: 4,
              borderBottom: "3px solid transparent",
              "&.Mui-selected": {
                color: "primary.main",
                borderBottomColor: "primary.main",
              },
            },
          }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Sources" value="sources" />
          <Tab label="Timeline" value="timeline" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <Stack spacing={6}>
          {/* Key Stats Grid */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard icon={Eye} label="Total Views" value={analytics.totalViews} trend="↑ 12% vs last week" color="#003366" />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard icon={Heart} label="Total Saves" value={analytics.totalSaves} trend="↑ 8% vs last week" color="#00A79D" />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard icon={Phone} label="Total Enquiries" value={analytics.totalEnquiries} trend="↑ 15% vs last week" color="#F59E0B" />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard icon={Share2} label="Total Shares" value={analytics.totalShares} trend="↑ 20% vs last week" color="#10B981" />
            </Grid>
          </Grid>

          {/* Engagement Metrics */}
          <Card sx={{ boxShadow: elevationShadows[1] }}>
            <CardContent sx={{ p: { xs: 4, md: 6 } }}>
              <Typography variant="h3" sx={{ fontSize: "1.2rem", fontWeight: 700, color: "primary.main", mb: 4 }}>
                Engagement Metrics
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6} md={3}>
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Avg. Time on Page
                    </Typography>
                    <Typography variant="h4" sx={{ fontSize: "1.5rem", color: "primary.main", fontWeight: 700 }}>
                      {Math.floor(analytics.avgEngagementTime / 60)} min
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Save Rate
                    </Typography>
                    <Typography variant="h4" sx={{ fontSize: "1.5rem", color: "secondary.main", fontWeight: 700 }}>
                      {((analytics.totalSaves / analytics.totalViews) * 100).toFixed(1)}%
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Enquiry Rate
                    </Typography>
                    <Typography variant="h4" sx={{ fontSize: "1.5rem", color: "#F59E0B", fontWeight: 700 }}>
                      {((analytics.totalEnquiries / analytics.totalViews) * 100).toFixed(1)}%
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Share Rate
                    </Typography>
                    <Typography variant="h4" sx={{ fontSize: "1.5rem", color: "#10B981", fontWeight: 700 }}>
                      {((analytics.totalShares / analytics.totalViews) * 100).toFixed(1)}%
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Performance Tips */}
          <Card sx={{ backgroundColor: "rgba(0,167,157,0.06)", border: "1px solid", borderColor: "#00A79D", boxShadow: elevationShadows[1] }}>
            <CardContent sx={{ p: { xs: 4, md: 6 } }}>
              <Stack direction="row" spacing={3} alignItems="flex-start">
                <TrendingUp size={24} color="#00A79D" style={{ flexShrink: 0, marginTop: 4 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontSize: "1rem", fontWeight: 700, color: "primary.main", mb: 2 }}>
                    Boost Your Listing Performance
                  </Typography>
                  <Stack spacing={2}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      • <strong>Add more photos:</strong> Listings with 8+ photos get 3x more saves
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      • <strong>Write better description:</strong> Use specific details about amenities
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      • <strong>Update pricing:</strong> Check nearby properties to stay competitive
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      • <strong>Respond quickly:</strong> Reply to enquiries within 2 hours for better conversion
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Sources Tab */}
      {activeTab === "sources" && (
        <Card sx={{ boxShadow: elevationShadows[1] }}>
          <CardContent sx={{ p: { xs: 4, md: 6 } }}>
            <Stack spacing={4}>
              <Typography variant="h3" sx={{ fontSize: "1.2rem", fontWeight: 700, color: "primary.main" }}>
                Views by Source
              </Typography>
              <Grid container spacing={3}>
                {[
                  { source: "Search", count: 680, percentage: 54.8 },
                  { source: "Direct", count: 320, percentage: 25.8 },
                  { source: "Saved", count: 160, percentage: 12.9 },
                  { source: "Share", count: 80, percentage: 6.5 },
                ].map((item) => (
                  <Grid item xs={12} sm={6} key={item.source}>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.source}
                        </Typography>
                        <Chip label={`${item.percentage}%`} size="small" variant="outlined" />
                      </Stack>
                      <Box sx={{ height: 8, backgroundColor: "background.default", borderRadius: 999, overflow: "hidden" }}>
                        <Box sx={{ height: "100%", width: `${item.percentage}%`, backgroundColor: "secondary.main" }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {item.count} views
                      </Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <Card sx={{ boxShadow: elevationShadows[1] }}>
          <CardContent sx={{ p: { xs: 4, md: 6 } }}>
            <Typography variant="h3" sx={{ fontSize: "1.2rem", fontWeight: 700, color: "primary.main", mb: 4 }}>
              Activity Timeline
            </Typography>
            <Stack spacing={3}>
              {[
                { date: "Today", events: 245, type: "views" },
                { date: "Yesterday", events: 198, type: "views" },
                { date: "Last 7 days", events: 1240, type: "views" },
                { date: "Last 30 days", events: 4560, type: "views" },
              ].map((item, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 3, backgroundColor: "background.default", borderRadius: `${radii.sm}px` }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Calendar size={16} color="#00A79D" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.date}
                    </Typography>
                  </Stack>
                  <Chip label={`${item.events} ${item.type}`} color="primary" variant="outlined" size="small" />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
