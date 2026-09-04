import React, { useEffect, useState, useMemo, Suspense } from "react";
import { StaggerContainer, StaggerItem } from "../../components/motion";
import {useAuth} from "../../Context/AuthContext";
import { 
  MapPin, Bed, Bath, Home, SlidersHorizontal, Grid, List, X, 
  Calendar, Car, PawPrint, Package, Building, 
  Shield, Check, Award, Filter, MapIcon, Star, Heart, Search,
  ChevronLeft, ChevronRight, Bookmark, Eye, Share2, Zap,
  Maximize2, Minimize2, Navigation, Phone, Mail, User
} from "lucide-react";
import TopNavigationBar from "./TopNavigationBar";
import { useNavigate } from "react-router-dom";
import Footer from "./Footer.jsx";
const MapsIntegration = React.lazy(() => import("../Property View/mapsintegration.jsx"));

const DEFAULT_IMG = `${process.env.PUBLIC_URL || ''}/default-property.jpg`;

const SavedProperties = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedSector, setSelectedSector] = useState(null);
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("default");
  const [sector, setSector] = useState("all");
  const [propertyType, setPropertyType] = useState("all");
  const [bedrooms, setBedrooms] = useState("all");
  const [bathrooms, setBathrooms] = useState("all");
  const [areaRange, setAreaRange] = useState({ min: 0, max: Infinity });
  const [tempAreaRange, setTempAreaRange] = useState({ min: "", max: "" });
  const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity });
  const [tempPriceRange, setTempPriceRange] = useState({ min: "", max: "" });
  const [moveInDate, setMoveInDate] = useState("");
  const [parking, setParking] = useState("all");
  const [petPolicy, setPetPolicy] = useState("all");
  const [smokingPolicy, setSmokingPolicy] = useState("all");
  const [appliances, setAppliances] = useState([]);
  const [communityFeatures, setCommunityFeatures] = useState([]);
  const [condition, setCondition] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);
   const { user } = useAuth();
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueAppliances, setUniqueAppliances] = useState([]);
  const [uniqueCommunityFeatures, setUniqueCommunityFeatures] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const navigate = useNavigate();

  // Hybrid auth: get accessToken from localStorage (for fallback header auth)
  const userToken = localStorage.getItem("accessToken");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDefaultType = (p) => {
    const raw = (p.defaultpropertytype || p.defaultPropertyType || p.propertyCategory || (p.monthlyRent != null ? 'rental' : 'sale'));
    return String(raw || '').toLowerCase();
  };

  const goToDetails = (p) => {
    const type = getDefaultType(p);
    const id = p?._id;
    if (!id) return;
    navigate(type === 'sale' ? `/Saledetails/${id}` : `/Rentaldetails/${id}`);
  };

  const handleMapView = (property) => {
    setSelectedSector(property.Sector);
    setSelectedProperty(property);
    if (isMobile) {
      setShowMap(true);
    }
  };

  useEffect(() => {
    // wait for authenticated user
    if (!user) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchSavedProperties = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${process.env.REACT_APP_Base_API}/api/propertyAanalysis/savedProperties?page=${currentPage}&limit=${itemsPerPage}`,
          {
            method: 'GET',
            credentials: 'include',
            signal,
            headers: {
              ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
            },
          }
        );

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setError('Not authorized. Please login.');
            setProperties([]);
            setFilteredProperties([]);
            setLoading(false);
            return;
          }
          throw new Error(`Fetch failed ${res.status}`);
        }

        const data = await res.json();
        const props = data?.properties || [];

        setProperties(props);
        // filteredProperties will be derived by memoized filters below

        const sectors = [...new Set(props.map(p => p.Sector).filter(Boolean))];
        setUniqueSectors(sectors);

        const allAppliances = props.flatMap(p => p.appliances || []);
        setUniqueAppliances([...new Set(allAppliances)]);

        const allFeatures = props.flatMap(p => p.communityFeatures || []);
        setUniqueCommunityFeatures([...new Set(allFeatures)]);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Error fetching saved properties:', err);
        setError('Failed to load saved properties');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedProperties();

    return () => {
      controller.abort();
    };
  }, [user, currentPage, itemsPerPage]);

  

  const navItems = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];

  
  // Memoized filtering & sorting (runs only when dependencies change)
  const filteredMemo = useMemo(() => {
    if (!properties || properties.length === 0) return [];

    let filtered = properties.slice();

    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(prop => (
        (prop.title || '').toLowerCase().includes(q) ||
        (prop.Sector || '').toLowerCase().includes(q) ||
        (prop.description || '').toLowerCase().includes(q)
      ));
    }

    if (sector !== 'all') filtered = filtered.filter(prop => prop.Sector === sector);
    if (propertyType !== 'all') filtered = filtered.filter(prop => (prop.propertyType || '').toLowerCase() === propertyType.toLowerCase());
    if (bedrooms !== 'all') filtered = filtered.filter(prop => prop.bedrooms === parseInt(bedrooms));
    if (bathrooms !== 'all') filtered = filtered.filter(prop => prop.bathrooms === parseInt(bathrooms));

    filtered = filtered.filter(prop => {
      const area = prop.totalArea?.sqft || 0;
      return area >= areaRange.min && area <= areaRange.max;
    });

    filtered = filtered.filter(prop => {
      const price = prop.price || prop.monthlyRent || 0;
      return price >= priceRange.min && price <= priceRange.max;
    });

    if (moveInDate) filtered = filtered.filter(prop => {
      if (!prop.moveInDate) return false;
      const propDate = new Date(prop.moveInDate);
      const filterDate = new Date(moveInDate);
      return propDate <= filterDate;
    });

    if (parking !== 'all') filtered = filtered.filter(prop => (prop.parking || '').toLowerCase().includes(parking.toLowerCase()));
    if (petPolicy !== 'all') filtered = filtered.filter(prop => (prop.petPolicy || '').toLowerCase().includes(petPolicy.toLowerCase()));
    if (smokingPolicy !== 'all') filtered = filtered.filter(prop => (prop.smokingPolicy || '').toLowerCase().includes(smokingPolicy.toLowerCase()));

    if (appliances.length > 0) filtered = filtered.filter(prop => (prop.appliances || []).every(app => appliances.includes(app)));
    if (communityFeatures.length > 0) filtered = filtered.filter(prop => (prop.communityFeatures || []).every(f => communityFeatures.includes(f)));
    if (condition !== 'all') filtered = filtered.filter(prop => (prop.conditionAge || '').toLowerCase().includes(condition.toLowerCase()));

    switch (sortBy) {
      case 'price-low': filtered.sort((a, b) => ((a.price || a.monthlyRent) || 0) - ((b.price || b.monthlyRent) || 0)); break;
      case 'price-high': filtered.sort((a, b) => ((b.price || b.monthlyRent) || 0) - ((a.price || a.monthlyRent) || 0)); break;
      case 'date-new': filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); break;
      case 'date-old': filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)); break;
      case 'title-az': filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'title-za': filtered.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
      case 'area-low': filtered.sort((a, b) => ((a.totalArea?.sqft) || 0) - ((b.totalArea?.sqft) || 0)); break;
      case 'area-high': filtered.sort((a, b) => ((b.totalArea?.sqft) || 0) - ((a.totalArea?.sqft) || 0)); break;
      default: break;
    }

    return filtered;
  }, [
    properties, searchQuery, sector, propertyType, bedrooms, bathrooms, areaRange.min, areaRange.max,
    priceRange.min, priceRange.max, moveInDate, parking, petPolicy, smokingPolicy, appliances,
    communityFeatures, condition, sortBy
  ]);

  // update filteredProperties whenever filteredMemo changes
  useEffect(() => {
    setFilteredProperties(filteredMemo);
    // If you want to reset to page 1 on filter change, uncomment:
    // setCurrentPage(1);
  }, [filteredMemo]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProperties = filteredProperties.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);

  const handleApplyPriceRange = () => { 
    setPriceRange({ 
      min: tempPriceRange.min ? Number(tempPriceRange.min) : 0, 
      max: tempPriceRange.max ? Number(tempPriceRange.max) : Infinity 
    }); 
  };

  const handleApplyAreaRange = () => { 
    setAreaRange({ 
      min: tempAreaRange.min ? Number(tempAreaRange.min) : 0, 
      max: tempAreaRange.max ? Number(tempAreaRange.max) : Infinity 
    }); 
  };

  const handleResetFilters = () => { 
    setSortBy("default"); 
    setSector("all"); 
    setPropertyType("all"); 
    setBedrooms("all"); 
    setBathrooms("all"); 
    setAreaRange({ min: 0, max: Infinity }); 
    setTempAreaRange({ min: "", max: "" }); 
    setPriceRange({ min: 0, max: Infinity }); 
    setTempPriceRange({ min: "", max: "" }); 
    setMoveInDate(""); 
    setParking("all"); 
    setPetPolicy("all"); 
    setSmokingPolicy("all"); 
    setAppliances([]); 
    setCommunityFeatures([]); 
    setCondition("all");
    setSearchQuery("");
  };

  const toggleArrayFilter = (array, setArray, value) => { 
    if (array.includes(value)) { 
      setArray(array.filter(item => item !== value)); 
    } else { 
      setArray([...array, value]); 
    } 
  };

if (loading) {
  return (
    <div className="saved-properties-loading">
      <div className="loader-wrapper">
        <div className="spinner"></div>
        <p>Loading your saved properties...</p>
      </div>
    </div>
  );
}

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">🏠</div>
          <h3>Unable to Load Properties</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-properties-app">
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 999 }}>
          <TopNavigationBar  navItems={navItems} />
        </div>
      
      <div className="app-container">
        {/* Header Section */}
        <div className="app-header">
          <div className="header-main">
            <div className="header-text">
              <h1>Saved Properties</h1>
              <p>Your curated collection of favorite properties</p>
            </div>
            <div className="header-actions">
              <div className="stats-badge">
                <span className="count">{filteredProperties.length}</span>
                <span className="label">Properties</span>
              </div>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="controls-bar">
            <div className="search-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by title, location, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="controls-group">
              <div className="view-toggles">
                <button 
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid size={18} />
                </button>
                <button 
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <List size={18} />
                </button>
              </div>

              <button 
                className={`filter-btn ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
                Filters
                {(sector !== "all" || propertyType !== "all" || bedrooms !== "all") && (
                  <span className="filter-dot"></span>
                )}
              </button>

              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="default">Sort by</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="date-new">Newest First</option>
                <option value="area-high">Largest Area</option>
              </select>

              {!isMobile && (
                <button 
                  className={`map-toggle ${mapExpanded ? 'expanded' : ''}`}
                  onClick={() => setMapExpanded(!mapExpanded)}
                >
                  {mapExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  {mapExpanded ? 'Minimize Map' : 'Expand Map'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="filters-sidebar">
              <div className="sidebar-header">
                <h3>Filters</h3>
                <button onClick={() => setShowFilters(false)} className="close-btn">
                  <X size={20} />
                </button>
              </div>

              <div className="filters-content">
                <div className="filter-section">
                  <label>Location</label>
                  <select value={sector} onChange={(e) => setSector(e.target.value)}>
                    <option value="all">All Sectors</option>
                    {uniqueSectors.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-section">
                  <label>Property Type</label>
                  <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    <option value="all">All Types</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                  </select>
                </div>

                <div className="filter-row">
                  <div className="filter-section">
                    <label>Bedrooms</label>
                    <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
                      <option value="all">Any</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4+</option>
                    </select>
                  </div>
                  <div className="filter-section">
                    <label>Bathrooms</label>
                    <select value={bathrooms} onChange={(e) => setBathrooms(e.target.value)}>
                      <option value="all">Any</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3+</option>
                    </select>
                  </div>
                </div>

                <div className="filter-section">
                  <label>Price Range (₹)</label>
                  <div className="range-inputs">
                    <input
                      type="number"
                      placeholder="Min"
                      value={tempPriceRange.min}
                      onChange={(e) => setTempPriceRange({...tempPriceRange, min: e.target.value})}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={tempPriceRange.max}
                      onChange={(e) => setTempPriceRange({...tempPriceRange, max: e.target.value})}
                    />
                  </div>
                  <button onClick={handleApplyPriceRange} className="apply-range-btn">
                    Apply Price
                  </button>
                </div>

                <div className="filter-actions">
                  <button onClick={handleResetFilters} className="reset-btn">
                    Reset All
                  </button>
                  <button onClick={() => setShowFilters(false)} className="apply-btn">
                    Show Results
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Properties Grid */}
          <div className={`properties-section ${showFilters ? 'with-filters' : ''} ${mapExpanded ? 'map-expanded' : ''}`}>
            <div className="properties-container">
              {currentProperties.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Bookmark size={64} />
                  </div>
                  <h3>No properties found</h3>
                  <p>Try adjusting your filters or search terms</p>
                  <button onClick={handleResetFilters} className="reset-filters-btn">
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <StaggerContainer className={`properties-grid ${viewMode}`}>
                  {currentProperties.map((property) => (
                    <StaggerItem key={property._id} whileHover={{ y: -6 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                      <PropertyCard
                        property={property}
                        viewMode={viewMode}
                        onViewDetails={goToDetails}
                        onViewMap={handleMapView}
                        isSelected={selectedProperty?._id === property._id}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="page-btn prev"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  
                  <div className="page-numbers">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="page-btn next"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Map Section */}
            {!isMobile && (
              <div className={`map-section ${mapExpanded ? 'expanded' : ''}`}>
                <div className="map-header">
                  <div className="map-title">
                    <h3>Property Locations</h3>
                    <p>View your saved properties on the map</p>
                  </div>
                  <div className="map-controls">
                    <button 
                      className="map-expand-btn"
                      onClick={() => setMapExpanded(!mapExpanded)}
                    >
                      {mapExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                  </div>
                </div>

                <div className="map-container">
                  {selectedSector ? (
                    <div className="map-wrapper">
                      <Suspense fallback={<div style={{height: 300}}>Loading map...</div>}>
                        <MapsIntegration key={selectedSector} sector={selectedSector} type="property" />
                      </Suspense>
                      {selectedProperty && (
                        <div className="map-property-info">
                                                    <div className="property-image">
                            <img
                              src={(selectedProperty && selectedProperty.images && selectedProperty.images[0]) || DEFAULT_IMG}
                              alt={selectedProperty?.title || 'Property'}
                              loading="lazy"
                              decoding="async"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                try {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = DEFAULT_IMG;
                                } catch (err) {
                                  // ignore
                                }
                              }}
                            />
                          </div>
                          <div className="property-details">
                            <h4>{selectedProperty.title || "Untitled Property"}</h4>
                            <p className="location">
                              <MapPin size={14} />
                              {selectedProperty.Sector}
                            </p>
                            <p className="price">
                              ₹{((selectedProperty.price || selectedProperty.monthlyRent) || 0).toLocaleString()}
                              {getDefaultType(selectedProperty) === "rental" && "/mo"}
                            </p>
                            <button 
                              className="view-details-btn"
                              onClick={() => goToDetails(selectedProperty)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="map-placeholder">
                      <MapIcon size={48} />
                      <p>Select a property to view its location</p>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="map-stats">
                  <div className="stat-item">
                    <span className="stat-value">{filteredProperties.length}</span>
                    <span className="stat-label">Properties</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {[...new Set(filteredProperties.map(p => p.Sector))].length}
                    </span>
                    <span className="stat-label">Locations</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {[...new Set(filteredProperties.map(p => getDefaultType(p)))].length}
                    </span>
                    <span className="stat-label">Types</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Map Modal */}
      {isMobile && showMap && (
        <div className="mobile-map-modal">
          <div className="modal-header">
            <h3>Property Map</h3>
            <button onClick={() => setShowMap(false)} className="close-btn">
              <X size={24} />
            </button>
          </div>
          <div className="modal-content">
            {selectedSector ? (
              <div className="mobile-map-container">
                                      <Suspense fallback={<div style={{height: 300}}>Loading map...</div>}>
                        <MapsIntegration key={selectedSector} sector={selectedSector} type="property" />
                      </Suspense>
                {selectedProperty && (
                  <div className="mobile-property-info">
                    <h4>{selectedProperty.title}</h4>
                    <p>{selectedProperty.Sector}</p>
                    <button 
                      className="view-details-btn"
                      onClick={() => goToDetails(selectedProperty)}
                    >
                      View Details
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="map-placeholder">
                <MapIcon size={48} />
                <p>Select a property to view on map</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer isMobile={isMobile} user={user} />

      <style jsx>{`
        /* Enhanced Loading State */
        .saved-properties-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }

        .loader-wrapper {
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 5px solid #cbd6e2;
          border-top-color: #003366;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .saved-properties-loading p {
          color: #4A6A8A;
          font-size: 16px;
          font-weight: 500;
        }
        .saved-properties-app {
          min-height: 100vh;
          background: #F4F7F9;
          margin-top: 80px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .app-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Header Styles */
        .app-header {
          background: #FFFFFF;
          border-radius: 16px;
          margin: 24px 0;
          padding: 32px;
          box-shadow: 0 2px 12px rgba(0, 51, 102, 0.04);
          border: 1px solid rgba(0, 51, 102, 0.06);
        }

        .header-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-text h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 700;
          color: #003366;
          line-height: 1.2;
        }

        .header-text p {
          margin: 0;
          color: #4A6A8A;
          font-size: 16px;
          font-weight: 400;
        }

        .stats-badge {
          background: #003366;
          color: #FFFFFF;
          padding: 12px 20px;
          border-radius: 12px;
          text-align: center;
          min-width: 100px;
        }

        .stats-badge .count {
          display: block;
          font-size: 24px;
          font-weight: 700;
          line-height: 1;
        }

        .stats-badge .label {
          font-size: 12px;
          opacity: 0.9;
          font-weight: 500;
        }

        /* Controls Bar */
        .controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .search-wrapper {
          display: flex;
          align-items: center;
          background: #F4F7F9;
          border: 1px solid rgba(0, 51, 102, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          flex: 1;
          min-width: 300px;
          transition: all 0.2s ease;
        }

        .search-wrapper:focus-within {
          border-color: #00A79D;
          box-shadow: 0 0 0 3px rgba(0, 167, 157, 0.1);
        }

        .search-icon {
          color: #4A6A8A;
          margin-right: 12px;
        }

        .search-input {
          background: none;
          border: none;
          color: #333333;
          flex: 1;
          font-size: 15px;
          font-weight: 400;
        }

        .search-input::placeholder {
          color: #4A6A8A;
        }

        .search-input:focus {
          outline: none;
        }

        .controls-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .view-toggles {
          display: flex;
          background: #F4F7F9;
          border-radius: 10px;
          padding: 4px;
          border: 1px solid rgba(0, 51, 102, 0.1);
        }

        .view-btn {
          background: none;
          border: none;
          color: #4A6A8A;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-btn.active {
          background: #FFFFFF;
          color: #003366;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          border: 1px solid rgba(0, 51, 102, 0.1);
          color: #003366;
          padding: 10px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
          position: relative;
        }

        .filter-btn:hover, .filter-btn.active {
          background: #003366;
          color: #FFFFFF;
        }

        .filter-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: #00A79D;
          border-radius: 50%;
        }

        .sort-select, .map-toggle {
          background: #FFFFFF;
          border: 1px solid rgba(0, 51, 102, 0.1);
          color: #003366;
          padding: 10px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sort-select:hover, .map-toggle:hover {
          border-color: #00A79D;
        }

        .map-toggle.expanded {
          background: #003366;
          color: #FFFFFF;
        }

        /* Main Content */
        .main-content {
          display: flex;
          gap: 24px;
          margin-bottom: 40px;
        }

        /* Filters Sidebar */
        .filters-sidebar {
          width: 320px;
          background: #FFFFFF;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0, 51, 102, 0.04);
          border: 1px solid rgba(0, 51, 102, 0.06);
          height: fit-content;
          position: sticky;
          top: 104px;
        }

        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(0, 51, 102, 0.06);
        }

        .sidebar-header h3 {
          margin: 0;
          color: #003366;
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: #F4F7F9;
          border: none;
          color: #4A6A8A;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #003366;
          color: #FFFFFF;
        }

        .filters-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .filter-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-section label {
          color: #003366;
          font-weight: 500;
          font-size: 14px;
        }

        .filter-section select, .filter-section input {
          padding: 12px;
          border: 1px solid rgba(0, 51, 102, 0.1);
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s ease;
          background: #FFFFFF;
        }

        .filter-section select:focus, .filter-section input:focus {
          outline: none;
          border-color: #00A79D;
        }

        .filter-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .range-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .range-inputs input {
          flex: 1;
        }

        .range-inputs span {
          color: #4A6A8A;
          font-size: 14px;
        }

        .apply-range-btn {
          width: 100%;
          padding: 12px;
          background: #00A79D;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .apply-range-btn:hover {
          background: #00857a;
          transform: translateY(-1px);
        }

        .filter-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 8px;
        }

        .reset-btn {
          padding: 12px;
          background: #FFFFFF;
          color: #003366;
          border: 1px solid rgba(0, 51, 102, 0.2);
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reset-btn:hover {
          background: #003366;
          color: #FFFFFF;
        }

        .apply-btn {
          padding: 12px;
          background: #003366;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .apply-btn:hover {
          background: #002244;
          transform: translateY(-1px);
        }

        /* Properties Section */
        .properties-section {
          flex: 1;
          display: flex;
          gap: 24px;
        }

        .properties-section.map-expanded .properties-container {
          flex: 0 0 400px;
        }

        .properties-section.map-expanded .map-section {
          flex: 1;
        }

        .properties-container {
          flex: 1;
          background: #FFFFFF;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0, 51, 102, 0.04);
          border: 1px solid rgba(0, 51, 102, 0.06);
        }

        /* Properties Grid */
        .properties-grid.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .properties-grid.list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Property Card */
        .property-card {
          background: #FFFFFF;
          border: 1px solid rgba(0, 51, 102, 0.08);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
        }

        .property-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 51, 102, 0.12);
          border-color: rgba(0, 167, 157, 0.2);
        }

        .property-card.selected {
          border-color: #00A79D;
          box-shadow: 0 0 0 2px rgba(0, 167, 157, 0.2);
        }

        .property-image {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .property-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .property-card:hover .property-image img {
          transform: scale(1.05);
        }

        .property-badges {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          justify-content: space-between;
        }

        .type-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .type-badge.rental { 
          background: linear-gradient(135deg, #00A79D, #22D3EE);
        }
        .type-badge.sale { 
          background: linear-gradient(135deg, #003366, #4A6A8A);
        }

        .sector-badge {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .property-content {
          padding: 20px;
        }

        .property-title {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #003366;
          line-height: 1.3;
        }

        .property-location {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #4A6A8A;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .property-features {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: #F4F7F9;
          border-radius: 6px;
          font-size: 12px;
          color: #333333;
          font-weight: 500;
        }

        .property-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid rgba(0, 51, 102, 0.08);
        }

        .price-section .price-label {
          display: block;
          color: #4A6A8A;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .price-amount {
          color: #00A79D;
          font-size: 20px;
          font-weight: 700;
        }

        .price-suffix {
          font-size: 14px;
          font-weight: 500;
          color: #4A6A8A;
        }

        .map-btn {
          background: #003366;
          color: #FFFFFF;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }

        .map-btn:hover {
          background: #002244;
          transform: translateY(-1px);
        }

        /* List View */
        .properties-grid.list .property-card {
          display: flex;
        }

        .properties-grid.list .property-image {
          width: 240px;
          height: 160px;
          flex-shrink: 0;
        }

        .properties-grid.list .property-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .properties-grid.list .property-footer {
          margin-top: auto;
        }

        /* Map Section */
        .map-section {
          flex: 0 0 400px;
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0, 51, 102, 0.04);
          border: 1px solid rgba(0, 51, 102, 0.06);
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
        }

        .map-section.expanded {
          flex: 1;
        }

        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(0, 51, 102, 0.06);
        }

        .map-title h3 {
          margin: 0 0 4px 0;
          color: #003366;
          font-size: 18px;
          font-weight: 600;
        }

        .map-title p {
          margin: 0;
          color: #4A6A8A;
          font-size: 14px;
        }

        .map-expand-btn {
          background: #F4F7F9;
          border: none;
          color: #4A6A8A;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .map-expand-btn:hover {
          background: #003366;
          color: #FFFFFF;
        }

        .map-container {
          flex: 1;
          min-height: 400px;
          position: relative;
        }

        .map-wrapper {
          height: 100%;
          position: relative;
        }

        .map-property-info {
          position: absolute;
          bottom: 16px;
          left: 16px;
          right: 16px;
          background: #FFFFFF;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .map-property-info .property-image {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .map-property-info .property-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .map-property-info .property-details {
          flex: 1;
        }

        .map-property-info h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: #003366;
        }

        .map-property-info .location {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #4A6A8A;
          font-size: 12px;
          margin: 0 0 4px 0;
        }

        .map-property-info .price {
          color: #00A79D;
          font-weight: 700;
          font-size: 16px;
          margin: 0 0 8px 0;
        }

        .view-details-btn {
          background: #003366;
          color: #FFFFFF;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-details-btn:hover {
          background: #002244;
        }

        .map-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #4A6A8A;
          text-align: center;
          padding: 40px;
        }

        .map-placeholder p {
          margin: 16px 0 0 0;
          font-size: 14px;
        }

        .map-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(0, 51, 102, 0.06);
          margin: 16px;
          border-radius: 8px;
          overflow: hidden;
        }

        .stat-item {
          background: #FFFFFF;
          padding: 16px;
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: #003366;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #4A6A8A;
          font-weight: 500;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 40px;
          color: #4A6A8A;
        }

        .empty-icon {
          margin-bottom: 20px;
          color: #4A6A8A;
          opacity: 0.6;
        }

        .empty-state h3 {
          margin: 0 0 12px 0;
          color: #003366;
          font-size: 20px;
          font-weight: 600;
        }

        .empty-state p {
          margin: 0 0 24px 0;
          font-size: 15px;
          line-height: 1.5;
        }

        .reset-filters-btn {
          background: #00A79D;
          color: #FFFFFF;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reset-filters-btn:hover {
          background: #00857a;
          transform: translateY(-1px);
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(0, 51, 102, 0.08);
        }

        .page-btn {
          padding: 10px 16px;
          background: #FFFFFF;
          border: 1px solid rgba(0, 51, 102, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          color: #003366;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .page-btn:hover:not(:disabled) {
          border-color: #00A79D;
          color: #00A79D;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-btn.active {
          background: #003366;
          border-color: #003366;
          color: #FFFFFF;
        }

        .page-numbers {
          display: flex;
          gap: 4px;
        }

        /* Mobile Map Modal */
        .mobile-map-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #FFFFFF;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 51, 102, 0.08);
          background: #003366;
          color: #FFFFFF;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .modal-content {
          flex: 1;
        }

        .mobile-map-container {
          height: 100%;
          position: relative;
        }

        .mobile-property-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #FFFFFF;
          padding: 16px;
          border-top: 1px solid rgba(0, 51, 102, 0.08);
        }

        .mobile-property-info h4 {
          margin: 0 0 4px 0;
          color: #003366;
          font-size: 16px;
          font-weight: 600;
        }

        .mobile-property-info p {
          margin: 0 0 12px 0;
          color: #4A6A8A;
          font-size: 14px;
        }

        /* Loading States */
        .loading-container {
          padding: 40px 20px;
        }

        .skeleton-loader {
          max-width: 1200px;
          margin: 0 auto;
        }

        .skeleton-header {
          height: 120px;
          background: #F4F7F9;
          border-radius: 12px;
          margin-bottom: 24px;
          animation: pulse 2s infinite;
        }

        .skeleton-content {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        .skeleton-card {
          height: 200px;
          background: #F4F7F9;
          border-radius: 12px;
          animation: pulse 2s infinite;
        }

        .error-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
          text-align: center;
        }

        .error-content {
          background: #FFFFFF;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 51, 102, 0.08);
          max-width: 400px;
          border: 1px solid rgba(0, 51, 102, 0.06);
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .error-content h3 {
          margin: 0 0 12px 0;
          color: #003366;
          font-size: 20px;
          font-weight: 600;
        }

        .error-content p {
          margin: 0 0 24px 0;
          color: #4A6A8A;
          line-height: 1.5;
        }

        .retry-btn {
          background: #00A79D;
          color: #FFFFFF;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-btn:hover {
          background: #00857a;
          transform: translateY(-1px);
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .properties-section {
            flex-direction: column;
          }
          
          .map-section {
            flex: none;
            height: 400px;
          }
        }

        @media (max-width: 768px) {
          .app-container {
            padding: 0 16px;
          }

          .app-header {
            padding: 24px 20px;
            margin: 16px 0;
          }

          .header-main {
            flex-direction: column;
            gap: 16px;
          }

          .header-text h1 {
            font-size: 24px;
          }

          .controls-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-wrapper {
            min-width: auto;
          }

          .controls-group {
            justify-content: space-between;
          }

          .main-content {
            flex-direction: column;
          }

          .filters-sidebar {
            width: 100%;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1001;
            border-radius: 0;
            overflow-y: auto;
          }

          .properties-container {
            padding: 20px;
          }

          .properties-grid.grid {
            grid-template-columns: 1fr;
          }

          .properties-grid.list .property-card {
            flex-direction: column;
          }

          .properties-grid.list .property-image {
            width: 100%;
            height: 200px;
          }

          .pagination {
            flex-direction: column;
            gap: 12px;
          }

          .page-numbers {
            order: -1;
          }
        }
      `}</style>
    </div>
  );
};

// Property Card Component
const PropertyCard = ({ property, viewMode, onViewDetails, onViewMap, isSelected }) => {
  const propertyType = property.defaultpropertytype === "rental" ? "rental" : "sale";
  
  return (
    <div 
      className={`property-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onViewDetails(property)}
    >
      <div className="property-image">
                <img
          src={property.images?.[0] || DEFAULT_IMG}
          alt={property.title || 'Property'}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = DEFAULT_IMG;
          }}
        />
        <div className="property-badges">
          <div className={`type-badge ${propertyType}`}>
            {propertyType === "rental" ? "For Rent" : "For Sale"}
          </div>
          {property.Sector && (
            <div className="sector-badge">
              {property.Sector}
            </div>
          )}
        </div>
      </div>
      
      <div className="property-content">
        <h3 className="property-title">
          {property.title || "Untitled Property"}
        </h3>
        
        <div className="property-location">
          <MapPin size={16} />
          <span>{property.Sector || "Location not specified"}</span>
        </div>
        
        <div className="property-features">
          {property.bedrooms && (
            <div className="feature">
              <Bed size={14} />
              <span>{property.bedrooms} Bed</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="feature">
              <Bath size={14} />
              <span>{property.bathrooms} Bath</span>
            </div>
          )}
          {property.totalArea?.sqft && (
            <div className="feature">
              <Home size={14} />
              <span>{property.totalArea.sqft} sqft</span>
            </div>
          )}
        </div>
        
        <div className="property-footer">
          <div className="price-section">
            <span className="price-label">
              {propertyType === "rental" ? "Monthly Rent" : "Price"}
            </span>
            <span className="price-amount">
              ₹{((property.price || property.monthlyRent) || 0).toLocaleString()}
              {propertyType === "rental" && <span className="price-suffix">/mo</span>}
            </span>
          </div>
          <button 
            className="map-btn"
            onClick={(e) => {
              e.stopPropagation();
              onViewMap(property);
            }}
          >
            <MapIcon size={14} />
            Map
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavedProperties;