import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  Link as MuiLink,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { CalendarCheck } from "lucide-react";
import ShareDialog from "../../components/ui/ShareDialog";
import { radii, elevationShadows } from "../../theme/theme";
import {
  PROPERTY_TYPE,
  normaliseProperty,
  whatsappUrl,
} from "../../utils/propertyModel";
import {
  EVENTS,
  getRecentlyViewed,
  pushRecentlyViewed,
  recordEngagementTime,
  recordPropertyView,
  trackEvent,
} from "../../utils/propertyAnalytics";
import MapIntegration from "./mapsintegration";
import SimilarProperties from "./Similarproperties";
import PropertyHero from "./sections/PropertyHero";
import PropertyGalleryPro from "./sections/PropertyGalleryPro";
import { QuickActionsBar, StickyActionBar } from "./sections/PropertyActions";
import EnquiryCard from "./sections/EnquiryCard";
import ContactCard from "./sections/ContactCard";
import CallbackDialog from "./sections/CallbackDialog";
import EmiCalculatorDialog from "./sections/EmiCalculatorDialog";
import ScheduleVisitDialog from "./sections/ScheduleVisitDialog";
import RecentlyViewed from "./sections/RecentlyViewed";
import {
  AmenitiesSection,
  ConnectivitySection,
  DescriptionSection,
  DocumentsSection,
  HighlightsSection,
  ListedBySection,
  LocationSection,
  NearbyPlacesSection,
  OverviewSection,
  PriceSection,
  SectionCard,
} from "./sections/ContentSections";

const TopNavigationBar = React.lazy(() => import("../Dashboard/TopNavigationBar"));

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

const DETAIL_API = {
  [PROPERTY_TYPE.RENTAL]: "REACT_APP_RENTAL_PROPERTY_DETAIL_API",
  [PROPERTY_TYPE.SALE]: "REACT_APP_SALE_PROPERTY_DETAIL_API",
};

const ROUTE_BASE = {
  [PROPERTY_TYPE.RENTAL]: "/Rentaldetails",
  [PROPERTY_TYPE.SALE]: "/Saledetails",
};

function LoadingSkeleton() {
  return (
    <Container maxWidth="lg" sx={{ px: { xs: 4, md: 6 }, py: 8 }}>
      <Skeleton variant="text" width={260} height={22} sx={{ mb: 4 }} />
      <Skeleton variant="text" width="60%" height={48} />
      <Skeleton variant="text" width="35%" height={26} sx={{ mb: 5 }} />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 6 }}>
        <Skeleton variant="rounded" sx={{ flex: 2, height: { xs: 240, md: 460 } }} />
        <Skeleton variant="rounded" sx={{ flex: 1, height: { xs: 160, md: 460 }, display: { xs: "none", md: "block" } }} />
      </Stack>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={6}>
        <Stack spacing={5} sx={{ flex: 1 }}>
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={180} />
        </Stack>
        <Skeleton variant="rounded" sx={{ width: { xs: "100%", lg: 360 }, height: 420 }} />
      </Stack>
    </Container>
  );
}

/**
 * The property detail experience, shared by the rental and sale routes.
 *
 * Everything is driven by the normalised property object — each section
 * decides for itself whether it has enough data to render, so a listing
 * without floor plans, documents or nearby-place data simply doesn't show
 * those sections rather than rendering empty shells.
 */
