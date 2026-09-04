import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Container,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import axios from "axios";
import { Home, SlidersHorizontal } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { StaggerContainer, StaggerItem } from "../../components/motion";
import SectionSkeleton from "../../components/ui/SectionSkeleton";
import { propertyDetailPath } from "../../components/property/PropertyCard";
import SearchHero from "./SearchHero";
import SearchToolbar from "./SearchToolbar";
import SearchSidebar from "./SearchSidebar";
import SearchResultCard from "./SearchResultCard";
import FilterDrawer from "./FilterDrawer";
import ShareDialog from "../../components/ui/ShareDialog";

const TopNavigationBar = React.lazy(() => import("../Dashboard/TopNavigationBar"));

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const PAGE_LIMIT = 10;

const EMPTY_REFINEMENTS = {
  bedroomsFilter: "",
  bathroomsFilter: "",
  minPriceFilter: "",
  maxPriceFilter: "",
  minAreaFilter: "",
  maxAreaFilter: "",
  moveInDateFilter: "",
  parkingFilter: "",
};

const addPropertyView = async (propertyId) => {
  try {
    await axios.post(
      process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_VIEW,
      { propertyId },
      {
        withCredentials: true,
        headers: {
          ...(localStorage.getItem("accessToken")
            ? { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            : {}),
        },
      }
    );
  } catch (err) {
    console.error("Error adding view:", err);
  }
};

export default function Searchproperty() {
  const userToken = localStorage.getItem("accessToken");
  const { query } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState(query || "");
  const [areaSuggestions, setAreaSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsTimeout = useRef(null);
  const [recentSearches, setRecentSearches] = useState([]);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const initialType = (searchParams.get("type") || "").toLowerCase();
  const [propertyTypeFilter, setPropertyTypeFilter] = useState(
    initialType === "rent" || initialType === "sale" ? initialType : ""
  );
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");

  const [refinements, setRefinements] = useState(EMPTY_REFINEMENTS);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [savedProperties, setSavedProperties] = useState(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");

  // ------------------------------------------------------------- fetch --

  const fetchSearchResults = useCallback(
    async (queryToSearch, options = { append: false, pageOverride: null }) => {
      const searchVal = typeof queryToSearch === "string" ? queryToSearch : searchQuery;
      const activeType = (propertyTypeFilter || "").toLowerCase();

      if (searchVal.trim() === "" && !activeType) {
        setResults([]);
        setLoading(false);
        setHasMore(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        const pageToLoad = options.pageOverride ?? page;
        if (searchVal.trim()) params.append("query", searchVal.trim());
        if (activeType) params.append("type", activeType);
        params.append("limit", String(PAGE_LIMIT));
        params.append("page", String(pageToLoad));

        const res = await axios.get(
          `${process.env.REACT_APP_SEARCH_PROPERTIES_API}?${params.toString()}`,
          { withCredentials: true }
        );

        const incoming = Array.isArray(res.data) ? res.data : [];
        const normalized = incoming.map((p) => {
          const rawType = (p.type || p.defaultpropertytype || "").toLowerCase();
          const normType = rawType.includes("rent")
            ? "rent"
            : rawType.includes("sale")
            ? "sale"
            : p.monthlyRent
            ? "rent"
            : "sale";
          return { ...p, type: normType, defaultpropertytype: normType === "rent" ? "rental" : "sale" };
        });

        const totalCountHeader = res.headers["x-total-count"] ? Number(res.headers["x-total-count"]) : null;
        let pageItems = normalized;
        let clientHasMore = false;

        if (totalCountHeader !== null) {
          clientHasMore = pageToLoad < Math.ceil(totalCountHeader / PAGE_LIMIT);
          pageItems = normalized.slice(0, PAGE_LIMIT);
        } else if (normalized.length > PAGE_LIMIT) {
          clientHasMore = true;
          pageItems = normalized.slice(0, PAGE_LIMIT);
        } else {
          clientHasMore = normalized.length === PAGE_LIMIT;
        }

        setResults((prev) => (options.append ? [...prev, ...pageItems].slice(0, pageToLoad * PAGE_LIMIT) : pageItems));
        if (options.pageOverride) setPage(pageToLoad);
        setHasMore(clientHasMore);
      } catch (error) {
        console.error("Search API error:", error);
        if (!options.append) setResults([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [searchQuery, propertyTypeFilter, page]
  );

  // Runs once on mount: a text query (path param) and/or a type (e.g. the
  // dashboard's "Buying/Renting a home" cards link to `/search?type=sale`)
  // can each arrive independently, so either one alone should still search.
  useEffect(() => {
    if (query) setSearchQuery(query);
    if (query || initialType === "rent" || initialType === "sale") {
      fetchSearchResults(query || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ------------------------------------------------------ area suggestions --

  useEffect(() => {
    if (!searchQuery.trim()) {
      setAreaSuggestions([]);
      setShowSuggestions(false);
      return undefined;
    }
    if (suggestionsTimeout.current) clearTimeout(suggestionsTimeout.current);
    suggestionsTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_SEARCH_AREAS_API}?query=${encodeURIComponent(searchQuery.trim())}`,
          { withCredentials: true }
        );
        const sectors = res.data?.sectors || [];
        setAreaSuggestions(sectors.map((s) => s.name || s));
        setShowSuggestions(sectors.length > 0);
      } catch (err) {
        setAreaSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(suggestionsTimeout.current);
  }, [searchQuery]);

  // ------------------------------------------------------------- saves --

  const fetchSavedProperties = useCallback(async () => {
    if (!user) {
      setSavedProperties(new Set());
      return;
    }
    try {
      const resp = await fetch(process.env.REACT_APP_FETCHING_SAVED_PROPERTIES, {
        method: "GET",
        credentials: "include",
        headers: { ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}) },
      });
      if (!resp.ok) {
        setSavedProperties(new Set());
        return;
      }
      const data = await resp.json().catch(() => ({}));
      const props = Array.isArray(data.properties) ? data.properties : [];
      setSavedProperties(new Set(props.map((p) => String(p._id || p.id))));
    } catch (err) {
      console.error("[fetchSavedProperties] error:", err);
      setSavedProperties(new Set());
    }
  }, [user, userToken]);

  useEffect(() => {
    fetchSavedProperties();
  }, [fetchSavedProperties]);

  const handleSaveProperty = async (propertyId, e) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setSavedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(String(propertyId))) next.delete(String(propertyId));
      else next.add(String(propertyId));
      return next;
    });

    try {
      const resp = await fetch(process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_SAVE, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({ propertyId }),
      });
      if (!resp.ok) {
        await fetchSavedProperties();
        return;
      }
      const body = await resp.json().catch(() => ({}));
      if (Array.isArray(body.savedPropertyIds)) {
        setSavedProperties(new Set(body.savedPropertyIds.map((id) => String(id))));
      } else {
        await fetchSavedProperties();
      }
    } catch (err) {
      console.error("[handleSaveProperty] error:", err);
      await fetchSavedProperties();
    }
  };

  // ---------------------------------------------------------- interactions --

  const handleSearch = (term) => {
    const value = (term ?? searchQuery).trim();
    if (!value) return;
    setRecentSearches((prev) => [value, ...prev.filter((s) => s !== value)].slice(0, 5));
    setShowSuggestions(false);
    setPage(1);
    fetchSearchResults(value, { append: false, pageOverride: 1 });
  };

  const handlePickSuggestion = (value) => {
    setSearchQuery(value);
    handleSearch(value);
  };

  const handleQuickFilter = (bhkValue) => {
    setRefinements((prev) => ({ ...prev, bedroomsFilter: prev.bedroomsFilter === bhkValue ? "" : bhkValue }));
    setPage(1);
    fetchSearchResults(searchQuery, { append: false, pageOverride: 1 });
  };

  const handleTypeChange = (value) => {
    setPropertyTypeFilter(value);
    setResults([]);
    setHasMore(true);
    setPage(1);
    fetchSearchResults(searchQuery, { append: false, pageOverride: 1 });
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || (nextPage > page && !hasMore)) return;
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchSearchResults(searchQuery, { append: false, pageOverride: nextPage });
  };

  const handleContactOwner = () => {
    if (!user) {
      navigate("/login");
      return;
    }
  };

  const handleShareProperty = (property) => {
    const route = propertyDetailPath(property);
    setShareLink(`${window.location.origin}${route}`);
    setShareOpen(true);
  };

  const handleOpenProperty = (property) => {
    if (!property._id) return;
    if (!user) {
      navigate("/login");
      return;
    }
    addPropertyView(property._id);
    navigate(propertyDetailPath(property));
  };

  // --------------------------------------------------------- client filter --

  const filteredResults = results.filter((p) => {
    if (refinements.bedroomsFilter) {
      const filterVal = refinements.bedroomsFilter.toLowerCase().trim();
      const haystack = `${(p.title || "").toLowerCase()} ${(p?.totalArea?.configuration || "").toLowerCase()}`;
      if (filterVal === "1 rk") {
        if (!haystack.includes("1 rk")) return false;
      } else if (filterVal.startsWith("4")) {
        const match = haystack.match(/(\d+)\s*bhk/);
        if (!match || Number(match[1]) < 4) return false;
      } else {
        const num = filterVal.match(/\d+/)?.[0];
        if (!num) return false;
        const patterns = [`${num} bhk`, `${num}bhk`, `${num} b.h.k`];
        if (!patterns.some((pat) => haystack.includes(pat))) return false;
      }
    }
    if (refinements.bathroomsFilter && p.bathrooms !== Number(refinements.bathroomsFilter)) return false;
    if (refinements.minPriceFilter && Number(p.monthlyRent || p.price) < Number(refinements.minPriceFilter)) return false;
    if (refinements.maxPriceFilter && Number(p.monthlyRent || p.price) > Number(refinements.maxPriceFilter)) return false;

    const area = Number(p?.totalArea?.sqft || 0);
    if (refinements.minAreaFilter && area < Number(refinements.minAreaFilter)) return false;
    if (refinements.maxAreaFilter && area > Number(refinements.maxAreaFilter)) return false;

    if (refinements.parkingFilter && p.parking !== refinements.parkingFilter) return false;

    if (refinements.moveInDateFilter) {
      if (!p.moveInDate) return false;
      if (new Date(p.moveInDate) > new Date(refinements.moveInDateFilter)) return false;
    }
    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "price-low") return (a.price || a.monthlyRent || 0) - (b.price || b.monthlyRent || 0);
    if (sortBy === "price-high") return (b.price || b.monthlyRent || 0) - (a.price || a.monthlyRent || 0);
    if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
    return 0;
  });

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh" }}>
      <Suspense fallback={<Box sx={{ height: 64 }} />}>
        <TopNavigationBar navItems={NAV_ITEMS} />
      </Suspense>

      <SearchHero
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSearch={handleSearch}
        showSuggestions={showSuggestions}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setShowSuggestions(false)}
        recentSearches={recentSearches}
        areaSuggestions={areaSuggestions}
        onPickSuggestion={handlePickSuggestion}
        onQuickFilter={handleQuickFilter}
        activeBhk={refinements.bedroomsFilter}
      />

      <Container maxWidth="lg" sx={{ px: { xs: 4, md: 6 }, py: 3 }}>
        <Breadcrumbs separator="/" sx={{ fontSize: 13, color: "text.secondary" }}>
          <MuiLink component="button" onClick={() => navigate("/")} sx={{ color: "text.secondary" }}>
            Home
          </MuiLink>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {searchQuery ? `Search results for "${searchQuery}"` : "Search"}
          </Typography>
        </Breadcrumbs>
      </Container>

      <SearchToolbar
        propertyTypeFilter={propertyTypeFilter}
        onTypeChange={handleTypeChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onOpenFilters={() => setShowFilters(true)}
        resultCount={sortedResults.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={refinements}
        onApply={(next) => {
          setRefinements(next);
          setPage(1);
          fetchSearchResults(searchQuery, { append: false, pageOverride: 1 });
        }}
      />

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} link={shareLink} />

      <Container maxWidth="lg" sx={{ px: { xs: 4, md: 6 }, py: { xs: 6, md: 8 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={8}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <SectionSkeleton count={4} height={280} />
            ) : sortedResults.length === 0 ? (
              <Stack
                alignItems="center"
                spacing={4}
                sx={{ py: 14, textAlign: "center", backgroundColor: "background.paper", borderRadius: 3 }}
              >
                <Home size={44} color="#4A6A8A" />
                <Typography variant="h3" sx={{ color: "primary.main", fontSize: "1.15rem" }}>
                  No properties found
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Try adjusting your filters or search in a different area.
                </Typography>
              </Stack>
            ) : (
              <>
                <StaggerContainer
                  style={{
                    display: "grid",
                    gap: 20,
                    gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(340px, 1fr))" : "1fr",
                  }}
                >
                  {sortedResults.map((property) => (
                    <StaggerItem key={property._id}>
                      <SearchResultCard
                        property={property}
                        layout={viewMode}
                        onClick={() => handleOpenProperty(property)}
                        onSave={handleSaveProperty}
                        isSaved={savedProperties.has(String(property._id))}
                        onShare={handleShareProperty}
                        onContact={handleContactOwner}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>

                <Stack direction="row" justifyContent="center" alignItems="center" spacing={4} sx={{ mt: 8 }}>
                  <Button variant="outlined" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>
                    Previous
                  </Button>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    Page {page}
                  </Typography>
                  <Button variant="outlined" disabled={!hasMore} onClick={() => handlePageChange(page + 1)}>
                    Next
                  </Button>
                </Stack>
              </>
            )}
          </Box>

          <Box sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0, display: { xs: "none", md: "block" } }}>
            <SearchSidebar user={user} />
          </Box>
        </Stack>
      </Container>

      {loading && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 3,
            backgroundColor: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(4px)",
          }}
        >
          <CircularProgress color="secondary" />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Searching properties…
          </Typography>
        </Box>
      )}

      <Stack
        spacing={3}
        alignItems="flex-end"
        sx={{ position: "fixed", right: { xs: 4, md: 8 }, bottom: { xs: 4, md: 8 }, zIndex: (t) => t.zIndex.speedDial }}
      >
        <Button
          onClick={() => navigate("/userpreferenceform")}
          sx={{
            display: { xs: "none", sm: "inline-flex" },
            backgroundColor: "primary.main",
            color: "common.white",
            px: 4,
            py: 2,
            borderRadius: 2,
            boxShadow: "0 8px 24px rgba(0,20,45,0.28)",
            "&:hover": { backgroundColor: "primary.dark" },
          }}
        >
          Didn't find your match? Submit your preference →
        </Button>
        <Box
          component="button"
          onClick={() => navigate("/userpreferenceform")}
          aria-label="Submit property preferences"
          sx={{
            width: 55,
            height: 55,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            backgroundColor: "secondary.main",
            color: "common.white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 5px 14px rgba(0,0,0,0.25)",
            transition: "transform .2s ease",
            "&:hover": { transform: "scale(1.08)" },
          }}
        >
          <SlidersHorizontal size={24} />
        </Box>
      </Stack>
    </Box>
  );
}
