import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Card, Checkbox, Chip, Grid, IconButton, InputAdornment, MenuItem, Pagination, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import { CheckCheck, Check, Download, Eye, Home, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatCard, EmptyState, useAdminFeedback } from "./shell/adminUi";
import EditPropertyModal from "./admin.editpropertymodel";
import "./admin.css";

const API = process.env.REACT_APP_Base_API || "";
const PER_PAGE = 15;
const authHeaders = () => {
  const t = localStorage.getItem("accessToken") || localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};

// Each tab maps to the list-endpoint query it needs.
const TABS = [
  { key: "all", label: "All properties", query: {} },
  { key: "scraped", label: "Scraped approvals", query: { origin: "scraped", approval: "pending" }, bulkOrigin: "scraped" },
  { key: "own", label: "Owner / agent approvals", query: { origin: "own", approval: "pending" }, bulkOrigin: "own" },
];

const thumb = (r) => {
  const first = Array.isArray(r.images) ? r.images[0] : r.image || r.thumbnail;
  return (first && (first.url || first)) || "";
};
const statusLabel = (r) => (r.isActive ? "Live" : r.isPending ? (r.isEdited ? "Edited – review" : "New – review") : "Not live");
const sourceLabel = (r) => (r.origin === "scraped" ? (r.source === "nobroker" ? "NoBroker" : "99acres") : r.ownerType === "Agent" ? "Agent" : "Owner");

const money = (r) => (r.price ? `₹${Number(r.price).toLocaleString("en-IN")}${r.listingType === "rent" ? "/mo" : ""}` : "—");

export default function AdminPropertyManager() {
  const navigate = useNavigate();
  const { confirm, feedback, notify } = useAdminFeedback();
  const [tab, setTab] = useState("all");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [state, setState] = useState("all");
  const [selected, setSelected] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const current = TABS.find((t) => t.key === tab);

  useEffect(() => {
    const h = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(h);
  }, [search]);

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/properties/counts`, { headers: authHeaders(), credentials: "include" });
      const data = await res.json();
      if (data.success) setCounts(data.counts);
    } catch (e) { console.error(e); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit: PER_PAGE, ...current.query });
      if (debounced) q.set("search", debounced);
      if (state !== "all") q.set("state", state);
      const res = await fetch(`${API}/api/admin/properties?${q}`, { headers: authHeaders(), credentials: "include" });
      const data = await res.json();
      if (data.success) { setRows(data.data || []); setTotal(data.meta?.total || 0); }
    } catch (e) {
      notify("Error loading properties", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debounced, state, current]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { setSelected([]); setPage(1); }, [tab, state]);

  const refresh = () => { load(); loadCounts(); };

  const approve = async (body, label) => {
    if (!(await confirm({ title: "Approve properties", message: label, confirmLabel: "Approve" }))) return;
    try {
      const res = await fetch(`${API}/api/admin/properties/bulk-approve`, { method: "POST", headers: authHeaders(), credentials: "include", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Approval failed");
      notify(`${data.approved} propert${data.approved === 1 ? "y" : "ies"} approved`, "success");
      setSelected([]);
      refresh();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const remove = async (r) => {
    if (!(await confirm({ title: "Delete property", message: `Delete "${r.title}"?`, confirmLabel: "Delete", danger: true }))) return;
    const res = await fetch(`${API}/api/admin/properties/${r._id}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
    if (res.ok) { notify("Property deleted", "success"); refresh(); }
    else notify("Failed to delete property", "error");
  };

  const exportCsv = () => {
    const lines = [["Title", "Type", "Price", "Location", "BHK", "Source", "Status", "Added"], ...rows.map((r) => [`"${(r.title || "").replace(/"/g, '""')}"`, r.listingType, r.price, `"${r.location}"`, r.bhk, r.source, r.isActive ? "Live" : "Pending", new Date(r.createdAt).toLocaleDateString()])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.map((l) => l.join(",")).join("\n")], { type: "text/csv" }));
    a.download = `properties-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const pendingForTab = tab === "scraped" ? counts?.pendingScraped : tab === "own" ? counts?.pendingOwn : null;
  const pageIds = rows.map((r) => r._id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      {feedback}
      <EditPropertyModal propertyId={editingId} isOpen={Boolean(editingId)} onClose={() => setEditingId(null)} onSuccess={() => { setEditingId(null); refresh(); }} />

      <PageHeader
        title="Property Manager"
        description="Approve, edit and manage every listing"
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<RefreshCw size={15} />} onClick={refresh}>Refresh</Button>
            <Button variant="outlined" size="small" startIcon={<Download size={15} />} onClick={exportCsv}>Export CSV</Button>
            <Button variant="contained" size="small" onClick={() => navigate("/admin/add-property")}>Add property</Button>
          </Stack>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total properties", value: counts?.total, tone: "#003366", hint: counts ? `${counts.rental} rent · ${counts.sale} sale` : undefined },
          { label: "Live", value: counts?.active, tone: "#10B981", hint: counts ? `${counts.inactive} not live` : undefined },
          { label: "Scraped", value: counts?.scraped, tone: "#F59E0B", hint: counts ? `${counts.pendingScraped} awaiting approval` : undefined },
          { label: "Owner / agent", value: counts?.own, tone: "#00A79D", hint: counts ? `${counts.pendingOwn} awaiting approval` : undefined },
        ].map((c) => (
          <Grid item xs={6} md={3} key={c.label}>
            <StatCard icon={Home} label={c.label} value={c.value ?? 0} tone={c.tone} hint={c.hint} loading={!counts} />
          </Grid>
        ))}
      </Grid>

      <Card className="admin-card" sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}>
          <Tab value="all" label="All properties" />
          <Tab value="scraped" label={`Scraped approvals${counts ? ` (${counts.pendingScraped})` : ""}`} />
          <Tab value="own" label={`Owner / agent approvals${counts ? ` (${counts.pendingOwn})` : ""}`} />
        </Tabs>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ p: 3 }}>
          <TextField
            size="small"
            placeholder="Search title, sector or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
          />
          {tab === "all" && (
            <Select size="small" value={state} onChange={(e) => setState(e.target.value)} sx={{ minWidth: 140 }}>
              <MenuItem value="all">All status</MenuItem>
              <MenuItem value="active">Live</MenuItem>
              <MenuItem value="inactive">Not live</MenuItem>
            </Select>
          )}
          {current.bulkOrigin && (
            <>
              <Button
                variant="outlined"
                startIcon={<Check size={15} />}
                disabled={selected.length === 0}
                onClick={() => approve({ ids: selected }, `Approve ${selected.length} selected propert${selected.length === 1 ? "y" : "ies"}? They will go live.`)}
              >
                Approve selected ({selected.length})
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCheck size={15} />}
                disabled={!pendingForTab}
                onClick={() => approve({ origin: current.bulkOrigin }, `Approve ALL ${pendingForTab} pending ${current.bulkOrigin === "scraped" ? "scraped" : "owner / agent"} properties? They will go live.`)}
              >
                Approve all ({pendingForTab ?? 0})
              </Button>
            </>
          )}
        </Stack>
      </Card>

      {!loading && rows.length === 0 ? (
        <EmptyState icon={Home} title={current.bulkOrigin ? "Nothing waiting for approval" : "No properties found"} description="Try a different search or filter." />
      ) : (
        <Card className="admin-card" sx={{ overflow: "hidden" }}>
          {/* Phone layout: one card per property so nothing is clipped */}
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            {loading && <Typography sx={{ textAlign: "center", p: 4 }}>Loading…</Typography>}
            {!loading && rows.map((r) => (
              <Box key={r._id} sx={{ display: "flex", gap: 2, p: 2.5, borderBottom: "1px solid #E5E9EE" }}>
                {current.bulkOrigin && (
                  <Checkbox size="small" sx={{ alignSelf: "flex-start", p: 0.5 }} checked={selected.includes(r._id)} onChange={() => toggle(r._id)} />
                )}
                <Box sx={{ width: 72, height: 72, borderRadius: "8px", flexShrink: 0, bgcolor: "#EEF3F6", backgroundImage: thumb(r) ? `url(${thumb(r)})` : "none", backgroundSize: "cover", backgroundPosition: "center", display: "flex", alignItems: "center", justifyContent: "center", color: "#9AA7B4" }}>
                  {!thumb(r) && <Home size={22} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.title || "Untitled"}</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#003366", fontSize: "0.95rem" }}>{money(r)}{r.bhk ? ` · ${/bhk/i.test(r.bhk) ? r.bhk : `${r.bhk} BHK`}` : ""}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.location || "—"} · {new Date(r.createdAt).toLocaleDateString()}</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ my: 1, flexWrap: "wrap", rowGap: 0.75 }}>
                    <Chip size="small" label={sourceLabel(r)} sx={r.origin === "scraped" ? { bgcolor: "rgba(245,158,11,0.15)", color: "#B45309", fontWeight: 700 } : { bgcolor: "rgba(0,167,157,0.14)", color: "#00857D", fontWeight: 700 }} />
                    <Chip size="small" variant="outlined" color={r.isActive ? "success" : r.isPending ? "warning" : "default"} label={statusLabel(r)} />
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    {!r.isActive && <IconButton aria-label="Approve" sx={{ color: "success.main" }} onClick={() => approve({ ids: [r._id] }, `Approve "${r.title}"?`)}><Check size={18} /></IconButton>}
                    <IconButton aria-label="View" onClick={() => navigate(r.listingType === "rent" ? `/Rentaldetails/${r._id}` : `/Saledetails/${r._id}`)}><Eye size={18} /></IconButton>
                    <IconButton aria-label="Edit" onClick={() => setEditingId(r._id)}><Pencil size={18} /></IconButton>
                    <IconButton aria-label="Delete" color="error" onClick={() => remove(r)}><Trash2 size={18} /></IconButton>
                  </Stack>
                </Box>
              </Box>
            ))}
          </Box>

          <Box className="admin-table-wrap" sx={{ display: { xs: "none", md: "block" } }}>
            <table className="admin-table">
              <thead>
                <tr>
                  {current.bulkOrigin && (
                    <th style={{ width: 44 }}>
                      <Checkbox size="small" checked={allSelected} onChange={() => setSelected(allSelected ? [] : pageIds)} />
                    </th>
                  )}
                  <th>Property</th><th>Location</th><th>Price</th><th>BHK</th><th>Source</th><th>Status</th>
                  <th className="admin-table-align-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 32 }}>Loading…</td></tr>
                ) : rows.map((r) => (
                  <tr key={r._id} className="admin-table-row">
                    {current.bulkOrigin && (
                      <td><Checkbox size="small" checked={selected.includes(r._id)} onChange={() => toggle(r._id)} /></td>
                    )}
                    <td>
                      <Typography sx={{ fontWeight: 600, maxWidth: 280 }} noWrap>{r.title || "Untitled"}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                        {r.listingType === "rent" ? "Rental" : "Sale"} · {new Date(r.createdAt).toLocaleDateString()}
                      </Typography>
                    </td>
                    <td>{r.location || "—"}</td>
                    <td>{money(r)}</td>
                    <td>{r.bhk || "—"}</td>
                    <td>
                      <Chip size="small" label={r.origin === "scraped" ? (r.source === "nobroker" ? "NoBroker" : "99acres") : r.ownerType === "Agent" ? "Agent" : "Owner"}
                        sx={r.origin === "scraped" ? { bgcolor: "rgba(245,158,11,0.15)", color: "#B45309", fontWeight: 700 } : { bgcolor: "rgba(0,167,157,0.14)", color: "#00857D", fontWeight: 700 }} />
                    </td>
                    <td>
                      <Chip size="small" variant="outlined" color={r.isActive ? "success" : r.isPending ? "warning" : "default"}
                        label={r.isActive ? "Live" : r.isPending ? (r.isEdited ? "Edited – review" : "New – review") : "Not live"} />
                    </td>
                    <td className="admin-table-align-center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {!r.isActive && (
                          <Tooltip title="Approve"><IconButton size="small" sx={{ color: "success.main" }} onClick={() => approve({ ids: [r._id] }, `Approve "${r.title}"?`)}><Check size={16} /></IconButton></Tooltip>
                        )}
                        <Tooltip title="View"><IconButton size="small" onClick={() => navigate(r.listingType === "rent" ? `/Rentaldetails/${r._id}` : `/Saledetails/${r._id}`)}><Eye size={16} /></IconButton></Tooltip>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditingId(r._id)}><Pencil size={16} /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => remove(r)}><Trash2 size={16} /></IconButton></Tooltip>
                      </Stack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          {Math.ceil(total / PER_PAGE) > 1 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2 }}>
              <Typography variant="body2" color="text.secondary">{total} properties</Typography>
              <Pagination count={Math.ceil(total / PER_PAGE)} page={page} onChange={(_, v) => setPage(v)} color="primary" size="small" />
            </Box>
          )}
        </Card>
      )}
    </>
  );
}
