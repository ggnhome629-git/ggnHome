import React, { Suspense, useEffect, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Container,
  InputBase,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  ClipboardList,
  Handshake,
  IndianRupee,
  KeyRound,
  MapPin,
  MessageCircle,
  PlusSquare,
  Search,
  ShieldCheck,
  Sofa,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import MobileBottomNav from "../Dashboard/MobileBottomNav";
import FlatmateCard from "./FlatmateCard";
import useFlatmateBookmarks from "./useFlatmateBookmarks";
import { StaggerContainer, StaggerItem } from "../../components/motion";
import { radii } from "../../theme/theme";

const TopNavigationBar = React.lazy(() => import("../Dashboard/TopNavigationBar"));
const Footer = React.lazy(() => import("../Dashboard/Footer"));
const OffersCarousel = React.lazy(() => import("../Dashboard/OffersCarousel"));

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const API = (process.env.REACT_APP_Base_API || "").replace(/\/$/, "");

const GENDERS = [
  { value: "", label: "Anyone" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];
const POPULAR = ["Sector 46", "Sushant Lok", "DLF Phase 3", "Golf Course Road", "Sohna Road", "Cyber City"];
const LOCALITIES = [...POPULAR, "Sector 49", "Sector 56", "MG Road", "Sector 14", "Sector 57", "South City"];

const today = () => new Date().toISOString().slice(0, 10);
const QUICK_LINKS = [
  { label: "Female only", icon: UserRound, to: "/flatmatessearch?gender=female" },
  { label: "Male only", icon: UserRound, to: "/flatmatessearch?gender=male" },
  { label: "Under ₹10K", icon: IndianRupee, to: "/flatmatessearch?maxBudget=10000" },
  { label: "Under ₹15K", icon: IndianRupee, to: "/flatmatessearch?maxBudget=15000" },
  { label: "Furnished", icon: Sofa, to: "/flatmatessearch?furnished=true" },
  { label: "Move in now", icon: KeyRound, to: () => `/flatmatessearch?moveInBy=${today()}` },
  { label: "List your room", icon: PlusSquare, to: "/flatmateslistingform", auth: true },
  { label: "My listings", icon: ClipboardList, to: "/flatmatesmylistings", auth: true },
];

const STEPS = [
  { icon: BedDouble, title: "List your room", text: "Add rent, move-in date, photos and who you'd like to live with. It's free." },
  { icon: MessageCircle, title: "Get enquiries", text: "Interested flatmates send you an enquiry once your listing is approved." },
  { icon: Handshake, title: "Meet & move in", text: "Visit, get to know each other, and split the rent from day one." },
];

function fetchRooms(params) {
  return fetch(`${API}/api/flatmates/listings/search?${new URLSearchParams(params).toString()}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => (Array.isArray(json?.data?.items) ? json.data.items : []))
    .catch(() => []);
}

function SectionHead({ overline, title, action }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={4} sx={{ mb: { xs: 5, md: 7 } }}>
      <Box>
        <Typography variant="overline" sx={{ color: "secondary.main", display: "block", mb: 1 }}>
          {overline}
        </Typography>
        <Typography variant="h2" sx={{ color: "primary.main" }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}

function RoomsRow({ title, overline, rooms, loading, onOpen, saved, onToggle, viewAll }) {
  if (!loading && rooms.length === 0) return null;
  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 10, md: 14 } }}>
      <SectionHead
        overline={overline}
        title={title}
        action={
          <Button onClick={viewAll} endIcon={<ArrowRight size={16} />} sx={{ color: "secondary.main", fontWeight: 700, flexShrink: 0 }}>
            View all
          </Button>
        }
      />
      <Box
        sx={{
          display: "grid",
          gap: "20px",
          // Swipeable row on phones, grid from tablets up.
          gridAutoFlow: { xs: "column", sm: "row" },
          gridAutoColumns: { xs: "82%", sm: "auto" },
          gridTemplateColumns: { sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          overflowX: { xs: "auto", sm: "visible" },
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          "& > *": { scrollSnapAlign: "start" },
        }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ borderRadius: `${radii.lg}px`, overflow: "hidden", border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
                <Skeleton variant="rectangular" sx={{ aspectRatio: "4 / 3", height: "auto" }} />
                <Box sx={{ p: 5 }}>
                  <Skeleton width="50%" height={28} />
                  <Skeleton width="80%" />
                </Box>
              </Box>
            ))
          : rooms.map((listing) => (
              <FlatmateCard key={listing._id} listing={listing} onClick={() => onOpen(listing)} isSaved={saved.has(listing._id)} onToggleSave={onToggle} />
            ))}
      </Box>
    </Container>
  );
}

/** Flatmates home, built in the main dashboard's visual language. */
export default function FlatmatesDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("");
  const [newest, setNewest] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, toggleSaved] = useFlatmateBookmarks();

  useEffect(() => {
    document.title = "Flatmates & Rooms in Gurgaon | GgnHome";
    let cancelled = false;
    Promise.all([fetchRooms({ limit: 8, sort: "newest" }), fetchRooms({ limit: 8, sort: "popular" })]).then(([a, b]) => {
      if (cancelled) return;
      setNewest(a);
      const seen = new Set(a.slice(0, 4).map((x) => x._id));
      setPopular(b.filter((x) => !seen.has(x._id)).slice(0, 4));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const go = (to, auth) => {
    const path = typeof to === "function" ? to() : to;
    if (auth && !user) navigate("/login", { state: { from: path } });
    else navigate(path);
  };

  const search = (term) => {
    const q = String(term ?? query).trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (gender) params.set("gender", gender);
    navigate(`/flatmatessearch${params.toString() ? `?${params}` : ""}`);
  };

  const openListing = (listing) => navigate(`/flatmatesearchpropertymodal/${listing._id}`);

  return (
    <Box sx={{ backgroundColor: "background.paper", overflowX: "clip" }}>
      <Suspense fallback={<Box sx={{ height: { xs: 64, md: 88 } }} />}>
        <TopNavigationBar navItems={NAV_ITEMS} />
      </Suspense>

      {/* ---------------- Hero ---------------- */}
      <Box component="section" sx={{ position: "relative", overflow: "hidden", color: "common.white", backgroundColor: "#001F3F", pt: { xs: 12, md: 22 }, pb: { xs: 12, md: 20 } }}>
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/Dashboard.webp)",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            animation: "fmHeroZoom 26s ease-in-out infinite alternate",
            "@keyframes fmHeroZoom": { from: { transform: "scale(1.04)" }, to: { transform: "scale(1.14)" } },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        />
        <Box aria-hidden sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,20,45,0.80) 0%, rgba(0,31,63,0.66) 45%, rgba(0,31,63,0.90) 100%)" }} />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(50% 45% at 50% 25%, rgba(0,167,157,0.22) 0%, rgba(0,167,157,0) 70%), radial-gradient(40% 50% at 90% 90%, rgba(246,196,83,0.14) 0%, rgba(246,196,83,0) 70%)",
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative", px: { xs: 4, sm: 6, md: 8 }, textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Stack direction="row" spacing={3} alignItems="center" justifyContent="center" sx={{ mb: { xs: 4, md: 6 } }}>
              <Box sx={{ width: 28, height: "1px", backgroundColor: "rgba(63,194,184,0.8)" }} />
              <Typography variant="overline" sx={{ color: "#8FE3DB", letterSpacing: "0.22em", fontSize: { xs: 10, md: 12 } }}>
                Gurgaon · Shared living
              </Typography>
              <Box sx={{ width: 28, height: "1px", backgroundColor: "rgba(63,194,184,0.8)" }} />
            </Stack>
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontWeight: 700,
                fontSize: "clamp(2.4rem, 6.4vw, 5.2rem)",
                lineHeight: 1.05,
                textShadow: "0 4px 30px rgba(0,0,0,0.35)",
              }}
            >
              Find Your Flatmate.
              <Box
                component="span"
                sx={{
                  display: "block",
                  fontStyle: "italic",
                  background: "linear-gradient(90deg, #8FE3DB 0%, #3FC2B8 50%, #F6D58A 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Share The Rent.
              </Box>
            </Typography>
            <Typography sx={{ mt: { xs: 4, md: 5 }, mx: "auto", maxWidth: 600, fontSize: { xs: "1rem", md: "1.15rem" }, color: "rgba(255,255,255,0.86)" }}>
              Rooms and flatmates across Gurgaon — filter by budget, move-in date and who you'd like to live with.
            </Typography>
          </motion.div>

          {/* Search card */}
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}>
            <Box
              sx={{
                mt: { xs: 7, md: 10 },
                mx: "auto",
                maxWidth: 860,
                textAlign: "left",
                p: { xs: 3, md: 4 },
                borderRadius: `${radii.lg}px`,
                backgroundColor: "rgba(255,255,255,0.97)",
                boxShadow: "0 24px 60px rgba(0, 20, 45, 0.32)",
              }}
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={gender}
                onChange={(_, v) => v !== null && setGender(v)}
                aria-label="Looking to live with"
                sx={{ mb: 3, "& .MuiToggleButton-root": { px: 4, textTransform: "none", fontWeight: 600, "&.Mui-selected": { color: "common.white", backgroundColor: "primary.main", "&:hover": { backgroundColor: "primary.dark" } } } }}
              >
                {GENDERS.map((g) => (
                  <ToggleButton key={g.label} value={g.value}>
                    {g.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{ flex: 1, px: 4, height: 56, borderRadius: `${radii.md}px`, border: "1px solid", borderColor: "divider", backgroundColor: "background.default", "&:focus-within": { borderColor: "secondary.main", boxShadow: "0 0 0 3px rgba(0,167,157,0.14)" } }}
                >
                  <Search size={20} color="#4A6A8A" aria-hidden />
                  <InputBase
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    placeholder="Sector or locality, e.g. Sector 46"
                    inputProps={{ "aria-label": "Search flatmates by area" }}
                    sx={{ flex: 1, fontSize: 15 }}
                  />
                </Stack>
                <Button variant="contained" onClick={() => search()} startIcon={<Search size={18} />} sx={{ height: 56, px: 10, fontSize: 15 }}>
                  Search
                </Button>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 4, overflowX: "auto", pb: 1, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                <Typography variant="caption" sx={{ flexShrink: 0, color: "text.secondary" }}>
                  Popular
                </Typography>
                {POPULAR.map((area) => (
                  <Chip
                    key={area}
                    label={area}
                    size="small"
                    onClick={() => search(area)}
                    sx={{ flexShrink: 0, backgroundColor: "background.default", color: "text.secondary", "&:hover": { backgroundColor: "primary.main", color: "common.white" } }}
                  />
                ))}
              </Stack>
            </Box>
          </motion.div>

          <Stack direction="row" useFlexGap flexWrap="wrap" justifyContent="center" columnGap={{ xs: 5, sm: 10 }} rowGap={3} sx={{ mt: { xs: 7, md: 9 } }}>
            {[
              { icon: ShieldCheck, label: "Admin-approved listings" },
              { icon: MessageCircle, label: "Enquire in one tap" },
              { icon: CalendarCheck, label: "Filter by move-in date" },
            ].map(({ icon: Icon, label }) => (
              <Stack key={label} direction="row" spacing={2} alignItems="center">
                <Icon size={16} color="#3FC2B8" aria-hidden />
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.78)" }}>
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ---------------- Quick links ---------------- */}
      <Box sx={{ backgroundColor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 6, md: 8 } }}>
          <Stack
            component="nav"
            aria-label="Flatmate quick links"
            direction="row"
            justifyContent={{ lg: "space-between" }}
            spacing={{ xs: 1, md: 2 }}
            sx={{ overflowX: "auto", py: { xs: 4, md: 5 }, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
          >
            {QUICK_LINKS.map(({ label, icon: Icon, to, auth }) => (
              <ButtonBase
                key={label}
                onClick={() => go(to, auth)}
                sx={{
                  flexShrink: 0,
                  flexDirection: "column",
                  gap: 2,
                  width: { xs: 80, md: 108 },
                  py: 2,
                  borderRadius: "16px",
                  transition: "transform .2s ease",
                  "&:hover": { transform: "translateY(-3px)" },
                  "&:hover .ql-icon": { color: "common.white", background: "linear-gradient(135deg, #003366 0%, #00A79D 100%)", boxShadow: "0 10px 22px rgba(0,51,102,0.22)" },
                }}
              >
                <Box
                  className="ql-icon"
                  sx={{
                    width: { xs: 50, md: 58 },
                    height: { xs: 50, md: 58 },
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    color: label === "Female only" ? "#BE123C" : "primary.main",
                    background: "linear-gradient(135deg, rgba(0,51,102,0.07) 0%, rgba(0,167,157,0.14) 100%)",
                    transition: "background .2s ease, color .2s ease, box-shadow .2s ease",
                  }}
                >
                  <Icon size={22} aria-hidden />
                </Box>
                <Typography sx={{ fontSize: { xs: 12, md: 13 }, fontWeight: 600, color: "text.primary", textAlign: "center", lineHeight: 1.25 }}>
                  {label}
                </Typography>
              </ButtonBase>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ---------------- Rooms ---------------- */}
      <Box sx={{ backgroundColor: "background.default" }}>
        <RoomsRow
          overline="Fresh listings"
          title="Rooms available now"
          rooms={newest.slice(0, 8)}
          loading={loading}
          onOpen={openListing}
          saved={saved}
          onToggle={toggleSaved}
          viewAll={() => navigate("/flatmatessearch")}
        />
        {!loading && newest.length === 0 && (
          <Container maxWidth="md" sx={{ py: { xs: 12, md: 16 }, textAlign: "center" }}>
            <Typography variant="h3" sx={{ color: "primary.main", fontSize: "1.3rem", mb: 3 }}>
              Be the first to list a room
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 5 }}>
              New rooms appear here as soon as they're approved.
            </Typography>
            <Button variant="contained" onClick={() => go("/flatmateslistingform", true)}>
              List your room
            </Button>
          </Container>
        )}
      </Box>

      {/* ---------------- How it works ---------------- */}
      <Box component="section" sx={{ position: "relative", overflow: "hidden", py: { xs: 12, md: 18 }, background: "linear-gradient(160deg, #001F3F 0%, #003366 60%, #0B4A6F 100%)", color: "common.white" }}>
        <Box aria-hidden sx={{ position: "absolute", inset: 0, background: "radial-gradient(40% 60% at 85% 10%, rgba(0,167,157,0.25) 0%, rgba(0,167,157,0) 70%)" }} />
        <Container maxWidth="lg" sx={{ position: "relative", px: { xs: 4, sm: 6, md: 8 } }}>
          <Stack spacing={3} alignItems="center" sx={{ textAlign: "center", mb: { xs: 10, md: 14 } }}>
            <Typography variant="overline" sx={{ color: "#8FE3DB", letterSpacing: "0.2em" }}>
              How it works
            </Typography>
            <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: { xs: "2rem", md: "2.75rem" } }}>
              From empty room to{" "}
              <Box component="span" sx={{ color: "#F6C453", fontStyle: "italic" }}>
                great flatmate
              </Box>
            </Typography>
          </Stack>
          <StaggerContainer style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))" }}>
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <StaggerItem key={title}>
                <Box sx={{ height: "100%", p: { xs: 6, md: 8 }, borderRadius: `${radii.lg}px`, border: "1px solid rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 4 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: "14px", display: "grid", placeItems: "center", color: "#003366", background: "linear-gradient(135deg, #B8F2EC 0%, #3FC2B8 100%)" }}>
                      <Icon size={22} aria-hidden />
                    </Box>
                    <Typography sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 13 }}>STEP {i + 1}</Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ color: "common.white", mb: 2 }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.74)" }}>
                    {text}
                  </Typography>
                </Box>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} justifyContent="center" sx={{ mt: { xs: 10, md: 12 } }}>
            <Button
              size="large"
              endIcon={<ArrowRight size={18} />}
              onClick={() => go("/flatmateslistingform", true)}
              sx={{ px: 8, py: 3, color: "#003366", fontWeight: 700, background: "linear-gradient(90deg, #B8F2EC 0%, #3FC2B8 100%)", "&:hover": { filter: "brightness(1.05)" } }}
            >
              List your room free
            </Button>
            <Button size="large" variant="outlined" onClick={() => navigate("/flatmatessearch")} sx={{ px: 8, py: 3, color: "common.white", borderColor: "rgba(255,255,255,0.4)", "&:hover": { borderColor: "common.white" } }}>
              Browse rooms
            </Button>
          </Stack>
        </Container>
      </Box>

      <Box sx={{ backgroundColor: "background.default" }}>
        <RoomsRow
          overline="Popular right now"
          title="Most viewed rooms"
          rooms={popular}
          loading={false}
          onOpen={openListing}
          saved={saved}
          onToggle={toggleSaved}
          viewAll={() => navigate("/flatmatessearch?sort=popular")}
        />
      </Box>

      <Suspense fallback={null}>
        <OffersCarousel />
      </Suspense>

      {/* ---------------- Localities ---------------- */}
      <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 10, md: 14 } }}>
        <SectionHead overline="Explore Gurgaon" title="Find flatmates by locality" />
        <Box sx={{ display: "grid", gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" } }}>
          {LOCALITIES.map((area) => (
            <Stack
              key={area}
              component="button"
              type="button"
              onClick={() => search(area)}
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{
                minWidth: 0,
                px: { xs: 3, md: 4 },
                py: { xs: 2.5, md: 3 },
                borderRadius: `${radii.md}px`,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                color: "text.primary",
                cursor: "pointer",
                font: "inherit",
                fontSize: { xs: 13, md: 14 },
                fontWeight: 500,
                textAlign: "left",
                transition: "border-color .2s ease, color .2s ease, background-color .2s ease",
                "&:hover": { borderColor: "secondary.main", color: "primary.main", backgroundColor: "rgba(0,167,157,0.05)" },
              }}
            >
              <MapPin size={14} color="#00A79D" style={{ flexShrink: 0 }} aria-hidden />
              <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {area}
              </Box>
            </Stack>
          ))}
        </Box>
      </Container>

      <Suspense fallback={null}>
        <Footer user={user} />
      </Suspense>
      <MobileBottomNav user={user} />
    </Box>
  );
}
