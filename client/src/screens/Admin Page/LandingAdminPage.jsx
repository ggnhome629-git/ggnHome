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
} from 'lucide-react';
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import { useNavigate } from "react-router-dom";

const AdminLandingPage = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [admins, setAdmins] = useState([]);
  const emailRef = useRef();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleNavigation = (route) => {
    window.location.href = route;
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

  const navItems = [
    "For Buyers",
    "For Tenants",
    "For Owners",
    "For Dealers / Builders",
    "Insights",
  ];

  const handleUpdateRole = async () => {
    const email = emailRef.current.value;
    if (!email) return alert("Please enter an email");
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
        setMessage("Admin role updated successfully");
        setAdmins((prev) => [...prev, data.user]);
        emailRef.current.value = "";
      } else {
        setMessage(data.message || "Failed to update role");
      }
    } catch (err) {
      console.error("Error updating role:", err);
      setMessage("Error updating role");
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
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      route: '/admin/UserManagement',
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    },
    {
      id: 'enquiries',
      title: 'Enquiries',
      description: 'View and manage property enquiries',
      icon: MessageSquare,
      route: '/admin/enquiries',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    {
      id: 'callbacks',
      title: 'Callback Requests',
      description: 'Handle customer callback requests',
      icon: Phone,
      route: '/admin/callback',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    {
      id: 'properties',
      title: 'ALL Properties',
      description: 'Manage all property listings',
      icon: Home,
      route: '/admin/rewardsproperties',
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    },
    {
      id: 'propertyManager',
      title: 'Property Manager',
      description: 'Activate, deactivate, and review properties',
      icon: Settings,
      route: '/admin/propertymanager',
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    },
    {
    id: 'addProperty',
    title: 'Add Property',
    description: 'Add new property listings to the system',
    icon: Home,
    route: '/admin/add-property',
    color: '#f97316', // orange color similar to other cards
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    },
    {
    id: 'Services',
    title: 'Services',
    description: 'Manage service requests and track progress',
    icon: Home,
    route: '/admin/services',
    color: '#f97316', // orange color similar to other cards
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    },
     {
    id: 'Usage Tracker',
    title: 'Usage Tracker',
    description: 'Track usage and performance metrics',
    icon: Home,
    route: '/admin/usagetrack',
    color: '#f97316', // orange color similar to other cards
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    },
    {
    id: 'Rewards Management',
    title: 'Rewards Management',
    description: 'Track usage and performance metrics',
    icon: Home,
    route: '/admin/rewards',
    color: '#f97316', // orange color similar to other cards
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    },
    {
    id: 'User Preference Form Responses',
    title: 'User Preference Form Responses',
    description: 'View and manage user preference form submissions',
    icon: Home,
    route: '/admin/userpreferenceformresponses',
    color: '#f97316', // orange color similar to other cards
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    },
    {
      id: 'Agents Management',
    title: 'Agents Management',
    description: 'View and manage real estate agents',
      icon: Home,
      route: '/admin/agentsmanagement',
      color: '#f97316', // orange color similar to other cards
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    },

    {
    id: 'Agent Registration',
    title: 'Admin Registration',
    description: 'Register new administrators',
    icon: Home,
    route: '/admin/agent-registration',
    color: '#f97316', // orange color similar to other cards
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    },
    


    
];

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '40px 24px',
    },
    content: {
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      marginBottom: '48px',
    },
    titleSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '12px',
    },
    title: {
      fontSize: '42px',
      fontWeight: '700',
      color: '#0f172a',
      margin: 0,
      letterSpacing: '-0.5px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#64748b',
      margin: 0,
      lineHeight: '1.6',
    },
    divider: {
      width: '80px',
      height: '4px',
      background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
      borderRadius: '2px',
      marginTop: '24px',
    },
    cardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: '24px',
    },
    card: (isHovered, color) => ({
      backgroundColor: '#ffffff',
      border: `2px solid ${isHovered ? color : '#e2e8f0'}`,
      borderRadius: '16px',
      padding: '32px',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
      boxShadow: isHovered 
        ? `0 20px 40px ${color}25, 0 0 0 1px ${color}10` 
        : '0 2px 8px rgba(0, 0, 0, 0.04)',
    }),
    cardTopBar: (gradient, isHovered) => ({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '5px',
      background: gradient,
      opacity: isHovered ? 1 : 0.6,
      transition: 'opacity 0.3s ease',
    }),
    cardContent: {
      paddingTop: '8px',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '20px',
    },
    iconWrapper: (color, isHovered) => ({
      width: '64px',
      height: '64px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `${color}10`,
      color: color,
      transition: 'all 0.3s ease',
      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
    }),
    arrowWrapper: (isHovered) => ({
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      transition: 'all 0.3s ease',
      transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
    }),
    cardTitle: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#0f172a',
      margin: '0 0 12px 0',
      letterSpacing: '-0.3px',
    },
    cardDescription: {
      fontSize: '15px',
      color: '#64748b',
      lineHeight: '1.6',
      margin: 0,
    },
  };

  return (
    <div style={styles.container}>
      {/* Top Navigation Bar */}
      <div
        style={{
          position: "fixed",
          marginBottom: "20px",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 999,
          backgroundColor: "#FFFFFF",
        }}
      >
        <TopNavigationBar user={user} handleLogout={handleLogout} navItems={navItems} />
      </div>
      {/* Spacer to push content below fixed navbar */}
      <div style={{ height: 72 }} />
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>Admin Portal</h1>
            <p style={styles.subtitle}>
              Centralized management system for your platform
            </p>
          </div>
          <div style={styles.divider} />
        </div>

        {/* Main Cards */}
        <div style={styles.cardsGrid}>
          {adminCards.map((card) => {
            const Icon = card.icon;
            const isHovered = hoveredCard === card.id;

            return (
              <div
                key={card.id}
                style={styles.card(isHovered, card.color)}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleNavigation(card.route)}
              >
                <div style={styles.cardTopBar(card.gradient, isHovered)} />
                
                <div style={styles.cardContent}>
                  <div style={styles.cardHeader}>
                    <div style={styles.iconWrapper(card.color, isHovered)}>
                      <Icon size={32} strokeWidth={1.5} />
                    </div>
                    <div style={styles.arrowWrapper(isHovered)}>
                      <ArrowRight size={20} color="#475569" />
                    </div>
                  </div>

                  <h3 style={styles.cardTitle}>{card.title}</h3>
                  <p style={styles.cardDescription}>{card.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Admin Access Management */}
        <div style={{ marginTop: "60px", padding: "30px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#0f172a" }}>Manage Admin Access</h2>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
            <input
              type="email"
              ref={emailRef}
              placeholder="Enter user email"
              style={{ padding: "10px 14px", flex: "1", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
            <button
              onClick={handleUpdateRole}
              disabled={loading}
              style={{
                backgroundColor: "#3b82f6",
                color: "#fff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {loading ? "Updating..." : "Grant Admin"}
            </button>
          </div>
          {message && <p style={{ color: "#10b981", marginBottom: "20px" }}>{message}</p>}

          <h3 style={{ fontSize: "18px", marginBottom: "12px", color: "#334155" }}>Current Admins:</h3>
          <ul style={{ listStyle: "none", padding: 0, color: "#475569" }}>
            {admins.length > 0 ? (
              admins.map((admin, idx) => <li key={idx} style={{ marginBottom: "8px" }}>• {admin.email}</li>)
            ) : (
              <li>No admins found</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminLandingPage;