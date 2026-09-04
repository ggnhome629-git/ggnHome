import React, { useState, useEffect , useRef } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Image,
  MapPin,
  Home,
  Maximize,
} from "lucide-react";
import { useNavigate , useLocation } from "react-router-dom";

const FlatmateDashboard = ({ user, onListingClick }) => {
  const [properties, setProperties] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  const location = useLocation();
  useEffect(() => {
    const updateItems = () => {
      const w = window.innerWidth;
      if (w >= 1024) setItemsPerPage(4);
      else if (w >= 768) setItemsPerPage(3);
      else if (w >= 420) setItemsPerPage(2);
      else setItemsPerPage(1);
    };
    updateItems();
    window.addEventListener('resize', updateItems);
    return () => window.removeEventListener('resize', updateItems);
  }, []);

  const cardWidthCalc = `calc(${100 / itemsPerPage}% - 18px)`;
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchListings = async () => {
      try {
        const res = await fetch(
          (process.env.REACT_APP_Base_API || "") + "/api/flatmates/listings",
          {
            method: "GET",

            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const json = await res.json();

        // Normalize all possible API shapes to a single array
        let list = [];
        if (Array.isArray(json)) {
          list = json;
        } else if (Array.isArray(json.listings)) {
          list = json.listings;
        } else if (Array.isArray(json.data)) {
          list = json.data;
        } else if (json.data && Array.isArray(json.data.items)) {
          list = json.data.items;
        } else if (json.items && Array.isArray(json.items)) {
          list = json.items;
        }

        console.log(
          "[FlatmateDashboard] fetched listings count =",
          list.length
        );

        if (mounted) {
          setProperties(list);
        }
      } catch (err) {
        console.error("Failed to load listings:", err);
        if (mounted) setProperties([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchListings();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isHovered) return; // pause on hover
    if (!autoScrollEnabled) return;
    if (!properties || properties.length <= itemsPerPage) return;

    const id = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxStart = Math.max(0, properties.length - itemsPerPage);
        return prev < maxStart ? prev + 1 : 0;
      });
    }, 4000);
    return () => clearInterval(id);
  }, [loading, isHovered, autoScrollEnabled, properties, itemsPerPage]);

  const handleNext = () => {
    if (currentIndex + itemsPerPage < properties.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleTouchStart = (e) => {
    e.currentTarget._touchStartX = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const start = e.currentTarget._touchStartX;
    const end = e.changedTouches[0].clientX;
    if (typeof start === "number") {
      const distance = start - end;
      if (distance > 50) handleNext();
      else if (distance < -50) handlePrev();
    }
  };

  const handleWheel = (e) => {
    // Horizontal navigation with vertical wheel
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      if (e.deltaY > 0) handleNext();
      else handlePrev();
    }
  };

  const containerStyle = {
    backgroundColor: "#F4F7F9",
    minHeight: "50vh",
    marginTop: "140px",
    padding: "40px 20px",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const headerStyle = {
    maxWidth: "1400px",
    margin: "0 auto 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const titleStyle = {
    fontSize: "32px",
    fontWeight: "700",
    color: "#003366",
    margin: 0,
    position: "relative",
    paddingBottom: "10px",
  };

  const underlineStyle = {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "80px",
    height: "4px",
    backgroundColor: "#00A79D",
    borderRadius: "2px",
  };

  const seeAllStyle = {
    color: "#00A79D",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const carouselWrapperStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    position: "relative",
    paddingRight: "64px",
  };

  const carouselStyle = {
    overflow: "hidden",
    position: "relative",
  };

  const cardsContainerStyle = {
    display: "flex",
    gap: "24px",
    transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
    transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const cardStyle = {
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(0, 51, 102, 0.08)",
    flex: `0 0 ${cardWidthCalc}`,
    cursor: "pointer",
    transition: "all 0.3s ease",
    border: "1px solid rgba(74, 106, 138, 0.1)",
  };

  const imageContainerStyle = {
    position: "relative",
    width: "100%",
    height: "220px",
    overflow: "hidden",
    backgroundColor: "#4A6A8A",
  };

  const imageStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.3s ease",
  };

  const imageCountStyle = {
    position: "absolute",
    bottom: "12px",
    left: "12px",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    color: "#FFFFFF",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backdropFilter: "blur(4px)",
  };

  const contentStyle = {
    padding: "18px",
  };

  const typeStyle = {
    fontSize: "18px",
    fontWeight: "700",
    color: "#003366",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const priceAreaStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    flexWrap: "wrap",
  };

  const priceStyle = {
    fontSize: "22px",
    fontWeight: "700",
    color: "#00A79D",
  };

  const separatorStyle = {
    color: "#4A6A8A",
    fontSize: "20px",
    fontWeight: "300",
  };

  const areaStyle = {
    fontSize: "16px",
    fontWeight: "600",
    color: "#4A6A8A",
  };

  const locationStyle = {
    fontSize: "14px",
    color: "#333333",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const statusStyle = {
    fontSize: "13px",
    color: "#4A6A8A",
    fontWeight: "500",
    paddingTop: "10px",
    borderTop: "1px solid rgba(74, 106, 138, 0.15)",
  };

  const navButtonStyle = (direction) => ({
    position: "absolute",
    top: "50%",
    [direction]: "-20px",
    transform: "translateY(-50%)",
    backgroundColor: "#FFFFFF",
    border: "2px solid #003366",
    borderRadius: "50%",
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(0, 51, 102, 0.15)",
    zIndex: 10,
  });

  const rupeeFormat = (val) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(val);
    } catch (e) {
      return `₹${val}`;
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          Flats Available
          <div style={underlineStyle}></div>
        </h1>

      </div>

      <div style={carouselWrapperStyle}>
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            style={navButtonStyle("left")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#003366";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#FFFFFF";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <ChevronLeft size={24} color="#003366" />
          </button>
        )}

        <div
          style={carouselStyle}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {loading ? (
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              {[...Array(itemsPerPage)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: `0 0 calc(${100 / itemsPerPage}% - 18px)`,
                    height: "350px",
                    borderRadius: "12px",
                    background: "linear-gradient(90deg, #f6f7f8 25%, #edeef1 37%, #f6f7f8 63%)",
                    backgroundSize: "400% 100%",
                    animation: "shimmer 1.4s ease infinite",
                    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
                  }}
                ></div>
              ))}
            </div>
          ) : (
            <div style={cardsContainerStyle}>
              {(properties || [])
                .filter((p) => p.isActive !== false)
                .map((property, idx) => (
                  <div
                    key={property._id || property.id || idx}
                    style={cardStyle}
                    onClick={() => {
  if (onListingClick) onListingClick(property);
  if (!user) {
    navigate("/login");
  } else {
    const id = property._id || property.id;
    navigate(`/flatmatesearchpropertymodal/${id}`, { state: { background: location } });
  }
}}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-8px)";
                      e.currentTarget.style.boxShadow =
                        "0 12px 24px rgba(0, 51, 102, 0.15)";
                      const img = e.currentTarget.querySelector("img");
                      if (img) img.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 2px 12px rgba(0, 51, 102, 0.08)";
                      const img = e.currentTarget.querySelector("img");
                      if (img) img.style.transform = "scale(1)";
                    }}
                  >
                    <div style={imageContainerStyle}>
                      <img
                        src={
                          property.photos && property.photos.length
                            ? property.photos[0].url || property.photos[0]
                            : "/default-property.jpg"
                        }
                        alt={property.title || "Flat"}
                        style={imageStyle}
                        onError={(e) => {
                          const def =
                            window.location.origin + "/default-property.jpg";
                          if (e.target.src !== def) e.target.src = def;
                        }}
                      />
                      <div style={imageCountStyle}>
                        <Image size={14} /> {property.photos?.length || 0}
                      </div>
                    </div>
                    <div style={contentStyle}>
                      <div style={typeStyle}>
                        <Home size={18} color="#003366" />
                        {property.title || property.propertyType || "Flat"}
                      </div>
                      <div style={priceAreaStyle}>
                        <span style={priceStyle}>
                          {rupeeFormat(
                            property.budget?.min ||
                              property.price ||
                              property.monthlyRent ||
                              0
                          )}
                        </span>
                        <span style={separatorStyle}>|</span>
                        <span style={areaStyle}>
                          <Maximize
                            size={14}
                            style={{ display: "inline", marginRight: "4px" }}
                          />
                          {property.area || property.location || "N/A"}
                        </span>
                      </div>
                      <div style={areaStyle}>
                        Move-in Date:{" "}
                        {property.moveInDate
                          ? new Date(property.moveInDate).toLocaleDateString()
                          : "N/A"}
                      </div>
                      <div style={locationStyle}>
                        <MapPin size={14} color="#00A79D" />
                        {property.city ||
                          property.area ||
                          property.location ||
                          "Unknown"}
                      </div>
                      <div style={statusStyle}>
                        {property.isActive === false ? "Inactive" : "Available"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {currentIndex + itemsPerPage < properties.length && (
          <button
            onClick={handleNext}
            style={navButtonStyle("right")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#003366";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#FFFFFF";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <ChevronRight size={24} color="#003366" />
          </button>
        )}
      </div>

      <style>
        {`
        /* skeleton-card moved inline */

        @keyframes shimmer {
          0% {
            background-position: -400px 0;
          }
          100% {
            background-position: 400px 0;
          }
        }
      `}
      </style>
    </div>
  );
};

export default FlatmateDashboard;
