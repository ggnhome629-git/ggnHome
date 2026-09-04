import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAgentAuth } from "../../../Context/AgentAuthContext";
import {
  Menu,
  Bell,
  User,
  Lock,
  Bot,
  Square,
  LogOut,
  Award,
  Heart,
  Briefcase,
  Home,
  Settings,
  HelpCircle,
} from "lucide-react";
import SideMenuBar from "./SideMenu";
import Location from "./Location";

const TopNavigationBar = ({ navItems = [] }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { agent, loading, logout } = useAgentAuth();
  const pathname = location?.pathname || "";
  const isAgentAuthRoute =
    pathname.startsWith("/agent/login") ||
    pathname.startsWith("/agent/register");
  // On agent auth pages we still want to show menu + Guest label
  const allowGuestMenu = isAgentAuthRoute;
  const resolvedAgent = agent;
  const isInactive = resolvedAgent && resolvedAgent.status !== "active";
  const shouldRenderNav = !loading;
  const isFlatmatesRoute =
    location && location.pathname
      ? String(location.pathname).toLowerCase().startsWith("/flatmates")
      : false;
  const [activeTab, setActiveTab] = useState("Buy");
  const [hoveredCard, setHoveredCard] = useState(null);

  const [properties, setProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);

  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);
  const [isMediumScreen, setIsMediumScreen] = useState(
    window.innerWidth < 1024
  );
  const [density, setDensity] = useState("full");
  const [showPreferencePopup, setShowPreferencePopup] = useState(false);
  const [showServicesSubmenu, setShowServicesSubmenu] = useState(false);
  const [showListingsSubmenu, setShowListingsSubmenu] = useState(false);
  // Change Password Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Recovery Email State
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");
  // Save/Update Recovery Email handler
  const handleSaveRecoveryEmail = async () => {
    setEmailError("");
    setEmailSuccess("");

    if (!recoveryEmail) {
      setEmailSuccess("Recovery email skipped");
      return;
    }

    try {
      setEmailSaving(true);

      const BASE_API = process.env.REACT_APP_Base_API || "";
      const url = `${BASE_API.replace(/\/$/, "")}/agent/set-recovery-email`;

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: recoveryEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save recovery email");

      setEmailSuccess("Recovery email saved successfully");
    } catch (err) {
      setEmailError(err.message || "Something went wrong");
    } finally {
      setEmailSaving(false);
    }
  };

  // Preference popup dismissal helpers
  const prefDismissRef = useRef({ hideTimeout: null, interval: null });

  const dismissPrefPopup = (durationMs = 10 * 60 * 1000) => {
    // hide now
    setShowPreferencePopup(false);
    // persist dismissal until a timestamp
    try {
      const until = Date.now() + durationMs;
      sessionStorage.setItem("prefDismissedUntil", String(until));
    } catch (e) {
      // ignore storage errors
    }

    // clear timers if set
    if (prefDismissRef.current.hideTimeout) {
      clearTimeout(prefDismissRef.current.hideTimeout);
      prefDismissRef.current.hideTimeout = null;
    }
    if (prefDismissRef.current.interval) {
      clearInterval(prefDismissRef.current.interval);
      prefDismissRef.current.interval = null;
    }
  };
  useEffect(() => {
    const computeDensity = () => {
      const w = window.innerWidth;
      if (w < 420) setDensity("icon");
      else if (w < 620) setDensity("compact");
      else setDensity("full");
    };
    computeDensity();
    window.addEventListener("resize", computeDensity);
    return () => window.removeEventListener("resize", computeDensity);
  }, []);

  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      // AuthContext.logout already calls your backend logout endpoint,
      // clears sessionStorage and sets global user to null.
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // always navigate to homepage after logout
      navigate("/");
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
      setIsMediumScreen(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const userMenu = document.querySelector(".user-menu-container");
      const sideMenuEl = document.querySelector(".side-menu-container");
      // If click originated inside user menu or side menu, ignore
      if (
        (userMenu && userMenu.contains(event.target)) ||
        (sideMenuEl && sideMenuEl.contains(event.target))
      ) {
        return;
      }
      // Otherwise close the user menu
      setShowMenu(false);
    };
    // Use mousedown so the toggle button click doesn't race with document click
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // If user isn't on root path or there is no logged-in user, do nothing
    if (!agent || location.pathname !== "/") return;

    // Respect a dismissal stored in sessionStorage
    const dismissedUntil = Number(
      sessionStorage.getItem("prefDismissedUntil") || 0
    );
    if (dismissedUntil && Date.now() < dismissedUntil) {
      return; // still dismissed
    }

    const visibleDuration = 6000; // show for 6s
    const intervalDelay = 10000; // 10s between shows

    // show immediately once
    setShowPreferencePopup(true);
    prefDismissRef.current.hideTimeout = setTimeout(
      () => setShowPreferencePopup(false),
      visibleDuration
    );

    // schedule recurring shows (but check dismissal before showing)
    prefDismissRef.current.interval = setInterval(() => {
      const dismissedUntil2 = Number(
        sessionStorage.getItem("prefDismissedUntil") || 0
      );
      if (dismissedUntil2 && Date.now() < dismissedUntil2) {
        // still dismissed — skip showing
        return;
      }
      setShowPreferencePopup(true);
      if (prefDismissRef.current.hideTimeout)
        clearTimeout(prefDismissRef.current.hideTimeout);
      prefDismissRef.current.hideTimeout = setTimeout(
        () => setShowPreferencePopup(false),
        visibleDuration
      );
    }, intervalDelay);

    return () => {
      if (prefDismissRef.current.hideTimeout) {
        clearTimeout(prefDismissRef.current.hideTimeout);
        prefDismissRef.current.hideTimeout = null;
      }
      if (prefDismissRef.current.interval) {
        clearInterval(prefDismissRef.current.interval);
        prefDismissRef.current.interval = null;
      }
    };
  }, [agent, location]);

  const MenuItem = ({ icon: Icon, label, onClick, isLogout, disabled }) => {
    // wrapper ensures document mousedown handler doesn't close menu before we act
    const safeClick = (e) => {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      if (e && typeof e.preventDefault === "function") e.preventDefault();

      if (disabled) {
        alert("Your account is disabled by admin");
        return;
      }

      setShowMenu(false);

      try {
        if (typeof onClick === "function") onClick();
      } catch (err) {}
    };

    return (
      <button
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          width: "100%",
          padding: isSmallScreen ? "0.65rem 1rem" : "0.75rem 1.25rem",
          backgroundColor: "transparent",
          color: isLogout ? "#00A79D" : "#333333",
          border: "none",
          textAlign: "left",
          fontSize: isSmallScreen ? "0.85rem" : "0.9rem",
          fontWeight: isLogout ? "600" : "500",
          transition: "all 0.2s ease",
          borderRadius: "6px",
          margin: "0 0.5rem",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          pointerEvents: disabled ? "none" : "auto",
        }}
        // use onMouseDown to intercept before document mousedown handler; also safe to use onClick fallback
        onMouseDown={safeClick}
        onClick={(e) => {
          if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          safeClick(e);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isLogout
            ? "#F0FDFC"
            : "#F4F7F9";
          if (isLogout) e.currentTarget.style.color = "#22D3EE";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = isLogout ? "#00A79D" : "#333333";
        }}
        disabled={disabled}
      >
        <Icon size={18} color={isLogout ? "currentColor" : "#4A6A8A"} />
        <span>{label}</span>
      </button>
    );
  };

  const commonButtonStyle = {
    height: density === "full" ? 38 : density === "compact" ? 32 : 30,
    minWidth: isSmallScreen
      ? density === "icon"
        ? 38
        : density === "compact"
        ? 60
        : 72
      : density === "full"
      ? 120
      : density === "compact"
      ? 70
      : 38,
    maxWidth: isSmallScreen
      ? density === "icon"
        ? 40
        : density === "compact"
        ? 88
        : 110
      : undefined,
    padding: density === "icon" ? "0" : isSmallScreen ? "0 8px" : "0 14px",
    background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    fontSize:
      density === "full" ? (isSmallScreen ? "0.75rem" : "0.85rem") : "0.72rem",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
    outline: "none",
    flexShrink: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxShadow: "0 4px 12px rgba(0,167,157,0.25)",
  };

  const iconButtonStyle = {
    height: isSmallScreen ? 34 : 40,
    width: isSmallScreen ? 34 : 40,
    backgroundColor: "#4A6A8A",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    flexShrink: 0,
    boxShadow: isSmallScreen
      ? "0 1px 4px rgba(0,0,0,0.06)"
      : "0 2px 8px rgba(0,0,0,0.1)",
  };

  if (!shouldRenderNav) {
    return null; // or a skeleton loader
  }

  return (
    <>
      <motion.nav
        animate={{
          paddingTop: isScrolled ? (isSmallScreen ? "0.35rem" : "0.45rem") : (isSmallScreen ? "0.5rem" : "0.65rem"),
          paddingBottom: isScrolled ? (isSmallScreen ? "0.35rem" : "0.45rem") : (isSmallScreen ? "0.5rem" : "0.65rem"),
          boxShadow: isScrolled
            ? "0 4px 20px rgba(0,51,102,0.22)"
            : "0 2px 16px rgba(0,51,102,0.15)",
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          backgroundColor: "#003366",
          paddingLeft: isSmallScreen ? "1%" : "1.5%",
          paddingRight: isSmallScreen ? "1%" : "1.5%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Left Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isSmallScreen ? "0.75rem" : "1rem",
            minWidth: 0,
            flex: "0 1 auto",
            position: "relative",
            zIndex: 1100,
          }}
        >
          {!isAgentAuthRoute && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={iconButtonStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSideMenuOpen((s) => !s);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#00A79D";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,167,157,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#4A6A8A";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                }}
              >
                <Menu size={20} color="#FFFFFF" />
              </div>
              {isSideMenuOpen && (
                <SideMenuBar
                  currentUser={resolvedAgent}
                  onLoginClick={() =>
                    navigate("/agent/login", { state: { from: location.pathname } })
                  }
                />
              )}
            </div>
          )}

          <div
            onClick={() => {
              if (isAgentAuthRoute) return; // ❌ block redirect on login/register

              const path = location.pathname
                ? String(location.pathname).toLowerCase()
                : "";

              if (path.startsWith("/admin")) {
                navigate("/admin/LandingPage");
                return;
              }

              if (path.startsWith("/flatmates")) {
                navigate("/flatmatesdashboard");
                return;
              }

              navigate("/agent/dashboard");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isSmallScreen ? "0.6rem" : "0.9rem",
              cursor: "pointer",
              color: "#FFFFFF",
              userSelect: "none",
              minWidth: 0,
            }}
          >
            <img
              src="/Logo2.jpg"
              alt="ggnHome Logo"
              style={{
                height: isSmallScreen ? 38 : 46,
                width: "auto",
                borderRadius: 10,
                display: "block",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1.2,
                gap: "2px",
              }}
            >
              <span
                style={{
                  fontWeight: 900,
                  fontVariationSettings: '"wght" 900',
                  fontSize: isSmallScreen ? "1.25rem" : "1.6rem",
                  letterSpacing: "0.3px",
                  color: "#FFFFFF",
                  textShadow: "0 2px 12px rgba(34,211,238,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                GgnHome
              </span>
              <span
                style={{
                  fontSize: isSmallScreen
                    ? "0.58rem"
                    : window.innerWidth > 1280
                    ? "0.72rem"
                    : "0.68rem",
                  color: "#22D3EE",
                  opacity: 0.9,
                  whiteSpace: "normal",
                  letterSpacing: "0.3px",
                  maxWidth: isSmallScreen ? 160 : 260,
                  overflow: "visible",
                  display: "block",
                  lineHeight: 1.25,
                  fontWeight: "500",
                }}
              >
                Get Space & Get Rewarded
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation */}
        <div
          style={{
            display: isMediumScreen ? "none" : "flex",
            gap:
              window.innerWidth > 1100
                ? "2rem"
                : isSmallScreen
                ? "0.5rem"
                : "1rem",
            alignItems: "center",
            flex: "1 1 auto",
            justifyContent: "center",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {navItems.slice(0, 3).map((item, idx) => (
            <a
              key={idx}
              href="#"
              style={{
                color: "#FFFFFF",
                textDecoration: "none",
                fontSize: isSmallScreen
                  ? "0.8rem"
                  : window.innerWidth > 1200
                  ? "0.9rem"
                  : "0.85rem",
                fontWeight: "500",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                position: "relative",
                paddingBottom: "4px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#22D3EE";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#FFFFFF";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {item}
            </a>
          ))}
        </div>

        {/* Right Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap:
              density === "icon" ? "0.12rem" : isSmallScreen ? "0" : "0.45rem",
            flex: "0 1 auto",
            minWidth: 0,
            flexWrap: "nowrap",
            overflow: "visible",
            WebkitOverflowScrolling: "touch",
            paddingRight: isSmallScreen ? "10px" : 0,
            // allow the cluster to shrink rather than create a scroll container that overlays the left side
            maxWidth: isSmallScreen ? "58%" : "55%",
          }}
        >
          {!isAgentAuthRoute && (
            <>
              {/* AI Search Button - hidden on small screens */}

              {/* Post Property Button */}
              <button
                style={{
                  ...commonButtonStyle,
                  marginLeft: isSmallScreen ? "4px" : "8px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(34,211,238,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,167,157,0.25)";
                }}
                onClick={() => {
                  if (!resolvedAgent) {
                    navigate(`/agent/login`);
                    return;
                  }
                  navigate("/agent/add-property");
                }}
              >
                {density === "icon" ? (
                  <Square size={18} color="#FFFFFF" />
                ) : (
                  <>
                    <Square size={16} />
                    <span>{density === "compact" ? "Post" : "Post property"}</span>
                    {density === "full" && (
                      <span
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#00A79D",
                          padding: "2px 7px",
                          borderRadius: "5px",
                          fontSize: isSmallScreen ? "0.6rem" : "0.65rem",
                          fontWeight: "800",
                        }}
                      >
                        FREE
                      </span>
                    )}
                  </>
                )}
              </button>
            </>
          )}
          {/* Quick switch to Flatmates Search */}
          {/* Quick switch: toggles between Flatmates Search and Property Search depending on current route */}
          {/* <button
            aria-label={
              isFlatmatesRoute
                ? "Go to Property Search"
                : "Go to Flatmates Search"
            }
            title={isFlatmatesRoute ? "Property Search" : "Flatmates Search"}
            style={{
              ...commonButtonStyle,
              marginLeft: isSmallScreen ? "4px" : "8px",
              background: isFlatmatesRoute
                ? "linear-gradient(90deg,#fff1e0,#ffd9b3)" // warm for property
                : "linear-gradient(90deg,#F7FFFE,#D6FBFF)", // cool for flatmates
              color: isFlatmatesRoute ? "#7A3B00" : "#003346",
              boxShadow: isFlatmatesRoute
                ? "0 6px 20px rgba(255,160,50,0.18)"
                : "0 6px 20px rgba(34,211,238,0.18)",
              fontWeight: 800,
              padding: isSmallScreen ? "6px 8px" : "8px 12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
              e.currentTarget.style.boxShadow = isFlatmatesRoute
                ? "0 12px 34px rgba(255,160,50,0.36)"
                : "0 12px 34px rgba(34,211,238,0.36)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = isFlatmatesRoute
                ? "0 6px 20px rgba(255,160,50,0.18)"
                : "0 6px 20px rgba(34,211,238,0.18)";
            }}
            onClick={() => {
              setShowMenu(false);
              // toggle behaviour: if currently on flatmates routes go to property search, else go to flatmates
              if (isFlatmatesRoute) navigate("/");
              else navigate("/flatmatesdashboard");
            }}
          >
            {density === "icon" ? (
              <Home
                size={16}
                color={isFlatmatesRoute ? "#7A3B00" : "#003346"}
              />
            ) : (
              <>
                <Home
                  size={14}
                  color={isFlatmatesRoute ? "#A65A00" : "#006A85"}
                />
                <span style={{ marginLeft: 6 }}>
                  {isFlatmatesRoute
                    ? density === "compact"
                      ? "Property"
                      : "Property Search"
                    : density === "compact"
                    ? "Flatmates"
                    : "Flatmates Search"}
                </span>
              </>
            )}
          </button> */}

          {/* Location Icon
          {!isSmallScreen && density !== "icon" && (
            <div
              style={{
                ...iconButtonStyle,
                marginRight: "0.3rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#00A79D";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#4A6A8A";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Location size={20} color="#FFFFFF" />
            </div>
          )} */}

          {/* User Email Display */}
          {(resolvedAgent || allowGuestMenu) && (
            <>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#FFFFFF",
                  marginLeft: "0.1rem",
                  marginRight: "0.5rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth:
                    density === "icon" ? "0px" : isSmallScreen ? "64px" : "120px",
                  transition: "max-width 0.18s ease",
                }}
              >
                {density === "full" && window.innerWidth >= 800
                  ? resolvedAgent
                    ?  resolvedAgent.mobileNumber || "Agent"
                    : "Guest"
                  : density !== "full" && !isSmallScreen
                  ? resolvedAgent
                    ? resolvedAgent.mobileNumber || "Agent"
                    : "Guest"
                  : ""}
              </div>

              {/* Lock Icon for Change Password */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChangePasswordModal(true);
                }}
                title="Change Password"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Lock size={14} color="#22D3EE" />
              </button>

              {/* User Menu */}
              <div
                className="user-menu-container"
                style={{
                  position: "relative",
                  flexShrink: 0,

                  overflow: "visible",
                  marginLeft: isSmallScreen ? "6px" : "12px",
                }}
              >
                <div
                  style={{
                    ...iconButtonStyle,
                    boxShadow: showMenu
                      ? "0 0 0 3px rgba(34,211,238,0.3)"
                      : "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu((s) => !s);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#00A79D";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#4A6A8A";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <User size={20} color="#FFFFFF" />
                </div>

                {showMenu && (
                  <>
                    {resolvedAgent ? (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 12px)",
                          right: 0,
                          backgroundColor: "#FFFFFF",
                          borderRadius: 14,
                          boxShadow: "0 12px 32px rgba(0,51,102,0.18)",
                          minWidth: isSmallScreen ? 260 : 300,
                          maxWidth: isSmallScreen ? "calc(100vw - 20px)" : "none",
                          overflow: "hidden",
                          border: "1px solid #F4F7F9",
                          zIndex: 1001,
                          maxHeight: isSmallScreen ? "70vh" : "80vh",
                          overflowY: "auto",
                          animation: "slideDown 0.3s ease",
                        }}
                      >
                        {/* User Header */}
                        <div
                          style={{
                            padding: isSmallScreen
                              ? "1rem 1rem"
                              : "1.25rem 1.25rem",
                            background:
                              "linear-gradient(135deg, #003366 0%, #4A6A8A 100%)",
                            color: "#FFFFFF",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                            }}
                          >
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                backgroundColor: "#22D3EE",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "700",
                                fontSize: "1.25rem",
                                color: "#003366",
                              }}
                            >
                              {resolvedAgent.name
                                ? resolvedAgent.name[0].toUpperCase()
                                : resolvedAgent.email
                                ? resolvedAgent.email[0].toUpperCase()
                                : resolvedAgent.mobileNumber
                                ? resolvedAgent.mobileNumber.slice(-2)
                                : "A"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: "700",
                                  fontSize: "0.95rem",
                                  marginBottom: "0.15rem",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {resolvedAgent.name || resolvedAgent.email || resolvedAgent.mobileNumber || "Agent"}
                              </div>

                              <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                                Welcome back!
                              </div>
                              
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions Section */}
                        {/* Quick Actions Section */}
                        <div style={{ padding: "0.5rem 0" }}>
                          <div
                            style={{
                              padding: "0.4rem 1rem 0.3rem",
                              fontSize: "0.7rem",
                              fontWeight: "700",
                              color: "#4A6A8A",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Quick Actions
                          </div>
                          {/* Show Flatmates Search when NOT on /flatmates* pages */}
                          {/* {!isFlatmatesRoute && (
                            <MenuItem
                              icon={Home}
                              label="Flatmates Search"
                              onClick={() => {
                                setShowMenu(false);
                                navigate('/flatmatesdashboard');
                              }}
                            />
                          )} */}

                          {/* Show Property Search when on any /flatmates* pages */}
                          {/* {isFlatmatesRoute && (
                            <MenuItem
                              icon={Home}
                              label="Property Search"
                              
                              onClick={() => {
                                setShowMenu(false);
                                navigate('/');
                              }}
                            />
                          )} */}

                          <MenuItem
                            icon={Square}
                            label="Post Property"
                            disabled={isInactive}
                            onClick={() => {
                              navigate(`/agent/add-property`);
                            }}
                          />
                        </div>

                        {/* Divider */}
                        <div
                          style={{
                            height: "1px",
                            backgroundColor: "#F4F7F9",
                            margin: "0.5rem 0",
                          }}
                        />

                        {/* Main Menu Section */}
                        <div style={{ padding: "0.5rem 0" }}>
                          <div
                            style={{
                              padding: "0.4rem 1rem 0.3rem",
                              fontSize: "0.7rem",
                              fontWeight: "700",
                              color: "#4A6A8A",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            My Account
                          </div>

                          {/* Listings submenu */}
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <button
                              onClick={() =>
                                setShowListingsSubmenu(!showListingsSubmenu)
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "0.75rem",
                                width: "100%",
                                padding: isSmallScreen
                                  ? "0.6rem 1rem"
                                  : "0.75rem 1.25rem",
                                backgroundColor: "transparent",
                                color: "#333333",
                                border: "none",
                                cursor: "pointer",
                                fontSize: isSmallScreen ? "0.85rem" : "0.9rem",
                                fontWeight: "600",
                                borderRadius: 6,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                }}
                              >
                                <Home size={18} color="#4A6A8A" />
                                <span>Manage Listings</span>
                              </div>
                              <div style={{ opacity: 0.7 }}>
                                {showListingsSubmenu ? "▾" : "▸"}
                              </div>
                            </button>

                            {showListingsSubmenu && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  paddingLeft: 12,
                                  gap: 6,
                                }}
                              >
                                <MenuItem
                                  icon={Home}
                                  label="Manage Property Listings"
                                  disabled={isInactive}
                                  onClick={() => {
                                    navigate("/agent/my-properties");
                                  }}
                                />

                                {/* <MenuItem
                                  icon={Home}
                                  label="Manage Flatmates Listing"
                                  onClick={() => {
                                    setShowMenu(false);
                                    navigate('/flatmatesmylistings');
                                  }}
                                /> */}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Divider */}
                        <div
                          style={{
                            height: "1px",
                            backgroundColor: "#F4F7F9",
                            margin: "0.5rem 0",
                          }}
                        />

                        {/* Support Section */}
                        <div style={{ padding: "0.5rem 0 1rem" }}>
                          <div
                            style={{
                              padding: "0.4rem 1rem 0.3rem",
                              fontSize: "0.7rem",
                              fontWeight: "700",
                              color: "#4A6A8A",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Support
                          </div>
                          <MenuItem
                            icon={HelpCircle}
                            label="Customer Support"
                            disabled={false}
                            onClick={() => navigate("/agent/support")}
                          />
                        </div>

                        {/* Divider */}
                        <div
                          style={{ height: "1px", backgroundColor: "#F4F7F9" }}
                        />


                        {/* Logout */}
                        <div style={{ padding: "0.75rem 0" }}>
                          <MenuItem
                            icon={LogOut}
                            label="Log Out"
                            onClick={handleLogout}
                            isLogout
                            disabled={false}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 12px)",
                          right: 0,
                          backgroundColor: "#FFFFFF",
                          borderRadius: 14,
                          boxShadow: "0 12px 32px rgba(0,51,102,0.18)",
                          minWidth: isSmallScreen ? 200 : 220,
                          maxWidth: isSmallScreen ? "calc(100vw - 16px)" : "none",
                          padding: isSmallScreen ? "1.25rem" : "1.5rem",
                          zIndex: 1001,
                          animation: "slideDown 0.3s ease",
                        }}
                      >
                        <div
                          style={{
                            color: "#003366",
                            marginBottom: "1rem",
                            fontWeight: "600",
                            textAlign: "center",
                            fontSize: "0.95rem",
                          }}
                        >
                          You are not logged in.
                        </div>
                        <button
                          onClick={() =>
                            navigate("/agent/login", {
                              state: { from: location.pathname },
                            })
                          }
                          style={{
                            background:
                              "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                            color: "#FFFFFF",
                            padding: isSmallScreen
                              ? "0.65rem 1rem"
                              : "0.75rem 1rem",
                            border: "none",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontWeight: 600,
                            width: "100%",
                            fontSize: "0.9rem",
                            transition: "all 0.3s ease",
                            boxShadow: "0 4px 12px rgba(0,167,157,0.25)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow =
                              "0 6px 20px rgba(34,211,238,0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(0,167,157,0.25)";
                          }}
                        >
                          Login Now
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          
        </div>
      </motion.nav>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowChangePasswordModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "1.5rem",
              width: "100%",
              maxWidth: 360,
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ marginBottom: 12, color: "#003366" }}>
              Update Password / Recovery Email
            </h3>

            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "1px solid #ccc",
                marginBottom: 12,
              }}
            />
            {/* Recovery Email Input */}
            <input
              type="email"
              placeholder="Recovery email (optional)"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "1px solid #ccc",
                marginBottom: 12,
              }}
            />

            {emailError && (
              <div style={{ color: "red", fontSize: 13, marginBottom: 8 }}>
                {emailError}
              </div>
            )}

            {emailSuccess && (
              <div style={{ color: "green", fontSize: 13, marginBottom: 8 }}>
                {emailSuccess}
              </div>
            )}

            {passwordError && (
              <div style={{ color: "red", fontSize: 13, marginBottom: 8 }}>
                {passwordError}
              </div>
            )}
            {newPassword && newPassword.length > 0 && newPassword.length < 6 && !passwordError && (
              <div style={{ color: "red", fontSize: 13, marginBottom: 8 }}>
                Password must be at least 6 characters long
              </div>
            )}

            <button
              disabled={passwordLoading || emailSaving}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: "#00A79D",
                color: "#fff",
                fontWeight: 700,
                cursor: passwordLoading || emailSaving ? "not-allowed" : "pointer",
              }}
              onClick={async () => {
                try {
                  setPasswordError("");
                  setEmailError("");
                  setEmailSuccess("");

                  // 1️⃣ Update password ONLY if entered
                  if (newPassword && newPassword.length < 6) {
                    setPasswordError("Password must be at least 6 characters long");
                    return;
                  }

                  if (newPassword) {
                    setPasswordLoading(true);

                    const BASE_API = process.env.REACT_APP_Base_API || "";
                    const url = `${BASE_API.replace(/\/$/, "")}/auth/change-password-direct`;

                    const res = await fetch(url, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ newPassword }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || "Password update failed");
                  }

                  // 2️⃣ Save recovery email (ALWAYS allowed)
                  if (recoveryEmail) {
                    await handleSaveRecoveryEmail();
                  }

                  setShowChangePasswordModal(false);
                  setNewPassword("");
                  setRecoveryEmail("");
                } catch (err) {
                  setPasswordError(err.message || "Something went wrong");
                } finally {
                  setPasswordLoading(false);
                }
              }}
            >
              {passwordLoading || emailSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Preference Popup Modal */}
      {showPreferencePopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,51,102,0.7)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "18px",
              boxShadow: "0 24px 64px rgba(0,51,102,0.3)",
              width: "100%",
              maxWidth: isSmallScreen ? "340px" : "500px",
              padding: isSmallScreen ? "1.5rem" : "2.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              animation: "slideUp 0.4s ease",
            }}
          >
            <div
              style={{
                width: isSmallScreen ? "64px" : "72px",
                height: isSmallScreen ? "64px" : "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: isSmallScreen ? "1.25rem" : "1.5rem",
                boxShadow: "0 8px 24px rgba(0,167,157,0.3)",
              }}
            >
              <span style={{ fontSize: isSmallScreen ? "2rem" : "2.5rem" }}>
                ✨
              </span>
            </div>

            <div
              style={{
                fontSize: isSmallScreen ? "1.25rem" : "1.6rem",
                fontWeight: "800",
                marginBottom: "0.75rem",
                color: "#003366",
              }}
            >
              Personalize Your Experience
            </div>

            <div
              style={{
                fontSize: isSmallScreen ? "0.9rem" : "1rem",
                color: "#4A6A8A",
                marginBottom: isSmallScreen ? "1.5rem" : "2rem",
                lineHeight: 1.6,
              }}
            >
              Tell us your preferences to get smarter property matches tailored
              just for you.
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: isSmallScreen ? "column" : "row",
                gap: "1rem",
                width: "100%",
              }}
            >
              <button
                onClick={() => {
                  // hide and persist dismissal for a short while to avoid immediate re-show
                  dismissPrefPopup(5 * 60 * 1000); // 5 minutes
                  navigate(`${process.env.REACT_APP_AI_ASSISTANT_PAGE}`);
                }}
                style={{
                  flex: 1,
                  padding: "0.875rem 1.5rem",
                  background:
                    "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "700",
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(0, 167, 157, 0.3)",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 24px rgba(34, 211, 238, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(0, 167, 157, 0.3)";
                }}
              >
                Set Preferences
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissPrefPopup(10 * 60 * 1000);
                }}
                style={{
                  flex: 1,
                  padding: "0.875rem 1.5rem",
                  background: "#F4F7F9",
                  color: "#4A6A8A",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "700",
                  fontSize: "1rem",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#4A6A8A";
                  e.currentTarget.style.color = "#FFFFFF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#F4F7F9";
                  e.currentTarget.style.color = "#4A6A8A";
                }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default TopNavigationBar;