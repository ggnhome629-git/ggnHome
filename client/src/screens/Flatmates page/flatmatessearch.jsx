import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  MenuItem,
  Pagination,
  Popover,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowRight, ChevronDown, Gift, Handshake, MapPin, RefreshCw, SearchX, ShieldCheck, Sofa } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import SearchHero from "../Searches/SearchHero";
import MobileBottomNav from "../Dashboard/MobileBottomNav";
import PromoCard from "../../components/promo/PromoCard";
import usePromos from "../../components/promo/usePromos";
import { openLink } from "../../components/promo/openLink";
import AnimatedNumber from "../../components/motion/AnimatedNumber";
import FlatmateCard from "./FlatmateCard";
import useFlatmateBookmarks from "./useFlatmateBookmarks";
import { radii } from "../../theme/theme";

const TopNavigationBar = React.lazy(() => import("../Dashboard/TopNavigationBar"));
const Footer = React.lazy(() => import("../Dashboard/Footer"));

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const PAGE_LIMIT = 12;
const CARD_MIN = 300;
const GRID_GAP = 20;

const GENDER_TABS = [
  { value: "", label: "Anyone" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "budget-low", label: "Rent: low to high" },
  { value: "budget-high", label: "Rent: high to low" },
  { value: "popular", label: "Most viewed" },
];
const BUDGET_PRESETS = [8000, 12000, 15000, 20000, 25000, 35000];
const TRUST = [
  { icon: ShieldCheck, label: "Admin-approved listings" },
  { icon: Handshake, label: "Enquire directly with listers" },
  { icon: Gift, label: "Free to list your room" },
];

const titleCase = (s) =>
  s.replace(/\b([a-z0-9]+)\b/gi, (w) => (w.toLowerCase() === "dlf" ? "DLF" : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));

const pill = (active) => ({
  height: 38,
  px: 4,
  flexShrink: 0,
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 14,
  textTransform: "none",
  whiteSpace: "nowrap",
  border: "1px solid",
  borderColor: active ? "primary.main" : "divider",
  color: active ? "common.white" : "text.primary",
  backgroundColor: active ? "primary.main" : "background.paper",
  "&:hover": { borderColor: "primary.main", backgroundColor: active ? "primary.dark" : "background.default" },
});

function promoSlots(cols, count) {
  const first = cols >= 3 ? cols - 2 : 2;
  const gap = cols === 1 ? 4 : 2 * cols - 1;
  return [first, first + gap, first + 2 * gap].filter((i) => i < count - 1);
}

function useNavHeight() {
  const [height, setHeight] = useState(64);
  useEffect(() => {
    let observer;
    const attach = () => {
      const nav = document.querySelector("nav");
      if (!nav || typeof ResizeObserver === "undefined") return false;
      const update = () => setHeight(nav.getBoundingClientRect().height);
      update();
      observer = new ResizeObserver(update);
      observer.observe(nav);
      return true;
    };
    const timer = attach() ? null : setInterval(() => attach() && clearInterval(timer), 300);
    return () => {
      if (timer) clearInterval(timer);
      if (observer) observer.disconnect();
    };
  }, []);
  return height;
}

function PopoverPill({ label, active, children }) {
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <Button onClick={(e) => setAnchor(e.currentTarget)} endIcon={<ChevronDown size={16} />} sx={pill(active)}>
        {label}
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{ sx: { mt: 2, p: 5, width: 300, borderRadius: `${radii.lg}px` } }}
      >
        {children(() => setAnchor(null))}
      </Popover>
    </>
  );
}

