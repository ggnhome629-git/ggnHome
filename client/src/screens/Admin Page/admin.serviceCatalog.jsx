import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader, useAdminFeedback } from "./shell/adminUi";
import { invalidateServiceCatalog, priceLabel } from "../../data/useServiceCatalog";

const API = process.env.REACT_APP_Base_API;
const authHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
const EMPTY = { title: "", emoji: "🔧", color: "#00A79D", description: "", startsFrom: "", active: true };
const EMOJI_IDEAS = ["🧹", "🎨", "🚰", "❄️", "⚡", "🪚", "📦", "🦟", "🐛", "🔧", "🧺", "🛠️", "🪟", "🌿", "🔒", "🧯"];

async function api(path, method = "GET", body) {
  const res = await fetch(`${API}${path}`, { method, credentials: "include", headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  if (!res.ok || !data || data.success === false) throw new Error((data && data.message) || "Request failed");
  return data;
}

function ServiceDialog({ open, initial, onClose, onSaved, notify }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(initial && initial._id);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...EMPTY, ...initial, startsFrom: initial.startsFrom ? String(initial.startsFrom) : "" } : EMPTY);
      setError("");
    }
  }, [open, initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));

  const save = async () => {
    if (!form.title.trim()) {
      setError("Give the service a name.");
      return;
    }
    setSaving(true);
    setError("");
    const body = {
      title: form.title.trim(),
      emoji: form.emoji,
      color: form.color,
      description: form.description,
      startsFrom: form.startsFrom === "" ? 0 : Number(form.startsFrom),
      active: form.active,
    };
    try {
      const data = editing ? await api(`/api/admin/service-catalog/${initial._id}`, "PATCH", body) : await api("/api/admin/service-catalog", "POST", body);
      onSaved(data.service, editing);
      notify(editing ? "Service updated" : "Service added", "success");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>{editing ? "Edit service" : "Add a service"}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="Icon" value={form.emoji} onChange={set("emoji")} inputProps={{ maxLength: 8, style: { fontSize: 22, textAlign: "center" } }} sx={{ width: 90 }} />
            <TextField label="Service name" value={form.title} onChange={set("title")} inputProps={{ maxLength: 60 }} fullWidth autoFocus />
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {EMOJI_IDEAS.map((e) => (
              <Chip key={e} label={e} onClick={() => setForm((f) => ({ ...f, emoji: e }))} variant={form.emoji === e ? "filled" : "outlined"} sx={{ fontSize: 18 }} />
            ))}
          </Stack>
          <TextField label="Short description (shown to users)" value={form.description} onChange={set("description")} inputProps={{ maxLength: 300 }} multiline minRows={2} fullWidth helperText={`${form.description.length}/300`} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Starting price"
              type="number"
              value={form.startsFrom}
              onChange={set("startsFrom")}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              inputProps={{ min: 0 }}
              helperText="Leave empty for “Price on inspection”"
              fullWidth
            />
            <TextField label="Accent colour" type="color" value={form.color} onChange={set("color")} sx={{ width: { xs: "100%", sm: 160 } }} />
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderRadius: "10px", border: "1px solid", borderColor: "divider" }}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>Show to users</Typography>
              <Typography variant="caption" color="text.secondary">
                When off, users can't see or book it. Existing requests are kept.
              </Typography>
            </Box>
            <Switch checked={form.active} onChange={set("active")} color="success" />
          </Stack>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Add service"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Admin → Service Catalog: add, edit, delete, reorder and show/hide home services. */
