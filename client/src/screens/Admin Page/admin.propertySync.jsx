import React, { useState, useEffect } from "react";
import { Box, Button, Card, CardContent, Grid, Typography, Stack, Alert, Chip, LinearProgress, Paper, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { RefreshCw, Play, Square, Eye, TrendingUp, AlertCircle, CheckCircle, Database, Zap, Camera } from "lucide-react";

const AdminPropertySync = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showReport, setShowReport] = useState(false);

  const API_BASE = process.env.REACT_APP_Base_API || "";

  // Fetch sync status
  const fetchStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/property-sync/status`,
        {
          headers: { Authorization: `Bearer ${(localStorage.getItem("accessToken") || localStorage.getItem("token"))}` },
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setSyncStatus(data.data);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/property-sync/logs?limit=50`,
        {
          headers: { Authorization: `Bearer ${(localStorage.getItem("accessToken") || localStorage.getItem("token"))}` },
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchStatus();
        if (syncStatus?.status?.isRunning) {
          fetchLogs();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Start verification
  const startVerification = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/property-sync/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(localStorage.getItem("accessToken") || localStorage.getItem("token"))}`,
          },
          credentials: "include",
          body: JSON.stringify({ source: "nobroker" }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setMessage("✓ Property verification started!");
        fetchStatus();
        fetchLogs();
      } else {
        setMessage("✗ " + (data.error?.message || "Failed to start verification"));
      }
    } catch (error) {
      setMessage("✗ Error: " + error.message);
    }
    setLoading(false);
  };

  // Stop verification
  const stopVerification = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/property-sync/stop`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(localStorage.getItem("accessToken") || localStorage.getItem("token"))}`,
          },
          credentials: "include",
        }
      );
      const data = await response.json();
      if (response.ok) {
        setMessage("✓ Verification stopped");
        fetchStatus();
      } else {
        setMessage("✗ Failed to stop verification");
      }
    } catch (error) {
      setMessage("✗ Error: " + error.message);
    }
    setLoading(false);
  };

  const status = syncStatus?.status;
  const report = syncStatus?.report;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <RefreshCw size={28} color="#003366" />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Property Verification & Sync
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Check existing properties for changes, delisted status, price updates
            </Typography>
          </Box>
        </Box>
      </Stack>

      {/* Message Alert */}
      {message && (
        <Alert
          severity={message.startsWith("✓") ? "success" : "error"}
          sx={{ mb: 2 }}
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      )}

      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🔍 Verification Control
            </Typography>

            <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
              <Button
                variant="contained"
                startIcon={<Play size={18} />}
                onClick={startVerification}
                disabled={loading || status?.isRunning}
                sx={{
                  backgroundColor: "success.main",
                  "&:hover": { backgroundColor: "success.dark" },
                }}
              >
                Start Verification
              </Button>

              {status?.isRunning && (
                <Button
                  variant="outlined"
                  startIcon={<Square size={18} />}
                  onClick={stopVerification}
                  disabled={loading}
                  sx={{ borderColor: "error.main", color: "error.main" }}
                >
                  Stop
                </Button>
              )}

              <Button
                variant="outlined"
                startIcon={<RefreshCw size={18} />}
                onClick={fetchStatus}
                disabled={loading}
              >
                Refresh
              </Button>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <Typography variant="body2">Auto-refresh (5s)</Typography>
              </Stack>
            </Stack>

            {/* Progress Bar */}
            {status?.isRunning && (
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Verification in progress...</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {report?.summary?.percentageComplete || 0}% complete
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={report?.summary?.percentageComplete || 0}
                />
                {report?.summary?.currentlyChecking && (
                  <Typography variant="caption" sx={{ color: "info.main" }}>
                    Currently checking: {report.summary.currentlyChecking.title} (
                    {report.summary.currentlyChecking.progress})
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Properties */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Database size={16} color="#1976d2" />
                  <Typography color="textSecondary" variant="body2">
                    Total Properties
                  </Typography>
                </Stack>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  {report?.summary?.totalPropertiesInDB || 0}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Verified Count */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircle size={16} color="#4caf50" />
                  <Typography color="textSecondary" variant="body2">
                    Verified This Run
                  </Typography>
                </Stack>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "success.main" }}
                >
                  {report?.summary?.propertiesVerified || 0}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={report?.summary?.percentageComplete || 0}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Properties */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Zap size={16} color="#2196f3" />
                  <Typography color="textSecondary" variant="body2">
                    Still Live
                  </Typography>
                </Stack>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "info.main" }}
                >
                  {report?.liveStatus?.live || 0}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Delisted Properties */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AlertCircle size={16} color="#f44336" />
                  <Typography color="textSecondary" variant="body2">
                    Delisted
                  </Typography>
                </Stack>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "error.main" }}
                >
                  {report?.liveStatus?.delisted || 0}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Progress Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              📊 Detailed Progress
            </Typography>

            <Grid container spacing={2}>
              {/* Progress Overview */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
                  <Stack spacing={2}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Progress Overview
                    </Typography>

                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mb: 1 }}
                      >
                        <Typography variant="caption">
                          Properties Verified
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {report?.summary?.propertiesVerified || 0} /{" "}
                          {report?.summary?.totalPropertiesInDB || 0}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={report?.summary?.percentageComplete || 0}
                      />
                    </Box>

                    <Divider />

                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption">Live Properties</Typography>
                        <Chip
                          label={report?.liveStatus?.live || 0}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption">Delisted</Typography>
                        <Chip
                          label={report?.liveStatus?.delisted || 0}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption">Remaining</Typography>
                        <Chip
                          label={report?.summary?.propertiesRemaining || 0}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>

              {/* Changes Detected */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
                  <Stack spacing={2}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Changes Detected
                    </Typography>

                    <Divider />

                    <Stack spacing={1}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <TrendingUp size={18} color="#ff9800" />
                        <Stack direction="row" justifyContent="space-between" sx={{ flex: 1 }}>
                          <Typography variant="caption">Price Changes</Typography>
                          <Chip
                            label={report?.changes?.priceChanges || 0}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={2} alignItems="center">
                        <Camera size={18} color="#9c27b0" />
                        <Stack direction="row" justifyContent="space-between" sx={{ flex: 1 }}>
                          <Typography variant="caption">Image Changes</Typography>
                          <Chip
                            label={report?.changes?.imageChanges || 0}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: "#9c27b0", color: "#9c27b0" }}
                          />
                        </Stack>
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {/* Scheduling & Timing Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ⏰ Scheduling & Timing
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1}>
                  <Typography color="textSecondary" variant="body2">
                    Last Run
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {report?.scheduling?.lastRun
                      ? new Date(report.scheduling.lastRun).toLocaleString()
                      : "Never"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {report?.scheduling?.daysSinceLastRun !== null
                      ? `${report.scheduling.daysSinceLastRun} days ago`
                      : "N/A"}
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1}>
                  <Typography color="textSecondary" variant="body2">
                    Next Scheduled Run
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {report?.scheduling?.nextScheduledRun
                      ? new Date(report.scheduling.nextScheduledRun).toLocaleString()
                      : "Not scheduled"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Dynamic based on property count
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1}>
                  <Typography color="textSecondary" variant="body2">
                    Job Duration
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {report?.jobTiming?.elapsedSeconds
                      ? `${report.jobTiming.elapsedSeconds}s`
                      : "N/A"}
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1}>
                  <Typography color="textSecondary" variant="body2">
                    Success Rate
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "success.main" }}
                  >
                    {report?.performanceMetrics?.successRate || 0}%
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                📈 Performance Metrics
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Eye size={16} />}
                onClick={() => setShowReport(!showReport)}
              >
                {showReport ? "Hide" : "Show"} Details
              </Button>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Total Runs
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {report?.performanceMetrics?.totalRuns || 0}
                    </Typography>
                    <Typography variant="caption">
                      ✓ {report?.performanceMetrics?.successfulRuns || 0} successful
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Total Verified
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {status?.stats?.propertiesVerified || 0}
                    </Typography>
                    <Typography variant="caption">
                      Across all runs
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Total Changes
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {(status?.stats?.priceChanges || 0) +
                        (status?.stats?.imageChanges || 0)}
                    </Typography>
                    <Typography variant="caption">
                      Price: {status?.stats?.priceChanges || 0}, Images:{" "}
                      {status?.stats?.imageChanges || 0}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                📋 Verification Logs
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Eye size={16} />}
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? "Hide" : "Show"} Logs
              </Button>
            </Stack>

            {showLogs && logs.length > 0 && (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Level</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.level}
                            size="small"
                            color={
                              log.level === "error"
                                ? "error"
                                : log.level === "warn"
                                ? "warning"
                                : "success"
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{log.message}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {!showLogs && logs.length > 0 && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {logs.length} log entries available
              </Typography>
            )}

            {logs.length === 0 && (
              <Alert severity="info">No logs yet. Start verification to see logs.</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ℹ️ Property Verification:
          </Typography>
          <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
            <li>
              <Typography variant="caption">
                Checks existing NoBroker properties every 1-5 days (dynamic based on count)
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Detects: Price changes, image changes, delisted properties
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Auto-schedules future runs: Small dataset (50) = daily, Large dataset (500+) = every 4 days
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Includes automatic rate limiting to prevent NoBroker blocking
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Set external cron to /api/cron/property-sync-trigger every 15 mins for automation
              </Typography>
            </li>
          </ul>
        </Stack>
      </Alert>
    </Box>
  );
};

export default AdminPropertySync;
