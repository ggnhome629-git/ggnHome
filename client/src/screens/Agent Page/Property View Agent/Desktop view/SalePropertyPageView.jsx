import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import {
  Home,
  Bed,
  Bath,
  Maximize,
  Car,
  DollarSign,
  MapPin,
  Calendar,
  Shield,
  Wrench,
  Wind,
  Zap,
  Droplet,
  Users,
  AlertCircle,
  PawPrint,
  Cigarette,
  Share2,
  Heart,
  Phone,
  X,
  Eye,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import TopNavigationBar from "../../Top Navigation Bar/AgentTopNavigationBar";
import {useAuth} from '../../../../Context/AuthContext';
import EnquiryPage from "../../../Visit Schedule/enquiry"; // adjust the path if needed
import MapIntegration from "../mapsintegration";
import { Button } from "@mui/material";
import SimilarProperties from "../Similarproperties";
import { Helmet } from "react-helmet";

// Authorization header fallback for protected API calls (works when cookies are off)
const agentToken = localStorage.getItem("agentAccessToken");

const addEngagementTime = async (propertyId, seconds) => {
  try {
    await fetch(process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_ENGAGEMENT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
      },
      body: JSON.stringify({ propertyId, seconds }),
      credentials: "include",
    });
  } catch (err) {
    console.error("Error adding engagement time:", err);
  }
};

const addRating = async (propertyId, rating, comment = "") => {
  try {
    await fetch(process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_RATING, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
      },
      body: JSON.stringify({ propertyId, rating, comment }),
      credentials: "include",
    });
  } catch (err) {
    console.error("Error adding rating:", err);
  }
};

