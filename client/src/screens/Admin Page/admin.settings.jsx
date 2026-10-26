import React from "react";
import { Box, Tab, Tabs, Typography, Stack } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import ScraperLock from "./shell/ScraperLock";
import { Settings, Globe, Gift, Power, Server, RefreshCw } from "lucide-react";

// Lazy load the sub-pages
const PromoCards = React.lazy(() => import("./admin.promos"));
const FeatureToggles = React.lazy(() => import("./admin.featureToggles"));
const ScraperControl = React.lazy(() => import("./admin.scraperControl"));
const PropertySync = React.lazy(() => import("./admin.propertySync"));
const AppLinks = React.lazy(() => import("./admin.appLinks"));

// Scraper screens go dark while the landing page's "Scraped properties" switch is off.
const lockedScraper = (Component) => () => (
  <ScraperLock>
    <Component />
  </ScraperLock>
);

// Grouped so related settings sit together. Removed from here: Property
// Manager (it has its own page in the side nav) and the affiliate tracker,
// affiliate config and link manager placeholders (never set up; the
// affiliate flow is switched off).
const SETTINGS_TABS = [
  { id: "toggles", label: "Feature Toggles", icon: Power, component: FeatureToggles },
  { id: "appLinks", label: "App & Website Links", icon: Globe, component: AppLinks },
  { id: "promos", label: "Promo Cards", icon: Gift, component: PromoCards },
  { id: "scraper", label: "Scraper Control", icon: Server, component: lockedScraper(ScraperControl) },
  { id: "propertySync", label: "Property Sync", icon: RefreshCw, component: lockedScraper(PropertySync) },
];
const TAB_IDS = SETTINGS_TABS.map((tab) => tab.id);

/**
 * Unified Admin Settings Page
 * Central hub for configuring platform features, promotions, and communication channels.
 */
export default function AdminSettings() {
  // The open tab lives in the URL (?tab=) so it survives a reload and can be linked to.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab = TAB_IDS.includes(requested) ? requested : TAB_IDS[0];
  const setActiveTab = (id) => setSearchParams(id === TAB_IDS[0] ? {} : { tab: id }, { replace: true });

  const activeConfig = SETTINGS_TABS.find((tab) => tab.id === activeTab);
  const ActiveComponent = activeConfig?.component;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      {/* Header */}
      <Box sx={{ backgroundColor: "background.paper", borderBottom: "1px solid", borderColor: "divider", p: { xs: 3, md: 4 } }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: "linear-gradient(135deg,#64748B,#003366)", color: "#fff" }}><Settings size={24} /></Box>
          <Box>
            <Typography variant="h2" sx={{ fontSize: "1.75rem", fontWeight: 700, color: "primary.main" }}>
              Settings
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Platform switches, website links, promotions and the scraper
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ backgroundColor: "background.paper", borderBottom: "1px solid", borderColor: "divider", overflowX: "auto" }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: { xs: 1, md: 4 },
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: { xs: "0.8rem", md: "0.95rem" },
              fontWeight: 600,
              color: "text.secondary",
              borderBottom: "3px solid transparent",
              minWidth: { xs: "auto", md: "auto" },
              px: { xs: 1, md: 2 },
              "&.Mui-selected": {
                color: "primary.main",
                borderBottomColor: "primary.main",
              },
            },
          }}
        >
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tab
                key={tab.id}
                value={tab.id}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </Stack>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ p: 0 }}>
        <React.Suspense
          fallback={
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography>Loading...</Typography>
            </Box>
          }
        >
          {ActiveComponent && <ActiveComponent />}
        </React.Suspense>
      </Box>
    </Box>
  );
}
