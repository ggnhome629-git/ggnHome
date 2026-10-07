import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Menu as MuiMenu,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Home as HomeIcon,
  LogOut,
  Menu as HamburgerIcon,
  Plus,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../Context/AuthContext";
import { ADMIN_NAV, ADMIN_NAV_ITEMS, adminCrumb } from "./adminNav";

const RAIL_WIDTH = 264;
const RAIL_WIDTH_COMPACT = 76;

const readCollapsed = () => {
  try {
    return window.localStorage.getItem("admin:railCollapsed") === "1";
  } catch {
    return false;
  }
};

const writeCollapsed = (value) => {
  try {
    window.localStorage.setItem("admin:railCollapsed", value ? "1" : "0");
  } catch {
    /* private mode — preference is simply not persisted */
  }
};

/** Nav rows shared by the rail and the mobile drawer. */
function NavList({ compact, onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Box sx={{ flex: 1, overflowY: "auto", py: 2 }}>
      {ADMIN_NAV.map((section) => (
        <Box key={section.group} sx={{ mb: 2 }}>
          {!compact && (
            <Typography
              variant="caption"
              sx={{ display: "block", px: 4, pb: 1, color: "#9AA7B4", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              {section.group}
            </Typography>
          )}
          {section.items.map((item) => {
            const active = location.pathname === item.route || location.pathname.startsWith(`${item.route}/`);
            const Icon = item.icon;
            const row = (
              <Box
                key={item.id}
                onClick={() => {
                  navigate(item.route);
                  onNavigate?.();
                }}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(item.route);
                    onNavigate?.();
                  }
                }}
                aria-current={active ? "page" : undefined}
                sx={{
                  position: "relative",
                  display: "flex",
                  flexDirection: compact ? "column" : "row",
                  alignItems: "center",
                  gap: compact ? 0.5 : 2,
                  mx: 2,
                  mb: 0.5,
                  px: compact ? 1 : 2.5,
                  py: compact ? 1.5 : 2,
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: active ? "#003366" : "#5B6B7B",
                  backgroundColor: active ? "rgba(0,167,157,0.10)" : "transparent",
                  fontWeight: active ? 700 : 500,
                  fontSize: compact ? "0.625rem" : "0.875rem",
                  lineHeight: 1.2,
                  textAlign: "center",
                  transition: "background-color .15s ease, color .15s ease",
                  "&::before": active
                    ? { content: '""', position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: "60%", backgroundColor: "#00A79D", borderRadius: "0 3px 3px 0" }
                    : undefined,
                  "&:hover": { backgroundColor: "#F0F6F9", color: "#003366" },
                  "&:focus-visible": { outline: "2px solid #00A79D", outlineOffset: 1 },
                }}
              >
                <Icon size={compact ? 20 : 18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                <Box component="span" sx={{ whiteSpace: compact ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: compact ? 64 : "none" }}>
                  {item.label}
                </Box>
              </Box>
            );
            return compact ? (
              <Tooltip key={item.id} title={item.label} placement="right">
                {row}
              </Tooltip>
            ) : (
              row
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

/** Ctrl/Cmd+K page picker — pages only until the global search API lands. */
function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ADMIN_NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(q)) : ADMIN_NAV_ITEMS;
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  const go = (item) => {
    navigate(item.route);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: "12px", mt: "8vh", alignSelf: "flex-start", overflow: "hidden" } } }}
    >
      <TextField
        autoFocus
        fullWidth
        variant="outlined"
        placeholder="Search users, properties, agents, enquiries…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter" && results[cursor]) {
            go(results[cursor]);
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={18} color="#5B6B7B" />
            </InputAdornment>
          ),
        }}
        sx={{ "& .MuiOutlinedInput-notchedOutline": { border: "none" } }}
      />
      <Divider />
      <List sx={{ maxHeight: 360, overflowY: "auto", py: 1 }}>
        {results.length === 0 && (
          <Typography variant="body2" sx={{ px: 3, py: 3, color: "text.secondary" }}>
            No pages match “{query}”
          </Typography>
        )}
        {results.map((item, index) => {
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.id}
              selected={index === cursor}
              onMouseEnter={() => setCursor(index)}
              onClick={() => go(item)}
              sx={{ px: 3, py: 1.5 }}
            >
              <Icon size={18} strokeWidth={1.75} color="#00A79D" style={{ marginRight: 12 }} />
              <ListItemText
                primary={item.label}
                secondary={item.group}
                primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: "0.72rem" }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Dialog>
  );
}

/** Full-page skeleton while auth resolves (PART 4: "Checking access…"). */
function ShellSkeleton() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#F4F7F9" }}>
      <Box sx={{ width: { xs: 0, md: RAIL_WIDTH }, bgcolor: "#FFFFFF", borderRight: "1px solid #E5E9EE", p: 3, display: { xs: "none", md: "block" } }}>
        <Skeleton width={140} height={34} />
        <Skeleton width="80%" height={44} sx={{ mt: 4 }} />
        <Skeleton width="70%" height={44} sx={{ mt: 1 }} />
        <Skeleton width="75%" height={44} sx={{ mt: 1 }} />
      </Box>
      <Box sx={{ flex: 1, p: 6 }}>
        <Skeleton width={240} height={36} />
        <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, mt: 5 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: "12px" }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: "12px", mt: 5 }} />
      </Box>
    </Box>
  );
}

