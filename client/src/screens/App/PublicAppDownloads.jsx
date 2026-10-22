import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Container, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Building2, Download, ExternalLink, MessageSquare, Shield, ShieldCheck, Smartphone } from "lucide-react";

const API = (process.env.REACT_APP_Base_API || "").replace(/\/+$/, "");
const SITE = "https://www.ggnhome.com";
const RELEASE_VERSION = "1.0.0";

// Four apps. Each has one stable download link on the API: /api/app-downloads/<file>.
const APPS = [
  {
    key: "ggnhome",
    file: "GgnHome.apk",
    name: "GgnHome",
    subtitle: "Search, rent and buy verified homes in Gurgaon. Every ggnhome.com link you tap opens in this app.",
    webUrl: SITE,
    webLabel: "Open ggnhome.com",
    color: "#0f766e",
    icon: Smartphone,
  },
  {
    key: "partner",
    file: "GgnHome-Partner.apk",
    name: "GgnHome Partner",
    subtitle: "For registered partners: add properties, see leads and enquiries.",
    webUrl: `${SITE}/partner/login`,
    webLabel: "Partner login on the web",
    color: "#2563eb",
    icon: Building2,
  },
  {
    key: "admin",
    file: "GgnHome-Admin.apk",
    name: "GgnHome Admin",
    subtitle: "For the GgnHome team: properties, users, approvals and settings. Admin numbers only.",
    webUrl: `${SITE}/admin/login`,
    webLabel: "Admin login on the web",
    color: "#b45309",
    icon: Shield,
  },
  {
    key: "sms-service",
    file: "sms-service.apk",
    name: "SMS Service",
    subtitle: "For the GgnHome team: the phone that sends OTP and alert SMS, and shows OTPs.",
    webUrl: `${SITE}/admin/sms-console`,
    webLabel: "SMS Console on the web",
    color: "#7c3aed",
    icon: MessageSquare,
  },
];

const INSTALL_STEPS = [
  "Tap Download APK on your Android phone.",
  "Open the downloaded file. If Android asks, allow \"Install unknown apps\" for your browser.",
  "Tap Install. To update later, download the new file and install it over the old one.",
];

export default function PublicAppDownloads() {
  const [versions, setVersions] = useState({});
  const [links, setLinks] = useState({});
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(`${API}/api/app-downloads`, { headers: { Accept: "application/json" } });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error("bad response");
        if (!active) return;
        setVersions(Object.fromEntries(data.map((item) => [item.key, item.version])));
        setLinks(Object.fromEntries(data.map((item) => [item.key, item.url])));
      } catch (_) {
        // The download links below still work: they do not depend on this call.
        if (active) setLoadFailed(true);
      }
    })();
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
            <Typography component="h1" sx={{ fontWeight: 900, color: "#102033", letterSpacing: "-0.04em", fontSize: { xs: 32, md: 44 } }}>
              GgnHome apps
            </Typography>
            <Typography sx={{ maxWidth: 580, color: "#5c6b7d", fontSize: { xs: 15, md: 17 } }}>
              Version {RELEASE_VERSION}. The official Android apps for GgnHome, the Partner portal, the Admin portal and the SMS Service.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#087f68", pt: 0.5 }}>
              <ShieldCheck size={17} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Direct downloads from ggnhome.com</Typography>
            </Stack>
          </Stack>

          {loadFailed && <Alert severity="info">Version details could not be loaded right now. The downloads below still work.</Alert>}

          <Stack spacing={2}>
            {APPS.map((app) => {
              const Icon = app.icon;
              const url = links[app.key] || `${API}/api/app-downloads/${app.file}`;
              return (
                <Card key={app.key} variant="outlined" sx={{ borderRadius: 4, borderColor: "#e0e7ef", boxShadow: "0 8px 28px rgba(16,32,51,0.04)" }}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                      <Box sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: 3, bgcolor: app.color + "14", color: app.color, display: "grid", placeItems: "center" }}>
                        <Icon size={25} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography sx={{ fontSize: 18, fontWeight: 850, color: "#102033" }}>{app.name}</Typography>
                          <Chip size="small" label={`v${versions[app.key] || RELEASE_VERSION}`} sx={{ fontWeight: 700 }} />
                        </Stack>
                        <Typography variant="body2" sx={{ color: "#617084", mt: 0.5 }}>{app.subtitle}</Typography>
                        <MuiLink href={app.webUrl} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.75, fontSize: 13, fontWeight: 700, color: app.color }}>
                          {app.webLabel} <ExternalLink size={13} />
                        </MuiLink>
                      </Box>
                      <Button
                        component="a"
                        href={url}
                        download={app.file}
                        variant="contained"
                        startIcon={<Download size={17} />}
                        sx={{ bgcolor: app.color, borderRadius: 2.5, textTransform: "none", fontWeight: 800, px: 2.5, py: 1.2, whiteSpace: "nowrap", "&:hover": { bgcolor: app.color, filter: "brightness(0.92)" } }}
                      >
                        Download APK
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>

          <Card variant="outlined" sx={{ borderRadius: 4, borderColor: "#e0e7ef" }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography sx={{ fontWeight: 850, color: "#102033", mb: 1 }}>How to install</Typography>
              <Stack component="ol" spacing={0.75} sx={{ m: 0, pl: 2.5, color: "#44546a", fontSize: 14.5 }}>
                {INSTALL_STEPS.map((step) => <li key={step}>{step}</li>)}
              </Stack>
            </CardContent>
          </Card>

          <Typography variant="caption" textAlign="center" sx={{ color: "#8290a0" }}>
            These apps are installed outside Google Play, so Android may ask you to confirm. Only download them from this page.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
