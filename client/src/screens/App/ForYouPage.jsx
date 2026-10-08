import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { BedDouble, MapPin, RefreshCw, Ruler, Sparkles, WifiOff } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import MobileBottomNav from "../Dashboard/MobileBottomNav";
import { useAuth } from "../../Context/AuthContext";
import { isNativeApp, snapshot } from "../../utils/nativeApp";
import { getRecentlyViewed } from "../../utils/propertyAnalytics";

const CACHE_KEY = "ggn:foryou:v1";
const FILTERS = [
  { id: "all", label: "All" },
  { id: "rental", label: "Rent" },
  { id: "sale", label: "Buy" },
];

const authHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function FeedCard({ item, onOpen, wide }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen(item)}
      sx={{
        appearance: "none",
        textAlign: "left",
        font: "inherit",
        cursor: "pointer",
        p: 0,
        flex: wide ? "none" : "0 0 78%",
        maxWidth: wide ? "none" : 300,
        width: wide ? "100%" : undefined,
        scrollSnapAlign: "start",
        border: "1px solid #E5E9EE",
        borderRadius: "16px",
        overflow: "hidden",
        backgroundColor: "#fff",
        boxShadow: "0 2px 10px rgba(0,51,102,0.07)",
        transition: "transform .15s ease, box-shadow .15s ease",
        "&:active": { transform: "scale(0.985)" },
      }}
    >
      <Box sx={{ position: "relative", aspectRatio: "16 / 10", backgroundColor: "#E8EEF3" }}>
        {item.image && (
          <Box
            component="img"
            src={item.image}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/default-property.jpg";
            }}
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        <Chip
          size="small"
          label={item.type === "rental" ? "For rent" : "For sale"}
          sx={{ position: "absolute", top: 10, left: 10, fontWeight: 800, color: "#fff", backgroundColor: item.type === "rental" ? "#00A79D" : "#003366" }}
        />
        <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, p: 1.5, pt: 4, background: "linear-gradient(transparent, rgba(0,20,45,0.75))" }}>
          <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.1 }}>{item.priceLabel}</Typography>
        </Box>
      </Box>
      <Box sx={{ p: 2 }}>
        {item.reason && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "#00857D", mb: 0.75 }}>
            <Sparkles size={12} />
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 800 }}>{item.reason}</Typography>
          </Stack>
        )}
        <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#1B2B3A", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.4em" }}>
          {item.title}
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 1, color: "#5B6B7B", flexWrap: "wrap" }} useFlexGap>
          {item.sector && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <MapPin size={13} />
              <Typography sx={{ fontSize: "0.75rem" }}>{item.sector}</Typography>
            </Stack>
          )}
          {item.bedrooms != null && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <BedDouble size={13} />
              <Typography sx={{ fontSize: "0.75rem" }}>{item.bedrooms} BHK</Typography>
            </Stack>
          )}
          {item.areaSqft ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Ruler size={13} />
              <Typography sx={{ fontSize: "0.75rem" }}>{item.areaSqft} sq.ft</Typography>
            </Stack>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}

function SkeletonRow() {
  return (
    <Stack direction="row" spacing={2} sx={{ overflow: "hidden" }}>
      {[0, 1].map((i) => (
        <Skeleton key={i} variant="rounded" sx={{ flex: "0 0 78%", maxWidth: 300, height: 250, borderRadius: "16px" }} />
      ))}
    </Stack>
  );
}

/**
 * "For You" — the app-only personalised feed. Served by /api/app/recommendations
 * (taste profile from saves, views, enquiries and searches), with the last
 * good response kept on the device so it still opens with no network.
 */
