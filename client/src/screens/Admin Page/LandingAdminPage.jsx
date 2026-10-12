import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, LayoutDashboard, Users, MessageSquare, Home, ArrowRight, Settings, LockKeyhole, Unlock, EyeOff, Megaphone, CreditCard } from 'lucide-react';
import { Box, Button, Card, CardContent, TextField, Typography, Alert, Chip, IconButton, Tooltip, Divider, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";

import './admin.css';
import { ADMIN_NAV } from "./shell/adminNav";

// Card icon for each side-nav group on the landing page.
const GROUP_ICONS = {
  Overview: LayoutDashboard,
  Listings: Home,
  People: Users,
  Leads: MessageSquare,
  Marketing: Megaphone,
  Money: CreditCard,
  System: Settings,
};

const AdminLandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const emailRef = useRef();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [hiddenRoutes, setHiddenRoutes] = useState([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [toolsSaving, setToolsSaving] = useState(false);
  const [toolsError, setToolsError] = useState("");

  const handleNavigation = (route) => {
    navigate(route);
  };

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_Base_API}/api/users?role=admin`, {
          credentials: "include",
        });
        const data = await res.json();
        if (Array.isArray(data)) setAdmins(data);
      } catch (error) {
        console.error("Error fetching admins:", error);
      }
    };
    fetchAdmins();
  }, []);

  const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    navigate("/admin/Landingpage");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  // Dashboard tool locks: applied instantly, saved to the server, and cached
  // in this browser so they still show if the server is briefly unreachable.
  const TOOLS_CACHE_KEY = "ggn:adminHiddenTools";
  const hiddenRef = useRef([]);
  const saveSeq = useRef(0);
  const readCache = () => {
    try {
      const v = JSON.parse(localStorage.getItem(TOOLS_CACHE_KEY) || "[]");
      return Array.isArray(v) ? v.filter((r) => typeof r === "string") : [];
    } catch (_) {
      return [];
    }
  };
  const applyHidden = (list) => {
    hiddenRef.current = list;
    setHiddenRoutes(list);
    try {
      localStorage.setItem(TOOLS_CACHE_KEY, JSON.stringify(list));
    } catch (_) {
      // storage blocked — server copy still applies
    }
  };
  const authHeaders = (json) => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) };
  };
  const readJson = async (response) => {
    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  };
  const toolsErrorFor = (response, data, fallback) => {
    if (response.status === 401 || response.status === 403) return "Your admin session has expired — sign in again to lock or unlock tools.";
    if (response.status === 404) return "The server hasn't been updated with tool locks yet. Your changes are kept in this browser until it is.";
    return (data && data.message) || fallback;
  };

  useEffect(() => {
    const cached = readCache();
    if (cached.length) applyHidden(cached);
    const loadDashboardTools = async () => {
      try {
        const response = await fetch((process.env.REACT_APP_Base_API || "") + "/api/admin/dashboard-tools", {
          credentials: "include",
          headers: authHeaders(false),
        });
        const data = await readJson(response);
        if (!response.ok || !data || !data.success) throw new Error(toolsErrorFor(response, data, "Could not load dashboard preferences."));
        applyHidden(Array.isArray(data.hiddenRoutes) ? data.hiddenRoutes : []);
      } catch (error) {
        setToolsError(error.message || "Could not load dashboard preferences.");
      } finally {
        setToolsLoading(false);
      }
    };
    loadDashboardTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleToolVisibility = async (route) => {
    const previous = hiddenRef.current;
    const next = previous.includes(route) ? previous.filter((item) => item !== route) : [...previous, route];
    applyHidden(next); // instant — no waiting on the network
    const seq = ++saveSeq.current;
    setToolsSaving(true);
    setToolsError("");
    try {
      const response = await fetch((process.env.REACT_APP_Base_API || "") + "/api/admin/dashboard-tools", {
        method: "PUT",
        credentials: "include",
        headers: authHeaders(true),
        body: JSON.stringify({ hiddenRoutes: next }),
      });
      const data = await readJson(response);
      if (response.status === 404) {
        // Older server without tool locks: keep the local copy.
        setToolsError(toolsErrorFor(response, data));
        return;
      }
      if (!response.ok || !data || !data.success) throw new Error(toolsErrorFor(response, data, "Could not save dashboard preferences."));
      if (seq === saveSeq.current) applyHidden(Array.isArray(data.hiddenRoutes) ? data.hiddenRoutes : next);
    } catch (error) {
      if (seq === saveSeq.current) applyHidden(previous); // roll back the optimistic change
      setToolsError(error.message || "Could not save dashboard preferences.");
    } finally {
      if (seq === saveSeq.current) setToolsSaving(false);
    }
  };

  // Use admin shell instead of public nav - handled by AdminLayout now

  const handleUpdateRole = async () => {
    const email = emailRef.current?.value;
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter an email' });
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/api/admin/update-role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role: "admin" }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Admin role updated successfully' });
        setAdmins((prev) => [...prev, data.user]);
        emailRef.current.value = "";
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update role' });
      }
    } catch (err) {
      console.error("Error updating role:", err);
      setMessage({ type: 'error', text: 'Error updating role' });
    } finally {
      setLoading(false);
    }
  };

  // Built from ADMIN_NAV — the same list as the left side nav — so every
  // section and shortcut appears in both places and they can't drift apart.
  // "Home" is this page itself, so it isn't repeated as a shortcut.
  const adminGroups = ADMIN_NAV.map((section) => ({
    id: section.group.toLowerCase(),
    title: section.group,
    icon: GROUP_ICONS[section.group] || section.items[0]?.icon || LayoutDashboard,
    color: section.color,
    links: section.items
      .filter((item) => item.route !== "/admin/Landingpage")
      .map((item) => ({ label: item.label, route: item.route, notSetUp: item.notSetUp })),
  })).filter((group) => group.links.length > 0);

  const visibleAdminGroups = adminGroups
    .map((group) => ({ ...group, links: group.links.filter((link) => !hiddenRoutes.includes(link.route)) }))
    .filter((group) => group.links.length > 0);
  const hiddenTools = adminGroups.flatMap((group) =>
    group.links.filter((link) => hiddenRoutes.includes(link.route)).map((link) => ({ ...link, groupTitle: group.title, groupColor: group.color }))
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F4F7F9', p: { xs: 4, md: 6 }, pt: { xs: 16, md: 0 } }}>
      {/* Admin shell is provided by AdminLayout - no need for TopNavigationBar here */}
      <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
        {/* Header */}
        <Box
          sx={{
            mb: 6, p: { xs: 4, md: 6 }, borderRadius: '16px', color: '#fff',
            backgroundImage: 'linear-gradient(120deg, #002244 0%, #003366 40%, #0B7A85 80%, #00A79D 100%)',
            boxShadow: '0 12px 32px rgba(0,51,102,0.25)', position: 'relative', overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(34,211,238,0.18)' }} />
          <Box sx={{ position: 'absolute', right: 120, bottom: -70, width: 160, height: 160, borderRadius: '50%', background: 'rgba(139,92,246,0.22)' }} />
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Sparkles size={22} color="#FCD34D" />
            <Typography variant="h1" sx={{ fontSize: { xs: '24px', md: '32px' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              Welcome back{user?.name ? `, ${String(user.name).split(' ')[0]}` : ''}
            </Typography>
          </Box>
          <Typography sx={{ position: 'relative', color: 'rgba(255,255,255,0.85)', fontSize: { xs: '14px', md: '16px' } }}>
            Everything you manage on GgnHome, in one place. Pick a section to get started.
          </Typography>
          <Box sx={{ position: 'relative', display: 'flex', gap: 1, mt: 3, flexWrap: 'wrap' }}>
            <Chip label={toolsLoading ? "Loading tools…" : (adminGroups.flatMap((group) => group.links).length - hiddenTools.length) + " active tools"} sx={{ bgcolor: 'rgba(255,255,255,.14)', color: '#fff', fontWeight: 800 }} />
            <Chip label={hiddenTools.length + " hidden"} icon={<EyeOff size={14} />} sx={{ bgcolor: 'rgba(255,255,255,.10)', color: '#fff', fontWeight: 700, '& .MuiChip-icon': { color: '#fff' } }} />
            {toolsSaving && <Chip label="Saving…" sx={{ bgcolor: 'rgba(255,255,255,.10)', color: '#fff' }} />}
          </Box>
        </Box>

        {/* Main Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 4,
          }}
        >
          {visibleAdminGroups.map((group) => {
            const Icon = group.icon;
            return (
              <Card
                key={group.id}
                sx={{ height: '100%', border: `1px solid ${group.color}33`, borderTop: `4px solid ${group.color}`, backgroundImage: `linear-gradient(160deg, ${group.color}12 0%, #fff 50%)`, boxShadow: '0 2px 8px rgba(0,51,102,0.05)', transition: 'transform .15s ease, box-shadow .15s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 28px ${group.color}30` } }}
              >
                <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: group.color, color: '#fff', boxShadow: `0 4px 10px ${group.color}55` }}>
                      <Icon size={22} strokeWidth={1.75} />
                    </Box>
                    <Typography variant="h3" sx={{ fontSize: '18px', fontWeight: 700 }}>
                      {group.title}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {group.links.map((link) => (
                      <Box
                        key={link.route}
                        role="link"
                        tabIndex={0}
                        onClick={() => handleNavigation(link.route)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNavigation(link.route)}
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          py: 1.5, px: 2, borderRadius: 1.5, cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                          color: 'text.primary',
                          '&:hover': { bgcolor: `${group.color}10`, color: group.color },
                          '&:focus-visible': { outline: '2px solid #00A79D' },
                        }}
                      >
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: link.notSetUp ? 0.6 : 1 }}>
                          {link.label}
                          {link.notSetUp && (
                            <Chip label="Not set up" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: 'rgba(100,116,139,0.16)', color: '#64748B' }} />
                          )}
                        </Box>
                        <ArrowRight size={16} />
                        <Tooltip title="Hide this tool from the main dashboard">
                          <span>
                            <IconButton size="small" disabled={toolsLoading} aria-label={"Hide " + link.label + " from dashboard"} onClick={(e) => { e.stopPropagation(); toggleToolVisibility(link.route); }} onKeyDown={(e) => e.stopPropagation()} sx={{ ml: 0.5, mr: -0.5, color: '#64748b' }}>
                              <LockKeyhole size={15} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {toolsError && <Alert severity="error" sx={{ mt: 3 }}>{toolsError}</Alert>}

        {hiddenTools.length > 0 && (
          <Box sx={{ mt: 4, p: { xs: 2.5, md: 3.5 }, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 4px 18px rgba(16,42,67,.035)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <EyeOff size={20} color="#64748b" />
              <Typography variant="h2" sx={{ fontSize: { xs: 18, md: 21 }, fontWeight: 800, color: '#102a43' }}>Hidden tools</Typography>
              <Chip label={hiddenTools.length} size="small" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>These shortcuts are hidden from the main dashboard only. Restore a tool to show it in its original card again.</Typography>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
              {hiddenTools.map((tool) => (
                <Box key={tool.route} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #edf2f7' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 750, color: '#334155' }}>{tool.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{tool.groupTitle}</Typography>
                  </Box>
                  <Tooltip title="Restore to main dashboard">
                    <span><IconButton size="small" aria-label={"Restore " + tool.label + " to dashboard"} onClick={() => toggleToolVisibility(tool.route)} sx={{ color: '#0f766e', border: '1px solid #b8dcd6', borderRadius: 2 }}>
                      <Unlock size={16} />
                    </IconButton></span>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Admin Access Management */}
        <Box
          sx={{
            mt: 8,
            p: { xs: 3, md: 5 },
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '20px', md: '24px' },
              mb: 4,
              color: 'text.primary',
            }}
          >
            Manage Admin Access
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              mb: 4,
              flexWrap: 'wrap',
            }}
          >
            <TextField
              inputRef={emailRef}
              placeholder="Enter user email"
              size="small"
              sx={{
                flex: 1,
                minWidth: 200,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleUpdateRole}
              disabled={loading}
              sx={{
                bgcolor: 'primary.main',
                minWidth: 120,
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              {loading ? 'Updating...' : 'Grant Admin'}
            </Button>
          </Box>

          {message && (
            <Alert
              severity={message.type === 'success' ? 'success' : 'error'}
              sx={{ mb: 3 }}
              onClose={() => setMessage('')}
            >
              {message.text}
            </Alert>
          )}

          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: '16px', md: '18px' },
              mb: 2,
              color: 'text.primary',
            }}
          >
            Current Admins:
          </Typography>

          {admins.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {admins.map((admin, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1,
                    px: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    •
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {admin.email}
                    </Typography>
                  </Box>
                  <Chip
                    label="Admin"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(0,167,157,0.14)',
                      color: '#00857D',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              No admins found
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default AdminLandingPage;