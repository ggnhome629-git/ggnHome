import React from "react";
import { Box, Card, CardContent, Chip, Container, Stack, Typography } from "@mui/material";

// Public, read-only overview for co-founder review. Mirrors docs/PORTALS_OVERVIEW.md.
// Deliberately outside ProtectedRoutes and AdminLayout: no login or role check.

const PORTALS = [
  { name: "Main website", url: "https://www.ggnhome.com", who: "Public users", status: "Live" },
  { name: "Admin portal", url: "https://www.ggnhome.com/admin/Landingpage", who: "Admins (admin email login)", status: "Live" },
  { name: "Partner Hub", url: "https://www.ggnhome.com/partner/login", who: "Approved partners (OTP login)", status: "Live" },
  { name: "Partner Hub (standalone site)", url: "Host not in repo", who: "Partners", status: "Confirm" },
  { name: "SMS gateway console", url: "https://www.ggnhome.com/sms-service/app/manage", who: "Owner with SMS key", status: "Live (hidden page)" },
  { name: "App downloads", url: "https://www.ggnhome.com/apps", who: "Everyone", status: "Live" },
  { name: "Agent portal (legacy)", url: "/agent/login", who: "—", status: "Disabled" },
  { name: "API backend", url: "Host not in repo (ggnhome.onrender.com likely)", who: "All apps", status: "Confirm" },
  { name: "Voice / LiveKit", url: "infra/livekit (self-hosted)", who: "AI voice assistant", status: "Off on main, on in v2" },
];

const APPS = [
  { name: "GgnHome (user)", details: "Capacitor wrapper of www.ggnhome.com · com.tanush.ggnhome · v1.2.0", download: "GitHub Release latest-apks → GgnHome.apk", status: "Live" },
  { name: "GgnHome Partner", details: "Android wrapper for Partner Hub", download: "/api/app-downloads/partner.apk (streams GgnHome-Partner.apk)", status: "Live" },
  { name: "SMS Service", details: "Android SMS gateway + OTP viewer", download: "GitHub Release latest-apks → sms-service.apk", status: "Live" },
];

const USER_STEPS = ["Basic Details", "Location", "Property Profile", "Price & Description", "Photos", "Review & Post"];
const PARTNER_STEPS = ["Photos (front photo required)", "Property Details (owner mobile required)", "Review & Publish"];

const LIVE = [
  "Property search, listing and detail pages",
  "User accounts, preferences and saved properties",
  "Post property (owner and partner)",
  "Partner Hub: dashboard, properties, leads, enquiries, profile (OTP login)",
  "Admin: inventory, users, enquiries, payments, rewards, property manager, settings, feature toggles, app downloads, partner access, callback requests",
  "SMS gateway console and OTP-display mode",
  "App downloads page",
];

const DISABLED = [
  ["Flatmates (user pages)", "Routes commented out; feature toggle defaults to off"],
  ["Agent portal", "Routes commented out; /agent/register redirects to admin; toggle off"],
  ["Public partner self-registration", "Backend returns 410; admin adds partners instead"],
  ["AI consultant (chat + voice)", "Off on main (AI_CONSULTANT_ENABLED = false); on in v2"],
  ["Hidden SMS devices page", "/admin/sms-devices redirects to landing page"],
];

const OPEN_ITEMS = [
  "Confirm the production API host and set it in the hosting dashboard.",
  "Confirm the domain: code uses both ggnhome.com and ggnhome.in.",
  "Store builds: GitHub APKs for GgnHome and Partner are debug builds. Publish signed release builds before Play Store or wide distribution.",
  "Test routes: /test (SMS OTP) and /admin/ping are public. Consider removing them in production.",
  "Partner Hub host: confirm www.ggnhome.com/partner/* or a separate site.",
  "Feature toggles: check live values for Flatmates and Agent portal in admin.",
  "Admin APK URLs: confirm all three download URLs are set in Admin → App Downloads.",
];

const statusColor = (status) => {
  if (status.startsWith("Live")) return "success";
  if (status === "Confirm") return "warning";
  return "default";
};

function Section({ title, children }) {
  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>{title}</Typography>
      {children}
    </Box>
  );
}

function Panel({ children }) {
  return <Card variant="outlined" sx={{ borderRadius: 2 }}><CardContent>{children}</CardContent></Card>;
}

export default function PortalsDocs() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 }, px: 2 }}>
      <Typography variant="h4" fontWeight={800}>GgnHome — Portals, Links & Status</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        For co-founder review · Branch main · As of 21 Oct 2026. "Live" means enabled in the code on main; check the hosting dashboard before treating anything as in production.
      </Typography>

      <Section title="1. Portals & links">
        <Stack spacing={1.5}>
          {PORTALS.map((p) => (
            <Panel key={p.name}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700}>{p.name}</Typography>
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{p.url}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.who}</Typography>
                </Box>
                <Chip size="small" label={p.status} color={statusColor(p.status)} />
              </Stack>
            </Panel>
          ))}
        </Stack>
      </Section>

      <Section title="2. Mobile apps & APKs">
        <Stack spacing={1.5}>
          {APPS.map((a) => (
            <Panel key={a.name}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700}>{a.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{a.details}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, wordBreak: "break-all" }}>Download: {a.download}</Typography>
                </Box>
                <Chip size="small" label={a.status} color={statusColor(a.status)} />
              </Stack>
            </Panel>
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Admin manages download URLs at Admin → App Downloads (keys: ggnhome, partner, sms-service). APKs are built by .github/workflows/build-all-apks.yml.
        </Typography>
      </Section>

      <Section title="3. Post property">
        <Panel>
          <Typography fontWeight={700}>User / owner — /add-property (6 steps)</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>{USER_STEPS.join(" → ")}</Typography>
          <Typography variant="body2">Free listing · reviewed before going live · editable anytime · owner mobile kept private · sale and rent.</Typography>
        </Panel>
        <Box sx={{ mt: 1.5 }}>
          <Panel>
            <Typography fontWeight={700}>Partner — Partner Hub /partner/properties/add (3 steps)</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>{PARTNER_STEPS.join(" → ")}</Typography>
            <Typography variant="body2">Publishes immediately · partner contact attached automatically · drafts saved on the device.</Typography>
          </Panel>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <Panel>
            <Typography fontWeight={700}>Partner web (standalone partner-portal)</Typography>
            <Typography variant="body2">Single-page form: purpose, type, title, sector, address, price, area, bedrooms, bathrooms, owner name and mobile. At least one front photo required.</Typography>
          </Panel>
        </Box>
      </Section>

      <Section title="4. Feature status">
        <Typography variant="subtitle1" fontWeight={700}>Live</Typography>
        <Box component="ul" sx={{ pl: 3, mt: 0.5 }}>
          {LIVE.map((item) => <li key={item}><Typography variant="body2">{item}</Typography></li>)}
        </Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2 }}>Disabled / not live</Typography>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {DISABLED.map(([feature, reason]) => (
            <Panel key={feature}>
              <Typography fontWeight={700}>{feature}</Typography>
              <Typography variant="body2" color="text.secondary">{reason}</Typography>
            </Panel>
          ))}
        </Stack>
      </Section>

      <Section title="5. Open items for review">
        <Box component="ol" sx={{ pl: 3 }}>
          {OPEN_ITEMS.map((item) => <li key={item}><Typography variant="body2" sx={{ mb: 0.5 }}>{item}</Typography></li>)}
        </Box>
      </Section>
    </Container>
  );
}
