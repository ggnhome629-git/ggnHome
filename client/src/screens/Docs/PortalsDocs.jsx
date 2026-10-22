import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Collapse, Container, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { motion } from "framer-motion";
import {
  Ban,
  Building2,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Download,
  ExternalLink,
  Globe,
  Layers,
  ListChecks,
  MessageSquarePlus,
  Mic,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  UserCog,
} from "lucide-react";

// Public, read-only overview of the 1.0.0 release. Mirrors docs/product/PORTALS_OVERVIEW.md.
// Deliberately outside ProtectedRoutes and AdminLayout: no login or role check.

const API = (process.env.REACT_APP_Base_API || "").replace(/\/+$/, "");
const SITE = "https://www.ggnhome.com";
const APK_API = "https://api.ggnhome.com/api/app-downloads";
const VERSION = "1.0.0";

const PORTALS = [
  { name: "Main website", url: SITE, who: "Everyone. Property search, listings, post property", status: "Live", icon: Globe },
  { name: "Admin login", url: `${SITE}/admin/login`, who: "Admin numbers only. The role is checked before an OTP is sent", status: "Live", icon: ShieldCheck },
  { name: "Admin portal", url: `${SITE}/admin/Landingpage`, who: "Signed-in admins", status: "Live", icon: ShieldCheck },
  { name: "Partner Hub", url: `${SITE}/partner/login`, who: "Registered partners (OTP login)", status: "Live", icon: Building2 },
  { name: "SMS Console", url: `${SITE}/admin/sms-console`, who: "Owner console password. SMS gateway phones, limits, logs and OTP delivery mode (also /sms-service/app/manage; button on the admin home page)", status: "Live (separate sign-in)", icon: Smartphone },
  { name: "App downloads", url: `${SITE}/apps`, who: "Everyone. The four Android apps", status: "Live", icon: Download },
  { name: "API backend", url: "https://api.ggnhome.com", who: "The website and all four apps", status: "Live", icon: Server },
  { name: "Partner portal (standalone site)", url: "Host not in repo (partner-portal/)", who: "Partners. Optional second site, the Partner Hub above is the main one", status: "Confirm", icon: Building2 },
  { name: "Agent portal (legacy)", url: "/agent/login", who: "No longer a supported flow", status: "Disabled", icon: UserCog },
  { name: "Voice / LiveKit", url: "infra/livekit (self-hosted)", who: "AI voice assistant", status: "Off on main, on in v2", icon: Mic },
];

// Four apps. Each downloads from one stable link on the API; the file is rebuilt by the GitHub workflow.
const APPS = [
  {
    name: "GgnHome",
    details: `v${VERSION} · com.tanush.ggnhome · opens www.ggnhome.com and every ggnhome.com link tapped on the phone`,
    source: "GgnHome.apk",
    href: `${APK_API}/GgnHome.apk`,
    status: "Live",
  },
  {
    name: "GgnHome Partner",
    details: `v${VERSION} · com.tanush.ggnhomepartner · opens the Partner Hub`,
    source: "GgnHome-Partner.apk",
    href: `${APK_API}/GgnHome-Partner.apk`,
    status: "Live",
  },
  {
    name: "GgnHome Admin",
    details: `v${VERSION} · com.tanush.ggnhomeadmin · opens the Admin login`,
    source: "GgnHome-Admin.apk",
    href: `${APK_API}/GgnHome-Admin.apk`,
    status: "Live",
  },
  {
    name: "SMS Service",
    details: `v${VERSION} · com.ggnhome.smsgateway · SMS gateway and OTP viewer`,
    source: "sms-service.apk",
    href: `${APK_API}/sms-service.apk`,
    status: "Live",
  },
];

const OWNER_STEPS = ["Basic Details", "Location", "Property Profile", "Price & Description", "Photos", "Review & Post"];
const PARTNER_STEPS = ["Photos (the first photo is the front photo)", "Property: rent or sale, type, rooms", "Size and price (typical size and price in one tap)", "Place: GPS or address search, nearby places found (edit or add in a closed menu), owner mobile"];

