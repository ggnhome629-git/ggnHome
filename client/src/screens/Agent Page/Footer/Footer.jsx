

import React from "react";

const Footer = ({ isMobile, user }) => {
  return (
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
          <a
            href={user ? "/agent/add-property" : "/agent/login"}
            style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: isMobile ? "0.95rem" : "0.9rem" }}
          >
            Post Property
          </a>
        </div>

        {/* Contact info: phone + email */}
        <div
          style={{
            marginBottom: isMobile ? "0.8rem" : "1.25rem",
            color: "#D1E7FF",
            fontSize: isMobile ? "0.85rem" : "0.95rem",
          }}
        >
          <div>
            Phone: <a href="tel:+919654131789" style={{ color: "#FFFFFF", fontWeight: 700, textDecoration: "none" }}>+91 96541 31789</a>
          </div>
          <div style={{ marginTop: 6 }}>
            Email: <a href="mailto:support@ggnhome.com" style={{ color: "#FFFFFF", fontWeight: 700, textDecoration: "none" }}>support@ggnhome.com</a>
          </div>
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
  );
};

export default Footer;