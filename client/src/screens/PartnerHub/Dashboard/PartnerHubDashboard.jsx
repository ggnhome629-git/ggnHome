import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Grid, Skeleton,
  Stack, Typography,
} from "@mui/material";
import {
  ArrowRight, BarChart3, Building2, CheckCircle2, ChevronRight, Home,
  MessageSquare, Plus, Search, Sparkles, TrendingUp, Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const INK = "#102a43";
const MUTED = "#718096";
const TEAL = "#0f766e";

const PartnerHubDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("partnerAccessToken");
      if (!token) {
        navigate("/partner/login");
        return;
      }
      const res = await fetch(`${process.env.REACT_APP_Base_API}/api/partner/dashboard`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/partner/login");
          return;
        }
        throw new Error("We couldn't load your dashboard. Please try again.");
      }
      setDashboard(await res.json());
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const stats = [
    { label: "Total properties", value: dashboard?.stats?.totalProperties ?? 0, note: "Your current listings", icon: Building2, tint: "#e5f4f1", color: "#0f766e" },
    { label: "Total enquiries", value: dashboard?.stats?.totalEnquiries ?? 0, note: "Customer interest received", icon: MessageSquare, tint: "#eaf1ff", color: "#3563c9" },
    { label: "New enquiries", value: dashboard?.stats?.newEnquiries ?? 0, note: "Worth a quick follow-up", icon: TrendingUp, tint: "#fff3df", color: "#b66b08" },
    { label: "Partner rating", value: dashboard?.agent?.rating != null ? Number(dashboard.agent.rating).toFixed(1) : "—", note: "Your service rating", icon: Sparkles, tint: "#f3eaff", color: "#8556bd" },
  ];

  const actions = [
    { title: "Add a property", description: "Create a listing in a few simple steps.", icon: Plus, color: "#0f766e", bg: "#e5f4f1", path: "/partner/properties/add" },
    { title: "Manage listings", description: "Update details and check listing status.", icon: Home, color: "#3563c9", bg: "#eaf1ff", path: "/partner/properties" },
    { title: "Review leads", description: "Explore customer searches and preferences.", icon: Users, color: "#8556bd", bg: "#f3eaff", path: "/partner/leads" },
    { title: "View all enquiries", description: "See incoming property enquiries in one place.", icon: MessageSquare, color: "#b66b08", bg: "#fff3df", path: "/partner/enquiries" },
  ];

  const allRecent = [
    ...(dashboard?.recentProperties?.sale || []),
    ...(dashboard?.recentProperties?.rental || []),
  ].slice(0, 3);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Skeleton variant="rounded" height={210} sx={{ borderRadius: 5, mb: 3 }} />
        <Grid container spacing={2}>{[1, 2, 3, 4].map((n) => <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={n}><Skeleton variant="rounded" height={116} /></Grid>)}</Grid>
        <Skeleton variant="text" width={220} height={44} sx={{ mt: 4 }} />
        <Grid container spacing={2}>{[1, 2, 3, 4].map((n) => <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={n}><Skeleton variant="rounded" height={150} /></Grid>)}</Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
      <Box sx={{
        position: "relative", overflow: "hidden", borderRadius: { xs: "22px", md: "28px" },
        p: { xs: 2.5, sm: 3.5, md: 4.5 }, mb: 3,
        color: "#fff", background: "linear-gradient(115deg, #103f46 0%, #0f766e 58%, #1b9588 100%)",
        boxShadow: "0 16px 40px rgba(15, 118, 110, .17)",
      }}>
        <Box sx={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", border: "1px solid rgba(255,255,255,.12)", right: { xs: -110, md: 40 }, top: -130 }} />
        <Box sx={{ position: "absolute", width: 210, height: 210, borderRadius: "50%", border: "1px solid rgba(255,255,255,.1)", right: { xs: -75, md: 75 }, top: -95 }} />
        <Box sx={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", bgcolor: "rgba(255,255,255,.045)", right: { xs: -50, md: 110 }, top: -60 }} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ maxWidth: 620 }}>
            <Chip icon={<Sparkles size={13} />} label="PARTNER OVERVIEW" size="small" sx={{ mb: 2, bgcolor: "rgba(255,255,255,.14)", color: "#e8fffa", fontWeight: 800, letterSpacing: 1, "& .MuiChip-icon": { color: "#a7f3d0" } }} />
            <Typography sx={{ fontSize: { xs: 26, sm: 31, md: 36 }, lineHeight: 1.15, fontWeight: 850, letterSpacing: "-1.2px" }}>
              Welcome back{dashboard?.agent?.name ? `, ${dashboard.agent.name.split(" ")[0]}` : ""}.
            </Typography>
            <Typography sx={{ mt: 1.2, maxWidth: 520, color: "rgba(255,255,255,.78)", fontSize: { xs: 13, sm: 14 }, lineHeight: 1.8 }}>
              Your property business, leads and customer enquiries — all in one clear workspace.
            </Typography>
          </Box>
          <Button onClick={() => navigate("/partner/properties/add")} variant="contained" startIcon={<Plus size={18} />}
            sx={{ flexShrink: 0, px: 2.4, py: 1.35, bgcolor: "#fff", color: "#0f766e", borderRadius: "12px", fontWeight: 850, "&:hover": { bgcolor: "#eafffa" } }}>
            Add property
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={fetchDashboard}>Retry</Button>} sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map(({ label, value, note, icon: Icon, tint, color }) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={label}>
            <Card elevation={0} sx={{ height: "100%", border: "1px solid #e7edf3", borderRadius: "18px", bgcolor: "#fff", transition: "transform .2s ease, box-shadow .2s ease", "&:hover": { transform: "translateY(-3px)", boxShadow: "0 12px 26px rgba(16,42,67,.07)" } }}>
              <CardContent sx={{ p: 2.4, "&:last-child": { pb: 2.4 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ color: MUTED, fontWeight: 700, fontSize: 12 }}>{label}</Typography>
                    <Typography sx={{ mt: 1, fontSize: 31, lineHeight: 1.1, fontWeight: 850, letterSpacing: "-1px", color: INK }}>{value}</Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: "14px", display: "grid", placeItems: "center", bgcolor: tint, color }}><Icon size={21} strokeWidth={2.1} /></Box>
                </Stack>
                <Typography sx={{ mt: 1.6, color: "#91a0af", fontSize: 11.5 }}>{note}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.8 }}>
        <Box>
          <Typography sx={{ color: INK, fontWeight: 850, fontSize: 20, letterSpacing: "-.45px" }}>Quick actions</Typography>
          <Typography sx={{ color: MUTED, fontSize: 12.5, mt: .4 }}>The things you do most, just one click away.</Typography>
        </Box>
      </Stack>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {actions.map(({ title, description, icon: Icon, color, bg, path }) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={title}>
            <Card onClick={() => navigate(path)} elevation={0} sx={{ height: "100%", cursor: "pointer", border: "1px solid #e7edf3", borderRadius: "18px", transition: "all .2s ease", "&:hover": { borderColor: "#b7dcd6", transform: "translateY(-3px)", boxShadow: "0 12px 26px rgba(16,42,67,.07)" } }}>
              <CardContent sx={{ p: 2.3, "&:last-child": { pb: 2.3 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box sx={{ width: 43, height: 43, borderRadius: "13px", display: "grid", placeItems: "center", bgcolor: bg, color }}><Icon size={20} strokeWidth={2.2} /></Box>
                  <ArrowRight size={17} color="#9aabba" />
                </Stack>
                <Typography sx={{ mt: 2, color: INK, fontWeight: 850, fontSize: 14 }}>{title}</Typography>
                <Typography sx={{ mt: .6, color: MUTED, fontSize: 12, lineHeight: 1.65 }}>{description}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ border: "1px solid #e7edf3", borderRadius: "20px", bgcolor: "#fff", p: { xs: 2, sm: 2.7 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography sx={{ color: INK, fontWeight: 850, fontSize: 18, letterSpacing: "-.4px" }}>Recently added properties</Typography>
            <Typography sx={{ color: MUTED, fontSize: 12, mt: .35 }}>A quick look at your latest listings.</Typography>
          </Box>
          <Button onClick={() => navigate("/partner/properties")} endIcon={<ChevronRight size={16} />} sx={{ color: TEAL, fontSize: 12 }}>View all</Button>
        </Stack>
        {allRecent.length === 0 ? (
          <Box sx={{ py: 4, px: 2, textAlign: "center", borderRadius: "15px", bgcolor: "#f8fafc", border: "1px dashed #dbe5ec" }}>
            <Box sx={{ mx: "auto", width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: "14px", bgcolor: "#e5f4f1", color: TEAL }}><Building2 size={22} /></Box>
            <Typography sx={{ mt: 1.5, color: INK, fontWeight: 800, fontSize: 14 }}>Your next listing starts here</Typography>
            <Typography sx={{ mt: .5, color: MUTED, fontSize: 12 }}>Add a property to start building your portfolio.</Typography>
            <Button onClick={() => navigate("/partner/properties/add")} variant="contained" startIcon={<Plus size={16} />} sx={{ mt: 1.8, bgcolor: TEAL }}>Add your first property</Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {allRecent.map((property) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={property._id}>
                <Card elevation={0} onClick={() => navigate(`/partner/properties/${property._id}`)} sx={{ display: "flex", height: "100%", overflow: "hidden", border: "1px solid #edf1f5", borderRadius: "14px", cursor: "pointer", "&:hover": { bgcolor: "#fbfdfd" } }}>
                  <Box sx={{ width: 112, minHeight: 120, flexShrink: 0, bgcolor: "#edf2f7", backgroundImage: property.images?.[0] ? `url(${property.images[0]})` : "none", backgroundSize: "cover", backgroundPosition: "center", display: "grid", placeItems: "center" }}>
                    {!property.images?.[0] && <Home size={25} color="#a0aec0" />}
                  </Box>
                  <CardContent sx={{ p: 1.7, minWidth: 0, flex: 1, "&:last-child": { pb: 1.7 } }}>
                    <Typography sx={{ fontWeight: 800, color: INK, fontSize: 13, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{property.title || "Property listing"}</Typography>
                    <Typography sx={{ mt: .5, fontSize: 11, color: MUTED }}>{property.Sector || "Location not specified"}</Typography>
                    <Typography sx={{ mt: 1.2, fontSize: 14, fontWeight: 850, color: TEAL }}>
                      {property.propertyType === "rental" ? `₹${Number(property.monthlyRent || property.price || 0).toLocaleString("en-IN")}/mo` : property.price ? `₹${(Number(property.price) / 100000).toFixed(1)}L` : "Price on request"}
                    </Typography>
                    <Chip size="small" icon={<CheckCircle2 size={12} />} label={property.isActive ? "Active" : "Pending"} sx={{ mt: 1, height: 22, bgcolor: property.isActive ? "#e5f6ed" : "#fff3df", color: property.isActive ? "#18794e" : "#9a6200", fontSize: 10, fontWeight: 800, "& .MuiChip-icon": { color: "inherit" } }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default PartnerHubDashboard;
