import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, LinearProgress, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import Reveal from "../../components/motion/Reveal";
import SectionShell from "../../components/ui/SectionShell";
import SectionSkeleton from "../../components/ui/SectionSkeleton";
import DashboardSeo from "./DashboardSeo";
import HeroSearch from "./HeroSearch";
import FloatingActions from "./FloatingActions";

// Lazy imports — everything below the hero streams in as the user scrolls.
const Footer = React.lazy(() => import("./Footer"));
const CardSection = React.lazy(() => import("./CardSection"));
const TopNavigationBar = React.lazy(() => import("./TopNavigationBar"));
const PropertyDashboard = React.lazy(() => import("./PropertiesWithwithoutlogin"));
const PropertyHeroSection = React.lazy(() => import("./News"));
const LandingPage = React.lazy(() => import("./advertisement"));
const PropertySnapshot = React.lazy(() => import("./PropertySnapshots"));
const Banners = React.lazy(() => import("./Banners"));
const PropertyCitiesComponent = React.lazy(() => import("./propertyOptions"));
const PropertiesInArea = React.lazy(() => import("./RecommendedProperties"));
const Location = React.lazy(() => import("./Location"));
const ToolsShowcase = React.lazy(() => import("./Tools"));

const NAV_ITEMS = [
  "For Buyers",
  "For Tenants",
  "For Owners",
  "For Dealers / Builders",
  "Insights",
];

/**
 * A lazy section that always shows structure while it loads and reveals once
 * on scroll. Sections that ship their own heading keep it — this only adds
 * the shared rhythm.
 */
function LazySection({ fallback, children, sx }) {
  return (
    <Box sx={sx}>
      <Suspense fallback={fallback}>
        <Reveal amount={0.05}>{children}</Reveal>
      </Suspense>
    </Box>
  );
}

