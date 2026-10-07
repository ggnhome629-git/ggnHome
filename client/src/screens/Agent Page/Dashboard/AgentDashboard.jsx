import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Plus,
  Home,
  TrendingUp,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Eye,
  Lock,
  MapPin,
  Award,
  BadgeCheck,
  Building2,
  Download,
  Pencil,
  Inbox,
  Users,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  MessageSquareQuote,
  BedDouble,
  Sofa,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toJpeg } from "html-to-image";
import { useNavigate } from "react-router-dom";
import TopNavigationBar from "../Top Navigation Bar/AgentTopNavigationBar";
import { AnimatedNumber, StaggerContainer, StaggerItem } from "../../../components/motion";
import { radii } from "../../../theme/theme";

const CARD_TEMPLATES = [
  {
    id: "ocean",
    name: "Ocean",
    background: "linear-gradient(135deg, #0B1F2A, #003366, #00A79D)",
    accent: "#22D3EE",
    text: "#FFFFFF",
  },
  {
    id: "gold",
    name: "Gold",
    background: "linear-gradient(135deg, #3E2723, #5D4037, #FFD54F)",
    accent: "#FFD54F",
    text: "#FFFFFF",
  },
  {
    id: "black",
    name: "Black",
    background: "linear-gradient(135deg, #000000, #1A1A1A)",
    accent: "#D1D5DB",
    text: "#FFFFFF",
  },
  {
    id: "white",
    name: "White",
    background: "#FFFFFF",
    accent: "#00A79D",
    text: "#003366",
  },
];

const HERO_BG = "linear-gradient(120deg, #002244 0%, #003366 45%, #0B5C7A 100%)";
const CARD_SX = {
  borderRadius: `${radii.lg}px`,
  backgroundColor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 6px 20px rgba(0,51,102,0.06)",
};

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const formatINR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n >= 1e7) return `${(n / 1e7).toFixed(n % 1e7 ? 2 : 0)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(n % 1e5 ? 2 : 0)} L`;
  return n.toLocaleString("en-IN");
};