/** Friendly 403 — never a bare error page (PART 4 access states). */
function AccessDenied() {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F4F7F9", p: 4 }}>
      <Stack spacing={3} alignItems="center" sx={{ maxWidth: 420, textAlign: "center" }}>
        <Box sx={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "rgba(0,167,157,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldAlert size={28} color="#00A79D" />
        </Box>
        <Typography variant="h2" sx={{ fontSize: "1.35rem", color: "primary.main", fontWeight: 700 }}>
          You need admin access
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          This console is limited to GgnHome administrators. Sign in with an admin account, or head back to the site.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={() => navigate("/login")}>
            Sign in
          </Button>
          <Button variant="outlined" onClick={() => navigate("/")} sx={{ borderColor: "divider", color: "text.secondary" }}>
            Go home
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

/**
 * PART 4 app shell: the Material-3 navigation rail, sticky top bar with
 * breadcrumbs / command palette / quick actions / user menu, and the outlet
 * every /admin/* screen renders inside. It also owns auth access states so
 * individual pages no longer copy fetchUser/handleLogout boilerplate.
 */
export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const wide = useMedia("(min-width:1200px)");
  const [userCollapsed, setUserCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickAnchor, setQuickAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);

  const collapsed = !wide || userCollapsed;
  const crumb = adminCrumb(location.pathname);

  // Ctrl/Cmd + K opens the command palette (8.8).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Route changes close transient surfaces.
  useEffect(() => {
    setDrawerOpen(false);
    setQuickAnchor(null);
    setUserAnchor(null);
  }, [location.pathname]);

  if (loading) return <ShellSkeleton />;
  if (!user || user.role !== "admin") return <AccessDenied />;

  const initials = String(user.name || user.email || "A")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const signOut = async () => {
    setUserAnchor(null);
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  const rail = (
    <>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ px: collapsed ? 2 : 4, py: 3, minHeight: 64 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "8px",
            backgroundImage: "linear-gradient(120deg, #002244 0%, #003366 45%, #0B5C7A 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "0.85rem",
            flexShrink: 0,
          }}
        >
          G
        </Box>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1.1 }}>
              GgnHome
            </Typography>
            <Chip label="Admin" size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, borderRadius: "999px", backgroundColor: "rgba(0,167,157,0.14)", color: "#00857D", mt: 0.5 }} />
          </Box>
        )}
      </Stack>

      <NavList compact={collapsed} onNavigate={() => setDrawerOpen(false)} />

      <Box sx={{ p: 2, borderTop: "1px solid #E5E9EE" }}>
        <IconButton
          onClick={() => {
            const next = !userCollapsed;
            setUserCollapsed(next);
            writeCollapsed(next);
          }}
          aria-label={userCollapsed ? "Expand navigation" : "Collapse navigation"}
          sx={{ width: 40, height: 40 }}
        >
          {userCollapsed ? <ChevronRight size={18} color="#5B6B7B" /> : <ChevronLeft size={18} color="#5B6B7B" />}
        </IconButton>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#F4F7F9" }}>
      {/* Navigation rail: expanded >=1200, compact 900-1199 (and on toggle), hidden below 900 */}
      <Box
        component="nav"
        aria-label="Admin navigation"
        sx={{
          width: collapsed ? RAIL_WIDTH_COMPACT : RAIL_WIDTH,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid #E5E9EE",
          overflow: "hidden",
        }}
      >
        {rail}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <Box
          component="header"
          sx={{
            position: "sticky",
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: { xs: 4, md: 6 },
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #E5E9EE",
          }}
        >
          <IconButton className="md:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" sx={{ display: { xs: "inline-flex", md: "none" } }}>
            <HamburgerIcon size={20} color="#003366" />
          </IconButton>

          {/* Breadcrumbs: Admin / group / page */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, display: { xs: "none", sm: "flex" } }}>
            <HomeIcon size={14} color="#9AA7B4" />
            <Typography variant="body2" sx={{ color: "#9AA7B4" }}>
              Admin
            </Typography>
            <Typography variant="body2" sx={{ color: "#9AA7B4" }}>
              /
            </Typography>
            <Typography variant="body2" sx={{ color: "#5B6B7B" }}>
              {crumb.group}
            </Typography>
            <Typography variant="body2" sx={{ color: "#9AA7B4" }}>
              /
            </Typography>
            <Typography variant="body2" sx={{ color: "#003366", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {crumb.label}
            </Typography>
          </Stack>

          {/* Command palette trigger */}
          <Box
            onClick={() => setPaletteOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setPaletteOpen(true)}
            sx={{
              ml: "auto",
              display: { xs: "none", lg: "flex" },
              alignItems: "center",
              gap: 1.5,
              width: 360,
              px: 2.5,
              py: 1.25,
              borderRadius: "8px",
              border: "1px solid #E5E9EE",
              backgroundColor: "#F4F7F9",
              color: "#9AA7B4",
              cursor: "pointer",
              "&:hover": { borderColor: "#00A79D" },
              "&:focus-visible": { outline: "2px solid #00A79D", outlineOffset: 1 },
            }}
          >
            <Search size={16} />
            <Typography variant="body2" sx={{ flex: 1 }}>
              Search users, properties, agents…
            </Typography>
            <Typography variant="caption" sx={{ color: "#9AA7B4", border: "1px solid #E5E9EE", borderRadius: "4px", px: 1, py: 0.25 }}>
              Ctrl K
            </Typography>
          </Box>

          <Box sx={{ flex: 1, display: { xs: "block", lg: "none" } }} />

          <IconButton onClick={() => setPaletteOpen(true)} aria-label="Search" sx={{ display: { xs: "inline-flex", lg: "none" } }}>
            <Search size={18} color="#5B6B7B" />
          </IconButton>

          <Tooltip title="Quick actions">
            <IconButton onClick={(e) => setQuickAnchor(e.currentTarget)} aria-label="Quick actions">
              <Plus size={20} color="#003366" />
            </IconButton>
          </Tooltip>

          <Button
            size="small"
            endIcon={<ExternalLink size={14} />}
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "text.secondary", display: { xs: "none", sm: "inline-flex" } }}
          >
            View site
          </Button>

          <IconButton onClick={(e) => setUserAnchor(e.currentTarget)} aria-label="Account menu" sx={{ ml: 0.5 }}>
            <Avatar sx={{ width: 34, height: 34, backgroundColor: "#003366", fontSize: "0.8rem", fontWeight: 700 }}>
              {initials}
            </Avatar>
          </IconButton>
        </Box>

        {/* Page content */}
        <Box component="main" sx={{ flex: 1, width: "100%", maxWidth: 1440, mx: "auto", p: { xs: 4, md: 6 } }}>
          <Outlet />
        </Box>
      </Box>

      {/* Mobile navigation drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 288, backgroundColor: "#FFFFFF" } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
            Admin
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </IconButton>
        </Stack>
        <Divider />
        <NavList compact={false} onNavigate={() => setDrawerOpen(false)} />
      </Drawer>

      {/* Quick actions */}
      <MuiMenu open={Boolean(quickAnchor)} anchorEl={quickAnchor} onClose={() => setQuickAnchor(null)}>
        <MenuItem onClick={() => navigate("/admin/add-property")}>Add property</MenuItem>
        <MenuItem onClick={() => navigate("/admin/agent-registration")}>Register agent</MenuItem>
        <MenuItem onClick={() => navigate("/admin/promos")}>New promo</MenuItem>
        <MenuItem onClick={() => navigate("/admin/rewards")}>Send reward</MenuItem>
      </MuiMenu>

      {/* User menu — sign out lives only here (PART 4) */}
      <MuiMenu open={Boolean(userAnchor)} anchorEl={userAnchor} onClose={() => setUserAnchor(null)}>
        <Box sx={{ px: 3, py: 2, minWidth: 220 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
            {user.name || user.email}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Chip label={user.role === "superadmin" ? "Super Admin" : "Admin"} size="small" sx={{ fontWeight: 700, borderRadius: "999px", backgroundColor: "rgba(0,167,157,0.14)", color: "#00857D" }} />
          </Stack>
        </Box>
        <Divider />
        <MenuItem onClick={signOut}>
          <LogOut size={16} style={{ marginRight: 10 }} /> Sign out
        </MenuItem>
      </MuiMenu>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </Box>
  );
}

/** Minimal matchMedia hook — avoids pulling in MUI's useMediaQuery SSR path. */
function useMedia(query) {
  const [matches, setMatches] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : true));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
