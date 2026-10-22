import React, { Suspense, useEffect, useState } from "react";
import {
  AppBar, Avatar, Box, Button, Divider, Drawer, IconButton, LinearProgress, List,
  ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Tooltip, Typography,
} from "@mui/material";
import {
  Building2, ChevronRight, ClipboardList, Download, ExternalLink, Home, LayoutDashboard,
  LogOut, Menu, MessageSquare, UserRound, X,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { PostPropertyIcon } from "../../components/ui/PostActionIcon";

const NAV_ITEMS = [
  { label: "Overview", caption: "Your workspace", path: "/partner/dashboard", icon: LayoutDashboard },
  { label: "My properties", caption: "Manage listings", path: "/partner/properties", icon: Building2 },
  { label: "Leads", caption: "Customer preferences", path: "/partner/leads", icon: ClipboardList },
  { label: "All enquiries", caption: "Incoming requests", path: "/partner/enquiries", icon: MessageSquare },
  { label: "My profile", caption: "Account details", path: "/partner/profile", icon: UserRound },
];

const SIDEBAR_WIDTH = 258;

// Downloads the code of every partner page in the background, so moving between pages is instant.
const prefetchPartnerPages = () => Promise.all([
  import("./Dashboard/PartnerHubDashboard"),
  import("./Properties/PartnerHubProperties"),
  import("./Properties/PartnerPropertyAdd"),
  import("./Leads/PartnerHubLeads"),
  import("./Enquiries/PartnerHubEnquiries"),
  import("./Profile/PartnerHubProfile"),
]).catch(() => {});

// Shown inside the page area only (the menu and header stay) while a page's code arrives.
const PageArea = () => <Box role="status" aria-live="polite"><LinearProgress sx={{ height: 3 }} /></Box>;

function SidebarContent({ pathname, navigate, onNavigate }) {
  const active = (path) => path === "/partner/properties"
    ? pathname === path || pathname.startsWith("/partner/properties/")
    : pathname === path || (path === "/partner/dashboard" && pathname === "/partner");
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#fff" }}>
      <Box sx={{ px: 2.6, py: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.2}>
          <Box sx={{ width: 40, height: 40, borderRadius: "13px", display: "grid", placeItems: "center", color: "#fff", bgcolor: "#0f766e", boxShadow: "0 6px 16px rgba(15,118,110,.22)" }}>
            <Home size={21} strokeWidth={2.4} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 19, lineHeight: 1.1, letterSpacing: "-.6px", fontWeight: 850, color: "#102a43" }}>ggnHome</Typography>
            <Typography sx={{ mt: .4, fontSize: 10, letterSpacing: 1.5, fontWeight: 800, color: "#0f766e", textTransform: "uppercase" }}>Partner workspace</Typography>
          </Box>
        </Stack>
      </Box>
      <Divider sx={{ borderColor: "#edf2f7" }} />
      <Box sx={{ px: 2, pt: 3, pb: 1 }}>
        <Typography sx={{ px: 1.2, mb: 1.2, color: "#94a3b8", fontSize: 10, letterSpacing: 1.3, fontWeight: 800, textTransform: "uppercase" }}>Workspace</Typography>
        <List disablePadding sx={{ display: "grid", gap: .55 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = active(item.path);
            return (
              <ListItemButton key={item.path} onClick={() => { navigate(item.path); onNavigate?.(); }} selected={selected}
                sx={{
                  minHeight: 54, px: 1.35, py: .8, borderRadius: "12px", alignItems: "center",
                  color: selected ? "#0f766e" : "#526477",
                  "&.Mui-selected": { bgcolor: "#e9f7f4" },
                  "&.Mui-selected:hover": { bgcolor: "#dff3ef" },
                  "&:hover": { bgcolor: "#f7fafc" },
                }}>
                <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}><Icon size={19} strokeWidth={selected ? 2.4 : 1.9} /></ListItemIcon>
                <ListItemText primary={item.label} secondary={item.caption}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: selected ? 800 : 700, color: selected ? "#0f766e" : "#243b53" }}
                  secondaryTypographyProps={{ fontSize: 11, color: selected ? "#438b82" : "#94a3b8" }} />
                {selected && <ChevronRight size={16} />}
              </ListItemButton>
            );
          })}
        </List>
      </Box>
      <Box sx={{ mt: "auto", p: 2 }}>
        <Box sx={{ p: 1.8, borderRadius: "15px", bgcolor: "#f3f8f7", border: "1px solid #e2efed" }}>
          <Typography sx={{ fontWeight: 800, fontSize: 12, color: "#183b42" }}>Need a hand?</Typography>
          <Typography sx={{ mt: .5, fontSize: 11, lineHeight: 1.6, color: "#668087" }}>Keep your listings up to date to help customers find the right home.</Typography>
          <Button size="small" onClick={() => navigate("/partner/properties/add")} endIcon={<PostPropertyIcon size={14} />}
            sx={{ mt: 1, p: 0, fontWeight: 800, textTransform: "none", color: "#0f766e", fontSize: 12 }}>Add a property</Button>
          <Button component="a" href={(process.env.REACT_APP_Base_API || "") + "/api/app-downloads/partner.apk"} download size="small" startIcon={<Download size={14} />}
            sx={{ mt: 1, p: 0, fontWeight: 800, textTransform: "none", color: "#0f766e", fontSize: 12, justifyContent: "flex-start" }}>Download Partner APK</Button>
        </Box>
        <Typography sx={{ mt: 2, px: .5, fontSize: 10, color: "#a0aec0" }}>ggnHome Partner Portal</Typography>
      </Box>
    </Box>
  );
}