const AgentDashboard = () => {
  // Use the correct agent access token for hybrid-auth
  const agentToken = localStorage.getItem("agentAccessToken");
  const cardRef = useRef(null);

  const downloadAgentCard = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toJpeg(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#0B1F2A",
      });

      const link = document.createElement("a");
      link.download = `${user?.name || "agent"}-ggnhome-card.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Card download failed", err);
    }
  };
  const [user, setUser] = useState(null);
  const fetchAgentMe = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/agent/me`,
        {
          headers: {
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch agent profile");

      const data = await response.json();
      setUser(data.agent || data);
    } catch (err) {
      console.error("Error fetching agent profile:", err);
    }
  };
  const [loading, setLoading] = useState(true);
  const [agentData, setAgentData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeadsToday: 0,
    pendingLeads: 0,
  });
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [revealedMobiles, setRevealedMobiles] = useState({});
  const [leadErrors, setLeadErrors] = useState({});
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [tempSectors, setTempSectors] = useState([]);
  const [sectorInput, setSectorInput] = useState("");
  // ===== Property Enquiries state =====
  const [propertyEnquiries, setPropertyEnquiries] = useState([]);
  const [unlockingEnquiryId, setUnlockingEnquiryId] = useState(null);
  const [activeList, setActiveList] = useState("leads"); // "leads" | "enquiries"
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(CARD_TEMPLATES[0]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgentMe();
    fetchDashboardData();
    fetchPropertyEnquiries();
  }, []);
  // ===== Fetch property enquiries =====
  const fetchPropertyEnquiries = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/agent/propertyEnquiries`,
        {
          headers: {
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch property enquiries");

      const data = await response.json();
      setPropertyEnquiries(data.enquiries || []);
    } catch (err) {
      console.error("Error fetching property enquiries:", err);
    }
  };

  // ===== Unlock property enquiry contact handler =====
  const handleUnlockEnquiry = async (enquiryId) => {
    try {
      setUnlockingEnquiryId(enquiryId);

      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/agent/enquiries/${enquiryId}/unlock`,
        {
          method: "POST",
          headers: {
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      // Merge unlocked contact into enquiry list
      setPropertyEnquiries((prev) =>
        prev.map((e) =>
          e._id === enquiryId
            ? {
                ...e,
                userEmail: data.userEmail,
                userMobile: data.userMobile,
                _unlocked: true,
              }
            : e
        )
      );
    } catch (err) {
      console.error("Failed to unlock enquiry:", err);
    } finally {
      setUnlockingEnquiryId(null);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(
        process.env.REACT_APP_Base_API + "/api/agent/dashboard",
        {
          headers: {
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch dashboard data");

      const data = await response.json();

      setAgentData(data.agentDetails);
      setLeads(data.userPreferenceForms || []);

      // Use backend stats directly
      setStats({
        totalLeads: data.stats?.totalLeads ?? 0,
        newLeadsToday: data.stats?.newLeadsToday ?? 0,
        pendingLeads: data.stats?.pendingLeads ?? 0,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      setLoading(false);
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return "";
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const isFresh = (date) => date && Date.now() - new Date(date).getTime() < 86400000;

  // Preferred sector normalization helper (matches registration logic)
  const normalizeSector = (input) => {
    const val = input.trim();
    if (!val) return null;

    const lower = val.toLowerCase();
    const sectorMatch = lower.match(/(sector|sec)\s*[-]?\s*(\d+)/i);
    if (sectorMatch) return `Sector-${sectorMatch[2]}`;

    if (lower.includes("dlf") || lower.includes("arjun vihar")) {
      return val.toUpperCase();
    }

    return val
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const handleAcceptLead = async () => {
    if (!activeLead) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/agent/leadinfo`,
        {
          method: "POST",
          headers: {
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ leadId: activeLead._id }),
        }
      );

      const data = await response.json();

      if (response.ok && data?.mobileNumber) {
        setRevealedMobiles((prev) => ({
          ...prev,
          [activeLead._id]: data.mobileNumber,
        }));

        // clear any previous error
        setLeadErrors((prev) => {
          const copy = { ...prev };
          delete copy[activeLead._id];
          return copy;
        });
      } else if (!response.ok) {
        setLeadErrors((prev) => ({
          ...prev,
          [activeLead._id]:
            data?.message || "Unable to unlock lead at this time",
        }));
      }
    } catch (err) {
      console.error("Error accepting lead:", err);
    } finally {
      setShowLeadModal(false);
      setActiveLead(null);
    }
  };

  const addTempSector = () => {
    const normalized = normalizeSector(sectorInput);
    if (!normalized || tempSectors.includes(normalized)) return;
    setTempSectors((prev) => [...prev, normalized]);
    setSectorInput("");
  };

  const saveSectors = async () => {
    try {
      await fetch(`${process.env.REACT_APP_Base_API}/api/agent/update-sectors`, {
        method: "POST",
        headers: {
          ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ preferredSectors: tempSectors }),
      });

      setAgentData((prev) => ({
        ...prev,
        preferredSectors: tempSectors,
      }));
    } catch (e) {
      console.error("Failed to update sectors", e);
    } finally {
      setShowSectorModal(false);
    }
  };

  const isInactive = agentData?.status !== "active";
  const agentName = user?.name || "Agent";
  const sectors = agentData?.preferredSectors || [];

  const q = search.trim().toLowerCase();
  const filteredLeads = useMemo(
    () =>
      !q
        ? leads
        : leads.filter((l) =>
            [l.userName, l.name, l.propertyType, l.preferredLocation, l.location, l.bhkSize]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          ),
    [leads, q]
  );
  const filteredEnquiries = useMemo(
    () =>
      !q
        ? propertyEnquiries
        : propertyEnquiries.filter((e) =>
            [e.propertyAddress, e.propertyType, e.message]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          ),
    [propertyEnquiries, q]
  );

  const statTiles = [
    { icon: Sparkles, label: "New leads today", value: stats.newLeadsToday, tone: "#00A79D" },
    { icon: Users, label: "Total leads", value: stats.totalLeads, tone: "#003366" },
    { icon: AlertCircle, label: "Pending leads", value: stats.pendingLeads, tone: "#C88A2A" },
    { icon: Inbox, label: "Property enquiries", value: propertyEnquiries.length, tone: "#0B5C7A" },
    { icon: Award, label: "Years of experience", value: agentData?.experienceYears || 0, tone: "#7C5CC4" },
  ];

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", backgroundColor: "#F4F7F9" }}>
        <TopNavigationBar />
        <Box sx={{ background: HERO_BG, pt: 9, pb: 18 }}>
          <Container maxWidth="xl">
            <Skeleton variant="text" width={180} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
            <Skeleton variant="text" width={360} height={56} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
          </Container>
        </Box>
        <Container maxWidth="xl" sx={{ mt: -12 }}>
          <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "repeat(2,1fr)", lg: "repeat(5,1fr)" } }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={92} sx={{ borderRadius: `${radii.lg}px` }} />
            ))}
          </Box>
          <Skeleton variant="rounded" height={420} sx={{ mt: 6, borderRadius: `${radii.lg}px` }} />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F4F7F9", pb: { xs: 12, md: 10 } }}>
      <TopNavigationBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={activeList === "leads" ? "Search by name, sector, BHK…" : "Search by address or type…"}
      />

      {/* ================= Hero ================= */}
      <Box sx={{ position: "relative", overflow: "hidden", color: "#fff", background: HERO_BG, pt: { xs: 6, md: 9 }, pb: { xs: 16, md: 18 } }}>
        <Box aria-hidden sx={{ position: "absolute", right: -80, top: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,167,157,0.35), transparent 70%)" }} />
        <Box aria-hidden sx={{ position: "absolute", left: "35%", bottom: -140, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)" }} />
        <Container maxWidth="xl" sx={{ position: "relative" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={5}>
            <Stack direction="row" spacing={4} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar
                src={agentData?.profilePhoto || undefined}
                alt={agentName}
                sx={{ width: { xs: 64, md: 84 }, height: { xs: 64, md: 84 }, border: "3px solid rgba(255,255,255,0.85)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", bgcolor: "#00A79D", fontWeight: 800, fontSize: { xs: "1.4rem", md: "1.8rem" } }}
              >
                {initialsOf(agentName)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: "#F6C453", fontWeight: 800, letterSpacing: 1.4 }}>
                  Agent dashboard
                </Typography>
                <Typography component="h1" sx={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: { xs: "1.8rem", md: "2.6rem" }, lineHeight: 1.15 }} noWrap>
                  Welcome back, {agentName.split(" ")[0]}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2, flexWrap: "wrap", rowGap: 2 }}>
                  <Chip
                    size="small"
                    icon={isInactive ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                    label={isInactive ? "Account inactive" : "Verified & active"}
                    sx={{
                      fontWeight: 700,
                      color: "#fff",
                      backgroundColor: isInactive ? "rgba(192,64,46,0.85)" : "rgba(46,158,107,0.9)",
                      "& .MuiChip-icon": { color: "#fff" },
                    }}
                  />
                  {sectors.length > 0 && (
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)", display: "flex", alignItems: "center", gap: 1 }}>
                      <MapPin size={14} /> {sectors.slice(0, 3).join(", ")}
                      {sectors.length > 3 ? ` +${sectors.length - 3}` : ""}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={3} sx={{ flexShrink: 0 }}>
              <Tooltip title={isInactive ? "Your account is inactive. Please contact support." : ""}>
                <span>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={<Plus size={18} />}
                    disabled={isInactive}
                    onClick={() => navigate("/agent/add-property")}
                    sx={{ borderRadius: 999, fontWeight: 800, px: 6, boxShadow: "0 8px 20px rgba(0,167,157,0.35)", "&.Mui-disabled": { backgroundColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.7)" } }}
                  >
                    Post property
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={isInactive ? "Your account is inactive. Please contact support." : ""}>
                <span>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<LayoutGrid size={18} />}
                    disabled={isInactive}
                    onClick={() => navigate("/agent/my-properties")}
                    sx={{ borderRadius: 999, fontWeight: 700, px: 5, color: "#fff", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.08)" }, "&.Mui-disabled": { color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.25)" } }}
                  >
                    My listings
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: { xs: -11, md: -12 }, position: "relative" }}>
        {/* ================= Stat tiles ================= */}
        <StaggerContainer>
          <Box sx={{ display: "grid", gap: { xs: 2.5, md: 4 }, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" }, mb: { xs: 5, md: 6 } }}>
            {statTiles.map(({ icon: Icon, label, value, tone }) => (
              <StaggerItem key={label}>
                <Box sx={{ ...CARD_SX, p: { xs: 3.5, md: 4.5 }, height: "100%", transition: "transform .15s ease", "&:hover": { transform: "translateY(-2px)" } }}>
                  <Stack direction="row" spacing={2.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: "12px", display: "grid", placeItems: "center", backgroundColor: `${tone}14`, color: tone, flexShrink: 0 }}>
                      <Icon size={19} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.3rem", md: "1.6rem" }, color: "primary.main", lineHeight: 1.1 }}>
                        <AnimatedNumber value={Number(value) || 0} />
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }} noWrap>
                        {label}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </StaggerItem>
            ))}
          </Box>
        </StaggerContainer>

        {isInactive && (
          <Box sx={{ ...CARD_SX, mb: 6, p: 4, display: "flex", gap: 3, alignItems: "center", borderColor: "rgba(192,64,46,0.35)", backgroundColor: "#FFF6F4" }}>
            <ShieldAlert size={22} color="#C0402E" style={{ flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: "#7A2A1E" }}>
              <strong>Your agent account isn't active yet.</strong> Posting and managing listings unlocks once our team approves your profile. Contact support if this is taking longer than expected.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "grid", gap: { xs: 5, md: 6 }, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 340px" } }}>
          {/* ================= Main column ================= */}
          <Stack spacing={{ xs: 5, md: 6 }} sx={{ minWidth: 0 }}>
            <Box sx={{ ...CARD_SX, overflow: "hidden" }}>
              {/* Tabs only - search moved to navbar */}
              <Stack direction="row" spacing={1} sx={{ p: { xs: 4, md: 5 }, pb: { xs: 3, md: 4 }, borderBottom: "1px solid", borderColor: "divider", alignSelf: "flex-start" }}>
                <Stack direction="row" spacing={1} sx={{ p: 1, borderRadius: 999, backgroundColor: "#F4F7F9" }}>
                  {[
                    { id: "leads", label: "Buyer & tenant leads", count: leads.length, icon: TrendingUp },
                    { id: "enquiries", label: "Property enquiries", count: propertyEnquiries.length, icon: Home },
                  ].map((t) => {
                    const active = activeList === t.id;
                    return (
                      <Button
                        key={t.id}
                        onClick={() => setActiveList(t.id)}
                        startIcon={<t.icon size={16} />}
                        sx={{
                          borderRadius: 999,
                          px: { xs: 3, md: 4 },
                          py: 1.75,
                          fontWeight: 700,
                          textTransform: "none",
                          whiteSpace: "nowrap",
                          color: active ? "#fff" : "text.secondary",
                          backgroundColor: active ? "primary.main" : "transparent",
                          boxShadow: active ? "0 4px 12px rgba(0,51,102,0.25)" : "none",
                          "&:hover": { backgroundColor: active ? "primary.main" : "rgba(0,51,102,0.06)" },
                        }}
                      >
                        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{t.label}</Box>
                        <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>{t.id === "leads" ? "Leads" : "Enquiries"}</Box>
                        <Box component="span" sx={{ ml: 1.5, px: 1.75, borderRadius: 999, fontSize: 12, fontWeight: 800, backgroundColor: active ? "rgba(255,255,255,0.2)" : "rgba(0,51,102,0.08)" }}>
                          {t.count}
                        </Box>
                      </Button>
                    );
                  })}
                </Stack>
              </Stack>

              {/* List */}
              <Box sx={{ p: { xs: 3, md: 5 }, maxHeight: { lg: 760 }, overflowY: { lg: "auto" } }}>
                {activeList === "leads" ? (
                  filteredLeads.length === 0 ? (
                    <EmptyState
                      icon={TrendingUp}
                      title={q ? "No leads match your search" : "No leads yet"}
                      text={q ? "Try a different name, sector or BHK." : "Leads from buyers and tenants in your sectors will appear here. Add more sectors to widen your reach."}
                    />
                  ) : (
                    <Stack spacing={3}>
                      {filteredLeads.map((lead) => (
                        <LeadCard
                          key={lead._id}
                          lead={lead}
                          revealed={revealedMobiles[lead._id]}
                          error={leadErrors[lead._id]}
                          timeAgo={formatTimeAgo(lead.createdAt)}
                          fresh={isFresh(lead.createdAt)}
                          onUnlock={() => {
                            setActiveLead(lead);
                            setShowLeadModal(true);
                          }}
                        />
                      ))}
                    </Stack>
                  )
                ) : filteredEnquiries.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title={q ? "No enquiries match your search" : "No property enquiries yet"}
                    text={q ? "Try a different address or property type." : "When someone enquires about one of your listings, it shows up here."}
                  />
                ) : (
                  <Stack spacing={3}>
                    {filteredEnquiries.map((enq) => (
                      <EnquiryCard
                        key={enq._id}
                        enq={enq}
                        unlocking={unlockingEnquiryId === enq._id}
                        timeAgo={formatTimeAgo(enq.createdAt)}
                        fresh={isFresh(enq.createdAt)}
                        onUnlock={() => handleUnlockEnquiry(enq._id)}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>

            {/* ================= Digital business card ================= */}
            <Box sx={{ ...CARD_SX, p: { xs: 4, md: 6 } }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={3} sx={{ mb: 5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.15rem" }}>Your digital business card</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Share it on WhatsApp or print it. The QR code opens a chat with you.
                  </Typography>
                </Box>
                <Button variant="contained" color="secondary" startIcon={<Download size={16} />} onClick={downloadAgentCard} sx={{ borderRadius: 999, fontWeight: 800, px: 5, flexShrink: 0 }}>
                  Download JPG
                </Button>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={6} alignItems={{ md: "center" }}>
                <Box sx={{ overflowX: "auto", pb: 1, mx: { xs: -1, md: 0 } }}>
                  <Box sx={{ p: 2, borderRadius: "18px", backgroundColor: "#EEF3F6", display: "inline-block" }}>
                    <BusinessCard cardRef={cardRef} template={selectedTemplate} user={user} agentData={agentData} />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 1, textTransform: "uppercase" }}>
                    Card style
                  </Typography>
                  <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                    {CARD_TEMPLATES.map((tpl) => {
                      const active = tpl.id === selectedTemplate.id;
                      return (
                        <Box key={tpl.id} component="button" type="button" onClick={() => setSelectedTemplate(tpl)} sx={{ font: "inherit", border: 0, background: "none", p: 0, cursor: "pointer", textAlign: "center" }}>
                          <Box sx={{ width: 48, height: 32, borderRadius: "8px", background: tpl.background, border: "2px solid", borderColor: active ? "secondary.main" : "divider", boxShadow: active ? "0 0 0 3px rgba(0,167,157,0.2)" : "none", transition: "all .15s ease" }} />
                          <Typography variant="caption" sx={{ display: "block", mt: 1, fontWeight: active ? 800 : 600, color: active ? "secondary.dark" : "text.secondary" }}>
                            {tpl.name}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Stack>

          {/* ================= Sidebar ================= */}
          <Box sx={{ position: { lg: "sticky" }, top: 96 }}>
            <Stack spacing={5}>
              <Box sx={{ ...CARD_SX, overflow: "hidden" }}>
                <Box sx={{ height: 64, background: HERO_BG }} />
                <Box sx={{ px: 5, pb: 5, mt: -8 }}>
                  <Avatar src={agentData?.profilePhoto || undefined} alt={agentName} sx={{ width: 72, height: 72, border: "4px solid #fff", bgcolor: "#00A79D", fontWeight: 800, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                    {initialsOf(agentName)}
                  </Avatar>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                    <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.1rem" }} noWrap>
                      {agentName}
                    </Typography>
                    {!isInactive && <BadgeCheck size={18} color="#00A79D" />}
                  </Stack>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Property consultant · ggnHome partner</Typography>

                  <Stack spacing={2} sx={{ mt: 4 }}>
                    <InfoRow icon={Phone} value={agentData?.whatsappNumber || user?.phone || user?.mobileNumber} placeholder="No phone on file" />
                    <InfoRow icon={Mail} value={user?.email} placeholder="No email on file" />
                    <InfoRow icon={Award} value={agentData?.experienceYears ? `${agentData.experienceYears}+ years in real estate` : null} placeholder="Experience not added" />
                    {agentData?.totalDeals ? <InfoRow icon={Building2} value={`${agentData.totalDeals}+ deals closed`} /> : null}
                  </Stack>
                </Box>
              </Box>

              <Box sx={{ ...CARD_SX, p: 5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography sx={{ fontWeight: 800, color: "primary.main" }}>Sectors you cover</Typography>
                  <Button
                    size="small"
                    startIcon={<Pencil size={14} />}
                    onClick={() => {
                      setTempSectors(sectors);
                      setSectorInput("");
                      setShowSectorModal(true);
                    }}
                    sx={{ fontWeight: 700, color: "secondary.dark" }}
                  >
                    Edit
                  </Button>
                </Stack>
                {sectors.length > 0 ? (
                  <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
                    {sectors.map((s) => (
                      <Chip key={s} size="small" icon={<MapPin size={12} />} label={s} sx={{ fontWeight: 700, backgroundColor: "rgba(0,167,157,0.1)", color: "secondary.dark", "& .MuiChip-icon": { color: "secondary.dark" } }} />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Add the sectors you work in so we can route matching leads to you.
                  </Typography>
                )}
              </Box>

              <Box sx={{ ...CARD_SX, p: 5, background: "linear-gradient(160deg, #FFFFFF 0%, #EAF7F6 100%)" }}>
                <Typography sx={{ fontWeight: 800, color: "primary.main", mb: 3 }}>How leads work</Typography>
                <Stack spacing={3}>
                  {[
                    ["Matched to you", "Leads come from buyers and tenants searching in your sectors."],
                    ["Unlock the contact", "Accept a lead to reveal the phone number. Commission follows ggnHome's rules."],
                    ["Respond fast", "Leads contacted within the first hour convert far better."],
                  ].map(([title, text], i) => (
                    <Stack key={title} direction="row" spacing={3}>
                      <Box sx={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "#fff", backgroundColor: "secondary.main" }}>{i + 1}</Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>{title}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>{text}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
                <Button fullWidth endIcon={<ArrowRight size={16} />} disabled={isInactive} onClick={() => navigate("/agent/add-property")} sx={{ mt: 4, fontWeight: 800, borderRadius: 999, color: "secondary.dark", backgroundColor: "rgba(0,167,157,0.1)", "&:hover": { backgroundColor: "rgba(0,167,157,0.18)" } }}>
                  List a property to get enquiries
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Container>

      {/* ================= Lead acceptance dialog ================= */}
      <Dialog
        open={showLeadModal}
        onClose={() => {
          setShowLeadModal(false);
          setActiveLead(null);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: `${radii.lg}px`, borderTop: "5px solid #00A79D" } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "primary.main", pb: 1 }}>Accept this lead?</DialogTitle>
        <DialogContent>
          {activeLead && (
            <Box sx={{ p: 3, mb: 3, borderRadius: `${radii.md}px`, backgroundColor: "#F4F7F9" }}>
              <Typography sx={{ fontWeight: 700, color: "primary.main" }}>{activeLead.userName || activeLead.name || "Anonymous lead"}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {[activeLead.propertyType, activeLead.bhkSize, activeLead.preferredLocation || activeLead.location].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
            By accepting, you agree to follow the <strong>rules and regulations of ggnHome</strong>. Commission is distributed strictly according to the platform's rules.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 5 }}>
          <Button
            onClick={() => {
              setShowLeadModal(false);
              setActiveLead(null);
            }}
            sx={{ fontWeight: 700, color: "text.secondary" }}
          >
            Not now
          </Button>
          <Button variant="contained" color="secondary" onClick={handleAcceptLead} sx={{ fontWeight: 800, borderRadius: 999, px: 5 }}>
            Accept & reveal number
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================= Sector editing dialog ================= */}
      <Dialog open={showSectorModal} onClose={() => setShowSectorModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: `${radii.lg}px` } }}>
        <DialogTitle sx={{ fontWeight: 800, color: "primary.main", pb: 1 }}>Edit the sectors you cover</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            Type a sector such as "Sector 46" or "DLF Phase 2" and press Enter.
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              size="small"
              fullWidth
              autoFocus
              placeholder="Add a sector"
              value={sectorInput}
              onChange={(e) => setSectorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTempSector();
                }
              }}
            />
            <Button variant="contained" color="secondary" onClick={addTempSector} sx={{ fontWeight: 800, flexShrink: 0 }}>
              Add
            </Button>
          </Stack>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5, mt: 4, minHeight: 32 }}>
            {tempSectors.length === 0 && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>No sectors added yet.</Typography>
            )}
            {tempSectors.map((sec) => (
              <Chip key={sec} label={sec} onDelete={() => setTempSectors((prev) => prev.filter((s) => s !== sec))} sx={{ fontWeight: 700 }} />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 5 }}>
          <Button onClick={() => setShowSectorModal(false)} sx={{ fontWeight: 700, color: "text.secondary" }}>
            Cancel
          </Button>
          <Button variant="contained" color="secondary" onClick={saveSectors} sx={{ fontWeight: 800, borderRadius: 999, px: 5 }}>
            Save sectors
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AgentDashboard;

/* ------------------------------------------------------------------------ */

function EmptyState({ icon: Icon, title, text }) {
  return (
    <Box sx={{ py: 12, px: 4, textAlign: "center" }}>
      <Box sx={{ width: 56, height: 56, mx: "auto", mb: 3, borderRadius: "16px", display: "grid", placeItems: "center", backgroundColor: "rgba(0,167,157,0.1)", color: "secondary.main" }}>
        <Icon size={24} />
      </Box>
      <Typography sx={{ fontWeight: 800, color: "primary.main" }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 380, mx: "auto", mt: 1 }}>
        {text}
      </Typography>
    </Box>
  );
}

function InfoRow({ icon: Icon, value, placeholder }) {
  return (
    <Stack direction="row" spacing={2.5} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{ width: 30, height: 30, borderRadius: "9px", display: "grid", placeItems: "center", backgroundColor: "#F4F7F9", color: "text.secondary", flexShrink: 0 }}>
        <Icon size={15} />
      </Box>
      <Typography variant="body2" noWrap sx={{ color: value ? "text.primary" : "text.secondary", fontWeight: value ? 600 : 400 }}>
        {value || placeholder}
      </Typography>
    </Stack>
  );
}

function Tag({ icon: Icon, children }) {
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1, px: 2, py: 0.75, borderRadius: "8px", fontSize: 12.5, fontWeight: 600, color: "text.secondary", backgroundColor: "#F4F7F9", whiteSpace: "nowrap" }}>
      {Icon && <Icon size={13} />}
      {children}
    </Box>
  );
}

function NewBadge() {
  return (
    <Box component="span" sx={{ px: 1.75, py: 0.25, borderRadius: 999, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "#fff", background: "linear-gradient(135deg, #00A79D, #22D3EE)" }}>
      New
    </Box>
  );
}

function LeadCard({ lead, revealed, error, timeAgo, fresh, onUnlock }) {
  const name = lead.userName || lead.name || "Anonymous lead";
  const budget = lead.budgetRange || lead.budget;
  const location = lead.preferredLocation || lead.location;
  return (
    <Box
        sx={{
          p: { xs: 3.5, md: 4.5 },
          borderRadius: `${radii.lg}px`,
          border: "1.5px solid",
          borderColor: fresh ? "rgba(0,167,157,0.35)" : "divider",
          backgroundColor: "#fff",
          transition: "all .15s ease",
          "&:hover": { borderColor: "secondary.main", boxShadow: "0 8px 24px rgba(0,167,157,0.12)" },
        }}
      >
        <Stack direction="row" spacing={3.5} alignItems="flex-start">
          <Avatar sx={{ width: 44, height: 44, fontWeight: 800, fontSize: 15, bgcolor: "rgba(0,51,102,0.08)", color: "primary.main" }}>{initialsOf(name)}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography sx={{ fontWeight: 800, color: "primary.main" }} noWrap>{name}</Typography>
                  {fresh && <NewBadge />}
                </Stack>
                <Typography variant="body2" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                  <MapPin size={13} />
                  <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{location || "Location not specified"}</Box>
                </Typography>
              </Box>
              {typeof lead.brokerageAmount === "number" && (
                <Box sx={{ textAlign: "right", flexShrink: 0, px: 2.5, py: 1.25, borderRadius: "10px", backgroundColor: "rgba(0,167,157,0.08)" }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: "text.secondary", letterSpacing: 0.6, textTransform: "uppercase" }}>Brokerage</Typography>
                  <Typography sx={{ fontWeight: 800, color: "secondary.dark", fontSize: 15, lineHeight: 1.2 }}>₹{formatINR(lead.brokerageAmount)}</Typography>
                </Box>
              )}
            </Stack>

            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5, mt: 3 }}>
              {lead.propertyType && <Tag icon={Home}>{lead.propertyType}</Tag>}
              {lead.bhkSize && <Tag icon={BedDouble}>{lead.bhkSize}</Tag>}
              {lead.furnishingLevel && <Tag icon={Sofa}>{lead.furnishingLevel.replace("-", " ")}</Tag>}
              <Tag icon={IndianRupee}>{budget || "Budget not specified"}</Tag>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mt: 3.5, pt: 3, borderTop: "1px dashed", borderColor: "divider" }}>
              <Stack direction="row" spacing={3} alignItems="center">
                {revealed ? (
                  <Button component="a" href={`tel:${revealed}`} size="small" startIcon={<Phone size={14} />} sx={{ fontWeight: 800, borderRadius: 999, px: 3, color: "#fff", backgroundColor: "success.main", "&:hover": { backgroundColor: "#24865A" } }}>
                    {revealed}
                  </Button>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                      <Phone size={14} />
                      <Box component="span" sx={{ filter: "blur(4px)", userSelect: "none", letterSpacing: 1 }}>98XXXXXXXX</Box>
                    </Typography>
                    <Button size="small" variant="outlined" color="secondary" startIcon={<Eye size={14} />} onClick={onUnlock} sx={{ fontWeight: 800, borderRadius: 999, px: 3 }}>
                      View contact
                    </Button>
                  </>
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 1 }}>
                <Clock size={12} /> {timeAgo}
              </Typography>
            </Stack>

            {error && (
              <Typography variant="caption" sx={{ display: "block", mt: 2, fontWeight: 700, color: "error.main" }}>
                {error}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>
  );
}

function EnquiryCard({ enq, unlocking, timeAgo, fresh, onUnlock }) {
  return (
    <Box
      sx={{
        p: { xs: 3.5, md: 4.5 },
        borderRadius: `${radii.lg}px`,
        border: "1.5px solid",
        borderColor: fresh ? "rgba(0,167,157,0.35)" : "divider",
        backgroundColor: "#fff",
        transition: "all .15s ease",
        "&:hover": { borderColor: "secondary.main", boxShadow: "0 8px 24px rgba(0,167,157,0.12)" },
      }}
    >
      <Stack direction="row" spacing={3.5} alignItems="flex-start">
        <Box sx={{ width: 44, height: 44, borderRadius: "12px", flexShrink: 0, display: "grid", placeItems: "center", backgroundColor: "rgba(11,92,122,0.1)", color: "#0B5C7A" }}>
          <Building2 size={20} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography sx={{ fontWeight: 800, color: "primary.main" }} noWrap>{enq.propertyAddress || "Your listing"}</Typography>
                {fresh && <NewBadge />}
              </Stack>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5, mt: 1.5 }}>
                {enq.propertyType && <Tag icon={Home}>{String(enq.propertyType).toUpperCase()}</Tag>}
                {enq.propertyPrice != null && <Tag icon={IndianRupee}>{formatINR(enq.propertyPrice)}</Tag>}
              </Stack>
            </Box>
            {enq.brokerage != null && (
              <Box sx={{ textAlign: "right", flexShrink: 0, px: 2.5, py: 1.25, borderRadius: "10px", backgroundColor: "rgba(0,167,157,0.08)" }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: "text.secondary", letterSpacing: 0.6, textTransform: "uppercase" }}>Commission</Typography>
                <Typography sx={{ fontWeight: 800, color: "secondary.dark", fontSize: 15, lineHeight: 1.2 }}>₹{formatINR(enq.brokerage)}</Typography>
              </Box>
            )}
          </Stack>

          {enq.message && (
            <Box sx={{ mt: 3, p: 3, borderRadius: "10px", backgroundColor: "#F4F7F9", display: "flex", gap: 2 }}>
              <MessageSquareQuote size={16} color="#4A6A8A" style={{ flexShrink: 0, marginTop: 2 }} />
              <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>{enq.message}</Typography>
            </Box>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mt: 3.5, pt: 3, borderTop: "1px dashed", borderColor: "divider" }}>
            {enq._unlocked ? (
              <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
                {enq.userMobile && (
                  <Button component="a" href={`tel:${enq.userMobile}`} size="small" startIcon={<Phone size={14} />} sx={{ fontWeight: 800, borderRadius: 999, px: 3, color: "#fff", backgroundColor: "success.main", "&:hover": { backgroundColor: "#24865A" } }}>
                    {enq.userMobile}
                  </Button>
                )}
                {enq.userEmail && (
                  <Button component="a" href={`mailto:${enq.userEmail}`} size="small" variant="outlined" startIcon={<Mail size={14} />} sx={{ fontWeight: 700, borderRadius: 999, px: 3, textTransform: "none" }}>
                    {enq.userEmail}
                  </Button>
                )}
              </Stack>
            ) : (
              <Stack direction="row" spacing={3} alignItems="center">
                <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                  <Lock size={14} />
                  <Box component="span" sx={{ filter: "blur(4px)", userSelect: "none" }}>XXXXXXXXXX</Box>
                </Typography>
                <Button size="small" variant="outlined" color="secondary" startIcon={<Eye size={14} />} onClick={onUnlock} disabled={unlocking} sx={{ fontWeight: 800, borderRadius: 999, px: 3 }}>
                  {unlocking ? "Unlocking…" : "Unlock contact"}
                </Button>
              </Stack>
            )}
            <Typography variant="caption" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 1 }}>
              <Clock size={12} /> {timeAgo}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

/** Fixed-size card (480×274) so the JPG export looks the same on every device. */
function BusinessCard({ cardRef, template, user, agentData }) {
  const chip = chipStyle(template);
  return (
    <div
      ref={cardRef}
      style={{
        width: "480px",
        height: "274px",
        position: "relative",
        padding: "14px",
        borderRadius: "12px",
        background: template.background,
        color: template.text,
        overflow: "hidden",
        boxSizing: "border-box",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px", fontWeight: 900, letterSpacing: "6px", color: "rgba(255,255,255,0.04)", transform: "rotate(-15deg)", pointerEvents: "none" }}>
        GgnHome
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/Logo2.jpg" alt="GgnHome Logo" style={{ width: "26px", height: "26px", objectFit: "contain", background: "#FFFFFF", borderRadius: "6px", padding: "2px" }} />
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 900, letterSpacing: "0.8px", margin: 0 }}>GgnHome</h3>
            <span style={{ fontSize: "11px", opacity: 0.85 }}>Real Estate Professional</span>
          </div>
        </div>
        <BadgeCheck size={18} color={template.accent} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 900, margin: "0 0 2px" }}>{user?.name || "Agent Name"}</h2>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "4px" }}>Property Consultant</div>

          <div style={{ fontSize: "13px", lineHeight: "1.7" }}>
            <div>
              <Phone size={12} color={template.accent} /> {agentData?.whatsappNumber || user?.phone || "N/A"}
            </div>
            <div>
              <Mail size={12} color={template.accent} /> {user?.email || "N/A"}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
            {agentData?.experienceYears ? (
              <span style={chip}>
                <Award size={12} color={template.accent} /> {agentData.experienceYears}+ Years
              </span>
            ) : null}
            {agentData?.totalDeals ? (
              <span style={chip}>
                <Building2 size={12} color={template.accent} /> {agentData.totalDeals}+ Deals
              </span>
            ) : null}
          </div>

          {agentData?.preferredSectors?.length > 0 && (
            <div style={{ marginTop: "6px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>Sectors Covered</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                {agentData.preferredSectors.slice(0, 3).map((sec) => (
                  <span key={sec} style={chip}>{sec}</span>
                ))}
                {agentData.preferredSectors.length > 3 && <span style={{ fontSize: "12px", fontWeight: 700, opacity: 0.9 }}>+ more</span>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginTop: "-26px" }}>
          <div style={{ width: "104px", height: "132px", borderRadius: "16px", overflow: "hidden", background: "#FFFFFF", boxShadow: "0 6px 18px rgba(0,0,0,0.3)", border: `6px solid ${template.accent}` }}>
            {agentData?.profilePhoto ? (
              <img src={agentData.profilePhoto} alt="Agent" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#003366", fontWeight: 800, fontSize: "28px" }}>
                {initialsOf(user?.name || "")}
              </div>
            )}
          </div>
          <div style={{ background: "#FFFFFF", padding: "6px", borderRadius: "8px" }}>
            <QRCode value={`https://wa.me/${agentData?.whatsappNumber || ""}`} size={68} />
          </div>
        </div>
      </div>
    </div>
  );
}

// CHIP STYLE HELPER
const chipStyle = (template) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 10px",
  background: template?.id === "white" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.18)",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: template?.id === "white" ? "#003366" : "#FFFFFF",
});