export default function AdminServiceCatalog() {
  const { confirm, notify, feedback } = useAdminFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState({ open: false, initial: null });
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/admin/service-catalog");
      setItems(data.services || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (svc) => {
    invalidateServiceCatalog();
    setItems((prev) => prev.map((s) => (s._id === svc._id ? svc : s)).sort((a, b) => a.order - b.order));
  };

  const toggle = async (svc) => {
    const next = !svc.active;
    setItems((prev) => prev.map((s) => (s._id === svc._id ? { ...s, active: next } : s))); // instant
    try {
      const data = await api(`/api/admin/service-catalog/${svc._id}`, "PATCH", { active: next });
      replace(data.service);
      notify(`${svc.title} is now ${next ? "visible to users" : "hidden from users"}`, "success");
    } catch (err) {
      setItems((prev) => prev.map((s) => (s._id === svc._id ? { ...s, active: svc.active } : s)));
      notify(err.message, "error");
    }
  };

  const move = async (index, dir) => {
    const a = items[index];
    const b = items[index + dir];
    if (!a || !b) return;
    setBusyId(a._id);
    try {
      const [ra, rb] = await Promise.all([
        api(`/api/admin/service-catalog/${a._id}`, "PATCH", { order: b.order }),
        api(`/api/admin/service-catalog/${b._id}`, "PATCH", { order: a.order === b.order ? a.order + dir : a.order }),
      ]);
      invalidateServiceCatalog();
      setItems((prev) => prev.map((s) => (s._id === a._id ? ra.service : s._id === b._id ? rb.service : s)).sort((x, y) => x.order - y.order));
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (svc) => {
    const ok = await confirm({
      title: `Delete “${svc.title}”?`,
      message: "Users won't be able to book it any more. Existing requests keep their service name.",
      impact: "Tip: switch it off instead if you may offer it again.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setBusyId(svc._id);
    try {
      await api(`/api/admin/service-catalog/${svc._id}`, "DELETE");
      invalidateServiceCatalog();
      setItems((prev) => prev.filter((s) => s._id !== svc._id));
      notify("Service deleted", "success");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const visible = items.filter((s) => s.active).length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {feedback}
      <PageHeader
        title="Service Catalog"
        description="The home services users can book from the dashboard. Switch a service off to hide it from users without deleting it."
        onRefresh={load}
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setDialog({ open: true, initial: null })}>
            Add service
          </Button>
        }
      >
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip label={`${items.length} services`} />
          <Chip color="success" label={`${visible} visible to users`} />
          {items.length - visible ? <Chip label={`${items.length - visible} hidden`} /> : null}
        </Stack>
      </PageHeader>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Stack spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={84} />
          ))}
        </Stack>
      ) : (
        <Stack spacing={2}>
          {items.map((svc, i) => (
            <Box
              key={svc._id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2.5,
                borderRadius: "14px",
                border: "1px solid",
                borderColor: "divider",
                borderLeft: `4px solid ${svc.color || "#00A79D"}`,
                backgroundColor: "background.paper",
                opacity: svc.active ? 1 : 0.62,
                transition: "opacity .2s",
              }}
            >
              <Box sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: "12px", display: "grid", placeItems: "center", fontSize: 26, backgroundColor: `${svc.color || "#00A79D"}1A` }}>{svc.emoji || "🔧"}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontWeight: 800 }}>{svc.title}</Typography>
                  <Chip size="small" label={priceLabel(svc)} variant="outlined" />
                  <Typography variant="caption" sx={{ color: "text.disabled", fontFamily: "monospace" }}>
                    {svc.key}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {svc.description || "No description"}
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Tooltip title={svc.active ? "Visible to users — click to hide" : "Hidden from users — click to show"}>
                  <Stack direction="row" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: svc.active ? "success.main" : "text.secondary", display: { xs: "none", sm: "block" } }}>
                      {svc.active ? "Shown" : "Hidden"}
                    </Typography>
                    <Switch checked={!!svc.active} onChange={() => toggle(svc)} color="success" inputProps={{ "aria-label": `Show ${svc.title} to users` }} />
                  </Stack>
                </Tooltip>
                <Tooltip title="Move up">
                  <span>
                    <IconButton size="small" disabled={i === 0 || busyId === svc._id} onClick={() => move(i, -1)} aria-label={`Move ${svc.title} up`}>
                      <ArrowUp size={16} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton size="small" disabled={i === items.length - 1 || busyId === svc._id} onClick={() => move(i, 1)} aria-label={`Move ${svc.title} down`}>
                      <ArrowDown size={16} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => setDialog({ open: true, initial: svc })} aria-label={`Edit ${svc.title}`}>
                    <Pencil size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <span>
                    <IconButton size="small" color="error" disabled={busyId === svc._id} onClick={() => remove(svc)} aria-label={`Delete ${svc.title}`}>
                      <Trash2 size={16} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Box>
          ))}
          {!items.length && !error ? (
            <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
              No services yet — add your first one.
            </Typography>
          ) : null}
        </Stack>
      )}

      <ServiceDialog
        open={dialog.open}
        initial={dialog.initial}
        notify={notify}
        onClose={() => setDialog({ open: false, initial: null })}
        onSaved={(svc, editing) => {
          invalidateServiceCatalog();
          if (editing) replace(svc);
          else setItems((prev) => [...prev, svc].sort((a, b) => a.order - b.order));
        }}
      />
    </Box>
  );
}
