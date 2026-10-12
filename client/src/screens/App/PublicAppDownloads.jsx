import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { Download, Smartphone, ShieldCheck } from "lucide-react";

const API = (process.env.REACT_APP_Base_API || "").replace(/\/+$/, "");
const APP_ORDER = [
  { key: "ggnhome", name: "GgnHome", subtitle: "Find and explore properties in Gurgaon", color: "#0f766e" },
  { key: "partner", name: "GgnHome Partner", subtitle: "Access your partner workspace on Android", color: "#2563eb" },
  { key: "sms-service", name: "SMS Service", subtitle: "Android SMS gateway companion app", color: "#7c3aed" },
];

export default function PublicAppDownloads() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadApps() {
      try {
        const response = await fetch(`${API}/api/app-downloads`, { headers: { Accept: "application/json" } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load app downloads.");
        if (active) setApps(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(err.message || "Could not load app downloads.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadApps();
    return () => { active = false; };
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f8fc", py: { xs: 4, md: 8 } }}>
      <Container maxWidth="md">
        <Stack spacing={4}>
          <Stack spacing={1.5} alignItems="center" textAlign="center">
            <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: "#dff5ee", color: "#087f68", display: "grid", placeItems: "center" }}>
              <Smartphone size={32} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 900, color: "#102033", letterSpacing: "-0.04em", fontSize: { xs: 32, md: 44 } }}>
              GgnHome Apps
            </Typography>
            <Typography sx={{ maxWidth: 560, color: "#5c6b7d", fontSize: { xs: 15, md: 17 } }}>
              Download the official Android apps for GgnHome, partners, and SMS service from one simple page.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#087f68", pt: 0.5 }}>
              <ShieldCheck size={17} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Direct downloads · No admin login required</Typography>
            </Stack>
          </Stack>

          {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}><CircularProgress /></Box>}
          {error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && (
            <Stack spacing={2}>
              {APP_ORDER.map((app) => {
                const configured = apps.find((item) => item.key === app.key);
                const url = configured?.url || "";
                const version = configured?.version || "";
                return (
                  <Card key={app.key} variant="outlined" sx={{ borderRadius: 4, borderColor: "#e0e7ef", boxShadow: "0 8px 28px rgba(16,32,51,0.04)" }}>
                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                        <Box sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: 3, bgcolor: app.color + "14", color: app.color, display: "grid", placeItems: "center" }}>
                          <Smartphone size={25} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 18, fontWeight: 850, color: "#102033" }}>{app.name}</Typography>
                          <Typography variant="body2" sx={{ color: "#617084", mt: 0.4 }}>{app.subtitle}</Typography>
                          {version && <Typography variant="caption" sx={{ display: "block", color: "#8290a0", mt: 0.8 }}>Version {version}</Typography>}
                        </Box>
                        {url ? (
                          <Button component="a" href={url} target="_blank" rel="noopener noreferrer" variant="contained" startIcon={<Download size={17} />} sx={{ bgcolor: app.color, borderRadius: 2.5, textTransform: "none", fontWeight: 800, px: 2.5, py: 1.2, whiteSpace: "nowrap", "&:hover": { bgcolor: app.color, filter: "brightness(0.92)" } }}>
                            Download APK
                          </Button>
                        ) : (
                          <Button variant="outlined" disabled sx={{ borderRadius: 2.5, textTransform: "none", whiteSpace: "nowrap" }}>Coming soon</Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}

          <Typography variant="caption" textAlign="center" sx={{ color: "#8290a0" }}>
            Android may ask you to confirm installation when an app is installed outside Google Play.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
