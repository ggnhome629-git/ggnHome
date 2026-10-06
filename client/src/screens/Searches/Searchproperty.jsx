import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import axios from "axios";
import { ArrowRight, MapPin, RefreshCw, SearchX, Share2 } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { propertyDetailPath } from "../../components/property/PropertyCard";
import SearchHero from "./SearchHero";
import SearchToolbar from "./SearchToolbar";
import SearchResultCard from "./SearchResultCard";
import QuickPicks from "./QuickPicks";
import PromoCard from "./PromoCard";
import RecentlyViewed from "../Property View/sections/RecentlyViewed";
import { getRecentlyViewed } from "../../utils/propertyAnalytics";
import AnimatedNumber from "../../components/motion/AnimatedNumber";
import FilterDrawer from "./FilterDrawer";
import ShareDialog from "../../components/ui/ShareDialog";
import MobileBottomNav from "../Dashboard/MobileBottomNav";
import { FILTER_KEYS, PAGE_LIMIT, SORT_OPTIONS, activeFilterChips, readFilters } from "./searchParams";
import { radii } from "../../theme/theme";

const TopNavigationBar = React.lazy(() => import("../Dashboard/TopNavigationBar"));
const Footer = React.lazy(() => import("../Dashboard/Footer"));

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const RECENT_KEY = "recentSearches";
const MORE_FILTER_KEYS = ["bathrooms", "minArea", "maxArea", "parking", "moveInBy", "propertyType", "postedBy", "listedWithin", "withPhotos"];

const authHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Every word capitalised, with real-estate acronyms kept upper case.
const ACRONYMS = { bhk: "BHK", rk: "RK", dlf: "DLF", mg: "MG", nh: "NH" };
const titleCase = (s) =>
  s.replace(/\b([a-z0-9]+)\b/gi, (w) => ACRONYMS[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list.slice(0, 6) : [];
  } catch (e) {
    return [];
  }
}

function writeRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
  } catch (e) {
    // storage unavailable — recent searches just won't persist
  }
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
    // The navbar is lazy-loaded, so it may not exist on first render.
    const timer = attach() ? null : setInterval(() => attach() && clearInterval(timer), 300);
    return () => {
      if (timer) clearInterval(timer);
      if (observer) observer.disconnect();
    };
  }, []);
  return height;
}

