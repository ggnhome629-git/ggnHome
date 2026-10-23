import React, { useState, useEffect } from "react";
import { Box, Button, Card, CardContent, Typography, Skeleton, Stack, Alert } from "@mui/material";
import { RefreshCw, Database, Activity } from "lucide-react";
import { PageHeader } from "./shell/adminUi";
import "./admin.css";

export default function AdminUsageDashboard() {
  const [mongoUsage, setMongoUsage] = useState(null);
  const [gnewsUsage, setGNewsUsage] = useState(null);
  const [dbAccounts, setDbAccounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const accessToken = localStorage.getItem("accessToken");

  const fetchUsageData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mongoRes, gnewsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_Base_API}/api/admin/mongo/usage`, {
          credentials: "include",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }),
        fetch(`${process.env.REACT_APP_Base_API}/api/admin/gnews/usage`, {
          credentials: "include",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }),
      ]);
      if (!mongoRes.ok || !gnewsRes.ok) throw new Error("Failed to fetch usage data");
      setMongoUsage(await mongoRes.json());
      setGNewsUsage(await gnewsRes.json());
      try {
        const dbRes = await fetch(`${process.env.REACT_APP_Base_API}/api/admin/db-accounts?refresh=1`, {
          credentials: "include",
          headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        });
        if (dbRes.ok) setDbAccounts(await dbRes.json());
      } catch (_) { /* board is optional */ }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatNumber = (num) => new Intl.NumberFormat().format(num);

  const gnewsPct =
    gnewsUsage?.dailyLimit
      ? Math.min(100, ((gnewsUsage.requestsToday / gnewsUsage.dailyLimit) * 100).toFixed(1))
      : 0;

  return (
    <>
      <PageHeader
        title="System & Usage"
        description="Monitor MongoDB and GNews API usage"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={fetchUsageData}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh Data"}
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Activity size={18} color="#DC2626" />
            <span>Error: {error}</span>
          </Box>
        </Alert>
      )}

      {dbAccounts?.slots?.length > 0 && (
        <Card className="admin-card" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h2" sx={{ fontWeight: 700, fontSize: "1.1rem", mb: 0.5 }}>
              Database accounts
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
              A database is marked full at {dbAccounts.limit}% of {dbAccounts.quotaMB} MB. New overflow data goes to the active one.
            </Typography>
            {dbAccounts.allFull && <Alert severity="error" sx={{ mb: 2 }}>Every database is full. Add another MONGO_URI.</Alert>}
            <Stack spacing={1.5}>
              {dbAccounts.slots.map((d) => {
                const color = { active: "#16A34A", saved: "#2563EB", full: "#DC2626", waiting: "#6B7280", offline: "#9CA3AF" }[d.state];
                return (
                  <Box key={d.slot}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 600 }}>Database {d.slot}</Typography>
                      <Typography sx={{ fontWeight: 700, color, textTransform: "uppercase", fontSize: 12 }}>
                        {d.state === "active" ? "Saving data now" : d.state === "saved" ? "Data saved" : d.state}
                      </Typography>
                    </Box>
                    <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden" }}>
                      <Box sx={{ height: "100%", width: `${Math.min(100, d.percent || 0)}%`, bgcolor: color }} />
                    </Box>
                    <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
                      {d.ok ? `${d.usedMB} MB used (${d.percent}%) · ${formatNumber(d.objects)} documents` : "Not reachable"}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* MongoDB card */}
      <Card className="admin-card">
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 44, height: 44, borderRadius: 2,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Database size={22} color="#fff" />
            </Box>
            <Typography variant="h2" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
              MongoDB Usage
            </Typography>
          </Box>

          {loading ? (
            <Stack spacing={1.5}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 1.5 }}>
                  <Skeleton width={140} height={18} />
                  <Skeleton width={80} height={18} />
                </Box>
              ))}
            </Stack>
          ) : mongoUsage ? (
            <Box className="admin-usage-rows">
              <Row label="Total Documents" value={formatNumber(mongoUsage.totalDocuments || 0)} />
              <Row label="Total Collections" value={formatNumber(mongoUsage.totalCollections || 0)} />
              <Row label="Database Size" value={formatBytes(mongoUsage.dataSize || 0)} />
              <Row label="Storage Size" value={formatBytes(mongoUsage.storageSize || 0)} />
              <Row label="Index Size" value={formatBytes(mongoUsage.indexSize || 0)} last />
            </Box>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No data available
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* GNews card */}
      <Card className="admin-card">
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 44, height: 44, borderRadius: 2,
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Newspaper size={22} color="#fff" />
            </Box>
            <Typography variant="h2" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
              GNews API Usage
            </Typography>
          </Box>

          {loading ? (
            <Stack spacing={1.5}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 1.5 }}>
                  <Skeleton width={140} height={18} />
                  <Skeleton width={80} height={18} />
                </Box>
              ))}
            </Stack>
          ) : gnewsUsage ? (
            <>
              <Box className="admin-usage-rows">
                <Row label="Requests Today" value={formatNumber(gnewsUsage.requestsToday || 0)} />
                <Row label="Daily Limit" value={formatNumber(gnewsUsage.dailyLimit || 0)} />
                <Row label="Remaining Requests" value={formatNumber(gnewsUsage.remaining || 0)} />
                <Row label="Usage Percentage" value={`${gnewsPct}%`} />
                <Row
                  label="Last Reset"
                  value={gnewsUsage.lastReset ? new Date(gnewsUsage.lastReset).toLocaleDateString() : "N/A"}
                  last
                />
              </Box>
              {gnewsUsage.dailyLimit > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Daily usage
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {gnewsPct}%
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 8, borderRadius: 4, bgcolor: "#E5E9EE", overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${Math.min(100, gnewsPct)}%`,
                        bgcolor:
                          gnewsPct > 90
                            ? "#DC2626"
                            : gnewsPct > 70
                            ? "#F59E0B"
                            : "#00A79D",
                        transition: "width .4s ease, background-color .3s ease",
                        borderRadius: 4,
                      }}
                    />
                  </Box>
                </Box>
              )}
            </>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No data available
            </Typography>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Row({ label, value, last }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 1.5,
        borderBottom: last ? "none" : "1px solid #F4F7F9",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: "text.primary", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function Newspaper({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.5 1-3 2-3s2 1.5 2 3v9a2 2 0 0 1-2 2Zm10 0h-4v-5h4v5Z"/>
    </svg>
  );
}
