import React, { useEffect, useState , useMemo } from "react";
import Similarproperties from "../Similarproperties";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import {
  Home,
  Bed,
  Bath,
  Maximize,
  MapPin,
  Share2,
  Heart,
  Calendar,
  Phone,
  Mail,
  X,
} from "lucide-react";
import TopNavigationBar from "../../Top Navigation Bar/AgentTopNavigationBar";
import {useAuth} from '../../../../Context/AuthContext';
import MapIntegration from "../mapsintegration";
import { Button } from "@mui/material";
import { Helmet } from "react-helmet";

// Local fallback for EnquiryPage (used if the shared component path isn't available)
const EnquiryPage = ({ propertyId, onClose, context, defaultMessage }) => {
  const [message, setMessage] = useState(defaultMessage || "");
  const [submitting, setSubmitting] = useState(false);
  const agentToken = localStorage.getItem("agentAccessToken");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await fetch(process.env.REACT_APP_SUPPORT_ENQUIRY_API || "/api/enquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
        },
        body: JSON.stringify({ propertyId, message, context }),
        credentials: "include",
      });
      alert("Enquiry sent!");
      onClose && onClose();
    } catch (err) {
      console.error("Failed to send enquiry", err);
      alert("Failed to send enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div
        style={{
          marginBottom: 8,
          color: "#003366",
          fontWeight: 600,
          fontSize: 16,
        }}
      >
        Send an enquiry
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={defaultMessage || "Hi, I’d like to schedule a viewing..."}
        style={{
          width: "100%",
          minHeight: 120,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #E5E7EB",
          fontFamily: "inherit",
        }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          background: "#00A79D",
          color: "#fff",
          padding: "10px 16px",
          border: "none",
          borderRadius: 8,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {submitting ? "Sending..." : "Send Enquiry"}
      </button>
    </form>
  );
};

const addEngagementTime = async (propertyId, seconds) => {
  const agentToken = localStorage.getItem("agentAccessToken");
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
  const agentToken = localStorage.getItem("agentAccessToken");
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
  const agentToken = localStorage.getItem("agentAccessToken");
  const navigate = useNavigate();
  const location = useLocation();
  const previewMode = location.state?.preview || false;
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const {user} = useAuth();
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [openMapModal, setOpenMapModal] = useState(false);

  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const openEnquiry = () => setShowEnquiryModal(true);
  const closeEnquiry = () => setShowEnquiryModal(false);

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
        if (!response.ok) throw new Error("Property not found");
        const data = await response.json();
        // If the property is inactive AND we are NOT in preview mode, hide it
        if (!previewMode && data && data.isActive === false) {
          setProperty(null);
          setLoading(false);
          return;
        }
        setProperty(data);
      } catch (err) {
        console.error("Error fetching SaleProperty:", err);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProperty();
  }, [id, agentToken]);
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

  

  useEffect(() => {
    if (!showEnquiryModal) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeEnquiry();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showEnquiryModal]);

  useEffect(() => {
    if (!property) return;
    const startTime = Date.now();
    return () => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      addEngagementTime(id, seconds);
    };
  }, [id, property]);

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

  const handleSave = async () => {
    try {
      await fetch(`${process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_SAVE}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
        },
        body: JSON.stringify({ propertyId: property._id }),
      });
      alert("Property saved!");
    } catch (err) {
      console.error("Error saving property:", err);
      alert("Failed to save property");
    }
  };

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

  // Responsive logic: detect mobile
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F4F7F9",
          fontFamily: "system-ui,-apple-system,sans-serif",
        }}
      >
        {/* Top Navigation Bar */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 999,
            backgroundColor: "#FFFFFF", // or match your navbar background
          }}
        >
          <TopNavigationBar
           
            navItems={navItems}
          />
        </div>
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            padding: isMobile ? "24px 8px" : "40px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: isMobile ? "16px" : "18px", color: "#4A6A8A" }}
          >
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
            padding: isMobile ? "24px 8px" : "40px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{ fontSize: isMobile ? "16px" : "18px", color: "#4A6A8A" }}
          >
            Property not found or inactive.
          </div>
        </div>
      </div>
    );
  }

  const images =
    property.images && property.images.length > 0
      ? property.images
      : ["https://via.placeholder.com/800x600?text=No+Image"];

  // Property ID section (to be reused)
  const propertyIDSection = (
    <div
      style={{
        background: "#F4F7F9",
        padding: isMobile ? "12px" : "16px",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        boxSizing: "border-box",
        marginBottom: isMobile ? "16px" : undefined,
      }}
    >
      <div
        style={{
          fontSize: isMobile ? "12px" : "13px",
          color: "#4A6A8A",
          marginBottom: "4px",
        }}
      >
        Property ID
      </div>
      <div
        style={{
          fontSize: isMobile ? "13px" : "15px",
          fontWeight: "600",
          color: "#003366",
          fontFamily: "monospace",
          wordBreak: "break-all",
        }}
      >
        #
        {property._id
          ? property._id.slice(0, property._id.length / 2).toUpperCase()
          : "N/A"}
      </div>
    </div>
  );

  // Schedule a Visit and Contact Info as a sidebar chunk
  const sidebarSections = (
    <>
      {/* Schedule a Visit */}
      <div
        style={{
          background: "#FFFFFF",
          padding: isMobile ? "16px" : "20px",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          position: isMobile ? undefined : "sticky",
          top: isMobile ? undefined : "20px",
          zIndex: 1,
          boxSizing: "border-box",
          marginBottom: isMobile ? "16px" : undefined,
        }}
      >
        {/* <button
          onClick={openEnquiry}
          style={{
            width: "100%",
            background: "#00A79D",
            color: "#fff",
            border: "none",
            padding: isMobile ? "12px" : "14px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: isMobile ? "14px" : "16px",
            cursor: "pointer",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "background 0.2s",
            boxSizing: "border-box",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#00887a")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#00A79D")}
        >
          <Calendar size={isMobile ? 18 : 20} />
          Schedule a Visit
        </button> */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              background: "#F4F7F9",
              color: "#003366",
              border: "1px solid #E5E7EB",
              padding: isMobile ? "10px" : "12px",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: isMobile ? "13px" : "15px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s",
              boxSizing: "border-box",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#E5E7EB";
              e.currentTarget.style.borderColor = "#00A79D";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#F4F7F9";
              e.currentTarget.style.borderColor = "#E5E7EB";
            }}
            title="Share this property"
          >
            <Share2 size={isMobile ? 16 : 18} />
            Share
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              background: "#F4F7F9",
              color: "#003366",
              border: "1px solid #E5E7EB",
              padding: isMobile ? "10px" : "12px",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: isMobile ? "13px" : "15px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s",
              boxSizing: "border-box",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#E5E7EB";
              e.currentTarget.style.borderColor = "#00A79D";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#F4F7F9";
              e.currentTarget.style.borderColor = "#E5E7EB";
            }}
            title="Save to favorites"
          >
            <Heart size={isMobile ? 16 : 18} />
            Save
          </button>
        </div>
      </div>
      {/* Contact Information */}
      <div
        style={{
          background: "#FFFFFF",
          padding: isMobile ? "16px" : "20px",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          boxSizing: "border-box",
          marginBottom: isMobile ? "16px" : undefined,
        }}
      >
        <h3
          style={{
            fontSize: isMobile ? "16px" : "18px",
            fontWeight: "600",
            color: "#003366",
            marginBottom: "16px",
          }}
        >
          Contact Information
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "#F4F7F9",
              borderRadius: "6px",
            }}
          >
            <Phone
              size={isMobile ? 16 : 18}
              style={{ color: "#00A79D", flexShrink: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: isMobile ? "13px" : "15px",
                  color: "#333333",
                }}
              >
                9654131789
              </span>
              <a
                href="mailto:support@ggnhome.com"
                style={{
                  fontSize: isMobile ? "13px" : "15px",
                  color: "#00A79D",
                  textDecoration: "none",
                }}
              >
                support@ggnhome.com
              </a>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "#F4F7F9",
              borderRadius: "6px",
            }}
          >
            <Mail
              size={isMobile ? 16 : 18}
              style={{ color: "#00A79D", flexShrink: 0 }}
            />
            <span
              onClick={() => navigate("/support")}
              style={{
                fontSize: isMobile ? "13px" : "15px",
                color: "#00A79D",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Send inquiry
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F7F9",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}
    >
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
      <TopNavigationBar
        navItems={navItems}
        
      />

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: isMobile ? "8px" : "20px",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            padding: isMobile ? "8px 0" : "12px 0",
            fontSize: isMobile ? "12px" : "14px",
            color: "#4A6A8A",
          }}
        >
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
            Home
          </span>
          <span style={{ margin: "0 8px" }}>›</span>
          <span style={{ cursor: "pointer" }}>Properties for Sale</span>
          <span style={{ margin: "0 8px" }}>›</span>
          <span style={{ color: "#003366", fontWeight: "500" }}>
            {property.Sector || "Property Details"}
          </span>
        </div>

        {/* Property ID at the top for mobile */}
        {isMobile && propertyIDSection}

        {/* Main Content Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 400px",
            gap: isMobile ? "0" : "24px",
            alignItems: "flex-start",
            width: "100%",
          }}
        >
          {/* Left Column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "16px" : "20px",
              minWidth: 0,
              width: "100%",
            }}
          >
            {/* Main content order for mobile vs desktop */}
            {isMobile ? (
              <>
                {/* Main left column content */}
                {/* Image Gallery */}
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "40vh",
                      minHeight: "180px",
                      background: "#000",
                    }}
                  >
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
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "0"
                        }}
                        onError={(e) => {
                          e.currentTarget.src = "/default-property.jpg";
                        }}
                      />
                    </AnimatePresence>
                    {/* <img
                      src={images[currentImageIndex]}
                      alt="Property"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex - 1 + images.length) %
                                images.length
                            )
                          }
                          style={{
                            position: "absolute",
                            left: "20px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            cursor: "pointer",
                            fontSize: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ‹
                        </button>
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex + 1) % images.length
                            )
                          }
                          style={{
                            position: "absolute",
                            right: "20px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            cursor: "pointer",
                            fontSize: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ›
                        </button>
                      </>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "20px",
                        right: "20px",
                        background: "rgba(0,0,0,0.7)",
                        color: "#fff",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      {currentImageIndex + 1} / {images.length}
                    </div> */}
                  </div>
                  {/* {images.length > 1 && (
                    <div
                      className="thumbnail-row"
                      style={{
                        display: "flex",
                        gap: "8px",
                        padding: "12px",
                        overflowX: "auto",
                        background: "#FAFAFA",
                      }}
                    >
                      {images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Thumbnail ${i + 1}`}
                          onClick={() => setCurrentImageIndex(i)}
                          style={{
                            width: "80px",
                            height: "60px",
                            objectFit: "cover",
                            borderRadius: "4px",
                            cursor: "pointer",
                            border:
                              i === currentImageIndex
                                ? "2px solid #00A79D"
                                : "2px solid transparent",
                            opacity: i === currentImageIndex ? 1 : 0.6,
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                  )} */}
                  <div>For privacy reasons, property images are shared individually via WhatsApp upon enquiry</div>
                </div>

                {/* Property Overview */}
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "16px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                    boxSizing: "border-box",
                    marginBottom: "16px",
                  }}
                >
                  <h1
                    style={{
                      fontSize: "26px",
                      fontWeight: "700",
                      color: "#003366",
                      marginBottom: "10px",
                      lineHeight: "1.3",
                    }}
                  >
                    {property.title || "Property Title Not Available"}
                  </h1>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    <MapPin
                      size={16}
                      style={{ color: "#00A79D", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: "14px", color: "#4A6A8A" }}>
                      {property.Sector || "Location not specified"}
                    </span>
                  </div>
                  {/* Price Section */}
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
                      padding: "16px",
                      borderRadius: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#F4F7F9",
                        marginBottom: "2px",
                      }}
                    >
                      Property Price
                    </div>
                    <div
                      style={{
                        fontSize: "34px",
                        fontWeight: "800",
                        color: "#FFFFFF",
                      }}
                    >
                      {property.price
                        ? `₹${property.price.toLocaleString()}`
                        : "Price on Request"}
                    </div>
                  </div>
                  {/* Property Stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "10px",
                      paddingBottom: "16px",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        padding: "10px",
                        background: "#F4F7F9",
                        borderRadius: "8px",
                      }}
                    >
                      <Bed
                        size={20}
                        style={{ color: "#00A79D", margin: "0 auto 6px" }}
                      />
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "#003366",
                        }}
                      >
                        {property.bedrooms != null ? property.bedrooms : "-"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#4A6A8A" }}>
                        Bedrooms
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "10px",
                        background: "#F4F7F9",
                        borderRadius: "8px",
                      }}
                    >
                      <Bath
                        size={20}
                        style={{ color: "#00A79D", margin: "0 auto 6px" }}
                      />
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "#003366",
                        }}
                      >
                        {property.bathrooms != null ? property.bathrooms : "-"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#4A6A8A" }}>
                        Bathrooms
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "10px",
                        background: "#F4F7F9",
                        borderRadius: "8px",
                      }}
                    >
                      <Maximize
                        size={20}
                        style={{ color: "#00A79D", margin: "0 auto 6px" }}
                      />
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "#003366",
                        }}
                      >
                        {property.totalArea
                          ? typeof property.totalArea === "object"
                            ? property.totalArea.sqft ?? "-"
                            : property.totalArea
                          : "-"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#4A6A8A" }}>
                        {property.totalArea &&
                        typeof property.totalArea === "object" &&
                        property.totalArea.configuration
                          ? property.totalArea.configuration
                          : "Sq. Ft."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* About this Property */}
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "16px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                    boxSizing: "border-box",
                    marginBottom: "16px",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#003366",
                      marginBottom: "10px",
                    }}
                  >
                    About this Property
                  </h2>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#333333",
                      lineHeight: "1.8",
                      margin: 0,
                    }}
                  >
                    {property.description ||
                      "No description available for this property."}
                  </p>
                </div>

                {/* Sidebar sections (Schedule a Visit, Contact Info, Property ID) */}
                {sidebarSections}
                {propertyIDSection}

                {/* Similar Properties */}
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "16px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                    boxSizing: "border-box",
                    marginBottom: "16px",
                  }}
                >
                  <Similarproperties sector={property.Sector} />
                </div>

                {/* Rating Section */}
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "16px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#003366",
                      marginBottom: "12px",
                    }}
                  >
                    Rate this Property
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        onClick={() => setUserRating(star)}
                        style={{
                          fontSize: "28px",
                          cursor: "pointer",
                          color: star <= userRating ? "#FFD700" : "#E5E7EB",
                          transition: "color 0.2s",
                        }}
                      >
                        ★
                      </span>
                    ))}
                    {userRating > 0 && (
                      <span
                        style={{
                          marginLeft: "12px",
                          fontSize: "14px",
                          color: "#4A6A8A",
                        }}
                      >
                        {userRating} out of 5
                      </span>
                    )}
                  </div>
                  <textarea
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    placeholder="Share your thoughts about this property (optional)"
                    style={{
                      width: "100%",
                      minHeight: "80px",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "13px",
                      marginBottom: "12px",
                      fontFamily: "inherit",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={handleSubmitRating}
                    style={{
                      background: "#00A79D",
                      color: "#fff",
                      padding: "10px 24px",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) => (e.target.style.background = "#00887a")}
                    onMouseOut={(e) => (e.target.style.background = "#00A79D")}
                  >
                    Submit Rating
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Desktop: left column */}
                {/* Image Gallery */}
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "60vh",
                      minHeight: "280px",
                      background: "#000",
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentImageIndex}
                        src={images[currentImageIndex]}
                        alt="Property"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </AnimatePresence>
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex - 1 + images.length) %
                                images.length
                            )
                          }
                          style={{
                            position: "absolute",
                            left: "20px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            cursor: "pointer",
                            fontSize: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ‹
                        </button>
                        <button
                          onClick={() =>
                            setCurrentImageIndex(
                              (currentImageIndex + 1) % images.length
                            )
                          }
                          style={{
                            position: "absolute",
                            right: "20px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            cursor: "pointer",
                            fontSize: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ›
                        </button>
                      </>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "20px",
                        right: "20px",
                        background: "rgba(0,0,0,0.7)",
                        color: "#fff",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    >
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </div>
                  {images.length > 1 && (
                    <div
                      className="thumbnail-row"
                      style={{
                        display: "flex",
                        gap: "8px",
                        padding: "16px",
                        overflowX: "auto",
                        background: "#FAFAFA",
                      }}
                    >
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
                            borderRadius: "4px",
                            cursor: "pointer",
                            border:
                              i === currentImageIndex
                                ? "2px solid #00A79D"
                                : "2px solid transparent",
                            opacity: i === currentImageIndex ? 1 : 0.6,
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Property Overview */}
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "24px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <h1
                    style={{
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "#003366",
                      marginBottom: "12px",
                      lineHeight: "1.3",
                    }}
                  >
                    {property.title || "Property Title Not Available"}
                  </h1>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "20px",
                    }}
                  >
                    <MapPin
                      size={18}
                      style={{ color: "#00A79D", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: "16px", color: "#4A6A8A" }}>
                      {property.Sector || "Location not specified"}
                    </span>
                  </div>
                  {/* Price Section */}
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
                      padding: "20px",
                      borderRadius: "8px",
                      marginBottom: "24px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#F4F7F9",
                        marginBottom: "4px",
                      }}
                    >
                      Property Price
                    </div>
                    <div
                      style={{
                        fontSize: "36px",
                        fontWeight: "800",
                        color: "#FFFFFF",
                      }}
                    >
                      {property.price
                        ? `₹${property.price.toLocaleString()}`
                        : "Price on Request"}
                    </div>
                  </div>
                  {/* Property Stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "16px",
                      paddingBottom: "24px",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        padding: "16px",
                        background: "#F4F7F9",
                        borderRadius: "8px",
                      }}
                    >
                      <Bed
                        size={24}
                        style={{ color: "#00A79D", margin: "0 auto 8px" }}
                      />
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "700",
                          color: "#003366",
                        }}
                      >
                        {property.bedrooms != null ? property.bedrooms : "-"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#4A6A8A" }}>
                        Bedrooms
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "16px",
                        background: "#F4F7F9",
                        borderRadius: "8px",
                      }}
                    >
                      <Bath
                        size={24}
                        style={{ color: "#00A79D", margin: "0 auto 8px" }}
                      />
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "700",
                          color: "#003366",
                        }}
                      >
                        {property.bathrooms != null ? property.bathrooms : "-"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#4A6A8A" }}>
                        Bathrooms
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "16px",
                        background: "#F4F7F9",
                        borderRadius: "8px",
                      }}
                    >
                      <Maximize
                        size={24}
                        style={{ color: "#00A79D", margin: "0 auto 8px" }}
                      />
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "700",
                          color: "#003366",
                        }}
                      >
                        {property.totalArea
                          ? typeof property.totalArea === "object"
                            ? property.totalArea.sqft ?? "-"
                            : property.totalArea
                          : "-"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#4A6A8A" }}>
                        {property.totalArea &&
                        typeof property.totalArea === "object" &&
                        property.totalArea.configuration
                          ? property.totalArea.configuration
                          : "Sq. Ft."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* About this Property */}
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "24px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "600",
                      color: "#003366",
                      marginBottom: "12px",
                    }}
                  >
                    About this Property
                  </h2>
                  <p
                    style={{
                      fontSize: "15px",
                      color: "#333333",
                      lineHeight: "1.8",
                      margin: 0,
                    }}
                  >
                    {property.description ||
                      "No description available for this property."}
                  </p>
                </div>

                {/* Similar Properties */}
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "24px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <Similarproperties sector={property.Sector} />
                </div>

                {/* Rating Section */}
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "24px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: "600",
                      color: "#003366",
                      marginBottom: "16px",
                    }}
                  >
                    Rate this Property
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        onClick={() => setUserRating(star)}
                        style={{
                          fontSize: "32px",
                          cursor: "pointer",
                          color: star <= userRating ? "#FFD700" : "#E5E7EB",
                          transition: "color 0.2s",
                        }}
                      >
                        ★
                      </span>
                    ))}
                    {userRating > 0 && (
                      <span
                        style={{
                          marginLeft: "12px",
                          fontSize: "16px",
                          color: "#4A6A8A",
                        }}
                      >
                        {userRating} out of 5
                      </span>
                    )}
                  </div>
                  <textarea
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    placeholder="Share your thoughts about this property (optional)"
                    style={{
                      width: "100%",
                      minHeight: "100px",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "15px",
                      marginBottom: "16px",
                      fontFamily: "inherit",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={handleSubmitRating}
                    style={{
                      background: "#00A79D",
                      color: "#fff",
                      padding: "12px 32px",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "16px",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) => (e.target.style.background = "#00887a")}
                    onMouseOut={(e) => (e.target.style.background = "#00A79D")}
                  >
                    Submit Rating
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Right Sidebar for desktop only */}
          {!isMobile && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                width: "400px",
                flexShrink: 0,
              }}
            >
              {sidebarSections}
              {propertyIDSection}
              <h3 style={{ marginTop: "20px", color: "#003366" }}>Map View</h3>
              {/* <div className="floating-map-btn-container">
                <Button
                  variant="contained"
                  className="floating-map-btn"
                  sx={{ backgroundColor: "#003366", color: "white", mb: 2 }}
                  onClick={() => setOpenMapModal(true)}
                >
                  View Map
                </Button>
              </div> */}

              <div style={{ height: 400, width: "100%" }}>
                <MapIntegration
                  sector={property?.Sector}
                  type={property?.propertyType}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Map floating button and modal for mobile */}
      {isMobile && (
        <>
          {/* <Button
            variant="contained"
            sx={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              backgroundColor: "#003366",
              color: "white",
              zIndex: 2000,
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            }}
            onClick={() => setOpenMapModal(true)}
          >
            View Map
          </Button> */}

          <div style={{ height: 400, width: "100%" }}>
            <MapIntegration
              sector={property?.Sector}
              type={property?.propertyType}
            />
          </div>
        </>
      )}
      {/* Enquiry Modal */}
      {showEnquiryModal && (
        <div
          onClick={closeEnquiry}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
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
            className="enquiry-modal"
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
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#4A6A8A",
              }}
            >
              <X size={20} />
            </button>

            <EnquiryPage
              propertyId={property?._id}
              onClose={closeEnquiry}
              context={{
                title: property?.propertyType || "Sale Property",
                sector: property?.Sector,
                address: property?.address,
                price: property?.price,
                bedrooms: property?.bedrooms,
                bathrooms: property?.bathrooms,
                sqft: property?.totalArea?.sqft,
                configuration: property?.totalArea?.configuration,
                url:
                  typeof window !== "undefined"
                    ? window.location.href
                    : undefined,
                source: "SalePropertyPageView",
              }}
              defaultMessage={`Hi, I’d like to schedule a viewing for ${
                property?.propertyType || "this property"
              } in ${property?.Sector || "your listed area"}.`}
            />
          </div>
        </div>
      )}

      <style>{`
      .enquiry-modal { animation: fadeInAnimation 0.3s ease-in-out; }
      @keyframes fadeInAnimation {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
    </div>
  );
}
