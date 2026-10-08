import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, MessageSquare, Home, TrendingUp, ArrowRight, Settings } from 'lucide-react';
import { Box, Button, Card, CardContent, TextField, Typography, Alert, Chip, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";

import './admin.css';

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

  // Grouped so the landing page shows a few cards instead of seventeen.
  const adminGroups = [
    {
      id: 'overview',
      title: 'Overview',
      icon: LayoutDashboard,
      color: '#003366',
      links: [{ label: 'Dashboard', route: '/admin/Dashboard' }],
    },
    {
      id: 'leads',
      title: 'Leads & Requests',
      icon: MessageSquare,
      color: '#10B981',
      links: [
        { label: 'Enquiries', route: '/admin/enquiries' },
        { label: 'Callback Requests', route: '/admin/callback' },
        { label: 'Preference Forms', route: '/admin/userpreferenceformresponses' },
        { label: 'Services', route: '/admin/services' },
      ],
    },
    {
      id: 'properties',
      title: 'Properties',
      icon: Home,
      color: '#EF4444',
      links: [
        { label: 'Property Manager', route: '/admin/propertymanager' },
        { label: 'All Properties', route: '/admin/rewardsproperties' },
        { label: 'Add Property', route: '/admin/add-property' },
      ],
    },
    {
      id: 'people',
      title: 'Users & Agents',
      icon: Users,
      color: '#8B5CF6',
      links: [
        { label: 'User Management', route: '/admin/UserManagement' },
        { label: 'Agents Management', route: '/admin/agentsmanagement' },
        { label: 'Register Agent', route: '/admin/agent-registration' },
      ],
    },
    {
      id: 'money',
      title: 'Rewards & Payments',
      icon: TrendingUp,
      color: '#00A79D',
      links: [
        { label: 'Rewards', route: '/admin/rewards' },
        { label: 'Payments', route: '/admin/payments' },
      ],
    },
    {
      id: 'system',
      title: 'System',
      icon: Settings,
      color: '#64748B',
      links: [
        { label: 'Settings', route: '/admin/settings' },
        { label: 'Usage Tracker', route: '/admin/usagetrack' },
        { label: 'SMS Phones', route: '/admin/sms-devices' },
      ],
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F4F7F9', p: { xs: 4, md: 6 }, pt: { xs: 16, md: 0 } }}>
      {/* Admin shell is provided by AdminLayout - no need for TopNavigationBar here */}
      <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '24px', md: '32px' },
              fontWeight: 700,
              color: 'primary.main',
              letterSpacing: '-0.5px',
            }}
          >
            Admin Portal
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mt: 1,
              lineHeight: 1.6,
              fontSize: { xs: '14px', md: '16px' },
            }}
          >
            Centralized management system for your platform
          </Typography>
          <Box
            sx={{
              width: 80,
              height: 4,
              bgcolor: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: 1,
              mt: 4,
            }}
          />
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
          {adminGroups.map((group) => {
            const Icon = group.icon;
            return (
              <Card
                key={group.id}
                sx={{ height: '100%', border: '1px solid #E5E9EE', bgcolor: 'background.paper', boxShadow: '0 2px 8px rgba(0,51,102,0.05)' }}
              >
                <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${group.color}15`, color: group.color }}>
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
                        {link.label}
                        <ArrowRight size={16} />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>

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