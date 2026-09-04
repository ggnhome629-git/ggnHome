import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SimilarProperties = ({ sector, propertyType }) => {
  const [recentSearchProps, setRecentSearchProps] = useState([]);
  const [nearbyProps, setNearbyProps] = useState([]);
  const [allProps, setAllProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);

  const navigate = useNavigate();

  const recentRef = React.useRef(null);
  const nearbyRef = React.useRef(null);
  const allRef = React.useRef(null);

  const scrollContainer = (ref, direction) => {
    if (!ref.current) return;
    const scrollAmount = 300;
    if (direction === "left") {
      ref.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    } else {
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); // show spinner before loading
        const allRes = await axios.get(process.env.REACT_APP_Base_API + "/api/activeproperties" + `?limit=10`);
        const allData = allRes.data || [];

        // 1️⃣ Same sector properties
        const sameSectorProps = allData.filter(
          (prop) =>
            prop.Sector &&
            sector &&
            prop.Sector.toLowerCase().includes(sector.toLowerCase())
        );
        setRecentSearchProps(sameSectorProps.slice(0, 7));

        // 2️⃣ Nearby sectors
        const sectorNum = parseInt(sector?.match(/\d+/)?.[0] || 0);
        const nearbyPropsFiltered = allData.filter((prop) => {
          const propSectorNum = parseInt(prop.Sector?.match(/\d+/)?.[0] || 0);
          return Math.abs(propSectorNum - sectorNum) <= 2 && propSectorNum !== sectorNum;
        });
        setNearbyProps(nearbyPropsFiltered.slice(0, 7));

        // 3️⃣ Recommended
        const remainingProps = allData.filter(
          (prop) => !sameSectorProps.includes(prop) && !nearbyPropsFiltered.includes(prop)
        );
        setAllProps(remainingProps.slice(0, 7));

        // Delay visible spinner
        setTimeout(() => setLoading(false), 2000);
      } catch (error) {
        console.error("Error loading similar properties:", error);
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [sector, propertyType]);

  if (loading) {
    return (
      <>
        <style>
          {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
        </style>
        <div
          style={{
            height: "250px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "18px",
            color: "#003366",
            background: "#fff",
            borderRadius: "10px",
            marginTop: "2rem",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              border: "4px solid #e0e0e0",
              borderTop: "4px solid #003366",
              borderRadius: "50%",
              width: "45px",
              height: "45px",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ marginTop: "12px", fontWeight: "500" }}>
            Loading properties...
          </p>
        </div>
      </>
    );
  }

  const renderCards = (list) =>
    list.map((prop, idx) => {
      const handleClick = () => {
        setNavigating(true);
        const targetPath =
          prop.defaultpropertytype === "rental" || prop.type === "rent"
            ? `/Rentaldetails/${prop._id}`
            : `/Saledetails/${prop._id}`;

        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "auto" });
          navigate(targetPath);
        }, 2000);
      };

      return (
        <div
          key={idx}
          onClick={handleClick}
          style={{
            cursor: "pointer",
            minWidth: "220px",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            background: "#fafafa",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-4px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0)")
          }
        >
          <img
            src={prop.images?.[0] || "/default-property.jpg"}
            alt={prop.title}
            style={{
              width: "100%",
              height: "140px",
              objectFit: "cover",
            }}
          />
          <div style={{ padding: "0.5rem" }}>
            <h4 style={{ margin: "0", fontSize: "1rem" }}>
              {prop.title || "Unnamed Property"}
            </h4>
            <p style={{ margin: "0.3rem 0", color: "#555", fontSize: "0.9rem" }}>
              {prop.price ? `₹${prop.price}` : "Price on request"}
            </p>
            <p style={{ margin: "0", color: "#777", fontSize: "0.85rem" }}>
              {prop.propertyType}
            </p>
          </div>
        </div>
      );
    });

  return (
    <>
      {navigating && (
        <>
          <style>
            {`
              @keyframes spinNav {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(255,255,255,0.85)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
              pointerEvents: "auto"
            }}
          >
            <div
              style={{
                border: "6px solid #e0e0e0",
                borderTop: "6px solid #003366",
                borderRadius: "50%",
                width: "56px",
                height: "56px",
                animation: "spinNav 1s linear infinite"
              }}
            />
            <p style={{ marginTop: 12, color: "#003366", fontWeight: 600 }}>
              Loading property...
            </p>
          </div>
        </>
      )}

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#fff",
          borderRadius: "10px",
        }}
      >
        <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#003366" }}>
          Similar Properties
        </h3>

        <div style={{ marginBottom: "2rem" }}>
          <h4 style={{ fontSize: "17px", color: "#003366" }}>
            Properties in {sector}
          </h4>
          <div style={{ position: "relative" }}>
            {recentSearchProps.length > 1 && (
              <button
                onClick={() => scrollContainer(recentRef, "left")}
                style={{
                  position: "absolute",
                  left: "0",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#003366",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  zIndex: 2
                }}
              >
                ‹
              </button>
            )}
            <div
              ref={recentRef}
              style={{
                display: "flex",
                gap: "1rem",
                overflowX: "auto",
                scrollBehavior: "smooth",
                padding: "0.5rem 2rem",
              }}
            >
              {renderCards(recentSearchProps)}
            </div>
            {recentSearchProps.length > 1 && (
              <button
                onClick={() => scrollContainer(recentRef, "right")}
                style={{
                  position: "absolute",
                  right: "0",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#003366",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  zIndex: 2
                }}
              >
                ›
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h4 style={{ fontSize: "17px", color: "#003366" }}>
            Properties Near {sector}
          </h4>
          <div style={{ position: "relative" }}>
            {nearbyProps.length > 1 && (
              <button
                onClick={() => scrollContainer(nearbyRef, "left")}
                style={{
                  position: "absolute",
                  left: "0",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#003366",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  zIndex: 2
                }}
              >
                ‹
              </button>
            )}
            <div
              ref={nearbyRef}
              style={{
                display: "flex",
                gap: "1rem",
                overflowX: "auto",
                scrollBehavior: "smooth",
                padding: "0.5rem 2rem",
              }}
            >
              {renderCards(nearbyProps)}
            </div>
            {nearbyProps.length > 1 && (
              <button
                onClick={() => scrollContainer(nearbyRef, "right")}
                style={{
                  position: "absolute",
                  right: "0",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#003366",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  zIndex: 2
                }}
              >
                ›
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h4 style={{ fontSize: "17px", color: "#003366" }}>Recommended for You</h4>
          <div style={{ position: "relative" }}>
            {allProps.length > 1 && (
              <button
                onClick={() => scrollContainer(allRef, "left")}
                style={{
                  position: "absolute",
                  left: "0",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#003366",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  zIndex: 2
                }}
              >
                ‹
              </button>
            )}
            <div
              ref={allRef}
              style={{
                display: "flex",
                gap: "1rem",
                overflowX: "auto",
                scrollBehavior: "smooth",
                padding: "0.5rem 2rem",
              }}
            >
              {renderCards(allProps)}
            </div>
            {allProps.length > 1 && (
              <button
                onClick={() => scrollContainer(allRef, "right")}
                style={{
                  position: "absolute",
                  right: "0",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#003366",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  zIndex: 2
                }}
              >
                ›
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SimilarProperties;