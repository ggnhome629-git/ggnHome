import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FlatmateDashboard from './flatematesdashboardcomp1';


import TopNavigationBar from '../Flatmates page/TopNavigationBar';
import PropertyHeroSection from '../Dashboard/News';
import LandingPage from '../Dashboard/advertisement';
import AdCarousel from '../Dashboard/Adcarousel';
import { FiSearch as Search, FiMic as Mic } from 'react-icons/fi';
import PropertySnapshot from '../Dashboard/PropertySnapshots';
import Banners from '../Dashboard/Banners';
import PropertyCitiesComponent from '../Dashboard/propertyOptions';
import Tools from '../Dashboard/Tools';
import Footer from '../Dashboard/Footer';

const ModernFlatmateDashboard = () => {
  const { query: urlQuery } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(urlQuery || '');
  const [activeTab, setActiveTab] = useState('discovery');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: [500, 3000],
    bedrooms: 'any',
    availableFrom: '',
    furnished: false,
    amenities: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid, list, map
  const [selectedListing, setSelectedListing] = useState(null);

  // Responsive + UI helper states (added to fix undefined errors)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const searchBoxRef = useRef(null);

  // Tabs used in the search box
  const tabs = [
    { name: 'All Properties' },
    
    { name: 'Get a Roomate', new: true }
  ];

  const [propertyTypeFilter, setPropertyTypeFilter] = useState('All');

  // Minimal user/search state placeholders (replace with real data hooks as needed)
  const [user, setUser] = useState(null);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [areaSuggestions, setAreaSuggestions] = useState([]);

  // Hybrid auth: get accessToken for authenticated APIs
  const userToken = localStorage.getItem("accessToken");

  const colorPalette = {
    prussianBlue: '#003366',
    slateBlue: '#4A6A8A',
    teal: '#00A79D',
    cyan: '#22D3EE',
    alabaster: '#F4F7F9',
    white: '#FFFFFF',
    darkCharcoal: '#333333',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  };

  // Enhanced styles with animations and modern design
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colorPalette.alabaster,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    header: {
      backgroundColor: colorPalette.white,
      padding: '16px 0',
      borderBottom: `1px solid ${colorPalette.alabaster}`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    },
    nav: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '0 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    logo: {
      fontSize: '28px',
      fontWeight: '800',
      color: colorPalette.prussianBlue,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: `linear-gradient(135deg, ${colorPalette.prussianBlue}, ${colorPalette.teal})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    },
    main: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '40px 24px'
    },
    hero: {
      textAlign: 'center',
      marginBottom: '60px',
      padding: '60px 40px',
      background: `linear-gradient(135deg, ${colorPalette.prussianBlue}dd, ${colorPalette.slateBlue}dd), url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderRadius: '24px',
      color: colorPalette.white,
      position: 'relative',
      overflow: 'hidden'
    },
    searchContainer: {
      display: 'flex',
      gap: '16px',
      maxWidth: '2000px',
      
      alignItems: 'center'
    },
    searchInput: {
      flex: 1,
      padding: '18px 24px',
      borderRadius: '16px',
      border: 'none',
      fontSize: '16px',
      outline: 'none',
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      background: colorPalette.white,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    searchButton: {
      padding: '18px 32px',
      backgroundColor: colorPalette.teal,
      color: colorPalette.white,
      border: 'none',
      borderRadius: '16px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: `0 8px 25px ${colorPalette.teal}40`,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    filterButton: {
      padding: '16px',
      backgroundColor: colorPalette.white,
      color: colorPalette.prussianBlue,
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    tabContainer: {
      display: 'flex',
      gap: '8px',
      marginBottom: '40px',
      backgroundColor: colorPalette.white,
      padding: '8px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: `1px solid ${colorPalette.alabaster}`
    },
    tab: {
      padding: '14px 28px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: 'transparent',
      color: colorPalette.slateBlue,
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '500',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    activeTab: {
      backgroundColor: colorPalette.teal,
      color: colorPalette.white,
      boxShadow: `0 6px 20px ${colorPalette.teal}40`,
      transform: 'translateY(-2px)'
    },
    grid: {
      display: viewMode === 'grid' ? 'grid' : 'block',
      gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fit, minmax(380px, 1fr))' : '1fr',
      gap: '30px',
      marginBottom: '50px'
    },
    card: {
      backgroundColor: colorPalette.white,
      borderRadius: '20px',
      padding: '0',
      boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
      border: `1px solid ${colorPalette.alabaster}`,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      position: 'relative'
    },
    featureGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '25px'
    },
    featureCard: {
      backgroundColor: colorPalette.white,
      borderRadius: '20px',
      padding: '30px 25px',
      textAlign: 'center',
      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      border: `1px solid ${colorPalette.alabaster}`,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    }
  };

  

  const [randomListings, setRandomListings] = useState([]);

  useEffect(() => {
    const fetchRandom = async () => {
      try {
        // try dedicated random endpoint first, then fallback to normal listings
        const tryUrls = [
          '/api/flatmates/random-listings?limit=6',
          '/api/flatmates/listings?limit=6'
        ];

        for (const url of tryUrls) {
          // These endpoints are public, do NOT send auth header
          const res = await fetch(url);
          if (!res.ok) continue;

          // try to parse JSON safely
          let data;
          try { data = await res.json(); } catch (e) { data = null; }
          if (!data) continue;

          // Accept multiple shapes: array, { success: true, data: [...] }, { listings: [...] }, { data: { items: [...] } }
          let items = [];
          if (Array.isArray(data)) {
            items = data;
          } else if (data.success && Array.isArray(data.data)) {
            items = data.data;
          } else if (Array.isArray(data.listings)) {
            items = data.listings;
          } else if (data.data && Array.isArray(data.data.items)) {
            items = data.data.items;
          } else if (data.data && Array.isArray(data.data)) {
            items = data.data;
          }

          if (items.length) {
            setRandomListings(items.map(normalizeListing));
            return;
          }
        }

        // If we reach here, endpoints didn't return usable items — clear the list
        setRandomListings([]);
      } catch (e) {
        console.error('fetchRandomListings error', e);
        setRandomListings([]);
      }
    };
    fetchRandom();
  }, []);

  const normalizeListing = (l) => ({
    id: l._id || l.id,
    title: l.title || '',
    price: (l.budget && (l.budget.max || l.budget.min)) || l.price || 0,
    location: l.area ? `${l.area}, ${l.city || ''}` : (l.city || ''),
    image: (l.photos && l.photos[0] && l.photos[0].url) || l.image || '',
    amenities: l.amenities || [],
    available: l.moveInDate ? new Date(l.moveInDate).toLocaleDateString() : (l.available || 'N/A'),
    bedrooms: l.occupancyWanted || l.bedrooms || 1,
    bathrooms: l.bathrooms || 1,
    area: l.area || '',
    rating: l.rating || 4.5,
    reviews: l.reviews || 0,
    boosted: l.boosted || false,
    verified: l.verified || false,
    distance: l.distance || ''
  });

  // Enhanced search handler with debouncing
 const handleSearch = useCallback(async (query) => {
  // Normalize input: sometimes this handler is called as an event (from onClick)
  // or with no argument. If `query` isn't a string, fall back to current state.
  if (typeof query !== 'string') {
    query = searchQuery || '';
  }

  const qTrim = (query && typeof query === 'string') ? query.trim() : '';
  if (!qTrim) return;

  setLoading(true);

  // Simulate API call with enhanced search logic
  setTimeout(() => {
    setLoading(false);
    navigate(`/flatmatessearch?q=${encodeURIComponent(qTrim)}`);
  }, 1200);
 }, [searchQuery, navigate]);
    
    const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
      },
    });
    setUser(null);
    navigate("/");
  };

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

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];


  // Enhanced Feature Card with gradient backgrounds
  const FeatureCard = ({ feature }) => (
    <div
      style={{
        ...styles.featureCard,
        background: feature.gradient
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)';
      }}
      onClick={() => console.log(`Feature clicked: ${feature.title}`)}
    >
      <div style={{ 
        fontSize: '48px', 
        marginBottom: '20px',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
      }}>
        {feature.icon}
      </div>
      <h3 style={{ 
        color: colorPalette.white, 
        marginBottom: '15px',
        fontSize: '20px',
        fontWeight: '700'
      }}>
        {feature.title}
      </h3>
      <p style={{ 
        color: 'rgba(255,255,255,0.9)', 
        marginBottom: '20px',
        fontSize: '14px',
        lineHeight: '1.6'
      }}>
        {feature.description}
      </p>
      <button
        style={{
          padding: '12px 24px',
          backgroundColor: colorPalette.white,
          color: colorPalette.prussianBlue,
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        }}
      >
        {feature.action}
      </button>
    </div>
  );

  // Enhanced Listing Card with more details
  const ListingCard = ({ listing }) => (
    <div
      className="card-entrance"
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.boxShadow = '0 25px 60px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.08)';
      }}
      onClick={() => setSelectedListing(listing)}
    >
      {/* Badges */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        display: 'flex',
        gap: '8px',
        zIndex: 2
      }}>
        {listing.boosted && (
          <span style={{
            backgroundColor: colorPalette.warning,
            color: colorPalette.white,
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
          }}>
            🔥 BOOSTED
          </span>
        )}
        {listing.verified && (
          <span style={{
            backgroundColor: colorPalette.success,
            color: colorPalette.white,
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
          }}>
            ✓ VERIFIED
          </span>
        )}
      </div>

      {/* Image */}
      <div
        style={{
          width: '100%',
          height: '240px',
          backgroundImage: `url(${listing.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            backgroundColor: colorPalette.teal,
            color: colorPalette.white,
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '700',
            boxShadow: `0 6px 20px ${colorPalette.teal}40`
          }}
        >
          ${listing.price}/mo
        </div>
      </div>
      
      {/* Content */}
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <h3 style={{ 
            margin: '0',
            color: colorPalette.darkCharcoal,
            fontSize: '20px',
            fontWeight: '700',
            lineHeight: '1.3',
            flex: 1
          }}>
            {listing.title}
          </h3>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            backgroundColor: colorPalette.alabaster,
            padding: '4px 8px',
            borderRadius: '8px'
          }}>
            <span style={{ color: colorPalette.warning, fontSize: '16px' }}>⭐</span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600',
              color: colorPalette.darkCharcoal
            }}>
              {listing.rating}
            </span>
            <span style={{ 
              fontSize: '12px', 
              color: colorPalette.slateBlue 
            }}>
              ({listing.reviews})
            </span>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          color: colorPalette.slateBlue
        }}>
          <span>📍 {listing.location}</span>
          <span>•</span>
          <span>📏 {listing.area} sq ft</span>
          <span>•</span>
          <span>🚗 {listing.distance}</span>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '16px',
          fontSize: '14px',
          color: colorPalette.slateBlue
        }}>
          <span>🛏️ {listing.bedrooms} bed</span>
          <span>🚿 {listing.bathrooms} bath</span>
          <span>📅 {listing.available}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px', 
          marginBottom: '20px' 
        }}>
          {listing.amenities.slice(0, 4).map((amenity, index) => (
            <span
              key={index}
              style={{
                backgroundColor: colorPalette.alabaster,
                color: colorPalette.slateBlue,
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500',
                border: `1px solid ${colorPalette.alabaster}`
              }}
            >
              {amenity}
            </span>
          ))}
          {listing.amenities.length > 4 && (
            <span
              style={{
                backgroundColor: colorPalette.alabaster,
                color: colorPalette.slateBlue,
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              +{listing.amenities.length - 4} more
            </span>
          )}
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          borderTop: `1px solid ${colorPalette.alabaster}`,
          paddingTop: '16px'
        }}>
          <button
            style={{
              flex: 1,
              padding: '12px 20px',
              backgroundColor: colorPalette.teal,
              color: colorPalette.white,
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colorPalette.cyan;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colorPalette.teal;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            View Details
          </button>
          <button
            style={{
              padding: '12px 20px',
              backgroundColor: colorPalette.white,
              color: colorPalette.teal,
              border: `2px solid ${colorPalette.teal}`,
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colorPalette.teal;
              e.currentTarget.style.color = colorPalette.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colorPalette.white;
              e.currentTarget.style.color = colorPalette.teal;
            }}
          >
            💬
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.92)',
            zIndex: 6000,
            gap: '16px',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '6px solid rgba(0,0,0,0.1)',
              borderTopColor: '#00A79D',
              animation: 'spin 1s linear infinite'
            }}
          />
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: '#003366'
            }}
          >
            Finding the best flatmates for you…
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '15px',
              color: '#4A6A8A',
              textAlign: 'center',
              maxWidth: '480px'
            }}
          >
            Matching preferences, scanning listings — great options are loading!
          </p>
        </div>
      )}
          <TopNavigationBar user={user} handleLogout={handleLogout} navItems={navItems} />
          

      {/* Main Content */}
 {/* Main Content */}
          <main>
              <div
        className="hero-banner-section hero-entrance"
        style={{
          width: "100%",
          position: "relative",
          padding: 0,
          
          marginBottom: isMobile ? "1rem" : "1.5rem",
        }}
      >
        {/* Hero Banner / Carousel */}
        <AdCarousel />
        {/* Search Box positioned below carousel */}
        <div
          ref={searchBoxRef}
          className="search-box-container"
          style={{
            position: isMobile ? "unset" : "absolute",
            bottom: isMobile ? "unset" : "-110px",
            left: isMobile ? "unset" : "50%",
            transform: isMobile ? "none" : "translateX(-50%)",
            width: isMobile ? "98vw" : "90%",
            maxWidth: isMobile ? "100vw" : "1200px",
            backgroundColor: "#FFFFFF",
            borderRadius: isMobile ? "14px" : "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 10,
            overflow: "visible",
            margin: isMobile ? "0.5rem auto" : "unset",
            padding: isMobile ? "0.3rem 0" : "unset",
          }}
        >
          {/* Tabs */}
          {/* Tabs Section */}
          {!isMobile ? (
            // Desktop tabs
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #E5E7EB",
                backgroundColor: "#FFFFFF",
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => {
                    setActiveTab(tab.name);
                    if (tab.name === "All Properties") {
                      setPropertyTypeFilter("All");
                    } else if (tab.name === "Buy") {
                      setPropertyTypeFilter("Sale");
                    } else if (tab.name === "Rent") {
                      setPropertyTypeFilter("Rent");
                    } else if (tab.name === "Post Property") {
                      const searchBox = document.querySelector(".search-box-container");
                      if (searchBox) {
                        searchBox.classList.add("slide-out");
                        setTimeout(() => {
                          if(!user){
                            navigate("/login");
                          }
                          else{
                          navigate("/createflatmatelisting");}
                          searchBox.classList.remove("slide-out");
                        }, 600);
                      } else {
                        navigate("/createflatmatelisting");
                      }
                    }
                  }}
                  style={{
                    padding: "16px 24px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: activeTab === tab.name ? "#003366" : "#4A6A8A",
                    fontSize: "14px",
                    fontWeight: activeTab === tab.name ? "600" : "500",
                    cursor: "pointer",
                    borderBottom:
                      activeTab === tab.name
                        ? "3px solid #00A79D"
                        : "3px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    position: "relative",
                  }}
                >
                  {tab.name}
                  {tab.new && (
                    <span
                      style={{
                        backgroundColor: "#FF4757",
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "700",
                      }}
                    >
                      NEW
                    </span>
                  )}
                  {tab.free && (
                    <span
                      style={{
                        backgroundColor: "#00A79D",
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "700",
                      }}
                    >
                      FREE
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            // Mobile tabs (scrollable horizontal)
            <div
              style={{
                display: "flex",
                overflowX: "auto",
                padding: "8px 0",
                gap: "8px",
                backgroundColor: "#FFFFFF",
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => {
                    setActiveTab(tab.name);
                    if (tab.name === "All Properties") {
                      setPropertyTypeFilter("All");
                    } else if (tab.name === "Buy") {
                      setPropertyTypeFilter("Sale");
                    } else if (tab.name === "Rent") {
                      setPropertyTypeFilter("Rent");
                    } else if (tab.name === "Post Property") {
                      const searchBox = document.querySelector(".search-box-container");
                      if (searchBox) {
                        searchBox.classList.add("slide-out");
                        setTimeout(() => {
                          navigate("/createflatmatelisting");
                          searchBox.classList.remove("slide-out");
                        }, 600);
                      } else {
                        navigate("/createflatmatelisting");
                      }
                    }
                  }}
                  style={{
                    padding: "12px 16px",
                    border: "none",
                    borderRadius: "8px",
                    backgroundColor:
                      activeTab === tab.name ? "#00A79D" : "#F4F7F9",
                    color: activeTab === tab.name ? "#FFFFFF" : "#4A6A8A",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    flex: "0 0 auto",
                  }}
                >
                  {tab.name}
                  {tab.new && (
                    <span
                      style={{
                        backgroundColor: "#FF4757",
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "700",
                        marginLeft: "4px",
                      }}
                    >
                      NEW
                    </span>
                  )}
                  {tab.free && (
                    <span
                      style={{
                        backgroundColor: "#00A79D",
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "700",
                        marginLeft: "4px",
                      }}
                    >
                      FREE
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Detailed Search Input */}
          {/* Search Input Layout */}
          {isMobile ? (
            <>
              <div
                className="search-row-mobile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  background: "#fff",
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  margin: 0,
                  minHeight: "44px",
                }}
              >
                <button
                  className="search-icon-btn"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    margin: "0 6px",
                    minWidth: "44px",
                    minHeight: "44px",
                    height: "44px",
                    width: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "20px",
                  }}
                  onClick={handleSearch}
                  aria-label="Search"
                  type="button"
                >
                  <Search size={20} color="#4A6A8A" />
                </button>
                <input
                  type="text"
                  placeholder="Search area or property type"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (!user) {
                      console.log(
                        "User not logged in, search disabled until login"
                      );
                      return; // do nothing on focus
                    }
                    setShowRecentDropdown(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowRecentDropdown(false), 400)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{
                    border: "none",
                    outline: "none",
                    flex: 1,
                    fontSize: "15px",
                    color: "#333333",
                    backgroundColor: "transparent",
                    width: "100%",
                    padding: "10px 0",
                    margin: 0,
                    borderRadius: "8px",
                    minHeight: "44px",
                  }}
                />
                {showRecentDropdown && user && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "0.5rem",
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      width: "100%",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      zIndex: 10,
                    }}
                  >
                    {/* If searchQuery is empty, show recentSearches */}
                    {!searchQuery.trim() &&
                      recentSearches.length > 0 &&
                      recentSearches.map((search, idx) => (
                        <div
                          key={search._id || idx}
                          style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            borderBottom:
                              idx !== recentSearches.length - 1
                                ? "1px solid #f1f1f1"
                                : "none",
                            color: "#333",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                            transition: "background 0.2s",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(search.query);
                            setShowRecentDropdown(false);
                            handleSearch();
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#F4F7F9")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#fff")
                          }
                        >
                          {search.query}
                        </div>
                      ))}
                    {/* If searchQuery is not empty and areaSuggestions exist, show suggestions */}
                    {searchQuery.trim() &&
                      areaSuggestions.length > 0 &&
                      areaSuggestions.map((sector, idx) => (
                        <div
                          key={sector.id || sector.name || idx}
                          style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            borderBottom:
                              idx !== areaSuggestions.length - 1
                                ? "1px solid #f1f1f1"
                                : "none",
                            color: "#333",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                            transition: "background 0.2s",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(sector.name);
                            setShowRecentDropdown(false);
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#F4F7F9")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#fff")
                          }
                        >
                          {sector.name}
                        </div>
                      ))}
                  </div>
                )}
                <button
                  className="mic-icon-btn"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    margin: "0 6px",
                    minWidth: "44px",
                    minHeight: "44px",
                    height: "44px",
                    width: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "20px",
                  }}
                  aria-label="Voice search"
                  type="button"
                  onClick={() => {
                    if (!("webkitSpeechRecognition" in window)) {
                      alert("Voice recognition not supported");
                      return;
                    }
                    const recognition = new window.webkitSpeechRecognition();
                    recognition.lang = "en-US";
                    recognition.interimResults = false;
                    recognition.maxAlternatives = 1;
                    recognition.start();
                    recognition.onresult = (event) => {
                      const voiceInput = event.results[0][0].transcript;
                      setSearchQuery(voiceInput);
                      handleSearch();
                    };
                    recognition.onerror = (event) =>
                      console.error("Voice recognition error:", event.error);
                  }}
                >
                  <Mic size={20} color="#00A79D" />
                </button>
              </div>
              {/* Mobile Search Button */}
              <button
                onClick={handleSearch}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "12px 0",
                  backgroundColor: "#0066FF",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                }}
              >
                Search
              </button>
            </>
          ) : (
            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
                flexDirection: "row",
              }}
            >
              <div style={{ position: "relative", minWidth: "180px", width: "auto", marginBottom: 0 }}>
                <select
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value)}
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#333333",
                    backgroundColor: "#FFFFFF",
                    cursor: "pointer",
                    width: "100%",
                    fontWeight: "500",
                  }}
                >
                  <option value="All">All</option>
                  <option value="Rent">Rent</option>
                  <option value="Sale">Sale</option>
                </select>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  backgroundColor: "#FFFFFF",
                  minWidth: "320px",
                  width: "auto",
                  position: "relative",
                  marginBottom: 0,
                }}
              >
                <Search
                  size={20}
                  color="#4A6A8A"
                  style={{ marginRight: "8px" }}
                />
                <input
                  type="text"
                  placeholder={'Search "3 BHK" or "Sector-46 or 3 BHK in Sector-46 or 1200 sqft or ₹20,000 / month"'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (!user) {
                      console.log(
                        "User not logged in, search disabled until login"
                      );
                      return; // do nothing on focus
                    }
                    setShowRecentDropdown(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowRecentDropdown(false), 400)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{
                    border: "none",
                    outline: "none",
                    flex: 1,
                    fontSize: "14px",
                    color: "#333333",
                    backgroundColor: "transparent",
                    width: "100%",
                  }}
                />
                <button
                  onClick={handleSearch}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  aria-label="Search"
                  type="button"
                >
                  <Search size={20} color="#4A6A8A" />
                </button>
                {showRecentDropdown && user && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "0.5rem",
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      width: "100%",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      zIndex: 10,
                    }}
                  >
                    {/* If searchQuery is empty, show recentSearches */}
                    {!searchQuery.trim() &&
                      recentSearches.length > 0 &&
                      recentSearches.map((search, idx) => (
                        <div
                          key={search._id || idx}
                          style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            borderBottom:
                              idx !== recentSearches.length - 1
                                ? "1px solid #f1f1f1"
                                : "none",
                            color: "#333",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                            transition: "background 0.2s",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(search.query);
                            setShowRecentDropdown(false);
                            handleSearch();
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#F4F7F9")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#fff")
                          }
                        >
                          {search.query}
                        </div>
                      ))}
                    {/* If searchQuery is not empty and areaSuggestions exist, show suggestions */}
                    {searchQuery.trim() &&
                      areaSuggestions.length > 0 &&
                      areaSuggestions.map((sector, idx) => (
                        <div
                          key={sector.id || sector.name || idx}
                          style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            borderBottom:
                              idx !== areaSuggestions.length - 1
                                ? "1px solid #f1f1f1"
                                : "none",
                            color: "#333",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                            transition: "background 0.2s",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery(sector.name);
                            setShowRecentDropdown(false);
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#F4F7F9")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#fff")
                          }
                        >
                          {sector.name}
                        </div>
                      ))}
                  </div>
                )}
                <Mic
                  size={20}
                  color="#00A79D"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (!("webkitSpeechRecognition" in window)) {
                      alert("Voice recognition not supported");
                      return;
                    }
                    const recognition = new window.webkitSpeechRecognition();
                    recognition.lang = "en-US";
                    recognition.interimResults = false;
                    recognition.maxAlternatives = 1;
                    recognition.start();
                    recognition.onresult = (event) => {
                      const voiceInput = event.results[0][0].transcript;
                      setSearchQuery(voiceInput);
                      handleSearch();
                    };
                    recognition.onerror = (event) =>
                      console.error("Voice recognition error:", event.error);
                  }}
                />
              </div>
              <button
                style={{
                  padding: "12px 48px",
                  backgroundColor: "#0066FF",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#0052CC";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(0,102,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#0066FF";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
                onClick={handleSearch}
              >
                Search
              </button>
            </div>
          )}
        </div>
              </div>

      {/* Suggested Listings: 3 rows x 2
      {randomListings && randomListings.length > 0 && (
        <section style={{ maxWidth: '1200px', marginTop: '24px' }}>
          <h2 style={{ marginTop: '24px', color: '#003366', fontSize: '28px', fontWeight: '700' }}>
            Flats Available
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            {randomListings.slice(0, 6).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
              )} */}

              <FlatmateDashboard user={user} />
              


               {/* Property Snapshot Section */}
      <div className="property-snapshot-section" >
        <PropertySnapshot />
      </div>
      {/* News Section */}
      <div id="news" className="news-section" >
        <PropertyHeroSection />
      </div>
      {/* Advertisement Section */}
      <div className="dashboard-ads-section" >
        <LandingPage />
      </div>
      {/* {Banners} */}
              <Banners user={user} />
              <Tools/>
              <PropertyCitiesComponent />



        

      

     
          </main>
          <Footer/>

      {/* Add CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
            <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          .hero-entrance {
            animation: fadeInUp 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .card-entrance {
            animation: fadeInUp 450ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          /* reduced motion respect */
          @media (prefers-reduced-motion: reduce) {
            .hero-entrance, .card-entrance {
              animation: none !important;
            }
            .loader { animation: none !important; }
          }
        `}
      </style>
    </div>
  );
};

export default ModernFlatmateDashboard;