export default function ForYouPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState(() => snapshot.read(CACHE_KEY, null)?.data || null);
  const [loading, setLoading] = useState(!data);
  const [stale, setStale] = useState(false);

  const load = useCallback(async () => {
    setLoading((prev) => prev || !data);
    const recent = getRecentlyViewed()
      .slice(0, 12)
      .filter((r) => r.id && r.type)
      .map((r) => `${r.id}:${String(r.type).toLowerCase().includes("rent") ? "rental" : "sale"}`)
      .join(",");
    try {
      const res = await fetch(`${process.env.REACT_APP_BASE_API || process.env.REACT_APP_Base_API}/api/app/recommendations?type=${filter}&limit=20&recent=${encodeURIComponent(recent)}`, {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setData(json);
      setStale(false);
      snapshot.write(CACHE_KEY, { data: json, filter, savedAt: Date.now() });
    } catch {
      setStale(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    document.title = "For you | GgnHome";
    load();
  }, [load]);

  const sections = useMemo(() => {
    const list = data?.sections || [];
    if (filter === "all") return list;
    return list.map((s) => ({ ...s, items: s.items.filter((i) => i.type === filter) })).filter((s) => s.items.length);
  }, [data, filter]);

  if (!isNativeApp() && process.env.NODE_ENV === "production") return <Navigate to="/" replace />;

  const open = (item) => navigate(item.path);
  const hero = sections[0];

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F4F7F9", pb: 2 }}>
      <Box
        sx={{
          px: 3,
          pt: "calc(20px + env(safe-area-inset-top, 0px))",
          pb: 3,
          color: "#fff",
          backgroundImage: "linear-gradient(130deg,#002244 0%,#003366 45%,#0B7A85 100%)",
          borderRadius: "0 0 24px 24px",
          boxShadow: "0 10px 24px rgba(0,51,102,0.22)",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Sparkles size={20} color="#FCD34D" />
              <Typography sx={{ fontSize: "1.45rem", fontWeight: 800, letterSpacing: "-0.3px" }}>For you</Typography>
            </Stack>
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
              {data?.personalised ? "Homes matched to what you've viewed, saved and searched" : user ? "Browse a few homes and we'll tailor this" : "Top homes right now — sign in to personalise"}
            </Typography>
          </Box>
          <Button onClick={load} aria-label="Refresh" sx={{ minWidth: 40, color: "#fff", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: "12px", "&:hover": { backgroundColor: "rgba(255,255,255,0.24)" } }}>
            <RefreshCw size={18} />
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.id}
              label={f.label}
              onClick={() => setFilter(f.id)}
              sx={{
                fontWeight: 800,
                color: filter === f.id ? "#003366" : "#fff",
                backgroundColor: filter === f.id ? "#fff" : "rgba(255,255,255,0.16)",
                "&:hover": { backgroundColor: filter === f.id ? "#fff" : "rgba(255,255,255,0.26)" },
              }}
            />
          ))}
        </Stack>
      </Box>

      {stale && data && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mx: 3, mt: 2, px: 2, py: 1, borderRadius: "10px", backgroundColor: "#FFF7E6", color: "#92400E" }}>
          <WifiOff size={14} />
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Showing your last saved picks</Typography>
        </Stack>
      )}

      <Box sx={{ px: 3, pt: 3 }}>
        {loading && !data && (
          <Stack spacing={3}>
            <SkeletonRow />
            <SkeletonRow />
          </Stack>
        )}

        {!loading && !sections.length && (
          <Stack alignItems="center" spacing={2} sx={{ py: 8, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 800, color: "#003366" }}>{stale ? "Can't reach GgnHome right now" : "Nothing to show yet"}</Typography>
            <Typography sx={{ color: "#5B6B7B", fontSize: "0.85rem", maxWidth: 280 }}>
              {stale ? "Check your connection and try again." : "Open a few homes and your picks will appear here."}
            </Typography>
            <Button variant="contained" onClick={load}>Try again</Button>
          </Stack>
        )}

        {sections.map((section, idx) => (
          <Box key={section.id} sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#003366" }}>{section.title}</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "#9AA7B4" }}>{section.items.length} homes</Typography>
            </Stack>
            {idx === 0 && hero ? (
              <Stack spacing={2}>
                {section.items.slice(0, 4).map((item) => (
                  <FeedCard key={item.id} item={item} onOpen={open} wide />
                ))}
              </Stack>
            ) : (
              <Box sx={{ display: "flex", gap: 2, overflowX: "auto", scrollSnapType: "x mandatory", pb: 1, mx: -3, px: 3, "&::-webkit-scrollbar": { display: "none" } }}>
                {section.items.map((item) => (
                  <FeedCard key={item.id} item={item} onOpen={open} />
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
      <MobileBottomNav user={user} />
    </Box>
  );
}
