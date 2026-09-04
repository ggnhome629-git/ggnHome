import { useState, useEffect } from 'react';
import TopNavigationBar from '../Dashboard/TopNavigationBar';
import { useNavigate } from 'react-router-dom';

const PropertyListingPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchSector, setSearchSector] = useState('');
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [expandedSectors, setExpandedSectors] = useState({});
  const [sortBy, setSortBy] = useState('newest');
  const [filterType, setFilterType] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
    const [stats, setStats] = useState({ total: 0, rental: 0, sale: 0, sectors: 0 });
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
  const PROPERTIES_PER_PAGE = 50;

  useEffect(() => {
    fetchAllProperties();
  }, [currentPage]);

  useEffect(() => {
    filterAndGroupProperties();
    calculateStats();
  }, [properties, searchSector, sortBy, filterType, priceRange]);

    const handleLogout = async () => {
    await fetch(process.env.REACT_APP_LOGOUT_API, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    navigate("/login");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(process.env.REACT_APP_USER_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const fetchAllProperties = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_Base_API}/api/properties?page=${currentPage}&limit=${PROPERTIES_PER_PAGE}`,
        { 
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }
      
      const data = await response.json();
      setProperties(data.properties || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const rental = filteredProperties.filter(p => p.defaultpropertytype === 'rental').length;
    const sale = filteredProperties.filter(p => p.defaultpropertytype === 'sale').length;
    const sectors = new Set(filteredProperties.map(p => p.Sector)).size;
    setStats({ total: filteredProperties.length, rental, sale, sectors });
  };

  const filterAndGroupProperties = () => {
    let filtered = properties;
    
    if (searchSector.trim()) {
      filtered = filtered.filter(prop => 
        prop.Sector?.toLowerCase().includes(searchSector.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(prop => prop.defaultpropertytype === filterType);
    }

    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(prop => {
        const price = prop.monthlyRent || 0;
        const min = priceRange.min ? parseInt(priceRange.min) : 0;
        const max = priceRange.max ? parseInt(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }

    if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.monthlyRent || 0) - (b.monthlyRent || 0));
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.monthlyRent || 0) - (a.monthlyRent || 0));
    } else if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'sector') {
      filtered.sort((a, b) => (a.Sector || '').localeCompare(b.Sector || ''));
    }
    
    setFilteredProperties(filtered);
  };

  const groupBySector = () => {
    const grouped = {};
    filteredProperties.forEach(prop => {
      const sector = prop.Sector || 'Unknown Sector';
      if (!grouped[sector]) {
        grouped[sector] = [];
      }
      grouped[sector].push(prop);
    });
    return grouped;
  };

  const toggleSector = (sector) => {
    setExpandedSectors(prev => ({
      ...prev,
      [sector]: !prev[sector]
    }));
  };

  const expandAll = () => {
    const allSectors = Object.keys(groupBySector());
    const expanded = {};
    allSectors.forEach(sector => expanded[sector] = true);
    setExpandedSectors(expanded);
  };

  const collapseAll = () => {
    setExpandedSectors({});
  };

  const clearFilters = () => {
    setSearchSector('');
    setFilterType('all');
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#F4F7F9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    hero: {
      background: 'linear-gradient(135deg, #003366 0%, #00A79D 100%)',
      padding: '60px 20px',
      color: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden'
    },
    heroPattern: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.1,
      backgroundImage: 'radial-gradient(circle, #FFFFFF 1px, transparent 1px)',
      backgroundSize: '30px 30px'
    },
    heroContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1
    },
    title: {
      fontSize: '48px',
      marginBottom: '10px',
      fontWeight: '800',
      textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
    },
    subtitle: {
      fontSize: '20px',
      marginBottom: '30px',
      opacity: 0.95
    },
    statsContainer: {
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap',
      marginTop: '30px'
    },
    statCard: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      padding: '20px 30px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.2)',
      minWidth: '150px'
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '5px'
    },
    statLabel: {
      fontSize: '14px',
      opacity: 0.9,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    controlsSection: {
      maxWidth: '1200px',
      margin: '-40px auto 40px',
      padding: '0 20px',
      position: 'relative',
      zIndex: 10
    },
    controlsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      padding: '30px',
      boxShadow: '0 10px 40px rgba(0,51,102,0.15)',
      border: '1px solid #E5E7EB'
    },
    searchRow: {
      display: 'flex',
      gap: '15px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    searchInputWrapper: {
      flex: '1',
      minWidth: '250px',
      position: 'relative'
    },
    searchIcon: {
      position: 'absolute',
      left: '15px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#4A6A8A',
      fontSize: '20px'
    },
    searchInput: {
      width: '100%',
      padding: '14px 14px 14px 45px',
      fontSize: '16px',
      border: '2px solid #E5E7EB',
      borderRadius: '10px',
      outline: 'none',
      backgroundColor: '#FFFFFF',
      color: '#333333',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box'
    },
    select: {
      padding: '14px 16px',
      fontSize: '16px',
      border: '2px solid #E5E7EB',
      borderRadius: '10px',
      outline: 'none',
      backgroundColor: '#FFFFFF',
      color: '#333333',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontWeight: '500'
    },
    filterButton: {
      padding: '14px 24px',
      backgroundColor: '#00A79D',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    secondaryButton: {
      padding: '14px 24px',
      backgroundColor: '#F4F7F9',
      color: '#003366',
      border: '2px solid #E5E7EB',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    filterPanel: {
      marginTop: '20px',
      padding: '20px',
      backgroundColor: '#F4F7F9',
      borderRadius: '12px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px'
    },
    filterPanelHidden: {
      display: 'none'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#003366',
      marginBottom: '5px'
    },
    input: {
      padding: '10px 12px',
      fontSize: '15px',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      outline: 'none',
      backgroundColor: '#FFFFFF',
      color: '#333333',
      transition: 'all 0.3s ease'
    },
    actionButtons: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      marginTop: '20px'
    },
    content: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px 40px'
    },
    viewToggle: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px'
    },
    viewButton: {
      padding: '10px 20px',
      backgroundColor: '#F4F7F9',
      color: '#333333',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    viewButtonActive: {
      backgroundColor: '#00A79D',
      color: '#FFFFFF',
      borderColor: '#00A79D'
    },
    sectorSection: {
      marginBottom: '20px',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,51,102,0.08)',
      border: '1px solid #E5E7EB',
      transition: 'all 0.3s ease'
    },
    sectorHeader: {
      padding: '20px 30px',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #F4F7F9 0%, #FFFFFF 100%)',
      transition: 'all 0.3s ease',
      borderBottom: '2px solid #E5E7EB'
    },
    sectorHeaderHover: {
      background: 'linear-gradient(135deg, #E8F4F8 0%, #F4F7F9 100%)'
    },
    sectorTitle: {
      fontSize: '22px',
      color: '#003366',
      margin: '0',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    sectorCount: {
      fontSize: '13px',
      color: '#003366',
      fontWeight: '600',
      backgroundColor: '#22D3EE',
      padding: '5px 14px',
      borderRadius: '20px'
    },
    chevron: {
      fontSize: '20px',
      color: '#00A79D',
      transition: 'transform 0.3s ease',
      fontWeight: 'bold'
    },
    chevronRotated: {
      transform: 'rotate(180deg)'
    },
    sectorContent: {
      padding: '30px',
      backgroundColor: '#FFFFFF',
      animation: 'slideDown 0.3s ease'
    },
    sectorContentCollapsed: {
      display: 'none'
    },
    propertyGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '24px'
    },
    propertyList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    propertyCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #E5E7EB',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
    propertyCardList: {
      display: 'flex',
      flexDirection: 'row',
      height: '200px'
    },
    imageContainer: {
      width: '100%',
      height: '200px',
      overflow: 'hidden',
      backgroundColor: '#4A6A8A',
      position: 'relative'
    },
    imageContainerList: {
      width: '300px',
      height: '200px',
      flexShrink: 0
    },
    propertyImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transition: 'transform 0.3s ease'
    },
    badge: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      backgroundColor: '#22D3EE',
      color: '#003366',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    },
    propertyInfo: {
      padding: '20px',
      flex: 1
    },
    propertyAddress: {
      fontSize: '16px',
      color: '#333333',
      marginBottom: '12px',
      fontWeight: '600',
      minHeight: '48px',
      lineHeight: '1.5'
    },
    propertySector: {
      fontSize: '14px',
      color: '#00A79D',
      marginBottom: '8px',
      fontWeight: '500'
    },
    propertyPrice: {
      fontSize: '24px',
      color: '#003366',
      fontWeight: '700',
      marginBottom: '8px'
    },
    propertyDate: {
      fontSize: '14px',
      color: '#4A6A8A',
      marginBottom: '16px'
    },
    viewButton: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#00A79D',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      marginTop: '50px',
      padding: '20px',
      flexWrap: 'wrap'
    },
    pageButton: {
      padding: '12px 20px',
      backgroundColor: '#FFFFFF',
      color: '#003366',
      border: '2px solid #4A6A8A',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    pageButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    pageInfo: {
      fontSize: '16px',
      color: '#4A6A8A',
      fontWeight: '500'
    },
    loading: {
      textAlign: 'center',
      padding: '60px 20px',
      fontSize: '20px',
      color: '#4A6A8A'
    },
    noResults: {
      textAlign: 'center',
      padding: '60px 20px',
      fontSize: '18px',
      color: '#4A6A8A',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={{fontSize: '48px', marginBottom: '20px'}}>🏠</div>
          Loading properties...
        </div>
      </div>
    );
  }

  const groupedProperties = groupBySector();

  return (
      <div style={styles.container}>
             {/* Top Navigation Bar */}
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    zIndex: 999,
                    backgroundColor: "#FFFFFF" // or match your navbar background
                  }}
                >
                  <TopNavigationBar
                    user={user}
                    handleLogout={handleLogout}
                    navItems={navItems}
                  />
                </div>
      <div style={styles.hero}>
        <div style={styles.heroPattern}></div>
        <div style={styles.heroContent}>
          <h1 style={styles.title}>Discover Your Perfect Property</h1>
          <p style={styles.subtitle}>Browse through our curated collection of premium properties</p>
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stats.total}</div>
              <div style={styles.statLabel}>Total Properties</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stats.rental}</div>
              <div style={styles.statLabel}>For Rent</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stats.sale}</div>
              <div style={styles.statLabel}>For Sale</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{stats.sectors}</div>
              <div style={styles.statLabel}>Sectors</div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.controlsSection}>
        <div style={styles.controlsCard}>
          <div style={styles.searchRow}>
            <div style={styles.searchInputWrapper}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search by sector..."
                value={searchSector}
                onChange={(e) => setSearchSector(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.select}
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="sector">Sort by Sector</option>
            </select>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Properties</option>
              <option value="rental">For Rent</option>
              <option value="sale">For Sale</option>
            </select>
            <button 
              style={styles.filterButton}
              onClick={() => setShowFilters(!showFilters)}
            >
              🎛️ {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>

          <div style={showFilters ? styles.filterPanel : styles.filterPanelHidden}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Min Price</label>
              <input
                type="number"
                placeholder="₹ 0"
                value={priceRange.min}
                onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Max Price</label>
              <input
                type="number"
                placeholder="₹ Any"
                value={priceRange.max}
                onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={{...styles.filterGroup, justifyContent: 'flex-end'}}>
              <button style={styles.secondaryButton} onClick={clearFilters}>
                Clear All Filters
              </button>
            </div>
          </div>

          <div style={styles.actionButtons}>
            <button style={styles.secondaryButton} onClick={expandAll}>
              📂 Expand All
            </button>
            <button style={styles.secondaryButton} onClick={collapseAll}>
              📁 Collapse All
            </button>
            <div style={{flex: 1}}></div>
            <div style={styles.viewToggle}>
              <button 
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'grid' ? styles.viewButtonActive : {})
                }}
                onClick={() => setViewMode('grid')}
              >
                ⊞ Grid
              </button>
              <button 
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'list' ? styles.viewButtonActive : {})
                }}
                onClick={() => setViewMode('list')}
              >
                ☰ List
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {Object.keys(groupedProperties).length === 0 ? (
          <div style={styles.noResults}>
            <div style={{fontSize: '64px', marginBottom: '20px'}}>🔍</div>
            No properties found
            {(searchSector || filterType !== 'all' || priceRange.min || priceRange.max) && 
              <div style={{marginTop: '10px'}}>Try adjusting your filters</div>
            }
          </div>
        ) : (
          Object.entries(groupedProperties).map(([sector, props]) => (
            <SectorDropdown 
              key={sector} 
              sector={sector} 
              properties={props}
              isExpanded={expandedSectors[sector]}
              onToggle={() => toggleSector(sector)}
              viewMode={viewMode}
              styles={styles}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{
              ...styles.pageButton,
              ...(currentPage === 1 ? styles.pageButtonDisabled : {})
            }}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <span style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            style={{
              ...styles.pageButton,
              ...(currentPage === totalPages ? styles.pageButtonDisabled : {})
            }}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

const SectorDropdown = ({ sector, properties, isExpanded, onToggle, viewMode, styles }) => {
  const [isHovered, setIsHovered] = useState(false);

  const headerStyle = {
    ...styles.sectorHeader,
    ...(isHovered ? styles.sectorHeaderHover : {})
  };

  const chevronStyle = {
    ...styles.chevron,
    ...(isExpanded ? styles.chevronRotated : {})
  };

  const contentStyle = {
    ...(viewMode === 'list' ? {...styles.sectorContent, ...styles.propertyList} : styles.sectorContent),
    ...(isExpanded ? {} : styles.sectorContentCollapsed)
  };

  return (
    <div style={styles.sectorSection}>
      <div 
        style={headerStyle}
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <h2 style={styles.sectorTitle}>
          <span>📍 Sector {sector}</span>
          <span style={styles.sectorCount}>
            {properties.length}
          </span>
        </h2>
        <div style={chevronStyle}>
          {isExpanded ? '▲' : '▼'}
        </div>
      </div>
      <div style={contentStyle}>
        <div style={viewMode === 'grid' ? styles.propertyGrid : styles.propertyList}>
          {properties.map((property) => (
            <PropertyCard 
              key={property._id} 
              property={property} 
              viewMode={viewMode}
              styles={styles} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const PropertyCard = ({ property, viewMode, styles }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);

  const formatPrice = (price) => {
    return price ? `₹${price.toLocaleString()}` : 'N/A';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewProperty = () => {
    const link = property.defaultpropertytype === 'rental' 
      ? `/Rentaldetails/${property._id}`
      : `/Saledetails/${property._id}`;
    window.location.href = link;
  };

  const cardStyle = {
    ...styles.propertyCard,
    ...(viewMode === 'list' ? styles.propertyCardList : {}),
    ...(isHovered ? {
      transform: viewMode === 'grid' ? 'translateY(-8px)' : 'translateX(8px)',
      boxShadow: '0 12px 24px rgba(0,167,157,0.15)',
      borderColor: '#00A79D'
    } : {})
  };

  const imageStyle = {
    ...styles.propertyImage,
    ...(isHovered ? { transform: 'scale(1.1)' } : {})
  };

  const buttonStyle = {
    ...styles.viewButton,
    ...(buttonHovered ? {
      backgroundColor: '#003366',
      transform: 'scale(1.02)'
    } : {})
  };

  const imageContainerStyle = {
    ...styles.imageContainer,
    ...(viewMode === 'list' ? styles.imageContainerList : {})
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={imageContainerStyle}>
        {property.images && property.images.length > 0 ? (
          <img
            src={property.images[0]}
            alt={property.address || 'Property'}
            style={imageStyle}
          />
        ) : (
          <div style={{
            ...styles.propertyImage,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            🏠 No Image Available
          </div>
        )}
        <span style={styles.badge}>
          {property.defaultpropertytype === 'rental' ? '🏠 For Rent' : '🏡 For Sale'}
        </span>
      </div>
      
      <div style={styles.propertyInfo}>
        <div style={styles.propertySector}>📍 Sector {property.Sector}</div>
        <div style={styles.propertyAddress}>
          {property.address || 'Address not provided'}
        </div>
        <div style={styles.propertySector}>
          Posted By: {property.ownerType || 'N/A'}
        </div>

        {property.ownerType === "Agent" && property.agent && (
          <div
            style={{
              marginTop: "8px",
              padding: "8px 10px",
              borderRadius: "8px",
              backgroundColor: "#F4F7F9",
              fontSize: "13px",
              color: "#003366"
            }}
          >
            <div>
              <strong>Agent:</strong> {property.agent.name || "N/A"}
            </div>

            {property.agent.mobileNumber && (
              <div>
                <strong>Mobile:</strong> {property.agent.mobileNumber}
              </div>
            )}

            {property.agent.email && (
              <div>
                <strong>Email:</strong> {property.agent.email}
              </div>
            )}
          </div>
        )}
        
        <div style={styles.propertyPrice}>
          {formatPrice(property.monthlyRent)}/month
        </div>
        <div style={styles.propertyDate}>
          📅 Move-in: {formatDate(property.moveInDate)}
              </div>
        {property.ownerType !== "Agent" && (
          <div style={{ fontSize: '14px', color: '#4A6A8A', marginBottom: '8px' }}>
            <strong>Contact:</strong>{' '}
            {property.ownernumber
              ? property.ownernumber
              : property.owner?.mobileNumber || property.owner?.mobile || 'N/A'}
          </div>
        )}
        <button
          style={buttonStyle}
          onClick={handleViewProperty}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
        >
          View Details →
        </button>
      </div>
    </div>
  );
};

export default PropertyListingPage;