const LIVE = [
  "Property search, listing and detail pages",
  "User accounts, preferences and saved properties",
  "Post property: owner (6 steps) and partner (4 short steps, nearby places found automatically and editable)",
  "Partner Hub: dashboard, properties, property pages, leads, enquiries, profile (OTP login)",
  "Admin: inventory, users, enquiries, payments, rewards, property manager, settings, feature toggles, app downloads, partner access, callback requests, SMS Console",
  "SMS Console: SMS gateway phones, limits, logs and OTP delivery mode",
  "Four Android apps (GgnHome, Partner, Admin, SMS Service) at /apps. GgnHome opens every ggnhome.com link",
  "One cache clear for every new deploy (browsers, Redis, Cloudflare)",
  "Production setup in code: several MongoDB databases (failover), several Cloudinary accounts (rotation, resting a full one), several servers (shared rate limits, one-server-only scheduled jobs), health checks, clean shutdown, request size limits",
];

const DISABLED = [
  ["Flatmates (user pages)", "Routes commented out; feature toggle defaults to off"],
  ["Agent portal", "Routes commented out; /agent/register redirects to admin; toggle off"],
  ["Public partner self-registration", "Backend returns 410; admin adds partners instead"],
  ["AI assistant on the site", "Consultant, AI Search pages, floating assistant and Chatbot follow the AI assistant switch at the top of the admin panel (off by default)"],
  ["Hidden SMS devices page", "/admin/sms-devices redirects to the admin home page"],
];

const OPEN_ITEMS = [
  "Hosting: set the health check path to /health/ready, set the required variables in server/.env.example, and add REDIS_URL if you run more than one API server (docs/guides/PRODUCTION_AND_SCALING.md).",
  "Release signing: add the four ANDROID_* repository secrets (mobile/tools/make-keystore.sh), then put the printed fingerprint in client/public/.well-known/assetlinks.json. Until then ggnhome.com links open in the app only after Android is told to allow it, and APK updates need the same key every time.",
  "SMS_KEY secret: the SMS Service APK needs the same SMS_KEY as the servers. Without it the APK uses a test key.",
  "Confirm the domain: code uses both ggnhome.com and ggnhome.in.",
  "Partner portal host: confirm whether the standalone partner-portal site is hosted anywhere, or retire it.",
  "Feature toggles: check live values for Flatmates and Agent portal in admin.",
  "Public status page: /admin/ping is public (the old /test OTP page now redirects home). Decide if it should stay.",
  "AI backend endpoints (/api/ai-consultant/*) still answer on main. The site no longer calls them, but they are not blocked server-side.",
];

const NAV = [
  { id: "portals", label: "Portals" },
  { id: "apps", label: "Apps" },
  { id: "post-property", label: "Post property" },
  { id: "features", label: "Features" },
  { id: "open-items", label: "Open items" },
];

const TONES = {
  live: { fg: "#15803d", bg: "rgba(22,163,74,0.13)" },
  confirm: { fg: "#b45309", bg: "rgba(217,119,6,0.15)" },
  off: { fg: "#b91c1c", bg: "rgba(220,38,38,0.11)" },
};
const toneOf = (status) => (status.startsWith("Live") ? "live" : status === "Confirm" ? "confirm" : "off");
const isUrl = (value) => /^https?:\/\//.test(value);

const cardSx = {
  p: 2.25,
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
  transition: "transform .2s ease, box-shadow .2s ease",
  "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 30px rgba(0,30,60,0.10)" },
};

function StatusPill({ status }) {
  const tone = TONES[toneOf(status)];
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.1,
        py: 0.35,
        borderRadius: 99,
        bgcolor: tone.bg,
        color: tone.fg,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: tone.fg }} />
      {status}
    </Box>
  );
}