export default function SalePropertyPageAgent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const previewMode = location.state?.preview || false;
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
     const { user } = useAuth();
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [openMapModal, setOpenMapModal] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [metrics, setMetrics] = useState({});
  const [conversion, setConversion] = useState({});

  const openEnquiry = () => setShowEnquiryModal(true);
  const closeEnquiry = () => setShowEnquiryModal(false);

  const handleSubmitRating = async () => {
    if (userRating < 1) {
      alert("Please select a rating before submitting!");
      return;
    }
    await addRating(id, userRating, userComment);
    alert("Thank you for your rating!");
    setUserRating(0);
    setUserComment("");
  };

  useEffect(() => {
    if (!property) return;
    const startTime = Date.now();
    return () => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      addEngagementTime(id, seconds);
    };
  }, [id, property]);

  useEffect(() => {
    async function fetchProperty() {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_SALE_PROPERTY_DETAIL_API}/${id}`,
          {
            credentials: "include",
            headers: {
              ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            },
          }
        );

        if (!response.ok) {
          // Backend returned non-200 (404/401/etc)
          console.warn('fetchProperty: response not ok', response.status);
          setProperty(null);
          setLoading(false);
          return;
        }

        const data = await response.json();

        // Only block inactive properties if NOT in preview mode
        if (!previewMode && data && typeof data.isActive !== 'undefined' && data.isActive === false) {
          console.warn('fetchProperty: property is inactive and previewMode is OFF', id);
          setProperty(null);
          setLoading(false);
          return;
        }

        // Otherwise set the fetched property
        setProperty(data);
      } catch (error) {
        console.error('Error fetching property:', error);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchProperty();
  }, [id]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const metricsRes = await fetch(
          `${process.env.REACT_APP_PROPERTY_ANALYSIS_GET_METRICS}/${id}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            },
          }
        );
        const data = await metricsRes.json();
        let performanceOverTime = [];
        if (Array.isArray(data.engagementTime)) {
          performanceOverTime = data.engagementTime.map((et) => ({
            time: et.time || et.day || et.period || "",
            seconds: et.seconds,
          }));
        }
        const summary = [];
        setMetrics({
          ...data,
          performanceOverTime,
          summary,
        });

        const conversionRes = await fetch(
          `${process.env.REACT_APP_PROPERTY_ANALYSIS_GET_CONVERSION}/${id}/conversion`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
            },
          }
        );
        const conv = await conversionRes.json();
        setConversion(conv || {});
      } catch (err) {
        console.error("Error fetching analytics:", err);
      }
    };

    if (id) fetchAnalytics();
  }, [id]);

  

  const handleSave = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_SAVE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
          },
          body: JSON.stringify({ propertyId: id }),
          credentials: "include",
        }
      );
      if (response.ok) alert("Property saved successfully!");
      else alert("Failed to save property.");
    } catch (error) {
      console.error("Error saving property:", error);
    }
  };

  

  const navItems = [
    "For Buyers",
    "For Tenants",
    "For Owners",
    "For Dealers / Builders",
    "Insights",
  ];

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    } catch (err) {
      alert("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F4F7F9",
          fontFamily: "system-ui,-apple-system,sans-serif",
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
            
            navItems={navItems}
          />
        </div>
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "100px 20px 40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "18px", color: "#4A6A8A" }}>
            Loading property details...
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F4F7F9",
          fontFamily: "system-ui,-apple-system,sans-serif",
        }}
      >
        <TopNavigationBar
          navItems={navItems}
          
        />
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "100px 20px 40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "18px", color: "#4A6A8A" }}>
            Property not found.
          </div>
        </div>
      </div>
    );
  }

  // ---------- Dynamic SEO (Safe image + JSON-LD) ----------






  const images =
    property.images && property.images.length > 0
      ? property.images
      : ["https://via.placeholder.com/800x600?text=No+Image"];

  const panoramas = Array.isArray(property.panoramas) ? property.panoramas : [];
  const hasPanoramas =
    Array.isArray(panoramas) &&
    panoramas.some(
      (p) => p && typeof p.url === "string" && p.url.trim() !== ""
    );

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N.A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper for safe image for meta tags
  const safeImage = (img) =>
    typeof img === "string" && img.startsWith("http") ? img : "https://ggnhome.in/logo192.png";

  // Structured data for SEO
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${property?.bedrooms || ""} BHK ${property?.propertyType || "Property"} for Sale in ${property?.Sector || "Gurgaon"}`,
    image: safeImage(property?.images?.[0]),
    description: `Buy a ${property?.bedrooms || ""} BHK ${property?.propertyType || ""} in ${property?.Sector || ""}, Gurgaon. Price: ₹${property?.price ? Number(property.price).toLocaleString() : "N/A"}. Area: ${property?.totalArea?.sqft || "N/A"} sq.ft. Verified listing on GgnHome.`,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: property?.price || "",
      availability: property?.isActive ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://ggnhome.in/Saledetails/${property?._id}`,
    },
    url: `https://ggnhome.in/Saledetails/${property?._id}`,
  });

  // REMOVE THE STANDALONE <Helmet>...</Helmet> BLOCK IF PRESENT (not needed as it will be inside return)

  return (
    <React.Fragment>
      <Helmet>
        <title>
          {`${property?.bedrooms || ""} BHK ${property?.propertyType || "Property"} for Sale in ${property?.Sector || "Gurgaon"} | ₹${property?.price ? Number(property.price).toLocaleString() : "N/A"} | GgnHome`}
        </title>

        <meta
          name="description"
          content={`Buy a ${property?.bedrooms || ""} BHK ${property?.propertyType || ""} in ${property?.Sector || ""}, Gurgaon. Price: ₹${property?.price ? Number(property.price).toLocaleString() : "N/A"}. Area: ${property?.totalArea?.sqft || "N/A"} sq.ft. Verified listing on GgnHome.`}
        />

        <meta
          name="keywords"
          content={`buy in ${property?.Sector}, ${property?.bedrooms} BHK for sale Gurgaon, ${property?.propertyType} for sale Gurgaon, GgnHome, property in Gurgaon`}
        />

        {/* Open Graph */}
        <meta property="og:title" content={`${property?.bedrooms} BHK ${property?.propertyType} for Sale in ${property?.Sector}`} />
        <meta property="og:description" content={`Price: ₹${property?.price ? Number(property.price).toLocaleString() : "N/A"}. Area: ${property?.totalArea?.sqft || "N/A"} sq.ft.`} />
        <meta property="og:image" content={safeImage(property?.images?.[0])} />
        <meta property="og:url" content={`https://ggnhome.in/Saledetails/${property?._id}`} />
        <meta property="og:type" content="product" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={` ${property?.bedrooms} BHK for Sale in ${property?.Sector}`} />
        <meta name="twitter:description" content={`Price: ₹${property?.price ? Number(property.price).toLocaleString() : "N/A"}. Area: ${property?.totalArea?.sqft || "N/A"} sq.ft.`} />
        <meta name="twitter:image" content={safeImage(property?.images?.[0])} />

        {/* Canonical URL */}
        <link rel="canonical" href={`https://ggnhome.in/Saledetails/${property?._id}`} />

        {/* Structured Data */}
        <script type="application/ld+json">{jsonLd}</script>
      </Helmet>
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F7F9",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}
    >
      <style>{`
        @media (max-width: 968px) { 
          .property-grid { grid-template-columns: 1fr !important; } 
          .top-info-grid { grid-template-columns: 1fr !important; }
          .stat-card { min-width: 120px; }
        }
        @media (min-width: 969px) { 
          .property-grid { grid-template-columns: 2fr 1fr !important; }
          .top-info-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        .image-nav-btn { transition: all 0.2s; }
        .image-nav-btn:hover { background: rgba(0, 167, 157, 0.9) !important; transform: scale(1.05); }
      `}</style>

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 999,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <TopNavigationBar
          navItems={navItems}
         
        />
      </div>

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "90px 20px 40px",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{ padding: "0 0 20px", fontSize: "14px", color: "#4A6A8A" }}
        >
          <span
            style={{ cursor: "pointer", color: "#003366" }}
            onClick={() => navigate("/")}
          >
            Home
          </span>
          <span style={{ margin: "0 8px", color: "#4A6A8A" }}>›</span>
          <span style={{ cursor: "pointer", color: "#4A6A8A" }}>
            Properties for Sale
          </span>
          <span style={{ margin: "0 8px", color: "#4A6A8A" }}>›</span>
          <span style={{ color: "#00A79D", fontWeight: "600" }}>
            {property.Sector || ""}
          </span>
        </div>

        {/* Property Title & Quick Stats */}
        <div style={{
          marginBottom: "24px",
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #E5E7EB"
        }}>
          {/* Left Section - Icon & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", flex: 1 }}>
            <div style={{
              width: "60px",
              height: "60px",
              background: "#ECFDF5",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #D1FAE5"
            }}>
              <div style={{ fontSize: "24px" }}>🏡</div>
              <div style={{ fontSize: "11px", color: "#059669", fontWeight: "600" }}>Sale</div>
            </div>
            <div>
              <h1 style={{ 
                fontSize: "22px", 
                fontWeight: "600", 
                color: "#1F2937", 
                marginBottom: "6px", 
                margin: 0 
              }}>
                {property.title || "Sale Property"}
              </h1>
              <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
                {property.Sector || "Location not specified"}
              </p>
            </div>
          </div>

          {/* Middle Section - Stats */}
          <div style={{ 
            display: "flex", 
            gap: "40px", 
            alignItems: "center",
            paddingLeft: "32px",
            paddingRight: "32px",
            borderLeft: "1px solid #E5E7EB"
          }}>
            {/* Price */}
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: "22px", 
                fontWeight: "700", 
                color: "#1F2937",
                marginBottom: "4px"
              }}>
                ₹ {property.price ? property.price.toLocaleString() : "N/A"}
              </div>
              <div style={{ fontSize: "13px", color: "#6B7280", fontWeight: "500" }}>
                Price
              </div>
            </div>

            {/* Divider */}
            <div style={{ 
              width: "1px", 
              height: "45px", 
              background: "#E5E7EB" 
            }}></div>

            {/* Sq.Ft */}
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: "22px", 
                fontWeight: "700", 
                color: "#1F2937",
                marginBottom: "4px"
              }}>
                {property.totalArea?.sqft ? property.totalArea.sqft.toLocaleString() : 'N/A'}
              </div>
              <div style={{ fontSize: "13px", color: "#6B7280", fontWeight: "500" }}>
                Sq.Ft
              </div>
            </div>

            {/* Divider */}
            <div style={{ 
              width: "1px", 
              height: "45px", 
              background: "#E5E7EB" 
            }}></div>

            {/* Configuration */}
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: "22px", 
                fontWeight: "700", 
                color: "#1F2937",
                marginBottom: "4px"
              }}>
                {property.totalArea?.configuration || 'N/A'}
              </div>
              <div style={{ fontSize: "13px", color: "#6B7280", fontWeight: "500" }}>
                Configuration
              </div>
            </div>
          </div>

          {/* Right Section - Button */}
          <div style={{ paddingLeft: "32px" }}>
            {/* <button
              onClick={openEnquiry}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#059669";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#10B981";
              }}
              style={{
                background: "#10B981",
                color: "#FFFFFF",
                border: "none",
                padding: "14px 32px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap"
              }}
            >
              Enquire
            </button> */}
          </div>
        </div>

        {/* Main Layout Container */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          
          {/* LEFT COLUMN - Image Gallery */}
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            height: "fit-content"
          }}>
            {/* Main Image Container */}
            <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex] || "/default-property.jpg"}
                  alt="Property"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    width: "100%",
                    height: "500px",
                    objectFit: "cover",
                    display: "block"
                  }}
                  onError={(e) => {
                    e.currentTarget.src = "/default-property.jpg";
                  }}
                />
              </AnimatePresence>


              {/* Virtual Tour Button */}
              {/* {hasPanoramas && (
                <button
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    background: "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(0, 167, 157, 0.3)"
                  }}
                >
                  🌐 360° Virtual Tour
                </button>
              )} */}

              {/* Photo Count Badge */}
              {/* <div style={{
                position: "absolute",
                bottom: "20px",
                left: "20px",
                background: "rgba(0, 51, 102, 0.9)",
                color: "#FFFFFF",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                backdropFilter: "blur(10px)"
              }}>
                📷 {currentImageIndex + 1} / {images.length}
              </div> */}

              {/* Navigation Arrows */}
              {/* {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length)}
                    style={{
                      position: "absolute",
                      left: "20px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(0, 167, 157, 0.85)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "50%",
                      width: "48px",
                      height: "48px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      fontSize: "20px"
                    }}
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((currentImageIndex + 1) % images.length)}
                    style={{
                      position: "absolute",
                      right: "20px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(0, 167, 157, 0.85)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "50%",
                      width: "48px",
                      height: "48px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      fontSize: "20px"
                    }}
                  >
                    ›
                  </button>
                </>
              )} */}
            </div>

            {/* Thumbnail Strip */}
            {/* {images.length > 1 && (
              <div style={{
                display: "flex",
                gap: "12px",
                overflowX: "auto",
                paddingBottom: "8px"
              }}>
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Thumbnail ${i + 1}`}
                    onClick={() => setCurrentImageIndex(i)}
                    style={{
                      width: "100px",
                      height: "75px",
                      objectFit: "cover",
                      borderRadius: "6px",
                      cursor: "pointer",
                      border: i === currentImageIndex ? "3px solid #00A79D" : "3px solid transparent",
                      opacity: i === currentImageIndex ? 1 : 0.6,
                      transition: "all 0.2s",
                      flexShrink: 0
                    }}
                  />
                ))}
              </div>
            )} */}
              <div>For privacy reasons, property images are shared individually via WhatsApp upon enquiry</div>
          </div>

          {/* RIGHT COLUMN - Property Details */}
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
          }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#003366",
              marginBottom: "24px",
              borderBottom: "3px solid #00A79D",
              paddingBottom: "12px"
            }}>
              Property Information
            </h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px"
            }}>

              {/* Title */}
              <div style={{
                background: "#F0F9FF",
                borderRadius: "12px",
                padding: "20px",
                border: "2px solid #BAE6FD"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px"
                }}>
                  <span style={{ fontSize: "20px" }}>🏷️</span>
                  <div style={{ fontSize: "14px", color: "#0369A1", fontWeight: "600" }}>
                    Property Title
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#4A6A8A", lineHeight: "1.6" }}>
                  {property.title || "N.A"}
                </div>
              </div>

              {/* Sector */}
              <div style={{
                background: "#FEF3C7",
                borderRadius: "12px",
                padding: "20px",
                border: "2px solid #FDE047"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px"
                }}>
                  <span style={{ fontSize: "20px" }}>📍</span>
                  <div style={{ fontSize: "14px", color: "#A16207", fontWeight: "600" }}>
                    Sector
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#4A6A8A", lineHeight: "1.6" }}>
                  {property.Sector || "N.A"}
                </div>
              </div>

              {/* Price */}
              <div style={{
                background: "#F0FDF4",
                borderRadius: "12px",
                padding: "20px",
                border: "2px solid #BBF7D0"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px"
                }}>
                  <span style={{ fontSize: "20px" }}>💰</span>
                  <div style={{ fontSize: "14px", color: "#15803D", fontWeight: "600" }}>
                    Price
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#4A6A8A", lineHeight: "1.6" }}>
                  ₹ {property.price ? property.price.toLocaleString() : "N.A"}
                </div>
              </div>

              {/* Status */}
              <div style={{
                background: "#FEF3F3",
                borderRadius: "12px",
                padding: "20px",
                border: "2px solid #FECACA"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px"
                }}>
                  <span style={{ fontSize: "20px" }}>📊</span>
                  <div style={{ fontSize: "14px", color: "#991B1B", fontWeight: "600" }}>
                    Status
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#4A6A8A", lineHeight: "1.6" }}>
                  <div>Active: {property.isActive ? "Yes" : "No"}</div>
                  <div>New Post: {property.isPostedNew ? "Yes" : "No"}</div>
                  <div>Type: {property.defaultpropertytype || "Sale"}</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div
          className="property-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "24px",
          }}
        >
          {/* Left Column */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            {/* Quick Property Stats */}
            <div
              style={{
                background: "#FFFFFF",
                padding: "28px",
                borderRadius: "12px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
            >
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#003366",
                  marginBottom: "24px",
                }}
              >
                Property Overview
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "16px",
                }}
              >
                <div
                  className="stat-card"
                  style={{
                    padding: "20px",
                    background: "#F4F7F9",
                    borderRadius: "10px",
                    textAlign: "center",
                    border: "2px solid #E5E7EB",
                    transition: "all 0.2s",
                  }}
                >
                  <Bed
                    size={32}
                    style={{ color: "#00A79D", margin: "0 auto 12px" }}
                  />
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#003366",
                      marginBottom: "4px",
                    }}
                  >
                    {property.bedrooms || "N.A"}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#4A6A8A",
                      fontWeight: "500",
                    }}
                  >
                    Bedrooms
                  </div>
                </div>
                <div
                  className="stat-card"
                  style={{
                    padding: "20px",
                    background: "#F4F7F9",
                    borderRadius: "10px",
                    textAlign: "center",
                    border: "2px solid #E5E7EB",
                  }}
                >
                  <Bath
                    size={32}
                    style={{ color: "#00A79D", margin: "0 auto 12px" }}
                  />
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#003366",
                      marginBottom: "4px",
                    }}
                  >
                    {property.bathrooms || "N.A"}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#4A6A8A",
                      fontWeight: "500",
                    }}
                  >
                    Bathrooms
                  </div>
                </div>
                <div
                  className="stat-card"
                  style={{
                    padding: "20px",
                    background: "#F4F7F9",
                    borderRadius: "10px",
                    textAlign: "center",
                    border: "2px solid #E5E7EB",
                  }}
                >
                  <Maximize
                    size={32}
                    style={{ color: "#00A79D", margin: "0 auto 12px" }}
                  />
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#003366",
                      marginBottom: "4px",
                    }}
                  >
                    {property.totalArea?.sqft ? property.totalArea.sqft.toLocaleString() : 'N/A'}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#4A6A8A",
                      fontWeight: "500",
                    }}
                  >
                    Sq.Ft
                  </div>
                </div>
                <div
                  className="stat-card"
                  style={{
                    padding: "20px",
                    background: "#F4F7F9",
                    borderRadius: "10px",
                    textAlign: "center",
                    border: "2px solid #E5E7EB",
                  }}
                >
                  <Home
                    size={32}
                    style={{ color: "#00A79D", margin: "0 auto 12px" }}
                  />
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#003366",
                      marginBottom: "4px",
                    }}
                  >
                    {property.totalArea?.configuration || 'N/A'}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#4A6A8A",
                      fontWeight: "500",
                    }}
                  >
                    Configuration
                  </div>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div
              style={{
                background: "#FFFFFF",
                padding: "28px",
                borderRadius: "12px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
            >
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#003366",
                  marginBottom: "24px",
                }}
              >
                Property Details
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "16px",
                  padding: "20px",
                  background: "#F4F7F9",
                  borderRadius: "10px",
                }}
              >
                {property.title && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Title
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                        textAlign: "right",
                      }}
                    >
                      {property.title}
                    </span>
                  </div>
                )}
                {property.Sector && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Sector
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                      }}
                    >
                      {property.Sector}
                    </span>
                  </div>
                )}
                {property.price && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Price
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                      }}
                    >
                      ₹ {property.price.toLocaleString()}
                    </span>
                  </div>
                )}
                {property.totalArea?.sqft && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Area (Sq.Ft)
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                      }}
                    >
                      {property.totalArea.sqft.toLocaleString()}
                    </span>
                  </div>
                )}
                {property.totalArea?.configuration && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Configuration
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                      }}
                    >
                      {property.totalArea.configuration}
                    </span>
                  </div>
                )}
                {property.bedrooms && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Bedrooms
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                      }}
                    >
                      {property.bedrooms}
                    </span>
                  </div>
                )}
                {property.bathrooms && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Bathrooms
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                      }}
                    >
                      {property.bathrooms}
                    </span>
                  </div>
                )}
                
                
                {property.defaultpropertytype && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Property Type
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                      }}
                    >
                      {property.defaultpropertytype}
                    </span>
                  </div>
                )}
                {property.createdAt && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Listed On
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                      }}
                    >
                      {formatDate(property.createdAt)}
                    </span>
                  </div>
                )}
                {property.updatedAt && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#4A6A8A",
                        fontWeight: "500",
                      }}
                    >
                      Last Updated
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#003366",
                      }}
                    >
                      {formatDate(property.updatedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div
                style={{
                  background: "#FFFFFF",
                  padding: "28px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                }}
              >
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "#003366",
                    marginBottom: "16px",
                  }}
                >
                  Property Description
                </h2>
                <p
                  style={{
                    fontSize: "15px",
                    color: "#333333",
                    lineHeight: "1.8",
                    margin: 0,
                  }}
                >
                  {property.description}
                </p>
              </div>
            )}

            {/* Panorama Details */}
            {hasPanoramas && (
              <div
                style={{
                  background: "#FFFFFF",
                  padding: "28px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                }}
              >
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "#003366",
                    marginBottom: "20px",
                  }}
                >
                  360° Virtual Tour Scenes
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {panoramas.map((panorama, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "16px",
                        background: "#F4F7F9",
                        borderRadius: "8px",
                        border: "1px solid #E5E7EB",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#003366",
                          marginBottom: "8px",
                        }}
                      >
                        {panorama.title}
                      </div>
                      {panorama.notes && (
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#4A6A8A",
                            marginBottom: "8px",
                          }}
                        >
                          {panorama.notes}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6B7280",
                        }}
                      >
                        Position: Yaw {panorama.yaw || 0}°, Pitch {panorama.pitch || 0}°
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Contact Card */}
            <div
              style={{
                background: "#FFFFFF",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                top: "100px",
              }}
            >
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#4A6A8A",
                    marginBottom: "12px",
                    fontWeight: "500",
                  }}
                >
                  Property ID
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#003366",
                    fontFamily: "monospace",
                    padding: "12px",
                    background: "#F4F7F9",
                    borderRadius: "6px",
                    textAlign: "center",
                  }}
                >
                  #
                  {property._id
                    ? property._id.slice(0, 12).toUpperCase()
                    : "N/A"}
                </div>
              </div>

              <div
                style={{
                  padding: "20px",
                  background:
                    "linear-gradient(135deg, #F4F7F9 0%, #E5E7EB 100%)",
                  borderRadius: "10px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <Phone size={22} style={{ color: "#00A79D" }} />
                  <div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        color: "#003366",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {"9654131789"}
                    </div>
                    <a
                      href="mailto:support@ggnhome.com"
                      style={{
                        fontSize: "13px",
                        color: "#00A79D",
                        textDecoration: "none",
                        fontWeight: "500",
                      }}
                    >
                      support@ggnhome.com
                    </a>
                  </div>
                </div>
              </div>

              {/* <button
                onClick={openEnquiry}
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
                  color: "#FFFFFF",
                  padding: "16px",
                  borderRadius: "10px",
                  fontSize: "16px",
                  fontWeight: "700",
                  border: "none",
                  cursor: "pointer",
                  marginBottom: "12px",
                  boxShadow: "0 4px 16px rgba(0, 167, 157, 0.3)",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                Create Request
              </button> */}

              {hasPanoramas && (
                <button
                  onClick={() =>
                    navigate(`/property/${property._id}/virtual-tour`, {
                      state: {
                        panoramas,
                        propertyName: property?.title || "Property",
                        propertyId: property?._id,
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    background: "#FFFFFF",
                    color: "#00A79D",
                    padding: "16px",
                    borderRadius: "10px",
                    fontSize: "16px",
                    fontWeight: "700",
                    border: "2px solid #00A79D",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#00A79D";
                    e.currentTarget.style.color = "#FFFFFF";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                    e.currentTarget.style.color = "#00A79D";
                  }}
                >
                  Virtual Tour
                </button>
              )}
            </div>

            {/* Quick Stats */}
            <div
              style={{
                background: "#FFFFFF",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#003366",
                  marginBottom: "20px",
                }}
              >
                Property Highlights
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "14px",
                    background: "#F4F7F9",
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#4A6A8A",
                      fontWeight: "500",
                    }}
                  >
                    Status
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: property.isActive ? "#059669" : "#DC2626",
                    }}
                  >
                    {property.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "14px",
                    background: "#F4F7F9",
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#4A6A8A",
                      fontWeight: "500",
                    }}
                  >
                    Listed On
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#003366",
                    }}
                  >
                    {formatDate(property.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div
              style={{
                background: "#FFFFFF",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#003366",
                  marginBottom: "20px",
                }}
              >
                Property Activity
              </h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  marginBottom: "16px",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <Eye
                    size={24}
                    style={{ color: "#00A79D", margin: "0 auto 8px" }}
                  />
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "700",
                      color: "#003366",
                    }}
                  >
                    {metrics.views?.length || 0}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#4A6A8A",
                      fontWeight: "500",
                    }}
                  >
                    Views
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <Heart
                    size={24}
                    style={{ color: "#00A79D", margin: "0 auto 8px" }}
                  />
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "700",
                      color: "#003366",
                    }}
                  >
                    {metrics.saves?.length || 0}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#4A6A8A",
                      fontWeight: "500",
                    }}
                  >
                    Saved
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <Phone
                    size={24}
                    style={{ color: "#00A79D", margin: "0 auto 8px" }}
                  />
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "700",
                      color: "#003366",
                    }}
                  >
                    {conversion.totalLeads || 0}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#4A6A8A",
                      fontWeight: "500",
                    }}
                  >
                    Contacts
                  </div>
                </div>
              </div>
            </div>

            {/* Report Issues */}
            <div
              style={{
                background: "linear-gradient(135deg, #FFF5F5 0%, #FEE2E2 100%)",
                padding: "20px",
                borderRadius: "12px",
                border: "2px solid #FED7D7",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <AlertCircle size={20} style={{ color: "#DC2626" }} />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#DC2626",
                  }}
                >
                  Report Issues
                </span>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#7F1D1D",
                  marginBottom: "12px",
                  lineHeight: "1.5",
                }}
              >
                Found incorrect information?
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  style={{
                    padding: "8px 14px",
                    background: "#FFFFFF",
                    border: "1px solid #FCA5A5",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    color: "#DC2626",
                    fontWeight: "500",
                  }}
                >
                  Wrong Info
                </button>
                <button
                  style={{
                    padding: "8px 14px",
                    background: "#FFFFFF",
                    border: "1px solid #FCA5A5",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    color: "#DC2626",
                    fontWeight: "500",
                  }}
                >
                  Already Sold
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Properties */}
        <div style={{ marginTop: "40px" }}>
          <SimilarProperties
            sector={property?.Sector}
            currentPropertyId={property?._id}
          />
        </div>

        {/* Rating Section */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "32px",
            borderRadius: "12px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            marginTop: "32px",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#003366",
              marginBottom: "24px",
            }}
          >
            Rate Your Experience
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onClick={() => setUserRating(star)}
                style={{
                  fontSize: "40px",
                  cursor: "pointer",
                  color: star <= userRating ? "#FFD700" : "#E5E7EB",
                  transition: "all 0.2s",
                  textShadow:
                    star <= userRating
                      ? "0 2px 4px rgba(255,215,0,0.3)"
                      : "none",
                }}
              >
                ★
              </span>
            ))}
            {userRating > 0 && (
              <span
                style={{
                  marginLeft: "16px",
                  fontSize: "18px",
                  color: "#00A79D",
                  fontWeight: "600",
                }}
              >
                {userRating}.0 / 5.0
              </span>
            )}
          </div>
          <textarea
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
            placeholder="Share your thoughts about this property (optional)"
            style={{
              width: "100%",
              minHeight: "120px",
              padding: "16px",
              borderRadius: "10px",
              border: "2px solid #E5E7EB",
              fontSize: "15px",
              marginBottom: "20px",
              fontFamily: "inherit",
              resize: "vertical",
              transition: "all 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#00A79D")}
            onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
          />
          <button
            onClick={handleSubmitRating}
            style={{
              background: "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
              color: "#fff",
              padding: "14px 40px",
              border: "none",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "16px",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0, 167, 157, 0.3)",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            Submit Rating
          </button>
        </div>
      </div>

      {/* Enquiry Modal */}
      {showEnquiryModal && (
        <div
          onClick={closeEnquiry}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 51, 102, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1200,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "32px",
              width: "90%",
              maxWidth: "600px",
              position: "relative",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <button
              onClick={closeEnquiry}
              aria-label="Close enquiry"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "#F4F7F9",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#4A6A8A",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#E5E7EB")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "#F4F7F9")}
            >
              <X size={20} />
            </button>
            <EnquiryPage
              propertyId={property?._id}
              onClose={closeEnquiry}
            />
          </div>
        </div>
      )}
    </div>
    </React.Fragment>
  );
}