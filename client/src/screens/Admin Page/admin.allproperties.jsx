import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Chip,
  Avatar,
  InputAdornment,
  Collapse,
  Alert,
  Stack,
  useMediaQuery,
  useTheme,
  Paper,
} from "@mui/material";
import { Search, List, ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import './admin.css';

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



  if (loading) {
    return (
      <Box className="admin-dashboard">
        <Box className="admin-container">
          <Box className="flex justify-center items-center" sx={{ minHeight: '60vh' }}>
            <Stack spacing={3}>
              <Box sx={{ fontSize: '48px' }}>🏠</Box>
              <Typography variant="h5" sx={{ color: 'text.secondary' }}>
                Loading properties...
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Box>
    );
  }

  const groupedProperties = groupBySector();

  return (
    <Box className="admin-dashboard">
      <Box className="admin-container">
        {/* Hero Section */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #003366 0%, #00A79D 100%)',
            p: { xs: 4, md: 6 },
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            mb: 4,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.08,
              backgroundImage: 'radial-gradient(circle, #FFFFFF 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
          <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1200, mx: 'auto' }}>
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: '28px', md: '42px' }, fontWeight: 800, mb: 2, textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}
            >
              Discover Your Perfect Property
            </Typography>
            <Typography
              sx={{ fontSize: { xs: '16px', md: '20px' }, opacity: 0.95, mb: 4 }}
            >
              Browse through our curated collection of premium properties
            </Typography>

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', p: 3, minWidth: 140 }}>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, mb: 0.5 }}>{stats.total}</Typography>
                <Typography sx={{ fontSize: '0.85rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Properties</Typography>
              </Card>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', p: 3, minWidth: 140 }}>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, mb: 0.5 }}>{stats.rental}</Typography>
                <Typography sx={{ fontSize: '0.85rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>For Rent</Typography>
              </Card>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', p: 3, minWidth: 140 }}>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, mb: 0.5 }}>{stats.sale}</Typography>
                <Typography sx={{ fontSize: '0.85rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>For Sale</Typography>
              </Card>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', p: 3, minWidth: 140 }}>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, mb: 0.5 }}>{stats.sectors}</Typography>
                <Typography sx={{ fontSize: '0.85rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sectors</Typography>
              </Card>
            </Box>
          </Box>
        </Box>

        {/* Controls Card */}
        <Card className="mb-5" sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
          <CardContent sx={{ p: 0 }}>
            {/* Search & Filters Row */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              <TextField
                fullWidth
                placeholder="Search by sector..."
                value={searchSector}
                onChange={(e) => setSearchSector(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} color="#4A6A8A" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: { xs: '100%', md: 250 } }}
              />
              <TextField
                select
                label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ minWidth: { xs: '100%', md: 180 } }}
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="sector">Sort by Sector</option>
              </TextField>
              <TextField
                select
                label="Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                SelectProps={{ native: true }}
                sx={{ minWidth: { xs: '100%', md: 150 } }}
              >
                <option value="all">All Properties</option>
                <option value="rental">For Rent</option>
                <option value="sale">For Sale</option>
              </TextField>
              <Button
                variant="contained"
                onClick={() => setShowFilters(!showFilters)}
                className="btn-gradient"
                startIcon={<Filter size={18} />}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </Box>

            {/* Filter Panel */}
            <Collapse in={showFilters}>
              <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Min Price"
                      type="number"
                      placeholder="₹ 0"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Price"
                      type="number"
                      placeholder="₹ Any"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="outlined" onClick={clearFilters} className="btn-outlined">
                      Clear All Filters
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 2 }}>
              <Button variant="outlined" onClick={expandAll} className="btn-outlined">
                Expand All
              </Button>
              <Button variant="outlined" onClick={collapseAll} className="btn-outlined">
                Collapse All
              </Button>
              <Box sx={{ flex: 1 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'btn btn-gradient' : 'btn btn-outlined'}
                  sx={{
                    bgcolor: viewMode === 'grid' ? 'teal.main' : 'action.hover',
                    color: viewMode === 'grid' ? 'white' : 'primary.main',
                    minWidth: 80,
                  }}
                >
                  Grid
                </Button>
                <Button
                  size="small"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'btn btn-gradient' : 'btn btn-outlined'}
                  sx={{
                    bgcolor: viewMode === 'list' ? 'teal.main' : 'action.hover',
                    color: viewMode === 'list' ? 'white' : 'primary.main',
                    minWidth: 80,
                  }}
                >
                  List
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Content */}
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 }, pb: 5 }}>
          {Object.keys(groupedProperties).length === 0 ? (
            <Box className="empty-state">
              <Box sx={{ fontSize: '64px', mb: 2, textAlign: 'center' }}>🔍</Box>
              <Typography variant="h5" sx={{ color: 'text.secondary', mb: 1 }}>
                No properties found
              </Typography>
              {(searchSector || filterType !== 'all' || priceRange.min || priceRange.max) && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Try adjusting your filters
                </Typography>
              )}
            </Box>
          ) : (
            Object.entries(groupedProperties).map(([sector, props]) => (
              <SectorDropdown
                key={sector}
                sector={sector}
                properties={props}
                isExpanded={expandedSectors[sector]}
                onToggle={() => toggleSector(sector)}
                viewMode={viewMode}
              />
            ))
          )}
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 5, flexWrap: 'wrap' }}>
            <Button
              size="small"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-outlined"
              sx={{
                minWidth: 80,
                bgcolor: currentPage === 1 ? 'action.hover' : 'primary.main',
                color: currentPage === 1 ? 'text.secondary' : 'white',
              }}
            >
              ← Previous
            </Button>
            <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary', minWidth: 100, textAlign: 'center' }}>
              Page {currentPage} of {totalPages}
            </Typography>
            <Button
              size="small"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-outlined"
              sx={{
                minWidth: 80,
                bgcolor: currentPage === totalPages ? 'action.hover' : 'primary.main',
                color: currentPage === totalPages ? 'text.secondary' : 'white',
              }}
            >
              Next →
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const SectorDropdown = ({ sector, properties, isExpanded, onToggle, viewMode }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card className="mb-4" sx={{ overflow: 'hidden', borderRadius: 2, boxShadow: '0 2px 12px rgba(0,51,102,0.08)', border: '1px solid #E5E7EB', transition: 'all 0.3s ease', '&:hover': { boxShadow: '0 4px 16px rgba(0,51,102,0.12)' } }}>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          cursor: 'pointer',
          bgcolor: isHovered ? 'action.hover' : 'background.paper',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #E5E7EB',
          transition: 'all 0.3s ease',
        }}
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '16px', sm: '20px' }, color: 'primary.main', fontWeight: 700 }}>
            📍 Sector {sector}
          </Typography>
          <Chip
            label={properties.length}
            size="small"
            sx={{
              bgcolor: 'rgba(34, 211, 238, 0.15)',
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
        </Box>
        <Box sx={{ color: 'teal.main', transition: 'transform 0.3s ease', fontWeight: 'bold', fontSize: '1.2rem' }}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Box>
      </Box>
      <Collapse in={isExpanded}>
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          {viewMode === 'grid' ? (
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {properties.map((property) => (
                <Grid item xs={12} sm={6} md={4} key={property._id}>
                  <PropertyCard property={property} viewMode="grid" />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {properties.map((property) => (
                <PropertyCard key={property._id} property={property} viewMode="list" />
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Card>
  );
};

const PropertyCard = ({ property, viewMode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);

  const formatPrice = (price) => price ? `₹${price.toLocaleString()}` : 'N/A';
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleViewProperty = () => {
    const link = property.defaultpropertytype === 'rental' ? `/Rentaldetails/${property._id}` : `/Saledetails/${property._id}`;
    window.location.href = link;
  };

  if (viewMode === 'list') {
    return (
      <Card className="card" sx={{ display: 'flex', overflow: 'hidden', borderRadius: 2, height: 'auto', mb: 2, '&:hover': { boxShadow: '0 8px 24px rgba(0,167,157,0.15)', borderColor: '#00A79D', transform: 'translateX(4px)' } }}>
        <Box sx={{ width: 300, minWidth: 300, height: 200, bgcolor: 'grey.300', overflow: 'hidden' }}>
          {property.images && property.images.length > 0 ? (
            <img src={property.images[0]} alt={property.address || 'Property'} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', transform: isHovered ? 'scale(1.1)' : 'scale(1)' }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
              🏠 No Image
            </Box>
          )}
          <Chip label={property.defaultpropertytype === 'rental' ? 'For Rent' : 'For Sale'} size="small" sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'cyan.main', color: 'primary.main', fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
        </Box>
        <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ color: 'teal.main', fontWeight: 500, fontSize: '0.85rem', mb: 0.5 }}>📍 Sector {property.Sector}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, minHeight: '48px', lineHeight: 1.5 }}>{property.address || 'Address not provided'}</Typography>
            <Typography sx={{ color: 'grey.600', fontSize: '0.8rem', mb: 0.5 }}>Posted By: {property.ownerType || 'N/A'}</Typography>
            {property.ownerType === "Agent" && property.agent && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1, fontSize: '0.75rem', color: 'primary.main' }}>
                <Typography><strong>Agent:</strong> {property.agent.name || "N/A"}</Typography>
                {property.agent.mobileNumber && <Typography><strong>Mobile:</strong> {property.agent.mobileNumber}</Typography>}
                {property.agent.email && <Typography><strong>Email:</strong> {property.agent.email}</Typography>}
              </Box>
            )}
            <Typography variant="h2" sx={{ color: 'primary.main', fontWeight: 700, mb: 0.5 }}>{formatPrice(property.monthlyRent)}/month</Typography>
            <Typography sx={{ color: 'grey.600', fontSize: '0.8rem' }}>📅 Move-in: {formatDate(property.moveInDate)}</Typography>
          </Box>
          {property.ownerType !== "Agent" && (
            <Typography sx={{ fontSize: '0.8rem', color: 'grey.600', mb: 1 }}>
              <strong>Contact:</strong> {property.ownernumber ? property.ownernumber : (property.owner?.mobileNumber || property.owner?.mobile || 'N/A')}
            </Typography>
          )}
          <Button
            fullWidth
            variant="contained"
            onClick={handleViewProperty}
            sx={{
              bgcolor: buttonHovered ? 'primary.main' : 'teal.main',
              transition: 'all 0.2s ease',
              transform: buttonHovered ? 'scale(1.02)' : 'scale(1)',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            View Details →
          </Button>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      className="card"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid #E5E7EB',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,167,157,0.15)',
          borderColor: '#00A79D',
        },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box sx={{ position: 'relative', height: 200, bgcolor: 'grey.300', overflow: 'hidden' }}>
        {property.images && property.images.length > 0 ? (
          <img
            src={property.images[0]}
            alt={property.address || 'Property'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
            🏠 No Image
          </Box>
        )}
        <Chip
          label={property.defaultpropertytype === 'rental' ? 'For Rent' : 'For Sale'}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'cyan.main',
            color: 'primary.main',
            fontWeight: 600,
            fontSize: '0.7rem',
            height: 22,
          }}
        />
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ color: 'teal.main', fontWeight: 500, fontSize: '0.85rem', mb: 0.5 }}>📍 Sector {property.Sector}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, minHeight: '48px', lineHeight: 1.5 }}>{property.address || 'Address not provided'}</Typography>
        <Typography sx={{ color: 'grey.600', fontSize: '0.8rem', mb: 0.5 }}>Posted By: {property.ownerType || 'N/A'}</Typography>
        {property.ownerType === "Agent" && property.agent && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1, fontSize: '0.75rem', color: 'primary.main' }}>
            <Typography><strong>Agent:</strong> {property.agent.name || "N/A"}</Typography>
            {property.agent.mobileNumber && <Typography><strong>Mobile:</strong> {property.agent.mobileNumber}</Typography>}
            {property.agent.email && <Typography><strong>Email:</strong> {property.agent.email}</Typography>}
          </Box>
        )}
        <Typography variant="h2" sx={{ color: 'primary.main', fontWeight: 700, mb: 0.5 }}>{formatPrice(property.monthlyRent)}/month</Typography>
        <Typography sx={{ color: 'grey.600', fontSize: '0.8rem', mb: 1 }}>📅 Move-in: {formatDate(property.moveInDate)}</Typography>
        {property.ownerType !== "Agent" && (
          <Typography sx={{ fontSize: '0.8rem', color: 'grey.600', mb: 1 }}>
            <strong>Contact:</strong> {property.ownernumber ? property.ownernumber : (property.owner?.mobileNumber || property.owner?.mobile || 'N/A')}
          </Typography>
        )}
        <Button
          fullWidth
          variant="contained"
          onClick={() => handleViewProperty()}
          sx={{
            bgcolor: buttonHovered ? 'primary.main' : 'teal.main',
            transition: 'all 0.2s ease',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
        >
          View Details →
        </Button>
      </Box>
    </Card>
  );
};

export default PropertyListingPage;