function ResultSkeleton() {
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

export default function Searchproperty() {
  const { query: rawQuery = "" } = useParams();
  const query = rawQuery.trim();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const navHeight = useNavHeight();
  const resultsTopRef = useRef(null);

  const type = (() => {
    const t = (searchParams.get("type") || "").toLowerCase();
    return t === "rent" || t === "sale" ? t : "";
  })();
  const sortBy = SORT_OPTIONS.some((o) => o.value === searchParams.get("sort"))
    ? searchParams.get("sort")
    : "relevance";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const [inputText, setInputText] = useState(query);
  const [areaSuggestions, setAreaSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState(readRecent);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [shareLink, setShareLink] = useState("");
  const [shareTitle, setShareTitle] = useState("Share property");
  const [savedToast, setSavedToast] = useState(false);
  const [recentlyViewed] = useState(() => getRecentlyViewed().slice(0, 8));

  useEffect(() => setInputText(query), [query]);

  // ------------------------------------------------------------- results --
  const paramsKey = searchParams.toString();
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (type) params.set("type", type);
    FILTER_KEYS.forEach((k) => filters[k] && params.set(k, filters[k]));
    params.set("sort", sortBy);
    params.set("page", String(page));
    params.set("limit", String(PAGE_LIMIT));

    setLoading(true);
    setError(false);
    axios
      .get(`${process.env.REACT_APP_SEARCH_PROPERTIES_API}?${params.toString()}`, {
        withCredentials: true,
        headers: authHeaders(),
      })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setResults(list.slice(0, PAGE_LIMIT));
        const header = res.headers?.["x-total-count"];
        setTotal(header != null && header !== "" ? Number(header) : null);
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setTotal(null);
        setError(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, paramsKey, reloadKey]);

  // ------------------------------------------------------ area suggestions --
  useEffect(() => {
    const text = inputText.trim();
    if (!text || text === query) {
      setAreaSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_SEARCH_AREAS_API}?query=${encodeURIComponent(text)}`,
          { withCredentials: true }
        );
        setAreaSuggestions((res.data?.sectors || []).map((s) => s.name || s).filter(Boolean).slice(0, 8));
      } catch (err) {
        setAreaSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [inputText, query]);

  // ------------------------------------------------------------- saves --
  const fetchSaved = useCallback(async () => {
    if (!user) return setSavedIds(new Set());
    try {
      const res = await fetch(process.env.REACT_APP_FETCHING_SAVED_PROPERTIES, {
        credentials: "include",
        headers: authHeaders(),
      });
      const data = res.ok ? await res.json().catch(() => ({})) : {};
      const props = Array.isArray(data.properties) ? data.properties : [];
      setSavedIds(new Set(props.map((p) => String(p._id || p.id))));
    } catch (err) {
      setSavedIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const goToLogin = (from) => navigate("/login", { state: { from } });

  const handleSave = async (propertyId) => {
    if (!user) return goToLogin(`${window.location.pathname}${window.location.search}`);
    const id = String(propertyId);
    if (!savedIds.has(id)) setSavedToast(true);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      const res = await fetch(process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_SAVE, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ propertyId }),
      });
      const body = res.ok ? await res.json().catch(() => ({})) : {};
      if (Array.isArray(body.savedPropertyIds)) setSavedIds(new Set(body.savedPropertyIds.map(String)));
      else fetchSaved();
    } catch (err) {
      fetchSaved();
    }
  };

  // ---------------------------------------------------------- navigation --
  const updateParams = (patch, { keepPage = false } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === "" || v == null) next.delete(k);
      else next.set(k, String(v));
    });
    if (!keepPage) next.delete("page");
    setSearchParams(next);
  };

  const handleSearch = (term) => {
    const value = String(term ?? inputText).trim();
    setAreaSuggestions([]);
    if (value) {
      const nextRecent = [value, ...recentSearches.filter((s) => s.toLowerCase() !== value.toLowerCase())];
      setRecentSearches(nextRecent.slice(0, 6));
      writeRecent(nextRecent);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    const qs = next.toString();
    navigate(`/search${value ? `/${encodeURIComponent(value)}` : ""}${qs ? `?${qs}` : ""}`);
  };

  const handlePageChange = (_, nextPage) => {
    updateParams({ page: nextPage > 1 ? nextPage : "" }, { keepPage: true });
    if (resultsTopRef.current) {
      const y = resultsTopRef.current.getBoundingClientRect().top + window.scrollY - navHeight - 80;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
  };

  const openProperty = (property) => {
    if (!property?._id) return;
    const route = propertyDetailPath(property);
    if (!user) return goToLogin(route);
    axios
      .post(process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_VIEW, { propertyId: property._id }, { withCredentials: true, headers: authHeaders() })
      .catch(() => {});
    navigate(route);
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    if (type) next.set("type", type);
    if (sortBy !== "relevance") next.set("sort", sortBy);
    setSearchParams(next);
  };

  // ------------------------------------------------------------- derived --
  const chips = activeFilterChips(filters);
  const moreFilterCount = MORE_FILTER_KEYS.filter((k) => filters[k]).length;
  const totalPages = total != null ? Math.max(1, Math.ceil(total / PAGE_LIMIT)) : null;
  const firstShown = results.length ? (page - 1) * PAGE_LIMIT + 1 : 0;
  const lastShown = (page - 1) * PAGE_LIMIT + results.length;
  const hasMoreFallback = total == null && results.length === PAGE_LIMIT;

  const where = query ? titleCase(query) : "Gurgaon";
  const headingPrefix = type === "rent" ? "Homes For Rent In" : type === "sale" ? "Homes For Sale In" : "Homes In";
  const heading = `${headingPrefix} ${where}`;
  const shownCount = total != null ? total : results.length;
  const countLabel = `${shownCount.toLocaleString("en-IN")} ${shownCount === 1 ? "Home" : "Homes"}${query ? ` In ${where}` : ""}`;

  // Neighbouring sectors, so a thin result set is one tap from a wider one.
  const sectorNum = Number((query.match(/^\s*(?:sector|sec)?\s*-?\s*(\d{1,3})\s*$/i) || [])[1]);
  const nearbySectors = sectorNum
    ? [sectorNum - 2, sectorNum - 1, sectorNum + 1, sectorNum + 2].filter((n) => n > 0).map((n) => `Sector ${n}`)
    : [];

  useEffect(() => {
    document.title = `${heading} | GgnHome`;
  }, [heading]);

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh" }}>
      <Suspense fallback={<Box sx={{ height: 64 }} />}>
        <TopNavigationBar navItems={NAV_ITEMS} />
      </Suspense>

      <SearchHero
        query={inputText}
        onQueryChange={setInputText}
        onSearch={handleSearch}
        type={type}
        onTypeChange={(t) =>
          // Sale listings have no property type, parking or move-in date fields.
          updateParams({ type: t, ...(t === "sale" ? { propertyType: "", parking: "", moveInBy: "" } : {}) })
        }
        recentSearches={recentSearches}
        areaSuggestions={areaSuggestions}
        onHome={() => navigate("/")}
        headingPrefix={headingPrefix}
        place={where}
        total={loading ? undefined : error ? null : total ?? results.length}
      />

      <SearchToolbar
        top={navHeight}
        type={type}
        filters={filters}
        onFilterChange={(patch) => updateParams(patch)}
        onOpenFilters={() => setShowFilters(true)}
        moreFilterCount={moreFilterCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        type={type}
        onApply={(next) => updateParams(next)}
      />

      <ShareDialog open={Boolean(shareLink)} onClose={() => setShareLink("")} link={shareLink} title={shareTitle} />

      <Container ref={resultsTopRef} maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 6, md: 8 } }}>
        <QuickPicks filters={filters} type={type} onPick={(patch) => updateParams(patch)} />

        {/* Result summary: total count for the area, range shown, active filters */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "flex-end" }}
          spacing={3}
          sx={{ mb: chips.length ? 4 : 6 }}
        >
          <Box>
            {loading ? (
              <Skeleton width={220} height={40} />
            ) : (
              <Typography component="h2" aria-label={countLabel} sx={{ fontSize: { xs: "1.4rem", md: "1.75rem" }, fontWeight: 800, color: "primary.main" }}>
                <AnimatedNumber value={shownCount} /> {shownCount === 1 ? "Home" : "Homes"}
                {query ? ` In ${where}` : ""}
              </Typography>
            )}
            {!loading && results.length > 0 && (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                Showing {firstShown}–{lastShown}
                {total != null ? ` of ${total.toLocaleString("en-IN")}` : ""}
                {totalPages ? ` · Page ${page} of ${totalPages}` : ""}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap rowGap={2}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            role="group"
            aria-label="Sort results"
            sx={{ display: { xs: "none", md: "flex" }, mr: 2 }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, mr: 2 }}>
              Sort by
            </Typography>
            {SORT_OPTIONS.map((o) => {
              const active = sortBy === o.value;
              return (
                <Box
                  key={o.value}
                  component="button"
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateParams({ sort: o.value === "relevance" ? "" : o.value })}
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
          <Button
            variant="outlined"
            size="small"
            startIcon={<Share2 size={15} />}
            onClick={() => {
              setShareTitle("Share this search");
              setShareLink(window.location.href);
            }}
            sx={{ borderRadius: 999, borderColor: "divider", color: "primary.main", fontWeight: 600, px: 4, height: 40, backgroundColor: "background.paper", "&:hover": { borderColor: "primary.main" } }}
          >
            Share search
          </Button>
          <Select
            size="small"
            value={sortBy}
            onChange={(e) => updateParams({ sort: e.target.value === "relevance" ? "" : e.target.value })}
            SelectDisplayProps={{ "aria-label": "Sort results" }}
            sx={{ display: { xs: "inline-flex", md: "none" }, minWidth: 170, fontSize: 14, fontWeight: 600, borderRadius: 999, backgroundColor: "background.paper" }}
          >
            {SORT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
          </Stack>
        </Stack>

        {nearbySectors.length > 0 && (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: chips.length ? 3 : 6 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, mr: 1 }}>
              Nearby:
            </Typography>
            {nearbySectors.map((name) => (
              <Chip
                key={name}
                label={name}
                icon={<MapPin size={13} />}
                onClick={() => handleSearch(name)}
                variant="outlined"
                sx={{ fontWeight: 600, backgroundColor: "background.paper", "& .MuiChip-icon": { color: "secondary.main" } }}
              />
            ))}
          </Stack>
        )}

        {chips.length > 0 && (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 6 }}>
            {chips.map((chip) => (
              <Chip
                key={chip.label}
                label={chip.label}
                onDelete={() => updateParams(Object.fromEntries(chip.keys.map((k) => [k, ""])))}
                sx={{ fontWeight: 600, backgroundColor: "rgba(0,51,102,0.08)", color: "primary.main" }}
              />
            ))}
            <Button size="small" onClick={clearAllFilters} sx={{ color: "secondary.main", fontWeight: 700 }}>
              Clear all
            </Button>
          </Stack>
        )}

        {loading ? (
          <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ResultSkeleton key={i} />
            ))}
          </Box>
        ) : error ? (
          <Stack alignItems="center" spacing={4} sx={{ py: 16, textAlign: "center", backgroundColor: "background.paper", borderRadius: `${radii.lg}px`, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="h3" sx={{ color: "primary.main", fontSize: "1.25rem" }}>
              We couldn't load homes right now
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
              Check your connection and try again — your search and filters are kept.
            </Typography>
            <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </Button>
          </Stack>
        ) : results.length === 0 ? (
          <Stack alignItems="center" spacing={4} sx={{ py: 16, px: 6, textAlign: "center", backgroundColor: "background.paper", borderRadius: `${radii.lg}px`, border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "background.default" }}>
              <SearchX size={28} color="#4A6A8A" />
            </Box>
            <Typography variant="h3" sx={{ color: "primary.main", fontSize: "1.25rem" }}>
              No homes match this search
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 440 }}>
              Try removing a filter, widening your budget, or searching a nearby sector.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
              {chips.length > 0 && (
                <Button variant="contained" onClick={clearAllFilters}>
                  Clear filters
                </Button>
              )}
              <Button variant="outlined" onClick={() => navigate("/userpreferenceform")}>
                Tell us what you need
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gap: 5,
                gridTemplateColumns:
                  viewMode === "list" ? "minmax(0, 1fr)" : "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
              }}
            >
              {results.map((property, i) => (
                <React.Fragment key={property._id}>
                <SearchResultCard
                  property={property}
                  layout={viewMode}
                  onClick={() => openProperty(property)}
                  onSave={handleSave}
                  isSaved={savedIds.has(String(property._id))}
                  onShare={(p) => {
                    setShareTitle("Share property");
                    setShareLink(`${window.location.origin}${propertyDetailPath(p)}`);
                  }}
                  onContact={openProperty}
                />
                {/* Promo tiles between listings, grid view only */}
                {viewMode === "grid" && i === 3 && results.length > 5 && (
                  <PromoCard variant="rewards" onClick={() => navigate(user ? "/rewards" : "/login", user ? undefined : { state: { from: "/rewards" } })} />
                )}
                {viewMode === "grid" && i === 8 && results.length > 10 && (
                  <PromoCard variant="post" onClick={() => navigate(user ? "/add-property" : "/login", user ? undefined : { state: { from: "/add-property" } })} />
                )}
                </React.Fragment>
              ))}
            </Box>

            <Stack alignItems="center" spacing={3} sx={{ mt: { xs: 10, md: 12 } }}>
              {totalPages ? (
                totalPages > 1 && (
                  <Pagination
                    count={totalPages}
                    page={Math.min(page, totalPages)}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                    siblingCount={1}
                    size="large"
                    sx={{ "& .MuiPaginationItem-root": { fontWeight: 600 } }}
                  />
                )
              ) : (
                <Stack direction="row" spacing={3}>
                  <Button variant="outlined" disabled={page === 1} onClick={() => handlePageChange(null, page - 1)}>
                    Previous
                  </Button>
                  <Button variant="outlined" disabled={!hasMoreFallback} onClick={() => handlePageChange(null, page + 1)}>
                    Next
                  </Button>
                </Stack>
              )}
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Page {page}
                {totalPages ? ` of ${totalPages}` : ""}
              </Typography>
            </Stack>
          </>
        )}

        {recentlyViewed.length > 0 && (
          <Box sx={{ mt: { xs: 12, md: 16 } }}>
            <RecentlyViewed items={recentlyViewed} />
          </Box>
        )}

        {/* Didn't find it? — the lead-capture moment, styled like the dashboard rewards band */}
        <Box
          sx={{
            mt: { xs: 12, md: 16 },
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
              Didn't find your home yet?
            </Typography>
            <Typography sx={{ mt: 3, color: "rgba(255,255,255,0.8)" }}>
              Tell us your budget and must-haves — we'll shortlist verified homes for you, and you can still earn
              gifts worth up to ₹1,000 when you close.
            </Typography>
          </Box>
          <Button
            size="large"
            endIcon={<ArrowRight size={18} />}
            onClick={() => navigate("/userpreferenceform")}
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
            Share my preferences
          </Button>
        </Box>
      </Container>

      <Suspense fallback={null}>
        <Footer user={user} />
      </Suspense>

      <Snackbar
        open={savedToast}
        autoHideDuration={3500}
        onClose={(_, reason) => reason !== "clickaway" && setSavedToast(false)}
        message="Saved to your shortlist"
        action={
          <Button color="secondary" size="small" onClick={() => navigate("/savedproperties")} sx={{ fontWeight: 700 }}>
            View
          </Button>
        }
        sx={{ bottom: { xs: 80, sm: 24 } }}
      />

      <MobileBottomNav
        user={user}
        onSearch={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => document.querySelector('input[aria-label="Search properties"]')?.focus({ preventScroll: true }), 350);
        }}
      />
    </Box>
  );
}