export default function PartnerHubLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAddPage = location.pathname === "/partner/properties/add";

  useEffect(() => {
    const run = () => { prefetchPartnerPages(); };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(run, 1200);
    return () => clearTimeout(timer);
  }, []);
  const current = location.pathname === "/partner/properties/add"
    ? { label: "Add a property" }
    : /^\/partner\/properties\/(sale|rental)\//.test(location.pathname)
      ? { label: "Property details" }
      : NAV_ITEMS.find((item) => item.path === location.pathname)
      || (location.pathname.startsWith("/partner/properties") ? NAV_ITEMS[1] : NAV_ITEMS[0]);
  const logout = () => {
    localStorage.removeItem("partnerAccessToken");
    navigate("/partner/login");
  };
  const sidebar = <SidebarContent pathname={location.pathname} navigate={navigate} onNavigate={() => setMobileOpen(false)} />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb", color: "#102a43" }}>
      <Box component="aside" sx={{ display: { xs: "none", md: "block" }, width: SIDEBAR_WIDTH, position: "fixed", inset: "0 auto 0 0", borderRight: "1px solid #e7edf3", zIndex: 1200 }}>
        {sidebar}
      </Box>
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, maxWidth: "86vw", border: 0 } }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}><IconButton onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></IconButton></Box>
        {sidebar}
      </Drawer>
      <Box sx={{ minWidth: 0, ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` } }}>
        <AppBar position={isAddPage ? "static" : "sticky"} elevation={0} sx={{ bgcolor: "rgba(255,255,255,.92)", color: "#102a43", borderBottom: "1px solid #e7edf3", backdropFilter: "blur(12px)" }}>
          <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, px: { xs: 2, sm: 3, lg: 4 }, gap: 1.5 }}>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { xs: "inline-flex", md: "none" }, color: "#334e68" }} aria-label="Open navigation"><Menu size={21} /></IconButton>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.25, color: "#8a9bad", fontWeight: 800 }}>Partner portal</Typography>
              <Typography noWrap sx={{ mt: .2, fontSize: { xs: 16, sm: 18 }, fontWeight: 800, letterSpacing: "-.35px", color: "#102a43" }}>{current.label}</Typography>
            </Box>
            <Tooltip title="Open public website">
              <Button onClick={() => navigate("/")} startIcon={<ExternalLink size={16} />} sx={{ display: { xs: "none", sm: "inline-flex" }, color: "#526477", border: "1px solid #e1e8ef", borderRadius: "10px", px: 1.5, textTransform: "none", fontWeight: 700, fontSize: 12 }}>View website</Button>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ my: 1.8, borderColor: "#e7edf3", display: { xs: "none", sm: "block" } }} />
            <Tooltip title="Sign out">
              <IconButton onClick={logout} sx={{ border: "1px solid #e1e8ef", borderRadius: "11px", color: "#526477", width: 40, height: 40 }} aria-label="Sign out"><LogOut size={18} /></IconButton>
            </Tooltip>
            <Avatar sx={{ width: 36, height: 36, bgcolor: "#d9f1ec", color: "#0f766e", fontWeight: 900, fontSize: 13 }}>P</Avatar>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ minHeight: "calc(100vh - 72px)", "& .MuiContainer-root": { maxWidth: "1440px" }, "& .MuiPaper-root": { borderColor: "#e7edf3" }, "& .MuiButton-root": { borderRadius: "10px", fontWeight: 700, textTransform: "none" }, "& .MuiButton-containedPrimary": { bgcolor: "#0f766e", color: "#fff", "&:hover": { bgcolor: "#115e59" } }, "& .MuiButton-outlinedPrimary": { color: "#0f766e", borderColor: "#b8dcd6", "&:hover": { borderColor: "#0f766e", bgcolor: "#f1faf8" } }, "& .MuiOutlinedInput-root": { borderRadius: "10px" }, "& .MuiTableContainer-root": { borderRadius: "16px", boxShadow: "0 4px 18px rgba(16,42,67,.035)", overflowX: "auto" }, "& .MuiTable-root": { minWidth: 760 }, "& .MuiTableHead-root .MuiTableCell-root": { bgcolor: "#f3f7fa", color: "#526477", fontSize: 11, letterSpacing: ".35px", textTransform: "uppercase", borderBottom: "1px solid #e5edf3", py: 1.8 }, "& .MuiTableBody-root .MuiTableCell-root": { color: "#334e68", fontSize: 12.5, borderBottom: "1px solid #edf2f7", py: 1.65 }, "& .MuiTableBody-root .MuiTableRow-root:hover": { bgcolor: "#f8fcfb" } }}>
          {children ?? <Suspense fallback={<PageArea />}><Outlet /></Suspense>}
        </Box>
      </Box>
    </Box>
  );
}
