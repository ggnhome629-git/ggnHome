import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { Download, ExternalLink, Save, Smartphone } from "lucide-react";

const API = process.env.REACT_APP_Base_API;
const DEFAULT_APPS = [
  { key: "ggnhome", name: "GgnHome", description: "Main GgnHome Android app", url: "", version: "" },
  { key: "partner", name: "GgnHome-Partner", description: "Partner portal Android app", url: "", version: "" },
  { key: "sms-service", name: "sms-service", description: "SMS service Android app", url: "", version: "" },
];

export default function AdminAppDownloads() {
  const [apps, setApps] = useState(DEFAULT_APPS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API}/api/admin/app-downloads`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load app links.");
      setApps(DEFAULT_APPS.map(base => ({ ...base, ...(data.find(x => x.key === base.key) || {}) })));
    } catch (e) { setError(e.message || "Could not load app links."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const change = (key, field, value) => setApps(prev => prev.map(app => app.key === key ? { ...app, [field]: value } : app));

  async function save() {
    setSaving(true); setNotice(""); setError("");
    try {
      const response = await fetch(`${API}/api/admin/app-downloads`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apps: apps.map(({ key, url, version }) => ({ key, url: url.trim(), version: version.trim() })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save links.");
      setApps(DEFAULT_APPS.map(base => ({ ...base, ...(data.apps.find(x => x.key === base.key) || {}) })));
      setNotice("Download links saved. They are now available to the Partner portal.");
    } catch (e) { setError(e.message || "Could not save links."); }
    finally { setSaving(false); }
  }

  if (loading) return <Box sx={{ p: 5, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1050, mx: "auto" }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#e6f5f3", color: "#087f75", display: "grid", placeItems: "center" }}><Smartphone size={26} /></Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 850, color: "#0f172a" }}>App Downloads</Typography>
            <Typography color="text.secondary">Manage direct APK links for GgnHome, GgnHome-Partner and sms-service.</Typography>
          </Box>
        </Stack>
        {notice && <Alert severity="success">{notice}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Alert severity="info">
          Paste the HTTPS direct-download URL for each APK. A link is shown in the Partner portal only after a URL is configured. APK binaries have not been uploaded by this settings page.
        </Alert>
        {apps.map((app) => (
          <Card key={app.key} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: "#f1f5f9", display: "grid", placeItems: "center" }}><Download size={20} /></Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{app.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{app.description}</Typography>
                  </Box>
                  {app.url && <Button size="small" endIcon={<ExternalLink size={15} />} onClick={() => window.open(app.url, "_blank", "noopener,noreferrer")}>Test link</Button>}
                </Stack>
                <TextField label="Direct APK download URL (HTTPS)" placeholder="https://github.com/owner/repo/releases/download/v1.0.0/app.apk" value={app.url} onChange={e => change(app.key, "url", e.target.value)} fullWidth />
                <TextField label="Version (optional)" placeholder="1.0.0" value={app.version} onChange={e => change(app.key, "version", e.target.value)} sx={{ maxWidth: 260 }} />
                <Typography variant="caption" color="text.secondary">{app.url ? "Configured — this link will be displayed on the Partner portal." : "Not configured — no APK download link will be shown yet."}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" onClick={save} disabled={saving} startIcon={<Save size={17} />} sx={{ bgcolor: "#087f75", textTransform: "none", fontWeight: 800, px: 3, py: 1.2 }}>
            {saving ? "Saving…" : "Save download links"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
