import React, { useState } from "react";
import { Box, Tab, Tabs, Typography, Stack } from "@mui/material";
import { Settings, Gift, Smartphone, Power, LinkIcon, TrendingUp, Link2, Server, Home, RefreshCw } from "lucide-react";

// Lazy load the sub-pages
const PromoCards = React.lazy(() => import("./admin.promos"));
const SmsDevices = React.lazy(() => import("./admin.smsDevices"));
const FeatureToggles = React.lazy(() => import("./admin.featureToggles"));
const AffiliateTracker = React.lazy(() => import("./admin.affiliateTracker"));
const AffiliateConfig = React.lazy(() => import("./admin.affiliateConfig"));
const LinkManager = React.lazy(() => import("./admin.linkManager"));
const ScraperControl = React.lazy(() => import("./admin.scraperControl"));
const PropertyManager = React.lazy(() => import("./admin.propertyManager.jsx"));
const PropertySync = React.lazy(() => import("./admin.propertySync"));

const SETTINGS_TABS = [
  { id: "scraper", label: "Scraper Control", icon: Server, component: ScraperControl },
  { id: "properties", label: "Property Manager", icon: Home, component: PropertyManager },
  { id: "propertySync", label: "Property Sync", icon: RefreshCw, component: PropertySync },
  { id: "toggles", label: "Feature Toggles", icon: Power, component: FeatureToggles },
  { id: "promos", label: "Promo Cards", icon: Gift, component: PromoCards },
  { id: "sms", label: "SMS Devices", icon: Smartphone, component: SmsDevices },
  { id: "affiliates", label: "Affiliate Tracker", icon: TrendingUp, component: AffiliateTracker },
  { id: "affiliateConfig", label: "Affiliate Config", icon: LinkIcon, component: AffiliateConfig },
  { id: "linkManager", label: "Link Manager", icon: Link2, component: LinkManager },
];

/**
 * Unified Admin Settings Page
 * Central hub for configuring platform features, promotions, and communication channels.
 */
export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("scraper");

  const activeConfig = SETTINGS_TABS.find((tab) => tab.id === activeTab);
  const ActiveComponent = activeConfig?.component;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      {/* Header */}
      <Box sx={{ backgroundColor: "background.paper", borderBottom: "1px solid", borderColor: "divider", p: { xs: 3, md: 4 } }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Settings size={28} color="#003366" />
          <Box>
            <Typography variant="h2" sx={{ fontSize: "1.75rem", fontWeight: 700, color: "primary.main" }}>
              Settings
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Manage platform features, promotions, and communication channels
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
