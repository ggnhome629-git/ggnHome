import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, MenuItem, Pagination, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { Bot, Hand, RefreshCw } from "lucide-react";
import AiLeadCard, { LEAD_STATUS } from "../../../components/aiConsultant/AiLeadCard";

const API = process.env.REACT_APP_Base_API;
const PARTNER_STATUSES = ["contacted", "viewing_scheduled", "converted", "lost"];
const headers = () => {
  const token = localStorage.getItem("partnerAccessToken");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

function PartnerLeadActions({ lead, onChange }) {
  const [status, setStatus] = useState(PARTNER_STATUSES.includes(lead.status) ? lead.status : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const call = async (url, method, body) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method, credentials: "include", headers: headers(), body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Could not update the lead");
      onChange(data.data);
      setNote("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!lead.assignedToMe) {
    return (
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <Typography variant="body2" sx={{ color: "text.secondary", flex: 1 }}>
          Contact details unlock when you take this lead ({lead.slotsLeft} of 3 partner slots left).
        </Typography>
        {error ? <Alert severity="warning" sx={{ py: 0 }}>{error}</Alert> : null}
        <Button variant="contained" startIcon={<Hand size={16} />} disabled={busy || lead.slotsLeft === 0} onClick={() => call(`${API}/api/partner/ai-leads/${lead._id}/claim`, "POST")}>
          {lead.slotsLeft === 0 ? "Lead is full" : busy ? "Taking…" : "Take this lead"}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField select size="small" label="Update status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 200 }}>
          {PARTNER_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {LEAD_STATUS[s].label}
            </MenuItem>
          ))}
        </TextField>
        <TextField size="small" label="Note (e.g. call outcome)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth inputProps={{ maxLength: 1000 }} />
        <Button variant="contained" disabled={busy || (!status && !note.trim())} onClick={() => call(`${API}/api/partner/ai-leads/${lead._id}`, "PATCH", { ...(status ? { status } : {}), ...(note.trim() ? { note } : {}) })} sx={{ flexShrink: 0 }}>
          Save
        </Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {(lead.followUps || []).slice(-3).map((f, i) => (
        <Typography key={i} variant="caption" sx={{ color: "text.secondary" }}>
          {new Date(f.at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })} · {f.byName || f.byType}
          {f.status ? ` → ${LEAD_STATUS[f.status]?.label || f.status}` : ""}
          {f.note ? ` — ${f.note}` : ""}
        </Typography>
      ))}
    </Stack>
  );
}

/** PartnerHub section: preferences captured by the AI consultant. */
export default function PartnerAiLeads() {
  const [scope, setScope] = useState("all");
  const [mode, setMode] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", scope });
      if (mode) params.set("mode", mode);
      const res = await fetch(`${API}/api/partner/ai-leads?${params}`, { credentials: "include", headers: headers() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Could not load AI consultant leads.");
      setItems(data.data || []);
      setMeta(data.meta || { totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, scope, mode]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ mb: 5 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: "10px", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#22d3ee,#3b82f6,#8b5cf6)", color: "#fff" }}>
            <Bot size={18} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
              AI Consultant leads
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              Buyers and tenants who completed the AI consultant and agreed to be contacted · {meta.total || 0} total
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="All open" color={scope === "all" ? "primary" : "default"} onClick={() => { setScope("all"); setPage(1); }} />
          <Chip label="Assigned to me" color={scope === "mine" ? "primary" : "default"} onClick={() => { setScope("mine"); setPage(1); }} />
          <TextField select size="small" value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }} sx={{ minWidth: 120 }} SelectProps={{ displayEmpty: true }}>
            <MenuItem value="">Rent & buy</MenuItem>
            <MenuItem value="rent">Rent</MenuItem>
            <MenuItem value="sale">Buy</MenuItem>
          </TextField>
          <Button size="small" onClick={load} startIcon={<RefreshCw size={14} />}>
            Refresh
          </Button>
        </Stack>
      </Stack>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Stack spacing={2}>
          {[0, 1].map((i) => (
            <Skeleton key={i} variant="rounded" height={170} />
          ))}
        </Stack>
      ) : items.length ? (
        <Stack spacing={2}>
          {items.map((lead) => (
            <AiLeadCard key={lead._id} lead={lead} contactHidden={!lead.assignedToMe}>
              <PartnerLeadActions lead={lead} onChange={(fresh) => setItems((prev) => prev.map((l) => (l._id === fresh._id ? fresh : l)))} />
            </AiLeadCard>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 3 }}>
          {scope === "mine" ? "No AI consultant leads are assigned to you yet." : "No open AI consultant leads right now."}
        </Typography>
      )}
      {meta.totalPages > 1 ? (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={meta.totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Stack>
      ) : null}
    </Box>
  );
}
