import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, Chip, Stack, TextField, Typography } from "@mui/material";
import { Globe, Smartphone } from "lucide-react";
import { useAdminFeedback } from "./shell/adminUi";

const API = process.env.REACT_APP_Base_API || "";
const headers = () => {
  const t = localStorage.getItem("accessToken") || localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const isHttps = (v) => !v || /^https:\/\/[^\s]+\.[^\s]+/i.test(v.trim());

/**
 * Settings → App & Website links. The website shows an "Get the app" banner
 * only once the Play Store link is set; the app shows a "Visit our website"
 * card only once the website link is set.
 */
export default function AdminAppLinks() {
  const { feedback, notify } = useAdminFeedback();
  const [form, setForm] = useState({ playStoreUrl: "", websiteUrl: "" });
  const [saved, setSaved] = useState({ playStoreUrl: "", websiteUrl: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/admin/app-links`, { headers: headers(), credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const v = { playStoreUrl: d.playStoreUrl || "", websiteUrl: d.websiteUrl || "" };
          setForm(v);
          setSaved(v);
        }
      })
      .catch(() => notify("Couldn't load links", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/app-links`, {
        method: "PUT",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify({ playStoreUrl: form.playStoreUrl.trim(), websiteUrl: form.websiteUrl.trim() }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message || "Save failed");
      const v = { playStoreUrl: d.playStoreUrl, websiteUrl: d.websiteUrl };
      setForm(v);
      setSaved(v);
      notify("Links saved", "success");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const valid = isHttps(form.playStoreUrl) && isHttps(form.websiteUrl);
  const dirty = form.playStoreUrl !== saved.playStoreUrl || form.websiteUrl !== saved.websiteUrl;

  const renderRow = ({ icon: Icon, tone, title, field, placeholder, live, where }) => (
    <Card key={field} className="admin-card" sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: `${tone}1F`, color: tone }}>
          <Icon size={20} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: "primary.main" }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{where}</Typography>
        </Box>
        <Chip size="small" label={live ? "Showing" : "Hidden"} color={live ? "success" : "default"} variant={live ? "filled" : "outlined"} />
      </Stack>
      <TextField
        fullWidth
        size="small"
        placeholder={placeholder}
        value={form[field]}
        disabled={loading}
        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        error={!isHttps(form[field])}
        helperText={!isHttps(form[field]) ? "Must be a full https:// link" : "Leave empty to hide the banner"}
      />
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 820 }}>
      {feedback}
      <Typography variant="h3" sx={{ fontSize: "1.2rem", fontWeight: 800, color: "primary.main", mb: 0.5 }}>App &amp; Website links</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Promote the app on the website and the website inside the app. Each banner only appears once its link is set.
      </Typography>
      <Stack spacing={2}>
        {renderRow({ icon: Smartphone, tone: "#00A79D", title: "Play Store link", field: "playStoreUrl", placeholder: "https://play.google.com/store/apps/details?id=com.tanush.ggnhome", live: Boolean(saved.playStoreUrl), where: "Shown on the website as a “Get the GgnHome app” banner" })}
        {renderRow({ icon: Globe, tone: "#8B5CF6", title: "Website link", field: "websiteUrl", placeholder: "https://www.ggnhome.com", live: Boolean(saved.websiteUrl), where: "Shown inside the app as a “Visit / share our website” card" })}
      </Stack>
      {!valid && <Alert severity="warning" sx={{ mt: 2 }}>Fix the highlighted link before saving.</Alert>}
      <Button variant="contained" sx={{ mt: 3 }} disabled={!valid || !dirty || saving} onClick={save}>
        {saving ? "Saving…" : "Save links"}
      </Button>
    </Box>
  );
}
