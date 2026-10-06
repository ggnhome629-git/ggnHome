import React, { useEffect, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, Skeleton, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { CalendarCheck, Car, ChevronDown, Clock, ExternalLink, Gift, HandCoins, Home, KeyRound, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import Footer from "../Dashboard/Footer";
import MobileBottomNav from "../Dashboard/MobileBottomNav";
import { useAuth } from "../../Context/AuthContext";
import { radii } from "../../theme/theme";

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const CLAIM_WINDOW_MS = 2 * 86400000; // rewards expire 2 days after they're sent (server model)
const FALLBACK_FORM = "https://forms.gle/pVCWgpoXdaoY6qnm9";

const STEPS = [
  { icon: Search, title: "Find Your Home", text: "Search rent or sale listings and shortlist the ones you like." },
  { icon: Car, title: "Visit & Decide", text: "Plan site visits with our team and pick the right home." },
  { icon: KeyRound, title: "Close Through ggnHome", text: "Finalise the deal through ggnHome and let us know." },
  { icon: Gift, title: "Get Rewarded", text: "We send you a thank-you gift — worth up to ₹1,000." },
];

const WAYS = [
  { icon: Search, title: "Search Homes", text: "Rent or buy across Gurgaon", to: "/search" },
  { icon: Home, title: "Post Your Property", text: "List it free, reach tenants & buyers", to: "/add-property" },
  { icon: CalendarCheck, title: "Plan Site Visits", text: "Talk to our team about visits", to: "/support" },
];

const FAQ = [
  ["Who can get a reward?", "Anyone who finalises a home through ggnHome — renting or buying. Our team confirms the deal and then sends the reward to your account."],
  ["How will I know I've got one?", "It shows on this page. Open it and press Claim to fill in your details."],
  ["How long do I have to claim it?", "Rewards stay open for 2 days after we send them, so claim yours soon."],
  ["What is the reward?", "A thank-you gift worth up to ₹1,000. The exact gift is described in your reward when it arrives."],
];

function useCountdown(until) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return undefined;
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return null;
  const ms = until - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h >= 1 ? `${h}h ${m}m left to claim` : `${m}m left to claim`;
}

/** /rewards — the user's reward (from the admin) and how to earn one. */
export default function RewardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, reward: null, error: "" });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    fetch(process.env.REACT_APP_CHECK_ELIGIBILITY_API, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn't load your rewards."))))
      .then((d) => setState({ loading: false, reward: d.reward || null, error: "" }))
      .catch((e) => setState({ loading: false, reward: null, error: e.message }));
  }, []);

  const reward = state.reward;
  const sentAt = reward?.distributedAt ? new Date(reward.distributedAt).getTime() : null;
  const expiresAt = sentAt ? sentAt + CLAIM_WINDOW_MS : null;
  const active = Boolean(reward && reward.isActive !== false && (!expiresAt || expiresAt > Date.now()));
  const countdown = useCountdown(active ? expiresAt : null);
  const formLink = (reward?.message || "").match(/https?:\/\/[^\s)]+/)?.[0] || FALLBACK_FORM;
  const message = (reward?.message || "").replace(/https?:\/\/[^\s)]+/g, "").trim();

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F4F7F9" }}>
      <TopNavigationBar navItems={NAV_ITEMS} />

      {/* Hero */}
      <Box sx={{ position: "relative", overflow: "hidden", color: "#fff", background: "linear-gradient(120deg, #002244 0%, #003366 45%, #0B5C7A 100%)", pt: { xs: 7, md: 10 }, pb: { xs: 18, md: 20 } }}>
        <Box aria-hidden sx={{ position: "absolute", right: -60, top: -60, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(246,196,83,0.35), transparent 70%)" }} />
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Typography variant="overline" sx={{ color: "#F6C453", fontWeight: 800, letterSpacing: 1.4 }}>
            ggnHome Rewards
          </Typography>
          <Typography component="h1" sx={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: { xs: "2rem", md: "3rem" }, lineHeight: 1.1 }}>
            Get Space.{" "}
            <Box component="span" sx={{ background: "linear-gradient(90deg,#F6C453,#F0B429)", WebkitBackgroundClip: "text", color: "transparent" }}>
              Get Rewarded.
            </Box>
          </Typography>
          <Typography sx={{ mt: 2, maxWidth: 560, color: "rgba(255,255,255,0.82)" }}>
            Find your home through ggnHome and we'll thank you with a gift worth up to ₹1,000.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: { xs: -12, md: -14 }, position: "relative", pb: { xs: 14, md: 10 } }}>
        {/* Reward card */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{ p: { xs: 5, md: 8 }, borderRadius: `${radii.xl}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", boxShadow: "0 16px 40px rgba(0,51,102,0.10)" }}
        >
          {state.loading ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={5} alignItems="center">
              <Skeleton variant="rounded" width={120} height={120} sx={{ borderRadius: 4 }} />
              <Box sx={{ flex: 1, width: "100%" }}>
                <Skeleton width="40%" height={36} />
                <Skeleton width="80%" />
                <Skeleton width="60%" />
              </Box>
            </Stack>
          ) : (
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 4, md: 7 }} alignItems={{ xs: "flex-start", md: "center" }}>
              <Box
                component={motion.div}
                animate={active ? { rotate: [0, -6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 1.2, repeat: active ? Infinity : 0, repeatDelay: 2.5 }}
                sx={{
                  width: { xs: 88, md: 120 },
                  height: { xs: 88, md: 120 },
                  borderRadius: "28px",
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  color: active ? "#7A4E00" : "#64748B",
                  background: active ? "linear-gradient(135deg,#FDE68A,#F0B429)" : "#EEF3F8",
                  boxShadow: active ? "0 14px 30px rgba(240,180,41,0.45)" : "none",
                }}
              >
                <Gift size={52} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {active ? (
                  <>
                    <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
                      <Box sx={{ px: 2.5, py: 0.75, borderRadius: 999, backgroundColor: "#DCFCE7", color: "#15803D", fontSize: 12, fontWeight: 800 }}>New Reward</Box>
                      {countdown && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#B45309", fontSize: 13, fontWeight: 700 }}>
                          <Clock size={14} />
                          <span>{countdown}</span>
                        </Stack>
                      )}
                    </Stack>
                    <Typography sx={{ mt: 2, fontWeight: 800, color: "primary.main", fontSize: { xs: "1.4rem", md: "1.8rem" } }}>Your Reward Has Arrived 🎉</Typography>
                    <Typography sx={{ mt: 1.5, color: "text.secondary", whiteSpace: "pre-line" }}>{message || "A thank-you gift worth up to ₹1,000 is waiting for you."}</Typography>
                    <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
                      Sent {new Date(sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </Typography>
                  </>
                ) : reward ? (
                  <>
                    <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: { xs: "1.3rem", md: "1.6rem" } }}>This Reward Has Expired</Typography>
                    <Typography sx={{ mt: 1.5, color: "text.secondary" }}>
                      Rewards stay open for 2 days. If you think you missed yours, our support team can help.
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: { xs: "1.3rem", md: "1.6rem" } }}>No Rewards Yet</Typography>
                    <Typography sx={{ mt: 1.5, color: "text.secondary" }}>
                      {state.error || "Finalise a home through ggnHome and your thank-you gift will show up right here."}
                    </Typography>
                  </>
                )}
              </Box>
              <Box sx={{ flexShrink: 0, width: { xs: "100%", md: "auto" } }}>
                {active ? (
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ExternalLink size={16} />}
                    onClick={() => window.open(formLink, "_blank", "noopener,noreferrer")}
                    sx={{ width: { xs: "100%", md: "auto" }, borderRadius: 999, fontWeight: 800, px: 7, py: 1.75, color: "#3B2600", background: "linear-gradient(90deg,#F6C453,#F0B429)", boxShadow: "0 10px 24px rgba(240,180,41,0.4)", "&:hover": { background: "linear-gradient(90deg,#F0B429,#E09F12)" } }}
                  >
                    Claim Reward
                  </Button>
                ) : reward ? (
                  <Button variant="outlined" size="large" onClick={() => navigate("/support")} sx={{ width: { xs: "100%", md: "auto" }, borderRadius: 999, fontWeight: 800 }}>
                    Contact Support
                  </Button>
                ) : (
                  <Button variant="contained" color="secondary" size="large" onClick={() => navigate("/search")} sx={{ width: { xs: "100%", md: "auto" }, borderRadius: 999, fontWeight: 800, px: 7 }}>
                    Start Searching
                  </Button>
                )}
              </Box>
            </Stack>
          )}
        </Box>

        {/* How it works */}
        <Typography component="h2" sx={{ mt: { xs: 9, md: 12 }, mb: 5, fontWeight: 800, color: "primary.main", fontSize: { xs: "1.4rem", md: "1.8rem" } }}>
          How It Works
        </Typography>
        <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" } }}>
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Box key={title} component={motion.div} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} sx={{ position: "relative", p: 5, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider" }}>
              <Typography sx={{ position: "absolute", top: 14, right: 18, fontWeight: 800, fontSize: 28, color: "#E6EDF3" }}>{i + 1}</Typography>
              <Box sx={{ width: 44, height: 44, borderRadius: "12px", display: "grid", placeItems: "center", backgroundColor: i === 3 ? "#FEF3C7" : "rgba(0,167,157,0.1)", color: i === 3 ? "#B45309" : "secondary.main", mb: 3 }}>
                <Icon size={22} />
              </Box>
              <Typography sx={{ fontWeight: 800, color: "primary.main" }}>{title}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                {text}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Ways to start */}
        <Typography component="h2" sx={{ mt: { xs: 9, md: 12 }, mb: 5, fontWeight: 800, color: "primary.main", fontSize: { xs: "1.4rem", md: "1.8rem" } }}>
          Start Here
        </Typography>
        <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
          {WAYS.map(({ icon: Icon, title, text, to }) => (
            <Box
              key={title}
              component="button"
              onClick={() => navigate(to)}
              sx={{ textAlign: "left", font: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, p: 5, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", transition: "all .15s ease", "&:hover": { borderColor: "secondary.main", transform: "translateY(-2px)", boxShadow: "0 10px 24px rgba(0,51,102,0.08)" } }}
            >
              <Box sx={{ width: 48, height: 48, borderRadius: "14px", display: "grid", placeItems: "center", backgroundColor: "primary.main", color: "#fff", flexShrink: 0 }}>
                <Icon size={22} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "primary.main" }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* FAQ */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: { xs: 9, md: 12 }, mb: 4 }}>
          <HandCoins size={22} color="#00A79D" />
          <Typography component="h2" sx={{ fontWeight: 800, color: "primary.main", fontSize: { xs: "1.4rem", md: "1.8rem" } }}>
            Questions
          </Typography>
        </Stack>
        <Box sx={{ borderRadius: `${radii.lg}px`, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
          {FAQ.map(([q, a]) => (
            <Accordion key={q} disableGutters elevation={0} sx={{ "&:before": { display: "none" }, borderBottom: "1px solid", borderColor: "divider" }}>
              <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Sparkles size={15} color="#F0B429" />
                  <Typography sx={{ fontWeight: 700 }}>{q}</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {a}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>
      <Footer user={user} />
      <MobileBottomNav user={user} />
    </Box>
  );
}
