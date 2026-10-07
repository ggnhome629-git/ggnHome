import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  TextField,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Play,
  Square,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Server,
  TrendingUp,
  Zap,
  Copy,
  ExternalLink,
} from "lucide-react";

const AdminScraperControl = () => {
  const [scraperStatus, setScraperStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("nobroker");
  const [stats, setStats] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const API_BASE = process.env.REACT_APP_Base_API || "http://localhost:2000";

  // Fetch scraper status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/scraper/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setScraperStatus(data.data);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/scraper/logs?limit=50`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

    // Auto-refresh every 5 seconds if scraper is running
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchStatus();
        if (scraperStatus?.isRunning) {
          fetchLogs();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Start scraper
  const startScraper = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/scraper/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
        body: JSON.stringify({ source }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage("✓ Scraper started successfully!");
        fetchStatus();
        fetchLogs();
      } else {
        setMessage("✗ " + (data.error?.message || "Failed to start scraper"));
      }
    } catch (error) {
      setMessage("✗ Error: " + error.message);
    }
    setLoading(false);
  };

  // Stop scraper
  const stopScraper = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/scraper/stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setMessage("✓ Scraper stopped");
        fetchStatus();
      } else {
        setMessage("✗ Failed to stop scraper");
      }
    } catch (error) {
      setMessage("✗ Error: " + error.message);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Server size={28} color="#003366" />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Scraper Control
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Manage web scraping jobs for property listings
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

      {/* Status Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Status Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="textSecondary" variant="body2">
                  Status
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {scraperStatus?.isRunning ? (
                    <Chip
                      icon={<Zap size={16} />}
                      label="Running"
                      color="success"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      icon={<CheckCircle size={16} />}
                      label="Idle"
                      color="default"
                      variant="outlined"
                    />
                  )}
                </Stack>
                {scraperStatus?.currentJob && (
                  <Typography variant="caption" sx={{ color: "info.main" }}>
                    Job: {scraperStatus.currentJob.jobId}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Last Run */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="textSecondary" variant="body2">
                  Last Run
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {stats?.lastRun
                    ? new Date(stats.lastRun).toLocaleString()
                    : "Never"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {stats?.successfulRuns || 0} successful runs
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Properties Scraped */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="textSecondary" variant="body2">
                  Total Scraped
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  {stats?.propertiesScraped || 0}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Success Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography color="textSecondary" variant="body2">
                  Success Rate
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "success.main" }}
                >
                  {stats?.totalRun > 0
                    ? Math.round((stats?.successfulRuns / stats?.totalRun) * 100)
                    : 0}
                  %
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    stats?.totalRun > 0
                      ? Math.round((stats?.successfulRuns / stats?.totalRun) * 100)
                      : 0
                  }
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              📥 Trigger Scraper
            </Typography>

            <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
              {/* Source Selection */}
              <TextField
                select
                label="Data Source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                SelectProps={{
                  native: true,
                }}
                size="small"
                sx={{ minWidth: 150 }}
                disabled={scraperStatus?.isRunning}
              >
                <option value="nobroker">NoBroker</option>
                <option value="99acres">99acres (Premium)</option>
                <option value="all">All Sources</option>
              </TextField>

              {/* Action Buttons */}
              <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Play size={18} />}
                  onClick={startScraper}
                  disabled={loading || scraperStatus?.isRunning}
                  sx={{
                    backgroundColor: "success.main",
                    "&:hover": { backgroundColor: "success.dark" },
                  }}
                >
                  Start Scraper
                </Button>

                {scraperStatus?.isRunning && (
                  <Button
                    variant="outlined"
                    startIcon={<Square size={18} />}
                    onClick={stopScraper}
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
              </Stack>
            </Stack>

            {/* Auto-refresh Toggle */}
            <Stack direction="row" spacing={1} alignItems="center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <Typography variant="body2">Auto-refresh status</Typography>
            </Stack>

            {/* Progress Bar */}
            {scraperStatus?.isRunning && (
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Scraping in progress...</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Current Job: {scraperStatus.currentJob?.source || "N/A"}
                  </Typography>
                </Stack>
                <LinearProgress />
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                📋 Scraper Logs
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Eye size={16} />}
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? "Hide" : "Show"} Details
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
              <Alert severity="info">No logs yet. Start scraper to see logs.</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ℹ️ How to use:
          </Typography>
          <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
            <li>
              <Typography variant="caption">
                Select NoBroker as the data source (99acres requires premium setup)
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Click "Start Scraper" to begin collecting properties
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Monitor progress in logs and stats cards above
              </Typography>
            </li>
            <li>
              <Typography variant="caption">
                Properties are automatically saved to database one by one
              </Typography>
            </li>
          </ul>
        </Stack>
      </Alert>
    </Box>
  );
};

export default AdminScraperControl;