export default function RealEstateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Hybrid authentication: grab token from localStorage for authenticated APIs
  const userToken = localStorage.getItem("accessToken");

  const [searchQuery, setSearchQuery] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("All");
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [areaSuggestions, setAreaSuggestions] = useState([]);

  const [properties, setProperties] = useState([]);
  const [recommended, setRecommended] = useState([]);

  const [userLocation, setUserLocation] = useState(null);
  const [propertiesInArea, setPropertiesInArea] = useState([]);
  const [areaPage, setAreaPage] = useState(1);
  const [areaLimit] = useState(10);
  const [areaHasMore, setAreaHasMore] = useState(true);
  const [areaLoading, setAreaLoading] = useState(false);
  const [areaError, setAreaError] = useState(false);

  const areaLoadingRef = useRef(false);

  // ---------------------------------------------------------------- search --

  // Area suggestions as the user types.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAreaSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_SEARCH_AREAS_API}?query=${encodeURIComponent(
            searchQuery.trim()
          )}`,
          { method: "GET", credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setAreaSuggestions(data.sectors || []);
        } else {
          setAreaSuggestions([]);
        }
      } catch (err) {
        setAreaSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [searchQuery]);

  // Takes the term explicitly so a suggestion click searches what was clicked
  // rather than whatever state had settled by then.
  const handleSearch = useCallback(
    (term) => {
      const query = (typeof term === "string" ? term : searchQuery).trim();
      if (!query) return;
      setIsSearching(true);
      try {
        // Primes the search endpoint; the results page fetches its own data, so
        // we never make the user wait on this before navigating.
        fetch(
          `${process.env.REACT_APP_SEARCH_PROPERTIES_API}?query=${encodeURIComponent(
            query
          )}&type=${encodeURIComponent(propertyTypeFilter)}`,
          { method: "GET", credentials: "include" }
        ).catch(() => {});
        navigate(`/search/${encodeURIComponent(query)}`);
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery, propertyTypeFilter, navigate]
  );

  // ------------------------------------------------------- dashboard data --

  useEffect(() => {
    if (!user) return;

    const fetchSearchHistory = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_SEARCH_HISTORY_API}`, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setRecentSearches(data.history.slice(0, 10));
        }
      } catch (err) {
        console.error("Error fetching search history:", err);
      }
    };

    fetchSearchHistory();
  }, [user, userToken]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        if (!user) {
          const res = await fetch(
            `${process.env.REACT_APP_Base_API}/api/activeproperties?limit=12`,
            { method: "GET" }
          );

          if (res.ok) {
            const data = await res.json();
            setProperties(data.slice(0, 15));
          } else {
            setProperties([]);
          }
        } else {
          const res = await fetch(`${process.env.REACT_APP_USER_DASHBOARD_API}`, {
            method: "GET",
            credentials: "include",
            headers: {
              ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
            },
          });
          if (res.ok) {
            const data = await res.json();
            setRecentSearches(data.recentSearches || []);
            setRecommended(data.recommendedProperties || data || []);
          } else {
            setRecentSearches([]);
            setRecommended([]);
          }
        }
      } catch (err) {
        setProperties([]);
        setRecentSearches([]);
        setRecommended([]);
      }
    };
    fetchProperties();
  }, [user, userToken]);

  // ------------------------------------------------- properties near you --

  const fetchAreaPage = useCallback(
    async ({ page = 1, replace = false }) => {
      if (!userLocation) return;
      if (areaLoadingRef.current) return;
      areaLoadingRef.current = true;
      setAreaLoading(true);
      setAreaError(false);
      try {
        const fields = [
          userLocation.area,
          userLocation.village,
          userLocation.city_district,
          userLocation.county,
          userLocation.state_district,
          userLocation.state,
        ].filter(Boolean);

        const resProps = await fetch(
          `${process.env.REACT_APP_SEARCH_PROPERTIES_BY_LOCATION_API}?page=${page}&limit=${areaLimit}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ queryFields: fields }),
          }
        );

        const text = await resProps.text();
        if (resProps.ok) {
          const chunk = JSON.parse(text);
          const safeChunk = Array.isArray(chunk) ? chunk : [];
          setAreaHasMore(safeChunk.length === areaLimit);
          setPropertiesInArea((prev) => (replace ? safeChunk : [...prev, ...safeChunk]));
        } else {
          if (replace) setPropertiesInArea([]);
          setAreaHasMore(false);
          setAreaError(true);
        }
      } catch (err) {
        if (replace) setPropertiesInArea([]);
        setAreaHasMore(false);
        setAreaError(true);
      } finally {
        areaLoadingRef.current = false;
        setAreaLoading(false);
      }
    },
    [userLocation, areaLimit]
  );

  useEffect(() => {
    if (!userLocation) return undefined;
    setAreaPage(1);
    setAreaHasMore(true);
    const debounceTimeout = setTimeout(() => {
      fetchAreaPage({ page: 1, replace: true });
    }, 300);
    return () => clearTimeout(debounceTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  useEffect(() => {
    if (!userLocation) return;
    if (areaPage === 1) return; // initial load handled above
    fetchAreaPage({ page: areaPage, replace: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaPage]);

  // Track property views
  const handlePropertyClick = async (propertyId) => {
    try {
      await fetch(`${process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_VIEW}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({ propertyId }),
      });
    } catch (err) {
      console.error("Error adding view:", err);
    }
  };

  const goToPreferences = () => navigate("/userpreferenceform");

  return (
    <Box sx={{ backgroundColor: "background.paper", overflowX: "hidden" }}>
      <DashboardSeo />

      <Suspense fallback={<Box sx={{ height: { xs: 64, md: 88 } }} />}>
        <TopNavigationBar navItems={NAV_ITEMS} />
      </Suspense>

      {/* Search feedback: a thread of progress, not a blocking white screen. */}
      {isSearching && (
        <LinearProgress
          color="secondary"
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            zIndex: (t) => t.zIndex.tooltip,
          }}
        />
      )}

      <HeroSearch
        user={user}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSearch={handleSearch}
        type={propertyTypeFilter}
        onTypeChange={setPropertyTypeFilter}
        recentSearches={recentSearches}
        suggestions={areaSuggestions}
        searching={isSearching}
        onOpenPreferences={goToPreferences}
      />

      {/* Primary intents */}
      <SectionShell
        tone="muted"
        overline="Start here"
        title="What brings you here today?"
        description="Four ways into the platform — pick one and we'll take you straight there."
        py={{ xs: 12, md: 16 }}
      >
        <Suspense fallback={<SectionSkeleton count={4} height={200} />}>
          <CardSection user={user} />
        </Suspense>
      </SectionShell>

      {/* Recommended / explore */}
      <LazySection fallback={<SectionSkeleton variant="row" count={4} height={300} />}>
        <PropertyDashboard
          properties={user ? recommended : properties}
          user={user}
          title={user ? "Recommended for you" : "Explore Properties"}
          onPropertyClick={handlePropertyClick}
        />
      </LazySection>

      <LazySection fallback={<SectionSkeleton count={3} height={180} />}>
        <PropertySnapshot />
      </LazySection>

      <LazySection fallback={<SectionSkeleton variant="row" count={3} height={260} />}>
        <Box id="news">
          <PropertyHeroSection />
        </Box>
      </LazySection>

      <LazySection fallback={<SectionSkeleton variant="band" height={320} />}>
        <LandingPage />
      </LazySection>

      <LazySection fallback={<SectionSkeleton variant="band" height={240} />}>
        <Banners user={user} />
      </LazySection>

      {/* Properties near the user, with its own pagination affordances */}
      <LazySection fallback={<SectionSkeleton variant="row" count={4} height={300} />}>
        <PropertiesInArea
          properties={propertiesInArea}
          user={user}
          title="Properties in your area"
          onPropertyClick={handlePropertyClick}
          locationQueryFields={[
            userLocation?.area,
            userLocation?.village,
            userLocation?.city_district,
            userLocation?.county,
            userLocation?.state_district,
            userLocation?.state,
          ].filter(Boolean)}
        />
      </LazySection>

      <Stack alignItems="center" spacing={3} sx={{ py: { xs: 6, md: 8 } }}>
        {areaLoading && (
          <Stack direction="row" spacing={3} alignItems="center">
            <CircularProgress size={18} color="secondary" />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Finding homes near you…
            </Typography>
          </Stack>
        )}

        {!areaLoading && areaError && (
          <Stack spacing={3} alignItems="center" sx={{ textAlign: "center", px: 6 }}>
            <Typography variant="h4" sx={{ color: "primary.main" }}>
              We couldn't load homes near you
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
              Nothing is lost — this is just a hiccup fetching listings for your
              location.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => fetchAreaPage({ page: 1, replace: true })}
            >
              Try again
            </Button>
          </Stack>
        )}

        {!areaLoading && !areaError && areaHasMore && propertiesInArea.length > 0 && (
          <Button variant="contained" color="secondary" onClick={() => setAreaPage((p) => p + 1)}>
            Load more in your area
          </Button>
        )}

        {!areaLoading && !areaError && !areaHasMore && propertiesInArea.length > 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            You're all caught up in this area.
          </Typography>
        )}
      </Stack>

      <LazySection fallback={<SectionSkeleton count={4} height={220} />}>
        <ToolsShowcase />
      </LazySection>

      <LazySection fallback={<SectionSkeleton count={4} height={200} />}>
        <PropertyCitiesComponent />
      </LazySection>

      <LazySection fallback={<SectionSkeleton variant="band" height={180} />}>
        <Location setUserLocation={setUserLocation} />
      </LazySection>

      <FloatingActions onOpenPreferences={goToPreferences} />

      <Suspense fallback={null}>
        <Footer user={user} />
      </Suspense>
    </Box>
  );
}
