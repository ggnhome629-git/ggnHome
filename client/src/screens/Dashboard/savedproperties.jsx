import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  InputBase,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Heart, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import PropertyCard, { isRentalProperty, propertyDetailPath } from "../../components/property/PropertyCard";
import ShareDialog from "../../components/ui/ShareDialog";
import MobileBottomNav from "./MobileBottomNav";
import { radii } from "../../theme/theme";

const TopNavigationBar = React.lazy(() => import("./TopNavigationBar"));
const Footer = React.lazy(() => import("./Footer"));

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const SORTS = [
  { value: "saved", label: "Recently saved" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "listed", label: "Newest listings" },
];

const authHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const priceOf = (p) => Number(p.monthlyRent ?? p.price ?? 0) || 0;

function CardSkeleton() {
  return (
    <Box sx={{ borderRadius: `${radii.lg}px`, overflow: "hidden", border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
      <Skeleton variant="rectangular" sx={{ aspectRatio: "4 / 3", height: "auto" }} />
      <Box sx={{ p: 5 }}>
        <Skeleton width="45%" height={30} />
        <Skeleton width="70%" />
        <Skeleton width="55%" />
      </Box>
    </Box>
  );
}

/** The user's shortlist: every saved home, filterable, with one-tap unsave. */
export default function SavedProperties() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [type, setType] = useState("all");
  const [sector, setSector] = useState("all");
  const [text, setText] = useState("");
  const [sortBy, setSortBy] = useState("saved");
  const [shareLink, setShareLink] = useState("");
  const [removed, setRemoved] = useState(null);

  useEffect(() => {
    document.title = "Saved homes | GgnHome";
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`${process.env.REACT_APP_Base_API}/api/propertyAanalysis/savedProperties?page=1&limit=100`, {
      credentials: "include",
      signal: controller.signal,
      headers: authHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => setProperties(Array.isArray(data?.properties) ? data.properties : []))
      .catch((err) => {
        if (err.name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [user, reloadKey]);

  const toggleSave = useCallback(async (property) => {
    const res = await fetch(process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_SAVE, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ propertyId: property._id }),
    });
    if (!res.ok) throw new Error(String(res.status));
  }, []);

  const handleUnsave = async (propertyId) => {
    const property = properties.find((p) => String(p._id) === String(propertyId));
    if (!property) return;
    setProperties((prev) => prev.filter((p) => p !== property));
    setRemoved(property);
    try {
      await toggleSave(property);
    } catch (e) {
      setProperties((prev) => [property, ...prev]);
      setRemoved(null);
    }
  };

  const handleUndo = async () => {
    const property = removed;
    setRemoved(null);
    if (!property) return;
    setProperties((prev) => [property, ...prev]);
    try {
      await toggleSave(property);
    } catch (e) {
      setProperties((prev) => prev.filter((p) => p !== property));
    }
  };

  const sectors = useMemo(
    () => [...new Set(properties.map((p) => p.Sector).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
    [properties]
  );

  const visible = useMemo(() => {
    const q = text.trim().toLowerCase();
    const list = properties.filter((p) => {
      if (type === "rent" && !isRentalProperty(p)) return false;
      if (type === "sale" && isRentalProperty(p)) return false;
      if (sector !== "all" && p.Sector !== sector) return false;
      if (q && !`${p.title || ""} ${p.Sector || ""} ${p.totalArea?.configuration || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...list];
    if (sortBy === "price-low") sorted.sort((a, b) => priceOf(a) - priceOf(b));
    else if (sortBy === "price-high") sorted.sort((a, b) => priceOf(b) - priceOf(a));
    else if (sortBy === "listed") sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else sorted.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
    return sorted;
  }, [properties, type, sector, text, sortBy]);

  const rentCount = properties.filter(isRentalProperty).length;
  const filtered = type !== "all" || sector !== "all" || text.trim();

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh" }}>
      <Suspense fallback={<Box sx={{ height: 64 }} />}>
        <TopNavigationBar navItems={NAV_ITEMS} />
      </Suspense>

      <Box
        component="section"
        sx={{
          position: "relative",
          overflow: "hidden",
          color: "common.white",
          background: "linear-gradient(160deg, #001F3F 0%, #003366 60%, #0B4A6F 100%)",
          py: { xs: 9, md: 12 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(45% 70% at 90% 0%, rgba(246,196,83,0.16) 0%, rgba(246,196,83,0) 70%)",
          }}
        />
        <Container maxWidth="xl" sx={{ position: "relative", px: { xs: 4, sm: 6, md: 8 } }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Heart size={16} color="#F6D58A" fill="#F6D58A" />
            <Typography variant="overline" sx={{ color: "#F6D58A", letterSpacing: "0.2em" }}>
              Your shortlist
            </Typography>
          </Stack>
          <Typography
            component="h1"
            sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: { xs: "2rem", md: "3rem" }, lineHeight: 1.1 }}
          >
            Saved homes
          </Typography>
          <Typography sx={{ mt: 3, color: "rgba(255,255,255,0.8)" }}>
            {loading
              ? "Loading your shortlist…"
              : properties.length
              ? `${properties.length} saved · ${rentCount} for rent · ${properties.length - rentCount} for sale`
              : "Tap the heart on any listing to keep it here."}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 6, md: 8 } }}>
        {!loading && !error && properties.length > 0 && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{
              mb: 6,
              p: 3,
              borderRadius: `${radii.lg}px`,
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={type}
              onChange={(_, v) => v && setType(v)}
              aria-label="Listing type"
              sx={{ "& .MuiToggleButton-root": { px: 4, textTransform: "none", fontWeight: 600 } }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="rent">For rent</ToggleButton>
              <ToggleButton value="sale">For sale</ToggleButton>
            </ToggleButtonGroup>

            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ flex: 1, px: 3, height: 40, borderRadius: `${radii.sm}px`, backgroundColor: "background.default" }}
            >
              <Search size={16} color="#4A6A8A" aria-hidden />
              <InputBase
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Search your saved homes"
                inputProps={{ "aria-label": "Search saved homes" }}
                sx={{ flex: 1, fontSize: 14 }}
              />
            </Stack>

            <Stack direction="row" spacing={3}>
              <Select size="small" value={sector} onChange={(e) => setSector(e.target.value)} SelectDisplayProps={{ "aria-label": "Sector" }} sx={{ minWidth: 150, fontSize: 14, flex: { xs: 1, md: "none" } }}>
                <MenuItem value="all">All sectors</MenuItem>
                {sectors.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
              <Select size="small" value={sortBy} onChange={(e) => setSortBy(e.target.value)} SelectDisplayProps={{ "aria-label": "Sort" }} sx={{ minWidth: 180, fontSize: 14, flex: { xs: 1, md: "none" } }}>
                {SORTS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Stack>
        )}

        {loading ? (
          <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </Box>
        ) : error ? (
          <Stack alignItems="center" spacing={4} sx={{ py: 16, textAlign: "center", backgroundColor: "background.paper", borderRadius: `${radii.lg}px`, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="h3" sx={{ color: "primary.main", fontSize: "1.25rem" }}>
              We couldn't load your saved homes
            </Typography>
            <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </Button>
          </Stack>
        ) : visible.length === 0 ? (
          <Stack alignItems="center" spacing={4} sx={{ py: 16, px: 6, textAlign: "center", backgroundColor: "background.paper", borderRadius: `${radii.lg}px`, border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "rgba(225,29,72,0.08)" }}>
              <Heart size={28} color="#E11D48" />
            </Box>
            <Typography variant="h3" sx={{ color: "primary.main", fontSize: "1.25rem" }}>
              {filtered ? "Nothing matches these filters" : "No saved homes yet"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
              {filtered
                ? "Try a different sector or clear the search."
                : "Browse listings and tap the heart to build your shortlist — it stays here across devices."}
            </Typography>
            {filtered ? (
              <Button
                variant="outlined"
                onClick={() => {
                  setType("all");
                  setSector("all");
                  setText("");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button variant="contained" onClick={() => navigate("/search")}>
                Browse homes
              </Button>
            )}
          </Stack>
        ) : (
          <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
            {visible.map((property) => (
              <PropertyCard
                key={property._id}
                property={property}
                onClick={() => navigate(propertyDetailPath(property))}
                onSave={handleUnsave}
                isSaved
                onShare={(p) => setShareLink(`${window.location.origin}${propertyDetailPath(p)}`)}
                onContact={(p) => navigate(propertyDetailPath(p))}
              />
            ))}
          </Box>
        )}
      </Container>

      <ShareDialog open={Boolean(shareLink)} onClose={() => setShareLink("")} link={shareLink} />

      <Snackbar
        open={Boolean(removed)}
        autoHideDuration={5000}
        onClose={(_, reason) => reason !== "clickaway" && setRemoved(null)}
        message="Removed from saved homes"
        action={
          <Button color="secondary" size="small" onClick={handleUndo} sx={{ fontWeight: 700 }}>
            Undo
          </Button>
        }
        sx={{ bottom: { xs: 80, sm: 24 } }}
      />

      <Suspense fallback={null}>
        <Footer user={user} />
      </Suspense>

      <MobileBottomNav user={user} />
    </Box>
  );
}
