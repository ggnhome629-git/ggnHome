import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  BarChart3,
  CheckCircle,
  Cloud,
  HardDrive,
  Image,
  Mail,
  MapPin,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, PageHeader } from "./shell/adminUi";
import "./admin.css";

/** Shared card chrome from the admin design tokens, applied via sx (never inline style objects). */
const CARD = {
  borderRadius: "12px",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 2px 8px rgba(0,51,102,0.05)",
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
};

const formatNum = (n) => Number(n || 0).toLocaleString("en-IN");

/** Small icon + label + value tile for the executive summary. */
function MetricTile({ icon: Icon, label, value, color, bg }) {
  return (
    <Box
      sx={{
        backgroundColor: "#FFFFFF",
        p: 3,
        borderRadius: "10px",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 2,
        minWidth: 0,
        height: "100%",
      }}
    >
      <Box
        sx={{
          p: 1.5,
          backgroundColor: bg,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={color} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums", wordBreak: "break-word" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/** Usage meter: track + percentage label (amber at 75%, red at 90%). */
function ProgressBar({ percentage, color }) {
  const barColor = percentage >= 90 ? "#EF4444" : percentage >= 75 ? "#F59E0B" : color;
  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ width: "100%", height: 8, backgroundColor: "#E5E9EE", borderRadius: "4px", overflow: "hidden" }}>
        <Box
          sx={{
            width: `${Math.min(percentage, 100)}%`,
            height: "100%",
            backgroundColor: barColor,
            transition: "width 0.5s ease",
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ display: "block", mt: 0.5, textAlign: "right", fontWeight: 700, color: "text.secondary" }}>
        {percentage.toFixed(1)}%
      </Typography>
    </Box>
  );
}

/** Label / value row shared by every usage-meter card (matches usageManager2). */
function Row({ label, value, last, children }) {
  return (
    <Box
      sx={{
        py: 1.5,
        borderBottom: last ? "none" : "1px solid #F4F7F9",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

/** Card header with a gradient icon tile (same layout on all three services). */
function UsageCardHeader({ icon: Icon, title, subtitle, gradient, action }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={22} color="#FFFFFF" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h2" sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.primary" }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

/** One Cloudinary account: credits + storage meters and transform count. */
function AccountCard({ account }) {
  if (account.error) {
    return (
      <Alert severity="error" sx={{ borderRadius: "8px" }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {account.cloudName}
        </Typography>
        <Typography variant="caption">{account.error}</Typography>
      </Alert>
    );
  }

  const creditsPercentage = (account.credits.used / account.credits.limit) * 100;
  const storagePercentage = account.storage.limit ? (account.storage.bytes / account.storage.limit) * 100 : 0;
  const status =
    creditsPercentage >= 90
      ? { bg: "#FEE2E2", fg: "#991B1B", label: "Critical" }
      : creditsPercentage >= 75
      ? { bg: "#FEF3C7", fg: "#92400E", label: "High" }
      : { bg: "#D1FAE5", fg: "#065F46", label: "Normal" };

  return (
    <Card variant="outlined" sx={{ borderRadius: "10px", height: "100%" }}>
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
              {account.cloudName}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Account #{account.index + 1}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={status.label}
            sx={{ height: 22, fontSize: "0.65rem", fontWeight: 700, borderRadius: "6px", backgroundColor: status.bg, color: status.fg }}
          />
        </Box>

        <Row
          label="Credits"
          value={`${account.credits.used.toFixed(1)} / ${account.credits.limit}`}
        >
          <Box sx={{ mt: 1 }}>
            <ProgressBar percentage={creditsPercentage} color="#10B981" />
          </Box>
        </Row>

        <Row label="Storage" value={formatBytes(account.storage.bytes)}>
          <Box sx={{ mt: 1 }}>
            <ProgressBar percentage={storagePercentage} color="#3B82F6" />
          </Box>
        </Row>

        <Row label="Transforms" value={formatNum(account.transformations.count)} last />
      </CardContent>
    </Card>
  );
}

/** Brevo email service: plan, credit meter and delivery stats. */
function BrevoCard({ data, lastRefresh }) {
  if (!data) return null;

  const { account, usage } = data;
  const creditsUsed = account.creditsLimit - account.creditsRemaining;
  const creditsPercentage = (creditsUsed / account.creditsLimit) * 100;
  const deliveryRate = usage.sent > 0 ? (usage.delivered / usage.sent) * 100 : 0;
  const openRate = usage.delivered > 0 ? (usage.opens / usage.delivered) * 100 : 0;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h3" sx={{ fontSize: "1rem", fontWeight: 700, color: "primary.main" }}>
          {account.company}
        </Typography>
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
          {account.email} • {account.planType}
        </Typography>
      </Box>

      <Row label="Email Credits" value={`${formatNum(creditsUsed)} / ${formatNum(account.creditsLimit)}`}>
        <Box sx={{ mt: 1 }}>
          <ProgressBar percentage={creditsPercentage} color="#10B981" />
        </Box>
      </Row>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {[
          { label: "Sent", value: formatNum(usage.sent), color: "text.primary" },
          { label: "Delivered", value: `${deliveryRate.toFixed(1)}%`, color: "#047857" },
          { label: "Open Rate", value: `${openRate.toFixed(1)}%`, color: "#1565C0" },
        ].map((stat) => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Box sx={{ textAlign: "center", py: 2.5, px: 1, backgroundColor: "#F4F7F9", borderRadius: "6px" }}>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: stat.color, fontVariantNumeric: "tabular-nums" }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                {stat.label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {lastRefresh && (
        <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
          Last updated: {new Date(lastRefresh).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}

/** LocationIQ geocoding: daily request meter plus remaining / bonus. */
function LocationiqCard({ data, lastRefresh }) {
  if (!data) return null;

  const { balance } = data;
  const dailyLimit = 5000;
  const used = dailyLimit - balance.day;
  const usagePercentage = (used / dailyLimit) * 100;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Geocoding API status: {data.raw.status}
        </Typography>
      </Box>

      <Row label="Daily Requests" value={`${formatNum(used)} / ${formatNum(dailyLimit)}`}>
        <Box sx={{ mt: 1 }}>
          <ProgressBar percentage={usagePercentage} color="#3B82F6" />
        </Box>
      </Row>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={6}>
          <Box sx={{ textAlign: "center", py: 2.5, px: 1, backgroundColor: "#F4F7F9", borderRadius: "6px" }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
              {formatNum(balance.day)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
              Remaining
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ textAlign: "center", py: 2.5, px: 1, backgroundColor: "#F4F7F9", borderRadius: "6px" }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: "#3B82F6", fontVariantNumeric: "tabular-nums" }}>
              {formatNum(balance.bonus)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
              Bonus
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {lastRefresh && (
        <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
          Last updated: {new Date(lastRefresh).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}

/** Skeleton rows used while a service loads (never a blank page). */
function CardSkeleton({ rows = 5 }) {
  return (
    <Stack spacing={1.5}>
      {[...Array(rows)].map((_, i) => (
        <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 1.5 }}>
          <Skeleton width={140} height={18} />
          <Skeleton width={80} height={18} />
        </Box>
      ))}
    </Stack>
  );
}

const CloudinaryDashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [brevoData, setBrevoData] = useState(null);
  const [locationiqData, setLocationiqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brevoLoading, setBrevoLoading] = useState(true);
  const [locationiqLoading, setLocationiqLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brevoError, setBrevoError] = useState(null);
  const [locationiqError, setLocationiqError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [brevoLastRefresh, setBrevoLastRefresh] = useState(null);
  const [locationiqLastRefresh, setLocationiqLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [brevoRefreshing, setBrevoRefreshing] = useState(false);
  const [locationiqRefreshing, setLocationiqRefreshing] = useState(false);
  const navigate = useNavigate();

  // Get access token from localStorage for all protected admin API calls
  const accessToken = localStorage.getItem("accessToken");

  const BASE_API = process.env.REACT_APP_Base_API || "http://localhost:2000";

  const fetchUsage = async (force = false) => {
    try {
      setRefreshing(true);
      const url = `${BASE_API}/api/admin/cloudinary/usage${force ? "?force=true" : ""}`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const result = await response.json();

      if (result.success) {
        setAccounts(result.data);
        setLastRefresh(result.refreshedAt);
        setError(null);
      } else {
        setError(result.message || "Failed to fetch usage data");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBrevoUsage = async () => {
    try {
      setBrevoRefreshing(true);
      const url = `${BASE_API}/api/admin/brevo/usage`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const result = await response.json();

      if (result.success) {
        setBrevoData(result);
        setBrevoLastRefresh(new Date().toISOString());
        setBrevoError(null);
      } else {
        setBrevoError(result.message || "Failed to fetch Brevo usage data");
      }
    } catch (err) {
      setBrevoError(err.message || "Network error");
    } finally {
      setBrevoLoading(false);
      setBrevoRefreshing(false);
    }
  };

  const fetchLocationiqUsage = async () => {
    try {
      setLocationiqRefreshing(true);
      const url = `${BASE_API}/api/admin/locationiq/usage`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const result = await response.json();

      if (result.success) {
        setLocationiqData(result);
        setLocationiqLastRefresh(new Date().toISOString());
        setLocationiqError(null);
      } else {
        setLocationiqError(result.message || "Failed to fetch LocationIQ usage data");
      }
    } catch (err) {
      setLocationiqError(err.message || "Network error");
    } finally {
      setLocationiqLoading(false);
      setLocationiqRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    fetchBrevoUsage();
    fetchLocationiqUsage();
  }, []);

  const totalCredits = accounts.reduce((sum, acc) => sum + (acc.credits?.used || 0), 0);
  const totalStorage = accounts.reduce((sum, acc) => sum + (acc.storage?.bytes || 0), 0);
  const totalBandwidth = accounts.reduce((sum, acc) => sum + (acc.bandwidth?.bytes || 0), 0);
  const totalTransformations = accounts.reduce((sum, acc) => sum + (acc.transformations?.count || 0), 0);
  const avgCreditsUsage =
    accounts.length > 0
      ? accounts.reduce((sum, acc) => sum + ((acc.credits?.used || 0) / (acc.credits?.limit || 1)) * 100, 0) / accounts.length
      : 0;

  const anyRefreshing = refreshing || brevoRefreshing || locationiqRefreshing;

  const refreshAll = () => {
    fetchUsage(true);
    fetchBrevoUsage();
    fetchLocationiqUsage();
  };

  return (
    <>
      <PageHeader
        title="Usage Tracker"
        description="Real-time monitoring of Cloudinary, Brevo & LocationIQ services"
        actions={
          <>
            <Button variant="outlined" onClick={() => navigate("/admin/usagetrack2")} sx={{ minHeight: 44 }}>
              Page 2
            </Button>
            <Button
              variant="contained"
              startIcon={<RefreshCw size={16} />}
              onClick={refreshAll}
              disabled={anyRefreshing}
              sx={{ minHeight: 44, bgcolor: "#00A79D", "&:hover": { bgcolor: "#008f85" } }}
            >
              {anyRefreshing ? "Refreshing…" : "Refresh All"}
            </Button>
          </>
        }
      />

      {/* Cloudinary / page-level error */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 4, borderRadius: "8px" }}
          action={
            <Button color="inherit" size="small" onClick={() => fetchUsage(true)} sx={{ minHeight: 40, fontWeight: 700 }}>
              Retry
            </Button>
          }
        >
          Failed to load Cloudinary usage: {error}
        </Alert>
      )}

      {/* Executive Summary */}
      <Card sx={{ ...CARD, mb: 4 }}>
        <CardContent>
          <UsageCardHeader
            icon={BarChart3}
            title="Executive Summary"
            subtitle="All Cloudinary accounts combined"
            gradient="linear-gradient(135deg, #003366 0%, #00A79D 100%)"
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricTile icon={Cloud} label="Total Accounts" value={accounts.length} color="#10B981" bg="#D1FAE5" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricTile icon={Zap} label="Avg Credits Usage" value={`${avgCreditsUsage.toFixed(1)}%`} color="#F59E0B" bg="#FEF3C7" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricTile icon={HardDrive} label="Total Storage" value={formatBytes(totalStorage)} color="#3B82F6" bg="#DBEAFE" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricTile icon={TrendingUp} label="Total Bandwidth" value={formatBytes(totalBandwidth)} color="#8B5CF6" bg="#EDE9FE" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricTile icon={Image} label="Transformations" value={formatNum(totalTransformations)} color="#EC4899" bg="#FCE7F3" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricTile icon={CheckCircle} label="Total Credits" value={totalCredits.toFixed(1)} color="#10B981" bg="#D1FAE5" />
            </Grid>
          </Grid>
          {lastRefresh && (
            <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
              Last updated: {new Date(lastRefresh).toLocaleString()}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Cloudinary accounts */}
      <Card sx={{ ...CARD, mb: 4 }}>
        <CardContent>
          <UsageCardHeader
            icon={Cloud}
            title="Cloudinary Media Storage"
            subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            action={
              <Chip
                size="small"
                label={`${accounts.length} Accounts`}
                sx={{ height: 24, fontWeight: 700, borderRadius: "999px", bgcolor: "rgba(0,51,102,0.08)", color: "primary.main" }}
              />
            }
          />
          {loading ? (
            <Grid container spacing={2}>
              {[0, 1, 2].map((i) => (
                <Grid item xs={12} sm={6} lg={4} key={i}>
                  <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px", p: 3 }}>
                    <Skeleton variant="rounded" width="60%" height={20} sx={{ mb: 2 }} />
                    <Skeleton variant="rounded" width="100%" height={8} sx={{ mb: 1, borderRadius: "4px" }} />
                    <Skeleton variant="rounded" width="100%" height={8} sx={{ mb: 1, borderRadius: "4px" }} />
                    <Skeleton variant="rounded" width="70%" height={8} sx={{ borderRadius: "4px" }} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : accounts.length === 0 && !error ? (
            <EmptyState
              icon={Cloud}
              title="No Cloudinary accounts yet"
              description="Once accounts are configured, their credits, storage and transformations show up here."
            />
          ) : (
            <Grid container spacing={2}>
              {accounts.map((account) => (
                <Grid item xs={12} sm={6} lg={4} key={account.index}>
                  <AccountCard account={account} />
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Brevo + LocationIQ */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ ...CARD, height: "100%" }}>
            <CardContent>
              <UsageCardHeader
                icon={Mail}
                title="Brevo Email Service"
                subtitle={brevoData ? `${brevoData.account.company} • ${brevoData.account.planType}` : "Plan, credits and delivery stats"}
                gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                action={
                  brevoRefreshing ? (
                    <Chip size="small" label="Refreshing…" sx={{ height: 24, fontWeight: 700, borderRadius: "999px", bgcolor: "rgba(33,150,243,0.14)", color: "#1565C0" }} />
                  ) : null
                }
              />
              {brevoError ? (
                <Alert
                  severity="error"
                  sx={{ borderRadius: "8px" }}
                  action={
                    <Button color="inherit" size="small" onClick={() => fetchBrevoUsage()} sx={{ minHeight: 40, fontWeight: 700 }}>
                      Retry
                    </Button>
                  }
                >
                  {brevoError}
                </Alert>
              ) : brevoLoading ? (
                <CardSkeleton />
              ) : (
                <BrevoCard data={brevoData} lastRefresh={brevoLastRefresh} />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ ...CARD, height: "100%" }}>
            <CardContent>
              <UsageCardHeader
                icon={MapPin}
                title="LocationIQ Geocoding"
                subtitle="Daily requests, remaining quota and bonus"
                gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
                action={
                  locationiqRefreshing ? (
                    <Chip size="small" label="Refreshing…" sx={{ height: 24, fontWeight: 700, borderRadius: "999px", bgcolor: "rgba(33,150,243,0.14)", color: "#1565C0" }} />
                  ) : null
                }
              />
              {locationiqError ? (
                <Alert
                  severity="error"
                  sx={{ borderRadius: "8px" }}
                  action={
                    <Button color="inherit" size="small" onClick={() => fetchLocationiqUsage()} sx={{ minHeight: 40, fontWeight: 700 }}>
                      Retry
                    </Button>
                  }
                >
                  {locationiqError}
                </Alert>
              ) : locationiqLoading ? (
                <CardSkeleton />
              ) : (
                <LocationiqCard data={locationiqData} lastRefresh={locationiqLastRefresh} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default CloudinaryDashboard;
