import React, { useState , useEffect } from 'react';
import { MapPin, Bed, Bath, Square, Heart, Share2, TrendingUp, Award, Shield } from 'lucide-react';
import { useLocation, useNavigate  } from 'react-router-dom';
import TopNavigationBar from './TopNavigationBar';
import { useAuth } from '../../Context/AuthContext';
import { StaggerContainer, StaggerItem } from '../../components/motion';


const SeeAllProperties = ({ properties = [] }) => {
  const [likedProperties, setLikedProperties] = useState(new Set());
   const { user } = useAuth();

  // Default sample properties if none provided
  

  const location = useLocation();
  const navigate = useNavigate();

  // Use recommendedProperties from previous page if passed
  const recommendedProperties = location.state?.recommendedProperties || [];
  // Optional: if parent passed location queryFields for server pagination
  const locationQueryFields = location.state?.locationQueryFields || null;
  const paginateActive = Boolean(location.state?.paginateActive);

  // Unified list rendered on this page
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(14); // page size
  const [hasMore, setHasMore] = useState(false); // remote modes: whether there is a next page
  const [loading, setLoading] = useState(false);
  // For local fallback mode only
  const [localAll, setLocalAll] = useState([]);
  const [localTotalPages, setLocalTotalPages] = useState(1);

  useEffect(() => {
    // If location-based pagination is available
    if (Array.isArray(locationQueryFields) && locationQueryFields.length > 0) {
      setPage(1);
      setHasMore(false);
      setItems([]);
      fetchLocationPage(1, true);
      return;
    }
    // If active-properties pagination is requested
    if (paginateActive) {
      setPage(1);
      setHasMore(false);
      setItems([]);
      fetchActivePage(1, true);
      return;
    }
    // Fallback: local array pagination using recommended/provided props
    const display = (recommendedProperties.length > 0 ? recommendedProperties : properties) || [];
    const active = display.filter(p => p && p.isActive !== false);
    setLocalAll(active);
    const total = Math.max(1, Math.ceil(active.length / limit));
    setLocalTotalPages(total);
    setPage(1);
    setItems(active.slice(0, limit));
    setHasMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(locationQueryFields), paginateActive, JSON.stringify(recommendedProperties), JSON.stringify(properties), limit]);

  // Fetch one page from active-properties backend (server pagination)
  const fetchActivePage = async (nextPage, replace = true) => {
    if (loading) return;
    setLoading(true);
    try {
      const url = `${process.env.REACT_APP_Base_API}/api/activeproperties?page=${nextPage}&limit=${limit}`;
      const res = await fetch(url, { method: 'GET', credentials: 'include' });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (Array.isArray(data.properties) ? data.properties : []);
      const activeChunk = arr.filter(p => p && p.isActive !== false);
      // If we received a full page, we can assume there MAY be a next page
      setHasMore(activeChunk.length === limit);
      setItems(activeChunk);
    } catch (err) {
      console.error('Error loading active properties:', err);
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch one page from location-based backend (server pagination)
  const fetchLocationPage = async (nextPage, replace = true) => {
    if (!Array.isArray(locationQueryFields) || locationQueryFields.length === 0) return;
    if (loading) return;
    setLoading(true);
    try {
      const url = `${process.env.REACT_APP_SEARCH_PROPERTIES_BY_LOCATION_API}?page=${nextPage}&limit=${limit}`;
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryFields: locationQueryFields }),
      });
      const data = await res.json();
      const chunk = Array.isArray(data) ? data : [];
      const activeChunk = chunk.filter(p => p && p.isActive !== false);
      setHasMore(activeChunk.length === limit);
      setItems(activeChunk);
    } catch (err) {
      console.error('Error loading properties by location:', err);
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Page change effect: fetch or slice for current page
  useEffect(() => {
    // Location mode
    if (Array.isArray(locationQueryFields) && locationQueryFields.length > 0) {
      fetchLocationPage(page, true);
      return;
    }
    // Active mode
    if (paginateActive) {
      fetchActivePage(page, true);
      return;
    }
    // Local fallback mode
    if (localAll.length > 0) {
      const start = (page - 1) * limit;
      const end = start + limit;
      setItems(localAll.slice(start, end));
    } else {
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);


 
  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
  const toggleLike = (id) => {
    setLikedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const PropertyCard = ({ property }) => (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        border: '1px solid #E8EEF3',
      }}
      onClick={() => {
        const t = (property.defaultpropertytype || property.defaultPropertyType || property.propertyCategory || '').toLowerCase();
        if (t === 'rental') {
          navigate(`/Rentaldetails/${property._id}`);
        } else {
          navigate(`/Saledetails/${property._id}`);
        }
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 51, 102, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.08)';
      }}
    >
      <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
        <img 
          src={property.images?.[0] || '/default-property.jpg'} 
          alt={property.propertyType || 'Property'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        />
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: '#00A79D',
          color: '#FFFFFF',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          letterSpacing: '0.5px'
        }}>
          {property.propertyType ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1) : 'Property'}
        </div>
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(property.id);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}>
            <Heart 
              size={18} 
              fill={likedProperties.has(property.id) ? '#00A79D' : 'none'}
              color={likedProperties.has(property.id) ? '#00A79D' : '#003366'}
            />
          </button>
          <button style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}>
            <Share2 size={18} color="#003366" />
          </button>
        </div>
      </div>
      
      <div style={{ padding: '16px' }}>
        <div style={{
          fontSize: '22px',
          fontWeight: '700',
          color: '#003366',
          marginBottom: '8px'
        }}>
          {property.monthlyRent ? `${property.monthlyRent}/month` : 'N/A'}
        </div>
        
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#333333',
          marginBottom: '8px',
          lineHeight: '1.4'
        }}>
          {property.propertyType ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1) : 'Property'}
        </h3>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#4A6A8A',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          <MapPin size={16} />
          <span>{property.address || 'Unknown Location'}</span>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '16px',
          borderTop: '1px solid #F4F7F9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4A6A8A' }}>
            <Bed size={18} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{property.bedrooms || 0}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4A6A8A' }}>
            <Bath size={18} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{property.bathrooms || 0}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4A6A8A' }}>
            <Square size={18} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              {property.totalArea
                ? `${property.totalArea.configuration || ""} (${property.totalArea.sqft || "N/A"} sqft)`
                : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const Banner = ({ icon: Icon, title, subtitle, gradient, onClick }) => (
    <div style={{
      background: gradient,
      borderRadius: '16px',
      padding: '22px',
      color: '#FFFFFF',
      marginBottom: '24px',
      boxShadow: '0 6px 24px rgba(0, 51, 102, 0.12)',
      position: 'relative',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      fontSize: '20px'
    }} onClick={onClick}>
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '120px',
        height: '120px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '-30px',
        width: '100px',
        height: '100px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '50%'
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Icon size={36} style={{ marginBottom: '12px', opacity: 0.9 }} />
        <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', lineHeight: '1.3' }}>
          {title}
        </h3>
        <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.6' }}>
          {subtitle}
        </p>
      </div>
    </div>
  );

  return (
    <div>
      <TopNavigationBar navItems={navItems} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '30px',
            fontWeight: '800',
            color: '#003366',
            marginBottom: '6px',
            letterSpacing: '-0.3px'
          }}>
            Recommended Properties
          </h1>
          <p style={{ fontSize: '15px', color: '#4A6A8A' }}>
            Discover your perfect home from our curated selection
          </p>
        </div>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          {/* Left Column - Properties Grid */}
          <div style={{ flex: '1 1 700px', minWidth: 0 }}>
            <StaggerContainer style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {items.map((property) => (
                <StaggerItem key={property._id || property.id} whileHover={{ y: -6 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
                  <PropertyCard property={property} />
                </StaggerItem>
              ))}
            </StaggerContainer>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Prev */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                style={{
                  padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #E8EEF3',
                  backgroundColor: page === 1 ? '#F4F7F9' : '#fff', color: page === 1 ? '#9ca3af' : '#1f2937',
                  cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                Previous
              </button>

              {/* Page numbers */}
              {(() => {
                // Compute total pages for local mode; for remote, show a sliding window
                const pages = [];
                const total = (Array.isArray(locationQueryFields) && locationQueryFields.length > 0) || paginateActive
                  ? (hasMore ? page + 1 : page)
                  : localTotalPages;
                const start = Math.max(1, page - 2);
                const end = Math.min(total, page + 2);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    disabled={loading}
                    style={{
                      padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #E8EEF3',
                      backgroundColor: page === n ? '#00A79D' : '#fff', color: page === n ? '#fff' : '#1f2937',
                      fontWeight: page === n ? 800 : 600, cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    {n}
                  </button>
                ));
              })()}

              {/* Next */}
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={loading || (!hasMore && ((Array.isArray(locationQueryFields) && locationQueryFields.length > 0) || paginateActive)) || (!paginateActive && !(Array.isArray(locationQueryFields) && locationQueryFields.length > 0) && page >= localTotalPages)}
                style={{
                  padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #E8EEF3',
                  backgroundColor: '#fff', color: '#1f2937', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>

          {/* Right Column - Banners */}
          <div style={{ flex: '0 0 340px', minWidth: '300px' }}>
            <div style={{ position: 'sticky', top: '20px' }}>
              <Banner
                icon={TrendingUp}
                title="Post Property"
                subtitle="List your property with us instantly and reach thousands of potential buyers"
                gradient="linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)"
                onClick={() => navigate('/add-property')}
              />
            
              
              <Banner
                icon={Award}
                title="Premium Listings"
                subtitle="Get verified badge and priority placement for your properties"
                gradient="linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)"
              />
              
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 6px 24px rgba(0, 51, 102, 0.08)',
                border: '2px solid #F4F7F9'
              }}>
                <Shield size={36} color="#00A79D" style={{ marginBottom: '12px' }} />
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#003366',
                  marginBottom: '12px'
                }}>
                  Why Choose Us?
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  color: '#4A6A8A',
                  fontSize: '14px',
                  lineHeight: '2'
                }}>
                  <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', background: '#00A79D', borderRadius: '50%' }} />
                    Verified properties only
                  </li>
                  <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', background: '#00A79D', borderRadius: '50%' }} />
                    24/7 customer support
                  </li>
                  <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', background: '#00A79D', borderRadius: '50%' }} />
                    No hidden charges
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', background: '#00A79D', borderRadius: '50%' }} />
                    Expert guidance
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
       <footer style={{
        background: "linear-gradient(135deg, #003366 0%, #004b6b 100%)",
        color: "#FFFFFF",
        padding: "3rem 1.5rem",
        textAlign: "center",
        marginTop: "3rem"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h3 style={{ fontWeight: "800", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
            ggnHomes – Find Your Dream Home
          </h3>
          <p style={{ fontSize: "0.9rem", color: "#D1E7FF", marginBottom: "1.5rem", maxWidth: "700px", margin: "0 auto" }}>
            Explore thousands of verified listings, connect directly with owners, and make your next move with confidence.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            <a href="/" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}>Home</a>
            <a href="/about" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}>About</a>
            <a href="/support" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}>Contact</a>
            <a href="/add-property" style={{ color: "#FFFFFF", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}>Post Property</a>
          </div>
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: "1rem",
            fontSize: "0.8rem",
            color: "#B0C4DE"
          }}>
            © {new Date().getFullYear()} ggnHomes. All rights reserved.
          </div>
        </div>
      </footer>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SeeAllProperties;