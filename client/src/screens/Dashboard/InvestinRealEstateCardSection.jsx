import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNavigationBar from "../Dashboard/TopNavigationBar";

// Color palette
const colors = {
  navBg: "#003366",
  navText: "#FFFFFF",
  slate: "#4A6A8A",
  teal: "#00A79D",
  cyan: "#22D3EE",
  alabaster: "#F4F7F9",
  white: "#FFFFFF",
  charcoal: "#333333",
};

// Main Page
export default function InvestRealEstatePage() {
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
    const navigate = useNavigate();
    const isMobile = window.innerWidth < 600;
  const navItems = [
    "For Buyers",
    "For Tenants",
    "For Owners",
    "For Dealers / Builders",
    "Insights",
  ];

  // Hybrid authentication: get access token from localStorage
  const userToken = localStorage.getItem("accessToken");

  // Logout handler
  const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
      },
    });
    setUser(null);
    window.location.href = "/login";
  };

  // Fetch user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        });
        const data = await res.json();
        if (res.ok) setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  // Fetch property data
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const base = process.env.REACT_APP_BASE_API || process.env.REACT_APP_Base_API || "";
        const url = `${base}/api/activeproperties?limit=8`;
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          console.error("Properties API not ok:", res.status, res.statusText);
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          console.error("Unexpected properties payload:", data);
          return;
        }
        const normalized = data.map((p) => ({
          id: p._id || p.id || p.propertyId || Math.random().toString(36).slice(2),
          imageUrl: (Array.isArray(p.images) && p.images[0]) || p.imageUrl || "/default-property.jpg",
          name: p.title || p.name || (p.defaultpropertytype === "rental" ? "Property For Rent" : "Property"),
          location: p.Sector || p.location || p.address || "",
          price: typeof p.price === "number" && p.price > 0
            ? `₹ ${Number(p.price).toLocaleString()}`
            : typeof p.monthlyRent === "number" && p.monthlyRent > 0
            ? `₹ ${Number(p.monthlyRent).toLocaleString()}/mo`
            : "Price on request",
          defaultpropertytype: p.defaultpropertytype,
        }));
        setProperties(normalized.slice(0, 12));
      } catch (err) {
        console.error("Error fetching properties:", err);
      }
    };
    fetchProperties();
  }, []);

  return (
    <div
      style={{
        background: colors.alabaster,
        fontFamily: "'Inter', 'Poppins', sans-serif",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 999,
          backgroundColor: "#FFFFFF",
        }}
      >
        <TopNavigationBar
          user={user}
          handleLogout={handleLogout}
          navItems={navItems}
        />
      </div>

      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          height: "500px",
          background: `linear-gradient(135deg, ${colors.navBg} 0%, ${colors.slate} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginTop: "64px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "url('/Dashboard.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.15,
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            color: colors.white,
            maxWidth: "900px",
            padding: "0 24px",
          }}
        >
          <h1
            style={{
              fontSize: "52px",
              fontWeight: 800,
              marginBottom: "24px",
              lineHeight: 1.2,
              letterSpacing: "-0.5px",
            }}
          >
            Invest Smart in Gurgaon
          </h1>
          <p
            style={{
              fontSize: "22px",
              fontWeight: 400,
              marginBottom: "36px",
              opacity: 0.95,
              lineHeight: 1.6,
            }}
          >
            Your Expert Consultation Awaits — Personalized Strategies for Maximum Returns
          </p>
                  <button
                      onClick={() => navigate('/support')}
            style={{
              background: colors.cyan,
              color: colors.white,
              border: "none",
              padding: "16px 40px",
              fontSize: "18px",
              fontWeight: 600,
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(34, 211, 238, 0.3)",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(34, 211, 238, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(34, 211, 238, 0.3)";
            }}
          >
            Start Your Consultation
          </button>
        </div>
      </section>

      {/* Why Choose Us Section with Feature Cards */}
      <section
        style={{
          background: colors.white,
          padding: "80px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              color: colors.charcoal,
              fontSize: "42px",
              fontWeight: 700,
              textAlign: "center",
              marginBottom: "16px",
              letterSpacing: "-0.5px",
            }}
          >
            Go Beyond Listings
          </h2>
          <p
            style={{
              color: colors.slate,
              fontSize: "20px",
              textAlign: "center",
              marginBottom: "60px",
              maxWidth: "800px",
              margin: "0 auto 60px auto",
              lineHeight: 1.6,
            }}
          >
            Get a personalized investment strategy designed to align your financial goals with the best opportunities in Gurgaon
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "32px",
              marginBottom: "48px",
            }}
          >
            {[
              {
                icon: "📊",
                title: "Market Deep Dive",
                desc: "Get unbiased expert insights into Gurgaon's micro-markets with rental yield projections and infrastructure impact analysis",
              },
              {
                icon: "💼",
                title: "Personalized Portfolio",
                desc: "Receive a custom portfolio of 10-12 high-potential properties tailored to your budget and investment goals",
              },
              {
                icon: "💰",
                title: "Financial Clarity",
                desc: "Detailed quotations, ROI forecasts, and comprehensive cost-benefit analyses before you commit",
              },
              {
                icon: "🤝",
                title: "Direct Expert Access",
                desc: "Speak directly with Parveen and Bharat Chawla — no call centers, just real expertise and trust",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                style={{
                  background: colors.alabaster,
                  padding: "36px 28px",
                  borderRadius: "16px",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                  border: `2px solid transparent`,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)";
                  e.currentTarget.style.border = `2px solid ${colors.cyan}`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.border = "2px solid transparent";
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>
                  {feature.icon}
                </div>
                <h3
                  style={{
                    color: colors.navBg,
                    fontSize: "22px",
                    fontWeight: 700,
                    marginBottom: "12px",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    color: colors.slate,
                    fontSize: "16px",
                    lineHeight: 1.6,
                  }}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Expert Consultation CTA */}
      <section
        style={{
          background: `linear-gradient(135deg, ${colors.teal} 0%, ${colors.cyan} 100%)`,
          padding: "80px 24px",
          color: colors.white,
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "38px",
              fontWeight: 700,
              marginBottom: "20px",
              letterSpacing: "-0.5px",
            }}
          >
            Meet Your Investment Experts
          </h2>
          <p
            style={{
              fontSize: "19px",
              marginBottom: "48px",
              opacity: 0.95,
              lineHeight: 1.6,
            }}
          >
            Led by seasoned professionals <strong>Parveen Chawla</strong> and <strong>Bharat Chawla</strong>, our team is dedicated to your portfolio's success
          </p>
          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* <button
              onClick={() => navigate('/support')}
              style={{
                background: colors.white,
                color: colors.teal,
                border: "none",
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: 700,
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.18)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
              }}
            >
              👋 Talk to Support
            </button> */}

            <a
              href="mailto:parveen@gmail.com"
              style={{
                color: colors.white,
                background: 'rgba(255,255,255,0.15)',
                border: `1px solid ${colors.white}`,
                padding: "10px 16px",
                borderRadius: "8px",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "15px",
              }}
            >
              ✉️ parveen@gmail.com
            </a>

            <a
              href="tel:+919310994032"
              style={{
                color: colors.white,
                background: 'rgba(255,255,255,0.15)',
                border: `1px solid ${colors.white}`,
                padding: "10px 16px",
                borderRadius: "8px",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "15px",
              }}
            >
              📞 9310994032
            </a>
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "80px 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h3
            style={{
              color: colors.charcoal,
              fontWeight: 700,
              fontSize: "38px",
              marginBottom: "12px",
              letterSpacing: "-0.5px",
            }}
          >
            Featured Investment Properties
          </h3>
          <p style={{ color: colors.slate, fontSize: "18px" }}>
            Handpicked opportunities in Gurgaon's prime locations
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "32px",
          }}
        >
          {properties.length === 0 ? (
            <div
              style={{
                color: colors.slate,
                fontSize: 18,
                padding: "60px 0",
                textAlign: "center",
                gridColumn: "1 / -1",
              }}
            >
              Loading properties...
            </div>
          ) : (
            properties.map((prop) => (
              <div
                key={prop.id || `${prop.name}-${prop.location}-${Math.random()}`}
                style={{
                  background: colors.white,
                  borderRadius: "16px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  border: "2px solid transparent",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.15)";
                  e.currentTarget.style.border = `2px solid ${colors.cyan}`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.border = "2px solid transparent";
                }}
                onClick={() =>
                  navigate(
                    prop.defaultpropertytype === "rental"
                      ? `/Rentaldetails/${prop.id}`
                      : `/Saledetails/${prop.id}`
                  )
                }
              >
                <div style={{ position: "relative" }}>
                  <img
                    src={prop.imageUrl || "/default-property.jpg"}
                    alt={prop.name || "Property"}
                    style={{
                      width: "100%",
                      height: "220px",
                      objectFit: "cover",
                      background: colors.alabaster,
                    }}
                    onError={(e) => {
                      if (
                        e.currentTarget.src !==
                        window.location.origin + "/default-property.jpg"
                      ) {
                        e.currentTarget.src = "/default-property.jpg";
                      }
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      backgroundColor:
                        prop.defaultpropertytype === "rental"
                          ? colors.teal
                          : colors.cyan,
                      color: colors.white,
                      fontSize: "13px",
                      fontWeight: 700,
                      padding: "6px 14px",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    }}
                  >
                    {prop.defaultpropertytype === "rental" ? "For Rent" : "For Sale"}
                  </div>
                </div>
                <div style={{ padding: "24px" }}>
                  <div
                    style={{
                      color: colors.navBg,
                      fontWeight: 700,
                      fontSize: "20px",
                      marginBottom: "8px",
                      lineHeight: 1.3,
                    }}
                  >
                    {prop.name}
                  </div>
                  <div
                    style={{
                      color: colors.slate,
                      fontWeight: 500,
                      fontSize: "15px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>📍</span>
                    {prop.location}
                  </div>
                  <div
                    style={{
                      color: colors.teal,
                      fontWeight: 700,
                      fontSize: "22px",
                    }}
                  >
                    {prop.price}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
          </section>
          {/* Footer */}
      <footer
        style={{
          background: "linear-gradient(135deg, #003366 0%, #004b6b 100%)",
          color: "#FFFFFF",
          padding: isMobile ? "1.2rem 0.4rem" : "3rem 1.5rem",
          textAlign: "center",
          marginTop: isMobile ? "1.2rem" : "3rem",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h3
            style={{
              fontWeight: "800",
              fontSize: isMobile ? "1.1rem" : "1.6rem",
              marginBottom: isMobile ? "0.2rem" : "0.5rem",
            }}
          >
            ggnHome – Find Your Dream Home
          </h3>
          <p
            style={{
              fontSize: isMobile ? "0.8rem" : "0.9rem",
              color: "#D1E7FF",
              marginBottom: isMobile ? "0.8rem" : "1.5rem",
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            Explore thousands of verified listings, connect directly with owners, and make your next move with confidence.
          </p>
          <div
            className="dashboard-footer-links"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: isMobile ? "10px" : "2rem",
              flexWrap: "wrap",
              marginBottom: isMobile ? "1rem" : "2rem",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
            }}
          >
            <a href="/" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: isMobile ? "0.95rem" : "0.9rem" }}>Home</a>
            <a href="/about" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: isMobile ? "0.95rem" : "0.9rem" }}>About</a>
            <a href="/support" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: isMobile ? "0.95rem" : "0.9rem" }}>Contact</a>
            <a href="/add-property" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: isMobile ? "0.95rem" : "0.9rem" }}>Post Property</a>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.15)",
              paddingTop: isMobile ? "0.7rem" : "1rem",
              fontSize: isMobile ? "0.7rem" : "0.8rem",
              color: "#B0C4DE",
            }}
          >
            © {new Date().getFullYear()} ggnHome. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}