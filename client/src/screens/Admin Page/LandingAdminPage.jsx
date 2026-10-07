import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Phone,
  Home,
  TrendingUp,
  Activity,
  ArrowRight,
  BarChart3,
  Settings,
  Smartphone,
  Megaphone,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Stack,
  Alert,
  Chip,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import './admin.css';

const AdminLandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
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

  const adminCards = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Overview of all system metrics and analytics',
      icon: LayoutDashboard,
      route: '/admin/Dashboard',
      color: '#003366',
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, rewards, preferences, and properties',
      icon: Users,
      route: '/admin/UserManagement',
      color: '#8B5CF6',
    },
    {
      id: 'enquiries',
      title: 'Enquiries',
      description: 'View and manage property enquiries',
      icon: MessageSquare,
      route: '/admin/enquiries',
      color: '#10B981',
    },
    {
      id: 'callbacks',
      title: 'Callback Requests',
      description: 'Handle customer callback requests',
      icon: Phone,
      route: '/admin/callback',
      color: '#F59E0B',
    },
    {
      id: 'properties',
      title: 'All Properties',
      description: 'Browse every listing grouped by sector',
      icon: Home,
      route: '/admin/rewardsproperties',
      color: '#EF4444',
    },
    {
      id: 'propertyManager',
      title: 'Property Manager',
      description: 'Activate, deactivate, and review properties',
      icon: Settings,
      route: '/admin/propertymanager',
      color: '#6366F1',
    },
    {
      id: 'addProperty',
      title: 'Add Property',
      description: 'Add new property listings to the system',
      icon: Home,
      route: '/admin/add-property',
      color: '#F97316',
    },
    {
      id: 'services',
      title: 'Services',
      description: 'Manage service requests and track progress',
      icon: Activity,
      route: '/admin/services',
      color: '#22D3EE',
    },
    {
      id: 'smsDevices',
      title: 'SMS Phones',
      description: 'OTP SMS gateway phones: status, limits, test send',
      icon: Smartphone,
      route: '/admin/sms-devices',
      color: '#0EA5E9',
    },
    {
      id: 'usage',
      title: 'Usage Tracker',
      description: 'Track usage and performance metrics',
      icon: BarChart3,
      route: '/admin/usagetrack',
      color: '#64748B',
    },
    {
      id: 'rewards',
      title: 'Rewards',
      description: 'Send and review reward distributions',
      icon: TrendingUp,
      route: '/admin/rewards',
      color: '#00A79D',
    },
    {
      id: 'preferences',
      title: 'Preference Forms',
      description: 'View and manage user preference form submissions',
      icon: MessageSquare,
      route: '/admin/userpreferenceformresponses',
      color: '#8B5CF6',
    },
    {
      id: 'agents',
      title: 'Agents Management',
      description: 'View and manage real estate agents',
      icon: Users,
      route: '/admin/agentsmanagement',
      color: '#003366',
    },
    {
      id: 'registerAgent',
      title: 'Register Agent',
      description: 'Register a new agent with ID proofs and sectors',
      icon: UserPlus,
      route: '/admin/agent-registration',
      color: '#22D3EE',
    },    {
      id: 'payments',
      title: 'Payments',
      description: 'Approve pending payments and distribute rewards',
      icon: Home,
      route: '/admin/payments',
      color: '#0D9488',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure features, promotions, scraper, affiliates, and SMS devices',
      icon: Settings,
      route: '/admin/settings',
      color: '#6B7280',
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
              xl: 'repeat(4, 1fr)',
            },
            gap: 4,
          }}
        >
          {adminCards.map((card, index) => {
            const Icon = card.icon;
            const isHovered = hoveredCard === card.id;

            return (
              <Card
                key={card.id}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: `2px solid ${isHovered ? card.color : '#E5E9EE'}`,
                  bgcolor: 'background.paper',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? `0 12px 24px ${card.color}25, 0 0 0 1px ${card.color}15`
                    : '0 2px 8px rgba(0,51,102,0.05)',
                  '&:hover': {
                    borderColor: card.color,
                  },
                  '&:focus-visible': {
                    outline: '2px solid #00A79D',
                    outlineOffset: 2,
                  },
                  animation: 'fadeIn 200ms ease-out',
                  animationDelay: `${index * 30}ms`,
                  animationFillMode: 'both',
                }}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleNavigation(card.route)}
              >
                <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${card.color}15`,
                        color: card.color,
                        transition: 'transform 0.2s ease',
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      <Icon size={28} strokeWidth={1.75} />
                    </Box>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#F4F7F9',
                        transition: 'transform 0.2s ease',
                        transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                      }}
                    >
                      <ArrowRight size={18} color="#5B6B7B" />
                    </Box>
                  </Box>

                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: { xs: '18px', sm: '20px' },
                      fontWeight: 700,
                      color: 'text.primary',
                      mb: 1.5,
                      letterSpacing: '-0.3px',
                    }}
                  >
                    {card.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.6,
                      fontSize: { xs: '13px', sm: '14px' },
                    }}
                  >
                    {card.description}
                  </Typography>
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