function CardSkeleton() {
  return (
    <Box sx={{ borderRadius: `${radii.lg}px`, overflow: "hidden", border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
      <Skeleton variant="rectangular" sx={{ aspectRatio: "4 / 3", height: "auto" }} />
      <Box sx={{ p: 5 }}>
        <Skeleton width="50%" height={30} />
        <Skeleton width="75%" />
        <Skeleton width="55%" />
      </Box>
    </Box>
  );
}

/** Flatmate / room search, styled like the property search page. */
export default function FlatmateDiscovery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navHeight = useNavHeight();
  const gridRef = useRef(null);
  const topRef = useRef(null);

  const q = (searchParams.get("q") || "").trim();
  const gender = ["male", "female"].includes(searchParams.get("gender")) ? searchParams.get("gender") : "";
  const maxBudget = searchParams.get("maxBudget") || "";
  const furnished = searchParams.get("furnished") === "true";
  const sharing = searchParams.get("sharing") || "";
  const moveInBy = searchParams.get("moveInBy") || "";
  const sort = SORTS.some((s) => s.value === searchParams.get("sort")) ? searchParams.get("sort") : "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [inputText, setInputText] = useState(q);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [gridCols, setGridCols] = useState(1);
  const [saved, toggleSaved] = useFlatmateBookmarks();
  const { promos } = usePromos("search", "rent");

  useEffect(() => setInputText(q), [q]);

  const paramsKey = searchParams.toString();
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT), sort });
    if (q) params.set("q", q);
    if (gender) params.set("gender", gender);
    if (maxBudget) params.set("maxBudget", maxBudget);
    if (furnished) params.set("furnished", "true");
    if (sharing) params.set("occupancyWanted", sharing);
    if (moveInBy) params.set("moveInBy", moveInBy);
    setLoading(true);
    setError(false);
    fetch(`${(process.env.REACT_APP_Base_API || "").replace(/\/$/, "")}/api/flatmates/listings/search?${params.toString()}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const data = json?.data || {};
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number.isFinite(Number(data.total)) ? Number(data.total) : null);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(null);
        setError(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, reloadKey]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const update = () => setGridCols(Math.max(1, Math.floor((el.clientWidth + GRID_GAP) / (CARD_MIN + GRID_GAP))));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, items.length]);

  const update = (patch, { keepPage = false } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === "" || v == null || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    if (!keepPage) next.delete("page");
    setSearchParams(next);
  };

  const where = q ? titleCase(q) : "Gurgaon";
  const heading = `Flatmates & Rooms In ${where}`;
  useEffect(() => {
    document.title = `${heading} | GgnHome`;
  }, [heading]);

  const totalPages = total != null ? Math.max(1, Math.ceil(total / PAGE_LIMIT)) : null;
  const shown = total != null ? total : items.length;
  const first = items.length ? (page - 1) * PAGE_LIMIT + 1 : 0;
  const last = (page - 1) * PAGE_LIMIT + items.length;
  const anyFilter = Boolean(gender || maxBudget || furnished || sharing || moveInBy);

  const slots = items.length > 3 ? promoSlots(gridCols, items.length) : [];
  const promoAt = useMemo(() => {
    const out = {};
    slots.slice(0, promos.length).forEach((slot, n) => {
      out[slot] = promos[((page - 1) * slots.length + n) % promos.length];
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promos, page, slots.join(",")]);

  const openListing = (listing) => navigate(`/flatmatesearchpropertymodal/${listing._id}`);

  const chips = [
    gender && { label: gender === "female" ? "Female" : "Male", clear: { gender: "" } },
    maxBudget && { label: `Up to ₹${Number(maxBudget).toLocaleString("en-IN")}`, clear: { maxBudget: "" } },
    furnished && { label: "Furnished", clear: { furnished: "" } },
    sharing && { label: `${sharing} spot${sharing === "1" ? "" : "s"}`, clear: { sharing: "" } },
    moveInBy && { label: `Move in by ${moveInBy}`, clear: { moveInBy: "" } },
  ].filter(Boolean);

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh" }}>
      <Suspense fallback={<Box sx={{ height: 64 }} />}>
        <TopNavigationBar navItems={NAV_ITEMS} />
      </Suspense>

      <SearchHero
        query={inputText}
        onQueryChange={setInputText}
        onSearch={(term) => update({ q: String(term ?? inputText).trim() })}
        type={gender}
        onTypeChange={(g) => update({ gender: g })}
        types={GENDER_TABS}
        recentSearches={[]}
        areaSuggestions={[]}
        onHome={() => navigate("/flatmatesdashboard")}
        headingPrefix="Flatmates & Rooms In"
        place={where}
        total={loading ? undefined : error ? null : shown}
        overline="Gurgaon · Shared living"
        trust={TRUST}
        placeholder="Sector or locality, e.g. “Sector 46” or “DLF Phase 3”"
        noun={["room", "rooms"]}
      />

      {/* Sticky refinement bar */}
      <Box
        sx={{
          position: "sticky",
          top: navHeight,
          zIndex: 20,
          backgroundColor: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid",
          borderColor: "divider",
          boxShadow: "0 4px 16px rgba(0,31,63,0.06)",
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 } }}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ py: 3, overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
          >
            <PopoverPill label={maxBudget ? `Up to ₹${Number(maxBudget).toLocaleString("en-IN")}` : "Budget"} active={Boolean(maxBudget)}>
              {(close) => (
                <>
                  <Typography variant="overline" sx={{ color: "text.secondary" }}>
                    Max rent per month (₹)
                  </Typography>
                  <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ my: 3 }}>
                    {BUDGET_PRESETS.map((v) => (
                      <Chip
                        key={v}
                        label={`₹${(v / 1000).toLocaleString("en-IN")}K`}
                        onClick={() => {
                          update({ maxBudget: v });
                          close();
                        }}
                        color={Number(maxBudget) === v ? "primary" : "default"}
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                  <Button
                    fullWidth
                    onClick={() => {
                      update({ maxBudget: "" });
                      close();
                    }}
                    sx={{ color: "text.secondary" }}
                  >
                    Any budget
                  </Button>
                </>
              )}
            </PopoverPill>

            <Button
              aria-pressed={furnished}
              startIcon={<Sofa size={16} />}
              onClick={() => update({ furnished: !furnished })}
              sx={pill(furnished)}
            >
              Furnished
            </Button>

            <Box sx={{ width: "1px", height: 24, backgroundColor: "divider", flexShrink: 0, mx: 1 }} />

            {["1", "2", "3"].map((n) => (
              <Button key={n} aria-pressed={sharing === n} onClick={() => update({ sharing: sharing === n ? "" : n })} sx={pill(sharing === n)}>
                {n} spot{n === "1" ? "" : "s"}
              </Button>
            ))}

            <Box sx={{ width: "1px", height: 24, backgroundColor: "divider", flexShrink: 0, mx: 1 }} />

            <PopoverPill label={moveInBy ? `By ${moveInBy}` : "Move-in date"} active={Boolean(moveInBy)}>
              {(close) => (
                <>
                  <Typography variant="overline" sx={{ color: "text.secondary" }}>
                    Move in by
                  </Typography>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={moveInBy}
                    onChange={(e) => update({ moveInBy: e.target.value })}
                    sx={{ my: 3 }}
                  />
                  <Button
                    fullWidth
                    onClick={() => {
                      update({ moveInBy: "" });
                      close();
                    }}
                    sx={{ color: "text.secondary" }}
                  >
                    Any date
                  </Button>
                </>
              )}
            </PopoverPill>
          </Stack>
        </Container>
      </Box>

      <Container ref={topRef} maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 6, md: 8 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "flex-end" }}
          spacing={3}
          sx={{ mb: chips.length ? 4 : 6 }}
        >
          <Box>
            {loading ? (
              <Skeleton width={240} height={40} />
            ) : (
              <Typography component="h2" sx={{ fontSize: { xs: "1.4rem", md: "1.75rem" }, fontWeight: 800, color: "primary.main" }}>
                <AnimatedNumber value={shown} /> {shown === 1 ? "Room" : "Rooms"} {q ? `In ${where}` : "Available"}
              </Typography>
            )}
            {!loading && items.length > 0 && (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                Showing {first}–{last}
                {total != null ? ` of ${total.toLocaleString("en-IN")}` : ""}
                {totalPages ? ` · Page ${page} of ${totalPages}` : ""}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }} role="group" aria-label="Sort results">
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, mr: 2 }}>
              Sort by
            </Typography>
            {SORTS.map((o) => {
              const active = sort === o.value;
              return (
                <Box
                  key={o.value}
                  component="button"
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ sort: o.value === "newest" ? "" : o.value })}
                  sx={{
                    position: "relative",
                    border: 0,
                    background: "none",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 14,
                    px: 2,
                    py: 1.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? "primary.main" : "text.secondary",
                    "&:hover": { color: "primary.main" },
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      left: 8,
                      right: 8,
                      bottom: 0,
                      height: 2,
                      borderRadius: 2,
                      backgroundColor: "secondary.main",
                      transform: active ? "scaleX(1)" : "scaleX(0)",
                      transition: "transform .2s ease",
                    },
                  }}
                >
                  {o.label}
                </Box>
              );
            })}
          </Stack>
          <Select
            size="small"
            value={sort}
            onChange={(e) => update({ sort: e.target.value === "newest" ? "" : e.target.value })}
            SelectDisplayProps={{ "aria-label": "Sort results" }}
            sx={{ display: { xs: "inline-flex", md: "none" }, minWidth: 190, fontSize: 14, fontWeight: 600, borderRadius: 999, backgroundColor: "background.paper" }}
          >
            {SORTS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </Stack>

        {chips.length > 0 && (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 6 }}>
            {chips.map((c) => (
              <Chip key={c.label} label={c.label} onDelete={() => update(c.clear)} sx={{ fontWeight: 600, backgroundColor: "rgba(0,51,102,0.08)", color: "primary.main" }} />
            ))}
            <Button
              size="small"
              onClick={() => update({ gender: "", maxBudget: "", furnished: "", sharing: "", moveInBy: "" })}
              sx={{ color: "secondary.main", fontWeight: 700 }}
            >
              Clear all
            </Button>
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
              We couldn't load rooms right now
            </Typography>
            <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </Button>
          </Stack>
        ) : items.length === 0 ? (
          <Stack alignItems="center" spacing={4} sx={{ py: 16, px: 6, textAlign: "center", backgroundColor: "background.paper", borderRadius: `${radii.lg}px`, border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "background.default" }}>
              <SearchX size={28} color="#4A6A8A" />
            </Box>
            <Typography variant="h3" sx={{ color: "primary.main", fontSize: "1.25rem" }}>
              No rooms match this search
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 440 }}>
              Try a nearby sector or loosen a filter — or post your own requirement so flatmates can find you.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
              {anyFilter && (
                <Button variant="contained" onClick={() => update({ gender: "", maxBudget: "", furnished: "", sharing: "", moveInBy: "" })}>
                  Clear filters
                </Button>
              )}
              <Button variant="outlined" onClick={() => navigate(user ? "/flatmateslistingform" : "/login", user ? undefined : { state: { from: "/flatmateslistingform" } })}>
                Post a listing
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Box ref={gridRef} sx={{ display: "grid", gap: 5, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
              {items.map((listing, i) => (
                <React.Fragment key={listing._id}>
                  <FlatmateCard
                    listing={listing}
                    onClick={() => openListing(listing)}
                    isSaved={saved.has(listing._id)}
                    onToggleSave={toggleSaved}
                  />
                  {promoAt[i] && <PromoCard promo={promoAt[i]} onClick={() => openLink(navigate, promoAt[i].link)} />}
                </React.Fragment>
              ))}
            </Box>

            {totalPages > 1 && (
              <Stack alignItems="center" spacing={3} sx={{ mt: { xs: 10, md: 12 } }}>
                <Pagination
                  count={totalPages}
                  page={Math.min(page, totalPages)}
                  onChange={(_, p) => {
                    update({ page: p > 1 ? p : "" }, { keepPage: true });
                    if (topRef.current) window.scrollTo({ top: topRef.current.getBoundingClientRect().top + window.scrollY - navHeight - 80, behavior: "smooth" });
                  }}
                  color="primary"
                  shape="rounded"
                  size="large"
                />
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Page {page} of {totalPages}
                </Typography>
              </Stack>
            )}
          </>
        )}

        {/* Popular localities (Flatmate.in style) */}
        <Box sx={{ mt: { xs: 12, md: 16 } }}>
          <Typography variant="overline" sx={{ color: "secondary.main", display: "block", mb: 1 }}>
            Popular for shared living
          </Typography>
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {["Sector 46", "Sector 49", "Sushant Lok", "DLF Phase 3", "Golf Course Road", "Sohna Road", "Sector 56", "MG Road", "Cyber City", "Sector 14"].map((area) => (
              <Chip
                key={area}
                icon={<MapPin size={13} />}
                label={area}
                variant="outlined"
                onClick={() => update({ q: area })}
                sx={{ fontWeight: 600, backgroundColor: "background.paper", "& .MuiChip-icon": { color: "secondary.main" } }}
              />
            ))}
          </Stack>
        </Box>

        {/* Lister CTA, styled like the property search lead band */}
        <Box
          sx={{
            mt: { xs: 10, md: 12 },
            p: { xs: 7, md: 10 },
            borderRadius: `${radii.xl}px`,
            color: "common.white",
            background: "linear-gradient(135deg, #001F3F 0%, #003366 60%, #0B4A6F 100%)",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <Box sx={{ maxWidth: 620 }}>
            <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: { xs: "1.6rem", md: "2.1rem" }, lineHeight: 1.2 }}>
              Have a room to share?
            </Typography>
            <Typography sx={{ mt: 3, color: "rgba(255,255,255,0.8)" }}>
              List it free with your budget, move-in date and who you'd like to live with — interested flatmates reach you directly.
            </Typography>
          </Box>
          <Button
            size="large"
            endIcon={<ArrowRight size={18} />}
            onClick={() => navigate(user ? "/flatmateslistingform" : "/login", user ? undefined : { state: { from: "/flatmateslistingform" } })}
            sx={{
              flexShrink: 0,
              px: 8,
              py: 3,
              color: "#3B2A00",
              fontWeight: 700,
              background: "linear-gradient(90deg, #FFE08A 0%, #F0B429 100%)",
              "&:hover": { background: "linear-gradient(90deg, #FFE7A8 0%, #F6C453 100%)" },
            }}
          >
            List your room free
          </Button>
        </Box>
      </Container>

      <Suspense fallback={null}>
        <Footer user={user} />
      </Suspense>
      <MobileBottomNav user={user} />
    </Box>
  );
}