export default function PropertyDetailPage({ type }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const previewMode = routerLocation.state?.preview || false;

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [emiOpen, setEmiOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [recent, setRecent] = useState([]);

  const property = useMemo(() => normaliseProperty(raw, type), [raw, type]);

  const emit = (event, extra) => trackEvent(event, { propertyId: id, ...extra });

  // ------------------------------------------------------------- data load --

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env[DETAIL_API[type]]}/${id}`, { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setRaw(null);
          return;
        }
        const data = await res.json();
        if (!previewMode && data?.isActive === false) {
          if (!cancelled) setRaw(null);
          return;
        }
        if (!cancelled) setRaw(data);
      } catch (error) {
        console.error("Error fetching property:", error);
        if (!cancelled) setRaw(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, previewMode, type]);

  // Record the view once, and remember it for "Recently viewed" elsewhere.
  useEffect(() => {
    if (!property) return;
    setRecent(getRecentlyViewed(property.id));
    recordPropertyView(property.id);
    pushRecentlyViewed(property);
    trackEvent(EVENTS.PROPERTY_VIEW, { propertyId: property.id, property_type: type });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]);

  // Time-on-listing, reported when the visitor leaves.
  useEffect(() => {
    if (!property) return undefined;
    const start = Date.now();
    return () => recordEngagementTime(property.id, Math.floor((Date.now() - start) / 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]);

  // ------------------------------------------------------------- handlers --

  const handleSave = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    emit(EVENTS.SAVE_PROPERTY, { saved: nextSaved });
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_SAVE, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ propertyId: id }),
      });
      if (!res.ok) setSaved(!nextSaved);
    } catch (error) {
      console.error("Error saving property:", error);
      setSaved(!nextSaved);
    }
  };

  const openShare = () => {
    setShareOpen(true);
    emit(EVENTS.SHARE_PROPERTY);
  };

  const openCallback = () => {
    setCallbackOpen(true);
    emit(EVENTS.ENQUIRY_STARTED, { via: "callback" });
  };

  const openVisit = () => {
    setVisitOpen(true);
    emit(EVENTS.SCHEDULE_VISIT_STARTED);
  };

  const scrollToEnquiry = () => document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth" });

  const openVirtualTour = () =>
    navigate(`/property/${property.id}/virtual-tour`, {
      state: { panoramas: property.panoramas, propertyName: property.propertyType || "Property", propertyId: property.id },
    });

  // --------------------------------------------------------------- render --

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
        <Suspense fallback={<Box sx={{ height: 64 }} />}>
          <TopNavigationBar navItems={NAV_ITEMS} />
        </Suspense>
        <LoadingSkeleton />
      </Box>
    );
  }

  if (!property) {
    return (
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
        <Suspense fallback={<Box sx={{ height: 64 }} />}>
          <TopNavigationBar navItems={NAV_ITEMS} />
        </Suspense>
        <Container maxWidth="sm" sx={{ py: 20, textAlign: "center" }}>
          <Typography variant="h2" sx={{ fontSize: "1.5rem", color: "primary.main", mb: 3 }}>
            This property isn't available
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
            The listing may have been taken down or is awaiting approval.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/search")}>
            Browse other properties
          </Button>
        </Container>
      </Box>
    );
  }

  const shareLink = `${window.location.origin}${ROUTE_BASE[type]}/${property.id}`;
  const pageTitle = `${property.configuration || property.propertyType || "Property"} ${
    property.isRental ? "for Rent" : "for Sale"
  } in ${property.sector || "Gurgaon"} | GgnHome`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={`${property.title} — ${property.priceDisplay || "price on request"}${
            property.builtUpAreaDisplay ? `, ${property.builtUpAreaDisplay}` : ""
          } in ${property.sector || "Gurgaon"}. Verified listing on GgnHome.`}
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={property.description?.slice(0, 200) || property.title} />
        {property.images[0] && <meta property="og:image" content={property.images[0]} />}
        <meta property="og:type" content="product" />
        <meta property="og:url" content={shareLink} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={shareLink} />
        {property.images[0] && <link rel="preload" as="image" href={property.images[0]} />}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": property.isRental ? "Accommodation" : "Product",
            name: property.title,
            description: property.description || undefined,
            image: property.images[0] || undefined,
            url: shareLink,
            numberOfRooms: property.bedrooms || undefined,
            floorSize: property.builtUpArea
              ? { "@type": "QuantitativeValue", value: property.builtUpArea, unitCode: "FTK" }
              : undefined,
            address: {
              "@type": "PostalAddress",
              addressLocality: property.sector || undefined,
              addressRegion: "Gurgaon",
              addressCountry: "IN",
            },
            offers: property.price
              ? {
                  "@type": "Offer",
                  price: property.price,
                  priceCurrency: "INR",
                  availability: "https://schema.org/InStock",
                  url: shareLink,
                }
              : undefined,
          })}
        </script>
      </Helmet>

      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default", pb: { xs: 24, lg: 0 } }}>
        <Suspense fallback={<Box sx={{ height: 64 }} />}>
          <TopNavigationBar navItems={NAV_ITEMS} />
        </Suspense>

        <Container maxWidth="lg" sx={{ px: { xs: 4, md: 6 }, py: { xs: 5, md: 7 } }}>
          <Breadcrumbs separator="›" sx={{ mb: 6, fontSize: 13 }}>
            <MuiLink component="button" onClick={() => navigate("/")} sx={{ color: "text.secondary", fontSize: 13 }}>
              Home
            </MuiLink>
            <MuiLink component="button" onClick={() => navigate("/search")} sx={{ color: "text.secondary", fontSize: 13 }}>
              Properties
            </MuiLink>
            <MuiLink
              component="button"
              onClick={() => navigate(`/search/${encodeURIComponent(property.sector || "Gurgaon")}`)}
              sx={{ color: "text.secondary", fontSize: 13 }}
            >
              {property.city}
            </MuiLink>
            {property.sector && (
              <Typography variant="caption" sx={{ color: "secondary.main", fontWeight: 700 }}>
                {property.sector}
              </Typography>
            )}
          </Breadcrumbs>

          {/* Hero: identity + price + specs, with the enquiry card alongside */}
          <Stack direction={{ xs: "column", lg: "row" }} spacing={6} alignItems="flex-start" sx={{ mb: 6 }}>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                p: { xs: 5, md: 7 },
                borderRadius: `${radii.lg}px`,
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: elevationShadows[1],
              }}
            >
              <PropertyHero property={property} />
            </Box>

            <Box sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0 }}>
              <Box sx={{ position: { lg: "sticky" }, top: { lg: 88 } }}>
                <ContactCard
                  property={property}
                  onScheduleVisit={openVisit}
                  onRequestCallback={openCallback}
                  onEvent={emit}
                />
              </Box>
            </Box>
          </Stack>

          <Stack direction={{ xs: "column", lg: "row" }} spacing={6} alignItems="flex-start">
            <Stack spacing={6} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
              <PropertyGalleryPro
                images={property.images}
                panoramas={property.panoramas}
                videos={property.videos}
                onOpenVirtualTour={openVirtualTour}
                onEvent={emit}
              />

              <QuickActionsBar
                property={property}
                saved={saved}
                onSave={handleSave}
                onShare={openShare}
                onEvent={emit}
              />

              <OverviewSection property={property} />
              <PriceSection property={property} onOpenEmi={() => setEmiOpen(true)} />
              <DescriptionSection description={property.description} />
              <HighlightsSection highlights={property.highlights} />
              <AmenitiesSection amenities={property.amenities} />
              <NearbyPlacesSection places={property.nearbyPlaces} />
              <ConnectivitySection connectivity={property.connectivity} />

              <LocationSection
                property={property}
                onDirections={() => emit(EVENTS.DIRECTIONS_CLICKED)}
                mapSlot={<MapIntegration sector={property.sector} type={property.propertyType} />}
              />

              <ListedBySection
                property={property}
                whatsappHref={property.contactNumber ? whatsappUrl(property, property.contactNumber) : undefined}
                onCall={() => emit(EVENTS.CALL_CLICKED)}
                onWhatsapp={() => emit(EVENTS.WHATSAPP_CLICKED)}
                onEnquire={scrollToEnquiry}
              />

              <DocumentsSection documents={property.documents} onDownload={() => emit(EVENTS.BROCHURE_DOWNLOAD)} />

              {/* Site visit conversion block */}
              <SectionCard
                title="Want to see this property in person?"
                sx={{ backgroundColor: "primary.main", borderColor: "primary.main", "& h2": { color: "common.white" } }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={5} alignItems={{ sm: "center" }} justifyContent="space-between">
                  <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.8)" }}>
                    Schedule a site visit at a time convenient for you.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={<CalendarCheck size={18} />}
                    onClick={openVisit}
                    sx={{ flexShrink: 0 }}
                  >
                    Schedule site visit
                  </Button>
                </Stack>
              </SectionCard>

              <EnquiryCard property={property} onEvent={emit} />
            </Stack>
          </Stack>

          <Box sx={{ mt: 10 }}>
            <SimilarProperties sector={property.sector} currentPropertyId={property.id} />
          </Box>

          {recent.length > 0 && (
            <Box sx={{ mt: 10 }}>
              <RecentlyViewed items={recent} />
            </Box>
          )}
        </Container>

        <StickyActionBar
          property={property}
          saved={saved}
          onSave={handleSave}
          onScheduleVisit={openVisit}
          onEvent={emit}
        />

        <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} link={shareLink} />
        <EmiCalculatorDialog open={emiOpen} onClose={() => setEmiOpen(false)} propertyPrice={property.price} />
        <CallbackDialog
          open={callbackOpen}
          onClose={() => setCallbackOpen(false)}
          property={property}
          onEvent={emit}
        />
        <ScheduleVisitDialog
          open={visitOpen}
          onClose={() => setVisitOpen(false)}
          property={property}
          onEvent={emit}
        />
      </Box>
    </>
  );
}