function IconBubble({ icon: Icon, status }) {
  const tone = TONES[toneOf(status)];
  return (
    <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: tone.bg, color: tone.fg, flexShrink: 0 }}>
      <Icon size={20} />
    </Box>
  );
}

function LinkButton({ href, children, icon: Icon = ExternalLink, variant = "contained", download = false, size = "small", sx }) {
  return (
    <Button
      component="a"
      href={href}
      target={download ? undefined : "_blank"}
      rel="noopener noreferrer"
      download={download || undefined}
      variant={variant}
      size={size}
      endIcon={<Icon size={15} />}
      sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, boxShadow: "none", ...sx }}
    >
      {children}
    </Button>
  );
}

/** Suggestions for one section: collapsible, with the list others wrote and a form to add one. */
function SuggestionBox({ section }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", msg }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/docs/suggestions?section=${encodeURIComponent(section)}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (res.ok) setItems(data.items || []);
    } catch (_) {
      // Keep the form usable even if the list cannot load.
    }
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 3) {
      setStatus({ type: "error", msg: "Please write at least 3 characters." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/api/docs/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ section, text: text.trim(), name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not send your suggestion.");
      setText("");
      setStatus({ type: "success", msg: "Thanks, your suggestion is recorded." });
      load();
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Could not send your suggestion." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ mt: 3, borderRadius: 3, border: "1px dashed", borderColor: "divider", overflow: "hidden" }}>
      <Button
        onClick={() => setOpen((v) => !v)}
        fullWidth
        aria-expanded={open}
        sx={{ justifyContent: "space-between", textTransform: "none", px: 2, py: 1.25, color: "text.primary", fontWeight: 700 }}
        startIcon={<MessageSquarePlus size={18} />}
        endIcon={<ChevronDown size={18} style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />}
      >
        <Box sx={{ flex: 1, textAlign: "left" }}>
          Suggestions{" "}
          <Chip size="small" label={items.length} sx={{ ml: 0.5, height: 20, fontWeight: 700 }} />
        </Box>
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 2, pb: 2 }}>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No suggestions yet. Be the first.</Typography>
          ) : (
            <Stack spacing={1}>
              {items.map((s) => (
                <Box key={s._id || `${s.createdAt}-${s.text}`} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                  <Typography variant="body2">{s.text}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.name || "Anonymous"} · {s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : ""}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}

          <Box component="form" onSubmit={submit} sx={{ mt: 2 }}>
            <Stack spacing={1.5}>
              <TextField
                label="Your suggestion"
                value={text}
                onChange={(e) => setText(e.target.value)}
                multiline
                minRows={2}
                inputProps={{ maxLength: 600 }}
                helperText={`${text.length}/600`}
                required
                fullWidth
              />
              <TextField
                label="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputProps={{ maxLength: 60 }}
                fullWidth
              />
              {status && <Alert severity={status.type}>{status.msg}</Alert>}
              <Box>
                <Button type="submit" variant="contained" disabled={busy} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
                  {busy ? "Sending…" : "Send suggestion"}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

function Section({ id, number, title, subtitle, icon: Icon, children }) {
  return (
    <Box
      component={motion.section}
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4 }}
      sx={{ mt: { xs: 5, md: 7 }, scrollMarginTop: 84 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Box sx={{ width: 42, height: 42, borderRadius: 3, display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(135deg,#003366,#0f766e)", flexShrink: 0 }}>
          <Icon size={21} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            <Box component="span" sx={{ color: "text.secondary", fontWeight: 600, mr: 0.75 }}>{number}.</Box>
            {title}
          </Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </Stack>
      {children}
      <SuggestionBox section={id} />
    </Box>
  );
}

function Steps({ steps, color }) {
  return (
    <Stack sx={{ mt: 1.5 }}>
      {steps.map((step, i) => (
        <Stack key={step} direction="row" spacing={1.5} alignItems="stretch">
          <Stack alignItems="center">
            <Box sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: color, color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {i + 1}
            </Box>
            {i < steps.length - 1 && <Box sx={{ width: 2, flex: 1, minHeight: 14, bgcolor: "divider", my: 0.5 }} />}
          </Stack>
          <Typography variant="body2" sx={{ pt: 0.4, pb: i < steps.length - 1 ? 1.5 : 0 }}>{step}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function Hero({ stats }) {
  return (
    <Box sx={{ position: "relative", overflow: "hidden", color: "#fff", background: "linear-gradient(135deg,#003366 0%,#0b5c7a 55%,#0f766e 100%)" }}>
      <Box sx={{ position: "absolute", top: -120, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,255,255,0.18),transparent 70%)" }} />
      <Box sx={{ position: "absolute", bottom: -160, left: -100, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.22),transparent 70%)" }} />
      <Container maxWidth="lg" sx={{ position: "relative", py: { xs: 5, md: 8 }, px: 2 }}>
        <Chip label={`Release ${VERSION}`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "#fff", fontWeight: 700, mb: 2 }} />
        <Typography component="h1" sx={{ fontSize: { xs: 30, md: 48 }, fontWeight: 800, lineHeight: 1.1, maxWidth: 760 }}>
          GgnHome portals, apps &amp; status
        </Typography>
        <Typography sx={{ mt: 1.5, maxWidth: 640, opacity: 0.9, fontSize: { xs: 15, md: 17 } }}>
          Every link, app and feature of the 1.0.0 release in one place. Open anything with one tap and leave a suggestion under any section.
        </Typography>

        <Stack direction="row" flexWrap="wrap" gap={1.25} sx={{ mt: 3 }}>
          <LinkButton href={SITE} sx={{ bgcolor: "#fff", color: "#003366", "&:hover": { bgcolor: "#e6f4f1" } }}>Open website</LinkButton>
          <LinkButton href={`${SITE}/admin/Landingpage`} variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.1)" } }}>
            Admin portal
          </LinkButton>
          <LinkButton href={`${SITE}/apps`} icon={Download} variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.1)" } }}>
            Get the apps
          </LinkButton>
        </Stack>

        <Box sx={{ mt: 4, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" } }}>
          {stats.map((s) => (
            <Box key={s.label} sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}>
              <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{s.value}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" sx={{ display: "block", mt: 2, opacity: 0.75 }}>
          Release 1.0.0 · Branch main · As of 22 Oct 2026 · "Live" means enabled in the code on main; check the hosting dashboard for what is deployed.
        </Typography>
      </Container>
    </Box>
  );
}

function SectionNav({ active }) {
  const go = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <Box sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider", backdropFilter: "blur(8px)" }}>
      <Container maxWidth="lg" sx={{ px: 2 }}>
        <Stack direction="row" spacing={1} sx={{ py: 1.25, overflowX: "auto", "&::-webkit-scrollbar": { display: "none" } }}>
          {NAV.map((n) => (
            <Chip
              key={n.id}
              label={n.label}
              onClick={() => go(n.id)}
              color={active === n.id ? "primary" : "default"}
              variant={active === n.id ? "filled" : "outlined"}
              sx={{ fontWeight: 700, flexShrink: 0 }}
            />
          ))}
          <Box sx={{ flex: 1 }} />
          <Chip component="a" href="/" clickable label="Back to site" variant="outlined" sx={{ fontWeight: 700, flexShrink: 0 }} />
        </Stack>
      </Container>
    </Box>
  );
}

const REVIEWED_KEY = "ggn:docReviewedItems";

export default function PortalsDocs() {
  const [active, setActive] = useState(NAV[0].id);
  const [reviewed, setReviewed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(REVIEWED_KEY) || "[]");
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const toggleReviewed = (index) => {
    setReviewed((prev) => {
      const next = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index];
      try {
        localStorage.setItem(REVIEWED_KEY, JSON.stringify(next));
      } catch (_) {
        // Progress is a per-viewer convenience; ignore blocked storage.
      }
      return next;
    });
  };

  const stats = useMemo(
    () => [
      { value: PORTALS.filter((p) => toneOf(p.status) === "live").length, label: "Live portals" },
      { value: APPS.length, label: "Android apps" },
      { value: DISABLED.length, label: "Disabled features" },
      { value: OPEN_ITEMS.length, label: "Open items" },
    ],
    []
  );

  const progress = Math.round((reviewed.length / OPEN_ITEMS.length) * 100);

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", pb: 8 }}>
      <Hero stats={stats} />
      <SectionNav active={active} />

      <Container maxWidth="lg" sx={{ px: 2 }}>
        <Section id="portals" number={1} title="Portals & links" subtitle="Tap Open to jump straight to any portal." icon={Globe}>
          <Box sx={{ display: "grid", gap: 1.75, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" } }}>
            {PORTALS.map((p) => (
              <Box key={p.name} sx={cardSx}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <IconBubble icon={p.icon} status={p.status} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Typography fontWeight={700}>{p.name}</Typography>
                      <StatusPill status={p.status} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all", mt: 0.25 }}>
                      {isUrl(p.url) ? p.url.replace(/^https?:\/\//, "") : p.url}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{p.who}</Typography>
                    {isUrl(p.url) && (
                      <Box sx={{ mt: 1.25 }}>
                        <LinkButton href={p.url}>Open</LinkButton>
                      </Box>
                    )}
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        </Section>

        <Section id="apps" number={2} title="Mobile apps & APKs" subtitle="Version 1.0.0. Always the latest build, from one link per app." icon={Smartphone}>
          <Box sx={{ display: "grid", gap: 1.75, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" } }}>
            {APPS.map((a) => (
              <Box key={a.name} sx={{ ...cardSx, display: "flex", flexDirection: "column" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <IconBubble icon={Smartphone} status={a.status} />
                  <StatusPill status={a.status} />
                </Stack>
                <Typography fontWeight={700}>{a.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{a.details}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, wordBreak: "break-all", display: "block" }}>
                  File: {a.source}
                </Typography>
                <Box sx={{ mt: "auto", pt: 1.5 }}>
                  <LinkButton href={a.href} icon={Download} download>Download APK</LinkButton>
                </Box>
              </Box>
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            The links above always give the latest build. They are rebuilt by{" "}
            <Box component="code" sx={{ fontSize: 13 }}>.github/workflows/build-all-apks.yml</Box>{" "}
            whenever the app code changes. Admin can change the version shown or point an app at another file at Admin → App Downloads.
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
            <LinkButton href={`${SITE}/apps`} variant="outlined" icon={Globe}>Public downloads page</LinkButton>
            <LinkButton href="https://github.com/ggnhome629-git/ggnHome/releases/tag/latest-apks" variant="outlined">All releases on GitHub</LinkButton>
          </Stack>
        </Section>

        <Section id="post-property" number={3} title="Post property" subtitle="What users and partners see when they list a property." icon={Building2}>
          <Box sx={{ display: "grid", gap: 1.75, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
            <Box sx={cardSx}>
              <Typography fontWeight={800}>User / owner</Typography>
              <Typography variant="caption" color="text.secondary">/add-property · 6 steps</Typography>
              <Steps steps={OWNER_STEPS} color="#0f766e" />
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
                {["Free listing", "Reviewed before going live", "Editable anytime", "Owner mobile private", "Sale & rent"].map((c) => (
                  <Chip key={c} size="small" label={c} sx={{ fontWeight: 600 }} />
                ))}
              </Stack>
              <Box sx={{ mt: 2 }}>
                <LinkButton href={`${SITE}/add-property`}>Open form</LinkButton>
              </Box>
            </Box>

            <Box sx={cardSx}>
              <Typography fontWeight={800}>Partner (Partner Hub)</Typography>
              <Typography variant="caption" color="text.secondary">/partner/properties/add · 4 short screens</Typography>
              <Steps steps={PARTNER_STEPS} color="#2563eb" />
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
                {["2-3 minutes", "Hindi + English", "Auto title & description", "Auto location & nearby places", "Publishes immediately", "Draft saved on device"].map((c) => (
                  <Chip key={c} size="small" label={c} sx={{ fontWeight: 600 }} />
                ))}
              </Stack>
              <Box sx={{ mt: 2 }}>
                <LinkButton href={`${SITE}/partner/properties/add`}>Open form</LinkButton>
              </Box>
            </Box>

            <Box sx={cardSx}>
              <Typography fontWeight={800}>Partner web (standalone)</Typography>
              <Typography variant="caption" color="text.secondary">partner-portal · single page</Typography>
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                One form: purpose, type, title, sector, address, price, area, bedrooms, bathrooms, owner name and mobile.
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
                <Chip size="small" label="Front photo required" sx={{ fontWeight: 600 }} />
              </Stack>
            </Box>
          </Box>
        </Section>

        <Section id="features" number={4} title="Feature status" subtitle="What is on, and what is switched off." icon={Layers}>
          <Box sx={{ display: "grid", gap: 1.75, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <Box sx={cardSx}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <CheckCircle2 size={20} color={TONES.live.fg} />
                <Typography fontWeight={800}>Live</Typography>
              </Stack>
              <Stack spacing={1.1}>
                {LIVE.map((item) => (
                  <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                    <CheckCircle2 size={16} color={TONES.live.fg} style={{ marginTop: 3, flexShrink: 0 }} />
                    <Typography variant="body2">{item}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Box sx={cardSx}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Ban size={20} color={TONES.off.fg} />
                <Typography fontWeight={800}>Disabled / not live</Typography>
              </Stack>
              <Stack spacing={1.5}>
                {DISABLED.map(([feature, reason]) => (
                  <Box key={feature} sx={{ p: 1.5, borderRadius: 2, bgcolor: TONES.off.bg }}>
                    <Typography variant="body2" fontWeight={700}>{feature}</Typography>
                    <Typography variant="caption" color="text.secondary">{reason}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        </Section>

        <Section id="open-items" number={5} title="Open items for review" subtitle="Tick items off as you go. Your progress is saved on this device." icon={ListChecks}>
          <Box sx={{ ...cardSx, mb: 1.75, "&:hover": undefined }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ClipboardCheck size={18} />
                <Typography fontWeight={700}>{reviewed.length} of {OPEN_ITEMS.length} reviewed</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">{progress}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 99 }} />
          </Box>
          <Stack spacing={1.25}>
            {OPEN_ITEMS.map((item, i) => {
              const done = reviewed.includes(i);
              return (
                <Box
                  key={item}
                  component="button"
                  type="button"
                  onClick={() => toggleReviewed(i)}
                  aria-pressed={done}
                  sx={{
                    ...cardSx,
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                    textAlign: "left",
                    width: "100%",
                    font: "inherit",
                    color: "text.primary",
                    cursor: "pointer",
                    opacity: done ? 0.6 : 1,
                  }}
                >
                  {done ? <CheckCircle2 size={20} color={TONES.live.fg} style={{ flexShrink: 0, marginTop: 1 }} /> : <Circle size={20} style={{ flexShrink: 0, marginTop: 1 }} />}
                  <Typography variant="body2" sx={{ textDecoration: done ? "line-through" : "none" }}>{item}</Typography>
                </Box>
              );
            })}
          </Stack>
        </Section>

        <Stack alignItems="center" spacing={1.5} sx={{ mt: 8, textAlign: "center" }}>
          <Rocket size={22} />
          <Typography variant="body2" color="text.secondary">
            Thanks for reviewing. Every suggestion is saved and visible to the team.
          </Typography>
          <LinkButton href={SITE} variant="outlined">Back to ggnhome.com</LinkButton>
        </Stack>
      </Container>
    </Box>
  );
}
