import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ArrowLeft, Braces, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PromoCard from "../../components/promo/PromoCard";
import { PROMO_ICONS, PROMO_THEMES } from "../../components/promo/promoData";
import PromoJsonImport from "./PromoJsonImport";
import { useAdminFeedback } from "./shell/adminUi";

const BASE = process.env.REACT_APP_Base_API;

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", headers: authHeaders(), ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

const PLACEMENTS = [
  { value: "dashboard", label: "Dashboard offers" },
  { value: "search", label: "Search results (between listings)" },
  { value: "banner", label: "Top banner line (dashboard)" },
  { value: "post", label: "Post property / flatmate forms" },
];

const EMPTY = {
  overline: "",
  title: "",
  text: "",
  ctaLabel: "Know more",
  link: "/",
  theme: "navy",
  icon: "sparkles",
  imageUrl: "",
  placements: ["dashboard", "search"],
  audience: "all",
  weight: 1,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : null);

/** Admin → Promo cards: what shows on the dashboard and between search results. */
export default function AdminPromos() {
  const { confirm, notify, feedback } = useAdminFeedback();
  const navigate = useNavigate();
  const [promos, setPromos] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [copied, setCopied] = useState("");

  const copyJson = async (promo) => {
    const keys = ["overline", "title", "text", "ctaLabel", "link", "theme", "icon", "imageUrl", "placements", "audience", "weight", "isActive", "startsAt", "endsAt"];
    const out = {};
    keys.forEach((k) => {
      if (promo[k] !== undefined && promo[k] !== null && promo[k] !== "") out[k] = k.endsWith("At") ? toDateInput(promo[k]) : promo[k];
    });
    try {
      await navigator.clipboard.writeText(JSON.stringify(out, null, 2));
      setCopied(promo._id);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) {
      setError("Could not copy — your browser blocked clipboard access.");
    }
  };

  const load = useCallback(async () => {
    try {
      setPromos(await api("/api/admin/promos"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const body = JSON.stringify({ ...editing, startsAt: editing.startsAt || null, endsAt: editing.endsAt || null });
      if (editing._id) await api(`/api/admin/promos/${editing._id}`, { method: "PUT", body });
      else await api("/api/admin/promos", { method: "POST", body });
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (promo) => {
    try {
      await api(`/api/admin/promos/${promo._id}`, { method: "PUT", body: JSON.stringify({ isActive: !promo.isActive }) });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (promo) => {
    if (!(await confirm({ title: "Delete promo", message: `Delete "${promo.title}"? This cannot be undone.`, confirmLabel: "Delete", danger: true }))) return;
    try {
      await api(`/api/admin/promos/${promo._id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const set = (key) => (value) => setEditing((prev) => ({ ...prev, [key]: value }));
  const togglePlacement = (value) =>
    setEditing((prev) => ({
      ...prev,
      placements: prev.placements.includes(value) ? prev.placements.filter((p) => p !== value) : [...prev.placements, value],
    }));

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", py: { xs: 6, md: 10 } }}>
      {feedback}
      <Container maxWidth="lg">
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <IconButton aria-label="Back to admin" onClick={() => navigate("/admin/Landingpage")}>
            <ArrowLeft size={20} />
          </IconButton>
          <Typography variant="h2" sx={{ color: "primary.main", fontSize: { xs: "1.6rem", md: "2rem" } }}>
            Promo cards
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 6, maxWidth: 680 }}>
          The dashboard shows up to 3 live promos and the search page shows 2–3 others, picked at random on every
          visit. Higher weight shows more often. Promos appear only once you create them here.
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={3} sx={{ mb: 6 }}>
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setEditing({ ...EMPTY })}>
            New promo
          </Button>
          <Button variant="outlined" startIcon={<Braces size={18} />} onClick={() => setJsonOpen(true)}>
            Add from JSON
          </Button>
        </Stack>

        <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}>
          {promos.map((promo) => (
            <Box key={promo._id} sx={{ opacity: promo.isActive ? 1 : 0.55 }}>
              <PromoCard promo={promo} minHeight={240} onClick={() => setEditing({ ...EMPTY, ...promo, startsAt: toDateInput(promo.startsAt), endsAt: toDateInput(promo.endsAt) })} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2, px: 1 }}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {promo.placements.map((p) => (
                    <Chip key={p} size="small" label={p} />
                  ))}
                  {promo.audience !== "all" && <Chip size="small" color="secondary" label={promo.audience} />}
                  <Chip size="small" variant="outlined" label={`weight ${promo.weight}`} />
                  {(promo.startsAt || promo.endsAt) && (
                    <Chip size="small" variant="outlined" label={`${fmtDate(promo.startsAt) || "now"} → ${fmtDate(promo.endsAt) || "open"}`} />
                  )}
                </Stack>
                <Stack direction="row" alignItems="center">
                  <Tooltip title={promo.isActive ? "Live — click to pause" : "Paused — click to go live"}>
                    <Switch checked={promo.isActive} onChange={() => toggleActive(promo)} color="secondary" />
                  </Tooltip>
                  <Tooltip title={copied === promo._id ? "Copied!" : "Copy as JSON"}>
                    <IconButton aria-label="Copy as JSON" onClick={() => copyJson(promo)}>
                      <Copy size={16} />
                    </IconButton>
                  </Tooltip>
                  <IconButton aria-label="Edit" onClick={() => setEditing({ ...EMPTY, ...promo, startsAt: toDateInput(promo.startsAt), endsAt: toDateInput(promo.endsAt) })}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton aria-label="Delete" onClick={() => remove(promo)} sx={{ color: "error.main" }}>
                    <Trash2 size={16} />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>

        {promos.length === 0 && !error && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
            No promos yet. Nothing shows on the site until you create one.
          </Typography>
        )}
      </Container>

      <PromoJsonImport
        open={jsonOpen}
        onClose={() => setJsonOpen(false)}
        onImported={load}
        createPromo={(promo) => api("/api/admin/promos", { method: "POST", body: JSON.stringify(promo) })}
      />

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="md" fullWidth>
        {editing && (
          <>
            <DialogTitle>{editing._id ? "Edit promo" : "New promo"}</DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" } }}>
                <Stack spacing={4}>
                  <TextField label="Small heading (optional)" value={editing.overline} onChange={(e) => set("overline")(e.target.value)} inputProps={{ maxLength: 40 }} />
                  <TextField label="Title" required value={editing.title} onChange={(e) => set("title")(e.target.value)} inputProps={{ maxLength: 90 }} />
                  <TextField label="Text" multiline minRows={2} value={editing.text} onChange={(e) => set("text")(e.target.value)} inputProps={{ maxLength: 200 }} />
                  <Stack direction="row" spacing={3}>
                    <TextField label="Button label" value={editing.ctaLabel} onChange={(e) => set("ctaLabel")(e.target.value)} inputProps={{ maxLength: 30 }} sx={{ flex: 1 }} />
                    <TextField label="Link" helperText="Site path like /rewards or a full https:// URL" value={editing.link} onChange={(e) => set("link")(e.target.value)} sx={{ flex: 1.4 }} />
                  </Stack>
                  <Stack direction="row" spacing={3}>
                    <TextField select label="Colour" value={editing.theme} onChange={(e) => set("theme")(e.target.value)} sx={{ flex: 1 }}>
                      {Object.entries(PROMO_THEMES).map(([key, t]) => (
                        <MenuItem key={key} value={key}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ width: 16, height: 16, borderRadius: "50%", background: t.background }} />
                            <span>{t.label}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField select label="Icon" value={editing.icon} onChange={(e) => set("icon")(e.target.value)} sx={{ flex: 1 }}>
                      {Object.entries(PROMO_ICONS).map(([key, Icon]) => (
                        <MenuItem key={key} value={key}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Icon size={16} />
                            <span>{key}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <TextField label="Background image URL (optional, https)" value={editing.imageUrl} onChange={(e) => set("imageUrl")(e.target.value)} />

                  <Box>
                    <Typography variant="overline" sx={{ color: "text.secondary" }}>Show on</Typography>
                    <FormGroup>
                      {PLACEMENTS.map((p) => (
                        <FormControlLabel key={p.value} control={<Checkbox checked={editing.placements.includes(p.value)} onChange={() => togglePlacement(p.value)} />} label={p.label} />
                      ))}
                    </FormGroup>
                  </Box>
                  <Stack direction="row" spacing={3}>
                    <TextField select label="Audience" value={editing.audience} onChange={(e) => set("audience")(e.target.value)} sx={{ flex: 1 }}>
                      <MenuItem value="all">Everyone</MenuItem>
                      <MenuItem value="rent">Rent searches</MenuItem>
                      <MenuItem value="sale">Buy searches</MenuItem>
                    </TextField>
                    <Box sx={{ flex: 1, px: 2 }}>
                      <Typography variant="caption">How often (weight {editing.weight})</Typography>
                      <Slider min={1} max={10} step={1} value={Number(editing.weight) || 1} onChange={(_, v) => set("weight")(v)} />
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={3}>
                    <TextField type="date" label="Starts" value={editing.startsAt} onChange={(e) => set("startsAt")(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
                    <TextField type="date" label="Ends" value={editing.endsAt} onChange={(e) => set("endsAt")(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
                  </Stack>
                  <FormControlLabel control={<Switch checked={editing.isActive} onChange={(e) => set("isActive")(e.target.checked)} color="secondary" />} label="Live" />
                </Stack>

                <Box>
                  <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Preview</Typography>
                  <Box sx={{ position: { md: "sticky" }, top: 0 }}>
                    <PromoCard promo={{ ...editing, title: editing.title || "Your promo title" }} onClick={() => {}} />
                    {editing.placements.includes("banner") && (
                      <Typography variant="caption" sx={{ display: "block", mt: 3, color: "text.secondary" }}>
                        Top banner shows only the title, on one line.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 6, py: 4 }}>
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="contained" onClick={save} disabled={saving || !editing.title.trim() || editing.placements.length === 0}>
                {saving ? "Saving…" : "Save promo"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
