import React, { useState, useEffect } from "react";
import {
  Plus,
  Home,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Edit,
  Mail,
  Hash,
  Eye,
} from "lucide-react";
import QRCode from "react-qr-code";
import {
  Home as HomeIcon,
  MapPin,
  Award,
  BadgeCheck,
  Building2,
} from "lucide-react";
import { toJpeg } from "html-to-image";
import { Download } from "lucide-react";
import { useRef } from "react";
import TopNavigationBar from "../Top Navigation Bar/AgentTopNavigationBar";
import { useNavigate } from "react-router-dom";
import Snowfall from "react-snowfall";

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
  // ===== Property Enquiries state =====
  const [propertyEnquiries, setPropertyEnquiries] = useState([]);
  const [unlockingEnquiryId, setUnlockingEnquiryId] = useState(null);
  const [activeList, setActiveList] = useState("leads"); // "leads" | "enquiries"
  const [selectedTemplate, setSelectedTemplate] = useState(CARD_TEMPLATES[0]);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const maskMobile = (mobile) => {
    if (!mobile) return "XXXXXXXXXX";
    return mobile.slice(0, 5) + "XXXXX";
  };

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

  const isInactive = agentData?.status !== "active";
  const quickActions = [
    {
      icon: Plus,
      label: "Post Property",
      color: "#00A79D",
      path: "/agent/add-property",
    },
    {
      icon: Home,
      label: "My Listings",
      color: "#4A6A8A",
      path: "/agent/my-properties",
    },

  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F4F7F9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: "18px", color: "#4A6A8A" }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F7F9",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <TopNavigationBar />

      {/* Hero Section with Snowfall Background */}
      <div
        style={{
          height: "400px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Snowfall Effect */}
        <Snowfall
          snowflakeCount={80}
          radius={[4, 8]}
          speed={[0.6, 1.2]}
          wind={[-0.5, 0.5]}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
          }}
        />
        {/* Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(5,15,30,0.9), rgba(0,40,60,0.85), rgba(0,80,90,0.8))",
            zIndex: 1,
          }}
        />

        {/* Decorative elements */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "300px",
            height: "300px",
            background: "rgba(34, 211, 238, 0.1)",
            borderRadius: "50%",
            filter: "blur(60px)",
          }}
        ></div>

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "60px 20px 40px",
            color: "#FFFFFF",
          }}
        >
          {/* Welcome Header */}
          <div style={{ marginBottom: "40px" }}>
            <h1
              style={{
                fontSize: "38px",
                fontWeight: "800",
                marginBottom: "10px",
                background:
                  "linear-gradient(90deg, #22D3EE, #00A79D, #A78BFA, #F472B6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "0.5px",
                textShadow: "0 6px 18px rgba(0,0,0,0.35)",
              }}
            >
              Welcome, {user?.name || "Agent"}
            </h1>
            <p
              style={{
                fontSize: "18px",
                opacity: 1,
                textShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }}
            >
              Account Status :{" "}
              {agentData?.status === "active" ? (
                <span style={{ color: "#4BB543", fontWeight: "600" }}>
                  Active &#10003;
                </span>
              ) : (
                <span style={{ color: "#FF4C4C", fontWeight: "600" }}>
                  {"Inactive"}
                </span>
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {quickActions.map((action, index) => (
              <button
                key={index}
                
                onClick={() => {
                  if (!isInactive && action.path) {
                    navigate(action.path);
                  }
                }}
                title={
                  isInactive
                    ? "Your account is inactive. Please contact support."
                    : ""
                }
                style={{
                  padding: "16px 32px",
                  background: "rgba(255, 255, 255, 0.95)",
                  border: "none",
                  borderRadius: "12px",
                  color: action.color,
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: isInactive ? "not-allowed" : "pointer",
                  opacity: isInactive ? 0.5 : 1,
                  pointerEvents: isInactive ? "none" : "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                  transition: "all 0.3s",
                  backdropFilter: "blur(10px)",
                  width: "100%",
                  maxWidth: "260px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-3px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)";
                }}
              >
                <action.icon size={22} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Dashboard Content - White Panel */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "-80px auto 0",
          padding: "0 20px 40px",
          position: "relative",
          zIndex: 3,
        }}
      >
        {/* White Container Card */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "24px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            padding: "40px",
            marginBottom: "30px",
          }}
        >
          {/* Stats Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                padding: "20px",
                background: "linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)",
                borderRadius: "16px",
                borderLeft: "4px solid #00A79D",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <TrendingUp size={20} color="#00A79D" />
                <span
                  style={{
                    fontSize: "13px",
                    color: "#4A6A8A",
                    fontWeight: "600",
                  }}
                >
                  NEW LEADS TODAY
                </span>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#003366",
                }}
              >
                {stats.newLeadsToday}
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                background: "linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)",
                borderRadius: "16px",
                borderLeft: "4px solid #22D3EE",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <Home size={20} color="#22D3EE" />
                <span
                  style={{
                    fontSize: "13px",
                    color: "#4A6A8A",
                    fontWeight: "600",
                  }}
                >
                  TOTAL LEADS
                </span>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#003366",
                }}
              >
                {stats.totalLeads}
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                background: "linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)",
                borderRadius: "16px",
                borderLeft: "4px solid #4A6A8A",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <AlertCircle size={20} color="#4A6A8A" />
                <span
                  style={{
                    fontSize: "13px",
                    color: "#4A6A8A",
                    fontWeight: "600",
                  }}
                >
                  PENDING LEADS
                </span>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#003366",
                }}
              >
                {stats.pendingLeads}
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                background: "linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)",
                borderRadius: "16px",
                borderLeft: "4px solid #00A79D",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <Clock size={20} color="#00A79D" />
                <span
                  style={{
                    fontSize: "13px",
                    color: "#4A6A8A",
                    fontWeight: "600",
                  }}
                >
                  EXPERIENCE
                </span>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#003366",
                }}
              >
                {agentData?.experienceYears || 0} yrs
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
              gap: "30px",
            }}
          >
            {/* Left Column - All Leads (Scrollable) */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Dropdown Selector */}
              <div style={{ marginBottom: "20px" }}>
                <select
                  value={activeList}
                  onChange={(e) => setActiveList(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "2px solid #E5E7EB",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#003366",
                    background: "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  <option value="leads">Leads</option>
                  <option value="enquiries">Property Enquiries</option>
                </select>
              </div>
              {/* All Leads */}
              {activeList === "leads" && (
                <>
                  <div>
                    <h2
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#003366",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <TrendingUp size={22} color="#00A79D" />
                      All Leads ({leads.length})
                    </h2>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "15px",
                        maxHeight: "600px",
                        overflowY: "auto",
                        paddingRight: "10px",
                      }}
                    >
                      {leads.length === 0 ? (
                        <div
                          style={{
                            padding: "40px",
                            textAlign: "center",
                            color: "#4A6A8A",
                            background: "#F4F7F9",
                            borderRadius: "12px",
                          }}
                        >
                          No leads available yet
                        </div>
                      ) : (
                        leads.map((lead) => (
                          <div
                            key={lead._id}
                            style={{
                              padding: "18px",
                              background: "#F4F7F9",
                              borderRadius: "12px",
                              transition: "all 0.3s",
                              cursor: "pointer",
                              border: "2px solid transparent",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#FFFFFF";
                              e.currentTarget.style.borderColor = "#00A79D";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(0,167,157,0.15)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#F4F7F9";
                              e.currentTarget.style.borderColor = "transparent";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "8px",
                              }}
                            >
                              <span
                                style={{ fontWeight: "600", color: "#003366" }}
                              >
                                {lead.userName || lead.name || "Anonymous Lead"}
                              </span>
                              {typeof lead.brokerageAmount === "number" && (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                    lineHeight: 1.1,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      color: "#4A6A8A",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Brokerage
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: "#00A79D",
                                      fontSize: "14px",
                                    }}
                                  >
                                    ₹ {lead.brokerageAmount}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                color: "#4A6A8A",
                                marginBottom: "6px",
                              }}
                            >
                              {lead.propertyType || "N/A"} -{" "}
                              {lead.budgetRange ||
                                lead.budget ||
                                "Budget not specified"}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#4A6A8A",
                                marginBottom: "6px",
                              }}
                            >
                              📍{" "}
                              {lead.preferredLocation ||
                                lead.location ||
                                "Location not specified"}
                            </div>
                            {(lead.bhkSize || lead.furnishingLevel) && (
                              <div
                                style={{
                                  fontSize: "13px",
                                  color: "#4A6A8A",
                                  marginBottom: "6px",
                                }}
                              >
                                {lead.bhkSize && (
                                  <span style={{ marginRight: "8px" }}>
                                    {lead.bhkSize}
                                  </span>
                                )}
                                {lead.furnishingLevel && (
                                  <span>
                                    {lead.furnishingLevel.replace("-", " ")}
                                  </span>
                                )}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#4A6A8A",
                                marginBottom: "6px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <Phone size={14} />
                              {revealedMobiles[lead._id] ? (
                                <span
                                  style={{ fontWeight: 600, color: "#003366" }}
                                >
                                  {revealedMobiles[lead._id]}
                                </span>
                              ) : (
                                <>
                                  <span
                                    style={{
                                      filter: "blur(4px)",
                                      userSelect: "none",
                                      letterSpacing: "1px",
                                    }}
                                  >
                                    {maskMobile("96541")}
                                  </span>
                                  <Eye
                                    size={16}
                                    style={{
                                      cursor: "pointer",
                                      color: "#00A79D",
                                    }}
                                    onClick={() => {
                                      setActiveLead(lead);
                                      setShowLeadModal(true);
                                    }}
                                  />
                                </>
                              )}
                            </div>
                            {leadErrors[lead._id] && (
                              <div
                                style={{
                                  marginTop: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: "#DC2626",
                                }}
                              >
                                {leadErrors[lead._id]}
                              </div>
                            )}
                            <div style={{ fontSize: "12px", color: "#4A6A8A" }}>
                              ⏰ {formatTimeAgo(lead.createdAt)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
              {/* ================= Property Enquiries ================= */}
              {activeList === "enquiries" && (
                <>
                  <div>
                    <h2
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#003366",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Home size={22} color="#00A79D" />
                      Property Enquiries ({propertyEnquiries.length})
                    </h2>

                    {propertyEnquiries.length === 0 ? (
                      <div
                        style={{
                          padding: "30px",
                          background: "#F4F7F9",
                          borderRadius: "12px",
                          color: "#4A6A8A",
                          textAlign: "center",
                        }}
                      >
                        No property enquiries yet
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                        }}
                      >
                        {propertyEnquiries.map((enq) => (
                          <div
                            key={enq._id}
                            style={{
                              padding: "16px",
                              background: "#F4F7F9",
                              borderRadius: "12px",
                              border: "1px solid #E5E7EB",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <div>
                                <div
                                  style={{ fontWeight: 700, color: "#003366" }}
                                >
                                  {enq.propertyAddress}
                                </div>
                                <div
                                  style={{ fontSize: "13px", color: "#4A6A8A" }}
                                >
                                  {enq.propertyType?.toUpperCase()} • ₹{" "}
                                  {enq.propertyPrice}
                                </div>
                              </div>

                              <div style={{ textAlign: "right" }}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#4A6A8A",
                                  }}
                                >
                                  COMMISSION
                                </div>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: "#00A79D",
                                    fontSize: "14px",
                                  }}
                                >
                                  ₹ {enq.brokerage}
                                </div>
                              </div>
                            </div>

                            {enq.message && (
                              <div
                                style={{
                                  marginTop: "8px",
                                  fontSize: "13px",
                                  color: "#4A6A8A",
                                }}
                              >
                                “{enq.message}”
                              </div>
                            )}

                            {/* Contact Row */}
                            <div
                              style={{
                                marginTop: "10px",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                fontSize: "13px",
                                color: "#003366",
                              }}
                            >
                              {enq._unlocked ? (
                                <>
                                  <Mail size={14} /> {enq.userEmail}
                                  <Phone size={14} /> {enq.userMobile}
                                </>
                              ) : (
                                <>
                                  <span style={{ filter: "blur(4px)" }}>
                                    XXXXXXXXXX
                                  </span>
                                  <Eye
                                    size={16}
                                    style={{
                                      cursor: "pointer",
                                      color: "#00A79D",
                                    }}
                                    onClick={() => handleUnlockEnquiry(enq._id)}
                                  />
                                  {unlockingEnquiryId === enq._id && (
                                    <span style={{ fontSize: "12px" }}>
                                      Unlocking...
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            <div
                              style={{
                                fontSize: "12px",
                                color: "#4A6A8A",
                                marginTop: "6px",
                              }}
                            >
                              ⏰ {formatTimeAgo(enq.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Column - Profile */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "25px" }}
            >
              {/* Premium Downloadable Agent Card */}
              {/* Card Controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <select
                  value={selectedTemplate.id}
                  onChange={(e) => {
                    const tpl = CARD_TEMPLATES.find(
                      (t) => t.id === e.target.value
                    );
                    setSelectedTemplate(tpl);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: "2px solid #E5E7EB",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: "#FFFFFF",
                  }}
                >
                  {CARD_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>

                <div
                  title="Download Card"
                  onClick={downloadAgentCard}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#00A79D",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Download size={18} />
                </div>
              </div>
              <div
                style={{
                  background: "#FFFFFF",
                  padding: isMobile ? "4px" : "20px",
                  borderRadius: isMobile ? "12px" : "22px",
                  boxShadow: "0 14px 40px rgba(0,0,0,0.14)",
                  marginLeft: isMobile ? "-40px" : "auto",
                }}
              >
                <div
                  ref={cardRef}
                  style={{
                    width: isMobile ? "440px" : "480px",
                    height: "274px",
                    position: "relative",
                    padding: "14px",
                    borderRadius: "12px",
                    background: selectedTemplate.background,
                    color: selectedTemplate.text,
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Watermark */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "48px",
                      fontWeight: 900,
                      letterSpacing: "6px",
                      color: "rgba(255,255,255,0.04)",
                      transform: "rotate(-15deg)",
                      pointerEvents: "none",
                    }}
                  >
                    GgnHome
                  </div>

                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <img
                        src="/Logo2.jpg"
                        alt="GgnHome Logo"
                        style={{
                          width: "26px",
                          height: "26px",
                          objectFit: "contain",
                          background: "#FFFFFF",
                          borderRadius: "6px",
                          padding: "2px",
                        }}
                      />
                      <div>
                        <h3
                          style={{
                            fontSize: "14px",
                            fontWeight: 900,
                            letterSpacing: "0.8px",
                            margin: 0,
                          }}
                        >
                          GgnHome
                        </h3>
                        <span style={{ fontSize: "11px", opacity: 0.85 }}>
                          Real Estate Professional
                        </span>
                      </div>
                    </div>
                    <BadgeCheck size={18} color={selectedTemplate.accent} />
                  </div>

                  {/* Main Content */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px",
                      
                      gap: "10px",
                      

                    }}
                  >
                    {/* LEFT */}
                    <div>
                      <h2
                        style={{
                          fontSize: "22px",
                          fontWeight: 900,
                          marginBottom: "2px",
                        }}
                      >
                        {user?.name || "Agent Name"}
                      </h2>

                      <div
                        style={{
                          fontSize: "14px",
                          opacity: 0.9,
                          marginBottom: "4px",
                        }}
                      >
                        Property Consultant
                      </div>

                      {/* Contact */}
                      <div style={{ fontSize: "13px", lineHeight: "1.7" }}>
                        <div>
                          <Phone size={12} color={selectedTemplate.accent} />{" "}
                          {agentData?.whatsappNumber || user?.phone || "N/A"}
                        </div>
                        <div>
                          <Mail size={12} color={selectedTemplate.accent} />{" "}
                          {user?.email || "N/A"}
                        </div>
                      </div>

                      {/* Dynamic Chips */}
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginTop: "6px",
                        }}
                      >
                        {agentData?.experienceYears && (
                          <span style={chipStyle(selectedTemplate)}>
                            <Award size={12} color={selectedTemplate.accent} />{" "}
                            {agentData.experienceYears}+ Years
                          </span>
                        )}
                        {agentData?.totalDeals && (
                          <span style={chipStyle(selectedTemplate)}>
                            <Building2
                              size={12}
                              color={selectedTemplate.accent}
                            />{" "}
                            {agentData.totalDeals}+ Deals
                          </span>
                        )}
                        {agentData?.preferredSectors?.[0] && (
                          <span style={chipStyle(selectedTemplate)}>
                            <MapPin size={12} color={selectedTemplate.accent} />{" "}
                            {agentData.preferredSectors[0]}
                          </span>
                        )}
                      </div>

                      {/* Sectors */}
                      {agentData?.preferredSectors?.length > 0 && (
                        <div style={{ marginTop: "6px" }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              marginBottom: "4px",
                            }}
                          >
                            Sectors Covered
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            {agentData.preferredSectors
                              .slice(0, 3)
                              .map((sec) => (
                                <span
                                  key={sec}
                                  style={chipStyle(selectedTemplate)}
                                >
                                  {sec}
                                </span>
                              ))}

                            {agentData.preferredSectors.length > 3 && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  opacity: 0.9,
                                }}
                              >
                                + more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "-26px",
                      }}
                    >
                      {/* Photo */}
                      <div
                        style={{
                          width: "104px",
                          height: "132px",
                          borderRadius: "16px",
                          overflow: "hidden",
                          background: "#FFFFFF",
                          boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
                          border: `6px solid ${selectedTemplate.accent}`,
                        }}
                      >
                        {agentData?.profilePhoto ? (
                          <img
                            src={agentData.profilePhoto}
                            alt="Agent"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#003366",
                              fontWeight: 700,
                            }}
                          >
                            No Photo
                          </div>
                        )}
                      </div>

                      {/* QR */}
                      <div
                        style={{
                          background: "#FFFFFF",
                          padding: "6px",
                          borderRadius: "8px",
                        }}
                      >
                        <QRCode
                          value={`https://wa.me/${
                            agentData?.whatsappNumber || ""
                          }`}
                          size={68}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Template Selector removed, now handled by dropdown above */}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modal for lead acceptance */}
      {showLeadModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "420px",
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,51,102,0.25)",
              borderTop: "6px solid #00A79D",
            }}
          >
            <h3
              style={{
                marginBottom: "14px",
                color: "#003366",
                fontWeight: 800,
              }}
            >
              Lead Acceptance Confirmation
            </h3>

            <p
              style={{
                fontSize: "14px",
                color: "#4A6A8A",
                lineHeight: 1.6,
                marginBottom: "22px",
              }}
            >
              By accepting this lead, you agree to follow all{" "}
              <strong>Rules and Regulations of GgnHome</strong>. Commission will
              be distributed strictly according to the rules stated by the
              platform.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => {
                  setShowLeadModal(false);
                  setActiveLead(null);
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "2px solid #E5E7EB",
                  background: "#FFFFFF",
                  color: "#4A6A8A",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reject
              </button>

              <button
                onClick={handleAcceptLead}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#00A79D",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 6px 14px rgba(0,167,157,0.35)",
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Preferred Sectors editing */}
      {showSectorModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "420px",
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <h3
              style={{
                marginBottom: "12px",
                fontWeight: 800,
                color: "#003366",
              }}
            >
              Edit Preferred Sectors
            </h3>

            <input
              id="sectorEditInput"
              placeholder="Type sector and click Add"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "2px solid #E5E7EB",
                marginBottom: "10px",
              }}
            />

            <button
              style={{
                padding: "8px 14px",
                background: "#00A79D",
                color: "#FFFFFF",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
              }}
              onClick={() => {
                const input = document.getElementById("sectorEditInput");
                if (!input.value) return;
                const normalized = normalizeSector(input.value);
                if (!normalized || tempSectors.includes(normalized)) return;

                setTempSectors((prev) => [...prev, normalized]);
                input.value = "";
              }}
            >
              Add Sector
            </button>

            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                marginTop: "12px",
              }}
            >
              {tempSectors.map((sec) => (
                <span
                  key={sec}
                  onClick={() =>
                    setTempSectors((prev) => prev.filter((s) => s !== sec))
                  }
                  style={{
                    padding: "6px 10px",
                    background: "#F4F7F9",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {sec} ✕
                </span>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              <button
                onClick={() => setShowSectorModal(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                }}
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  try {
                    await fetch(
                      `${process.env.REACT_APP_Base_API}/api/agent/update-sectors`,
                      {
                        method: "POST",
                        headers: {
                          ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
                          "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify({ preferredSectors: tempSectors }),
                      }
                    );

                    setAgentData((prev) => ({
                      ...prev,
                      preferredSectors: tempSectors,
                    }));
                  } catch (e) {
                    console.error("Failed to update sectors", e);
                  } finally {
                    setShowSectorModal(false);
                  }
                }}
                style={{
                  padding: "8px 16px",
                  background: "#00A79D",
                  color: "#FFFFFF",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 800,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDashboard;

// CHIP STYLE HELPER
const chipStyle = (template) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 10px",
  background:
    template?.id === "white" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.18)",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: template?.id === "white" ? "#003366" : "#FFFFFF",
});
