import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, Chip, Collapse, MenuItem, Pagination, Select, Stack, TextField, Typography, InputAdornment } from "@mui/material";
import { ChevronDown, ChevronUp, ExternalLink, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./shell/adminUi";
import "./admin.css";

const PER_PAGE = 50;

const money = (p) => {
  const v = p.defaultpropertytype === "rental" ? p.monthlyRent : p.price;
  if (!v) return "—";
  return `₹${Number(v).toLocaleString("en-IN")}${p.defaultpropertytype === "rental" ? "/mo" : ""}`;
};

const bhk = (p) => p.totalArea?.configuration || (p.bedrooms ? `${p.bedrooms} BHK` : "—");

/** Browse every listing, grouped by sector, in one clean table per sector. */
export default function PropertyListingPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [open, setOpen] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${process.env.REACT_APP_Base_API}/api/properties?page=${page}&limit=${PER_PAGE}`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to fetch properties");
        const data = await res.json();
        setProperties(data.properties || []);
        setTotalPages(data.totalPages || 1);
      } catch (e) {
        console.error(e);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = properties.filter((p) => {
      if (type !== "all" && p.defaultpropertytype !== type) return false;
      if (origin === "scraped" && !p.sourcePortal) return false;
      if (origin === "own" && p.sourcePortal) return false;
      if (q && !`${p.Sector || ""} ${p.title || ""} ${p.address || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const map = {};
    rows.forEach((p) => {
      const k = p.Sector || "Unknown sector";
      (map[k] = map[k] || []).push(p);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [properties, search, type, origin]);

  const view = (p) => navigate(p.defaultpropertytype === "rental" ? `/Rentaldetails/${p._id}` : `/Saledetails/${p._id}`);
  const allOpen = groups.length > 0 && groups.every(([s]) => open[s]);
  const setAll = (v) => setOpen(Object.fromEntries(groups.map(([s]) => [s, v])));

  return (
    <>
      <PageHeader title="All Properties" description="Every listing, grouped by sector" />

      <Card className="admin-card" sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <TextField
            size="small"
            placeholder="Search sector, title or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
          />
          <Select size="small" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="all">Rent + Sale</MenuItem>
            <MenuItem value="rental">Rental</MenuItem>
            <MenuItem value="sale">Sale</MenuItem>
          </Select>
          <Select size="small" value={origin} onChange={(e) => setOrigin(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">All sources</MenuItem>
            <MenuItem value="own">Own / agent</MenuItem>
            <MenuItem value="scraped">Scraped</MenuItem>
          </Select>
          <Button variant="outlined" size="small" onClick={() => setAll(!allOpen)}>
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        </Stack>
      </Card>

      {loading ? (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>Loading properties…</Typography>
      ) : groups.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>No properties match these filters.</Typography>
      ) : (
        <Stack spacing={2}>
          {groups.map(([sector, rows]) => {
            const isOpen = !!open[sector];
            return (
              <Card key={sector} className="admin-card" sx={{ overflow: "hidden" }}>
                <Box
                  onClick={() => setOpen((o) => ({ ...o, [sector]: !o[sector] }))}
                  sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography sx={{ fontWeight: 700 }}>{sector}</Typography>
                    <Chip size="small" label={`${rows.length} ${rows.length === 1 ? "property" : "properties"}`} />
                  </Stack>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </Box>
                <Collapse in={isOpen} unmountOnExit>
                  <Box className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr><th>Title</th><th>Type</th><th>BHK</th><th>Price</th><th>Source</th><th>Status</th><th /></tr>
                      </thead>
                      <tbody>
                        {rows.map((p) => (
                          <tr key={p._id} className="admin-table-row">
                            <td><Typography sx={{ fontWeight: 600 }} noWrap>{p.title || "Untitled"}</Typography></td>
                            <td style={{ textTransform: "capitalize" }}>{p.defaultpropertytype}</td>
                            <td>{bhk(p)}</td>
                            <td>{money(p)}</td>
                            <td>
                              <Chip size="small" label={p.sourcePortal ? (p.sourcePortal === "nobroker" ? "NoBroker" : "99acres") : p.ownerType === "Agent" ? "Agent" : "Owner"}
                                sx={p.sourcePortal ? { bgcolor: "rgba(245,158,11,0.15)", color: "#B45309", fontWeight: 700 } : { bgcolor: "rgba(0,167,157,0.14)", color: "#00857D", fontWeight: 700 }} />
                            </td>
                            <td>
                              <Chip size="small" label={p.isActive ? "Live" : "Pending"} color={p.isActive ? "success" : "default"} variant="outlined" />
                            </td>
                            <td><Button size="small" endIcon={<ExternalLink size={14} />} onClick={() => view(p)}>View</Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Collapse>
              </Card>
            );
          })}
        </Stack>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
        </Box>
      )}
    </>
  );
}
