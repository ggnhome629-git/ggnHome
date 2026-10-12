import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Bot, Cpu, MessageSquareText, Save } from "lucide-react";
import { PageHeader, useAdminFeedback } from "./shell/adminUi";
import AiLeadCard, { LEAD_STATUS } from "../../components/aiConsultant/AiLeadCard";

const API = process.env.REACT_APP_Base_API;
const authHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

function LeadActions({ lead, partners, onSaved, notify }) {
  const [status, setStatus] = useState(lead.status);
  const [assigned, setAssigned] = useState(() => (lead.assignedPartners || []).map((p) => (typeof p === "object" ? p : { _id: p })));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/ai-consultant/leads/${lead._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({ status, assignedPartners: assigned.map((p) => p._id), note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Could not save");
      setNote("");
      onSaved(data.data);
      notify("Lead updated", "success");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
        <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 200 }}>
          {Object.entries(LEAD_STATUS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete
          multiple
          size="small"
          options={partners}
          value={assigned}
          onChange={(_, v) => setAssigned(v.slice(0, 3))}
          isOptionEqualToValue={(a, b) => String(a._id) === String(b._id)}
          getOptionLabel={(p) => (p.name ? `${p.name}${p.agencyName ? ` · ${p.agencyName}` : ""}${p.agentCode ? ` (${p.agentCode})` : ""}` : String(p._id))}
          renderInput={(params) => <TextField {...params} label="Assigned partners (max 3)" />}
          sx={{ flex: 1, minWidth: 240 }}
        />
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField size="small" label="Follow-up note" value={note} onChange={(e) => setNote(e.target.value)} fullWidth inputProps={{ maxLength: 1000 }} />
        <Button variant="contained" startIcon={<Save size={16} />} onClick={save} disabled={saving} sx={{ flexShrink: 0 }}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </Stack>
      {(lead.followUps || []).length ? (
        <Stack spacing={0.5}>
          {lead.followUps.slice(-5).map((f, i) => (
            <Typography key={i} variant="caption" sx={{ color: "text.secondary" }}>
              {new Date(f.at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })} · {f.byName || f.byType}
              {f.status ? ` → ${LEAD_STATUS[f.status]?.label || f.status}` : ""}
              {f.note ? ` — ${f.note}` : ""}
            </Typography>
          ))}
        </Stack>
      ) : null}
      {(lead.transcript || []).length ? (
        <Box>
          <Button size="small" startIcon={<MessageSquareText size={15} />} onClick={() => setShowTranscript((v) => !v)}>
            {showTranscript ? "Hide conversation" : `Show conversation (${lead.transcript.length})`}
          </Button>
          <Collapse in={showTranscript} unmountOnExit>
            <Stack spacing={1} sx={{ mt: 1, p: 2, borderRadius: "10px", backgroundColor: "background.default", maxHeight: 320, overflowY: "auto" }}>
              {lead.transcript.map((t, i) => (
                <Typography key={i} variant="body2" sx={{ color: t.role === "user" ? "primary.main" : "text.secondary", fontWeight: t.role === "user" ? 600 : 400 }}>
                  {t.role === "user" ? "User: " : "AI: "}
                  {t.text}
                </Typography>
              ))}
            </Stack>
          </Collapse>
        </Box>
      ) : null}
    </Stack>
  );
}

function UsagePanel() {
  const [usage, setUsage] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/admin/ai-consultant/usage`, { credentials: "include", headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUsage(d))
      .catch(() => {});
  }, []);
  if (!usage) return null;
  const llm = usage.llm || {};
  const today = usage.metrics?.[0] || {};
  const tile = (label, value) => (
    <Box sx={{ p: 2, borderRadius: "10px", border: "1px solid", borderColor: "divider", minWidth: 120 }}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontFamily: "ui-monospace, Menlo, monospace" }}>{value ?? 0}</Typography>
    </Box>
  );
  return (
    <Box sx={{ mb: 4, p: 3, borderRadius: "14px", border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Cpu size={16} />
        <Typography sx={{ fontWeight: 700 }}>AI usage today</Typography>
        <Chip size="small" label={llm.enabled ? `${llm.model} · ${llm.keysConfigured} key(s)` : "LLM off — rule-based only"} color={llm.enabled ? "success" : "default"} />
        {llm.orgCooldownSeconds ? <Chip size="small" color="warning" label={`Rate-limited · ${llm.orgCooldownSeconds}s`} /> : null}
      </Stack>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {tile("Conversations", today.conversations_started)}
        {tile("Searches", today.searches)}
        {tile("With results", today.searches_with_results)}
        {tile("Enquiries", today.enquiries)}
        {tile("AI calls (est.)", llm.localEstimate?.todayRequests)}
        {tile("AI tokens (est.)", llm.localEstimate?.todayTokens)}
        {tile("AI fallbacks", Object.values(llm.stats?.fallbacks || {}).reduce((a, b) => a + b, 0))}
        {tile("Voice failures", today.speech_failed)}
      </Stack>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
        AI numbers are local estimates per server instance; Groq's console is authoritative. Paid usage is never enabled by the app.
      </Typography>
    </Box>
  );
}

export default function AdminAiConsultantLeads() {
  const { notify, feedback } = useAdminFeedback();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (status) params.set("status", status);
      if (mode) params.set("mode", mode);
      if (query) params.set("q", query);
      const res = await fetch(`${API}/api/admin/ai-consultant/leads?${params}`, { credentials: "include", headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Could not load leads");
      setItems(data.data || []);
      setCounts(data.counts || {});
      setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, mode, query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch(`${API}/api/admin/ai-consultant/partners`, { credentials: "include", headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPartners(d.data || []))
      .catch(() => {});
  }, []);

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {feedback}
      <PageHeader
        title="AI Consultant Leads"
        description="Requirements captured by the GgnHome AI Property Consultant. Assign up to 3 partners; partners whose listings matched are assigned automatically."
        onRefresh={load}
        tabs={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`All (${total})`} color={!status ? "primary" : "default"} onClick={() => { setStatus(""); setPage(1); }} />
            {Object.entries(LEAD_STATUS).map(([k, v]) => (
              <Chip key={k} label={`${v.label} (${counts[k] || 0})`} color={status === k ? "primary" : "default"} onClick={() => { setStatus(k); setPage(1); }} />
            ))}
          </Stack>
        }
      />
      <UsagePanel />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          label="Search ref, name, phone or requirement"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              setQuery(q.trim());
            }
          }}
          sx={{ flex: 1 }}
        />
        <TextField select size="small" label="Rent / buy" value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="rent">Rent</MenuItem>
          <MenuItem value="sale">Buy</MenuItem>
        </TextField>
        <Button variant="outlined" onClick={() => { setPage(1); setQuery(q.trim()); }}>
          Search
        </Button>
      </Stack>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Stack spacing={2}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={180} />
          ))}
        </Stack>
      ) : items.length ? (
        <Stack spacing={3}>
          {items.map((lead) => (
            <AiLeadCard key={lead._id} lead={lead}>
              <LeadActions lead={lead} partners={partners} notify={notify} onSaved={(fresh) => setItems((prev) => prev.map((l) => (l._id === fresh._id ? fresh : l)))} />
            </AiLeadCard>
          ))}
        </Stack>
      ) : (
        <Stack alignItems="center" spacing={1} sx={{ py: 8, color: "text.secondary" }}>
          <Bot size={32} />
          <Typography>No AI consultant leads yet.</Typography>
        </Stack>
      )}
      {meta.totalPages > 1 ? (
        <Stack alignItems="center" sx={{ mt: 4 }}>
          <Pagination count={meta.totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Stack>
      ) : null}
    </Box>
  );
}
