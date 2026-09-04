import { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  DollarSign,
  Home,
  Sparkles,
  ArrowLeft,
  Filter,
  SlidersHorizontal,
  Heart,
  Share2,
  MoreVertical,
  Phone,
  MessageCircle,
  Bed,
  Bath,
  Maximize,
} from "lucide-react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
const Searchproperty = () => {
  // Simulating useParams and useNavigate
  const { query } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(query || "");
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(null);

  // Fetch search results function, moved outside useEffect
  const fetchSearchResults = async (queryToSearch) => {
    const searchVal =
      typeof queryToSearch === "string" ? queryToSearch : searchQuery;
    if (searchVal.trim() === "") return;
    setLoading(true);
    try {
      // Search properties endpoint configurable via .env
      const res = await axios.get(
        `${process.env.REACT_APP_SEARCH_PROPERTIES_API}?query=${encodeURIComponent(
          searchVal.trim()
        )}`,
        { withCredentials: true }
      );
      setFilteredPayments(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Search API error:", error);
      setFilteredPayments([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") return;
    fetchSearchResults(searchQuery);
  }, [searchQuery]);

  // useEffect(() => {
  //   // Simulating API call
  //   setLoading(true);
  //   setTimeout(() => {
  //     setPayments(sampleData);
  //     setFilteredPayments(sampleData);
  //     setLoading(false);
  //   }, 500);
  // }, []);

  const handleLogout = async () => {
    // Logout endpoint configurable via .env
    await fetch(`${process.env.REACT_APP_LOGOUT_API}`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    navigate("/login");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // User info endpoint configurable via .env
        const res = await fetch(`${process.env.REACT_APP_USER_ME_API}`, {
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F4F7F9" }}>
      <TopNavigationBar
        navItems={navItems}
        user={user}
        handleLogout={handleLogout}
      />

      {/* Search and Filter Section */}
      <div
        style={{
          backgroundColor: "#003d82",
          padding: "3rem 0 2.5rem 0",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          background: "linear-gradient(180deg, #003d82 0%, #065bb1ff 100%)",
        }}
      >
        <div
          style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 2rem" }}
        >
          {/* Search Bar */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Search
              size={22}
              color="#4A6A8A"
              style={{ marginLeft: "0.75rem" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim() !== "") {
                  fetchSearchResults(searchQuery.trim());
                }
              }}
              placeholder="Search by location, property type, or amenities"
              style={{
                flex: 1,
                padding: "0.85rem 0",
                border: "none",
                fontSize: "1rem",
                outline: "none",
                color: "#333333",
              }}
            />
            <button
              style={{
                backgroundColor: "#00A79D",
                color: "#FFFFFF",
                border: "none",
                padding: "0.85rem 2rem",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#008c84")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#00A79D")
              }
              onClick={() => {
                if (searchQuery.trim() !== "") {
                  fetchSearchResults(searchQuery.trim());
                }
              }}
            >
              <Search size={18} />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div
        style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}
      >
        <div style={{ display: "flex", gap: "2rem" }}>
          {/* Left Column - Property Listings */}
          <div style={{ flex: "1 1 70%" }}>
            {/* Results Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                paddingBottom: "1rem",
                borderBottom: "2px solid rgba(74, 106, 138, 0.1)",
              }}
            >
              <div>
                <h2
                  style={{
                    color: "#003366",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    margin: "0 0 0.25rem 0",
                  }}
                >
                  {loading ? "" : filteredPayments.length} Properties Found
                </h2>
                <p
                  style={{
                    color: "#4A6A8A",
                    fontSize: "0.9rem",
                    margin: 0,
                  }}
                >
                  Showing results for "{query}"
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  backgroundColor: "#FFFFFF",
                  padding: "0.75rem 1.25rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(74, 106, 138, 0.15)",
                }}
              >
                <SlidersHorizontal size={18} color="#4A6A8A" />
                <span
                  style={{
                    color: "#4A6A8A",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                  }}
                >
                  Sort by:
                </span>
                <select
                  style={{
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#003366",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    outline: "none",
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    let sorted = [...filteredPayments];
                    if (value === "Price: Low to High") {
                      sorted.sort((a, b) => {
                        // Use price or monthlyRent (fallback to 0 if missing)
                        const priceA = a.price !== undefined && a.price !== null ? Number(a.price) : (a.monthlyRent !== undefined && a.monthlyRent !== null ? Number(a.monthlyRent) : 0);
                        const priceB = b.price !== undefined && b.price !== null ? Number(b.price) : (b.monthlyRent !== undefined && b.monthlyRent !== null ? Number(b.monthlyRent) : 0);
                        return priceA - priceB;
                      });
                    } else if (value === "Price: High to Low") {
                      sorted.sort((a, b) => {
                        const priceA = a.price !== undefined && a.price !== null ? Number(a.price) : (a.monthlyRent !== undefined && a.monthlyRent !== null ? Number(a.monthlyRent) : 0);
                        const priceB = b.price !== undefined && b.price !== null ? Number(b.price) : (b.monthlyRent !== undefined && b.monthlyRent !== null ? Number(b.monthlyRent) : 0);
                        return priceB - priceA;
                      });
                    } else if (value === "Newest First") {
                      sorted.sort((a, b) => {
                        // Compare by createdAt, descending (newest first)
                        const dateA = new Date(a.createdAt).getTime();
                        const dateB = new Date(b.createdAt).getTime();
                        return dateB - dateA;
                      });
                    }
                    setFilteredPayments(sorted);
                  }}
                >
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Newest First</option>
                </select>
              </div>
            </div>

            {/* Add Localities Banner */}
            <div
              style={{
                backgroundColor: "rgba(34, 211, 238, 0.1)",
                border: "2px dashed #22D3EE",
                borderRadius: "12px",
                padding: "1rem 1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "2rem",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              <MapPin size={24} color="#00A79D" />
              <span
                style={{
                  color: "#003366",
                  fontSize: "1rem",
                  fontWeight: "600",
                }}
              >
                Add Localities for more relevant results
              </span>
            </div>

            {/* Property List */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#003366",
                    fontSize: "1.2rem",
                    margin: "2rem 0",
                  }}
                >
                  Loading properties...
                </div>
              ) : filteredPayments.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#003366",
                    fontSize: "1.2rem",
                    margin: "2rem 0",
                  }}
                >
                  No results found.
                </div>
              ) : (
                filteredPayments.map((property) => (
                  <div
                    key={property._id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      overflow: "hidden",
                      boxShadow: "0 2px 12px rgba(0, 51, 102, 0.08)",
                      border: "2px solid transparent",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      position: "relative",
                    }}
                    onClick={() => navigate(`/details/${property._id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#22D3EE";
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(34, 211, 238, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.boxShadow =
                        "0 2px 12px rgba(0, 51, 102, 0.08)";
                    }}
                  >
                    <div style={{ display: "flex" }}>
                      {/* Property Image */}
                      <div
                        style={{
                          width: "300px",
                          height: "220px",
                          flexShrink: 0,
                          background:
                            "linear-gradient(135deg, #003366 0%, #4A6A8A 100%)",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {/* Show image if available, else fallback icon */}
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={property.images[0]}
                            alt="Property"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: "12px 0 0 12px",
                            }}
                          />
                        ) : (
                          <Home size={64} color="rgba(255, 255, 255, 0.3)" />
                        )}
                        {property.status === "Newly Launched" && (
                          <div
                            style={{
                              position: "absolute",
                              top: "1rem",
                              left: "0",
                              backgroundColor: "#00A79D",
                              color: "#FFFFFF",
                              padding: "0.4rem 1rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            ✓ {property.status}
                          </div>
                        )}
                      </div>

                      {/* Property Details */}
                      <div
                        style={{
                          flex: 1,
                          padding: "1.5rem",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h3
                              style={{
                                color: "#003366",
                                fontSize: "1.25rem",
                                fontWeight: "700",
                                marginBottom: "0.5rem",
                                lineHeight: "1.3",
                              }}
                            >
                              {property.propertyType}For Rent in{" "}
                              {property.address}
                            </h3>
                            <p
                              style={{
                                color: "#4A6A8A",
                                fontSize: "0.9rem",
                                marginBottom: "1rem",
                                fontWeight: "500",
                              }}
                            >
                              {property.society}
                            </p>
                            {/* Amenities if available */}
                            {property.amenities &&
                              property.amenities.length > 0 && (
                                <div
                                  style={{
                                    marginBottom: "0.5rem",
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "0.5rem",
                                  }}
                                >
                                  {property.amenities
                                    .slice(0, 5)
                                    .map((amenity, idx) => (
                                      <span
                                        key={idx}
                                        style={{
                                          backgroundColor:
                                            "rgba(0,167,157,0.09)",
                                          color: "#00A79D",
                                          fontSize: "0.8rem",
                                          padding: "0.2rem 0.7rem",
                                          borderRadius: "6px",
                                          fontWeight: "600",
                                        }}
                                      >
                                        <Sparkles
                                          size={13}
                                          style={{
                                            verticalAlign: "middle",
                                            marginRight: "3px",
                                          }}
                                        />
                                        {amenity}
                                      </span>
                                    ))}
                                </div>
                              )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.75rem",
                              marginLeft: "1rem",
                            }}
                          >
                            <button
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                border: "1px solid rgba(74, 106, 138, 0.2)",
                                backgroundColor: "#FFFFFF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              <Heart size={18} color="#4A6A8A" />
                            </button>
                          
                            <button
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                border: "1px solid rgba(74, 106, 138, 0.2)",
                                backgroundColor: "#FFFFFF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              <MoreVertical size={18} color="#4A6A8A" />
                            </button>
                          </div>
                        </div>

                        {/* Property Specs */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: "1rem",
                            marginBottom: "1rem",
                            paddingBottom: "1rem",
                            borderBottom: "1px solid rgba(74, 106, 138, 0.1)",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "#4A6A8A",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                marginBottom: "0.25rem",
                              }}
                            >
                              Super Area
                            </div>
                            <div
                              style={{
                                fontSize: "0.95rem",
                                color: "#333333",
                                fontWeight: "600",
                              }}
                            >
                              {property.totalArea} sqft
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "#4A6A8A",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                marginBottom: "0.25rem",
                              }}
                            >
                              Status
                            </div>
                            <div
                              style={{
                                fontSize: "0.95rem",
                                color: "#333333",
                                fontWeight: "600",
                              }}
                            >
                              {property.possession}
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "#4A6A8A",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                marginBottom: "0.25rem",
                              }}
                            >
                              Furnishing
                            </div>
                            <div
                              style={{
                                fontSize: "0.95rem",
                                color: "#333333",
                                fontWeight: "600",
                              }}
                            >
                              {property.furnishing}
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "#4A6A8A",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                marginBottom: "0.25rem",
                              }}
                            >
                              Bathroom
                            </div>
                            <div
                              style={{
                                fontSize: "0.95rem",
                                color: "#333333",
                                fontWeight: "600",
                              }}
                            >
                              {property.bathrooms}
                            </div>
                          </div>
                        </div>

                        {/* Price and Actions */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "auto",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                color: "#003366",
                                fontSize: "1.75rem",
                                fontWeight: "800",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <div
                                style={{
                                  color: "#003366",
                                  fontSize: "1.75rem",
                                  fontWeight: "800",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                ₹{" "}
                                {property.price
                                  ? Number(property.price).toLocaleString()
                                  : property.monthlyRent
                                  ? Number(
                                      property.monthlyRent
                                    ).toLocaleString()
                                  : "N/A"}
                              </div>
                            </div>
                            <div
                              style={{ color: "#4A6A8A", fontSize: "0.85rem" }}
                            >
                              ₹{" "}
                              {property.pricePerSqft
                                ? property.pricePerSqft.toLocaleString()
                                : "N/A"}{" "}
                              per sqft
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem" }}>
                            <button
                              style={{
                                backgroundColor: "#FFFFFF",
                                color: "#00A79D",
                                border: "2px solid #00A79D",
                                padding: "0.75rem 1.5rem",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                                onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/support`);
                              }
                              }
                            >
                              <Phone size={16} />
                              Get Phone No.
                            </button>
                            <button
                              style={{
                                backgroundColor: "#DC2626",
                                color: "#FFFFFF",
                                border: "none",
                                padding: "0.75rem 1.5rem",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/support`);
                              }
                              }
                            >

                              <MessageCircle size={16} />
                              Contact Agent
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column - Promotional Sidebar */}
          <div style={{ flex: "0 0 320px" }}>
            <div style={{ position: "sticky", top: "2rem" }}>
              {/* Post Property Card */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "16px",
                  padding: "2rem",
                  boxShadow: "0 4px 20px rgba(0, 51, 102, 0.1)",
                  marginBottom: "1.5rem",
                  textAlign: "center",
                  border: "2px solid #22D3EE",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    backgroundColor: "rgba(34, 211, 238, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <Home size={40} color="#00A79D" />
                </div>
                <h3
                  style={{
                    color: "#003366",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    marginBottom: "0.75rem",
                  }}
                >
                  Sell/Rent your Property
                </h3>
                <p
                  style={{
                    color: "#4A6A8A",
                    fontSize: "1.1rem",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                  }}
                >
                  for{" "}
                  <span
                    style={{
                      color: "#00A79D",
                      fontSize: "1.3rem",
                      fontWeight: "800",
                    }}
                  >
                    Free
                  </span>
                </p>
                <p
                  style={{
                    color: "#666",
                    fontSize: "0.9rem",
                    marginBottom: "1.5rem",
                    lineHeight: "1.5",
                  }}
                >
                  Find Buyers & Tenants easily
                </p>
                <button
                  style={{
                    width: "100%",
                    backgroundColor: "#FFD700",
                    color: "#003366",
                    border: "none",
                    padding: "1rem",
                    borderRadius: "10px",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(255, 215, 0, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(255, 215, 0, 0.3)";
                  }}
                  onClick={() => navigate("/add-property")}
                >
                  Post Property
                </button>
              </div>

              {/* Benefits Card */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "16px",
                  padding: "1.75rem",
                  boxShadow: "0 4px 20px rgba(0, 51, 102, 0.1)",
                }}
              >
                <h4
                  style={{
                    color: "#003366",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    marginBottom: "1.25rem",
                  }}
                >
                  Here's why ShineOneEstate:
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {[
                    "Get Access to 4 Lakh+ Buyers",
                    "Sell Faster with Premium Service",
                    "Find only Genuine Leads",
                    "Get Expert advice on Market Trends & insights",
                  ].map((benefit, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          backgroundColor: "rgba(0, 167, 157, 0.1)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        <span
                          style={{
                            color: "#00A79D",
                            fontSize: "0.9rem",
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </span>
                      </div>
                      <span
                        style={{
                          color: "#333333",
                          fontSize: "0.9rem",
                          lineHeight: "1.5",
                        }}
                      >
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Searchproperty;
