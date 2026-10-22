import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ExternalLink, ImageOff, Search } from 'lucide-react';
import { PostPropertyIcon } from '../../../components/ui/PostActionIcon';
import { useNavigate } from 'react-router-dom';

const GREEN = '#0f766e';

// The list API tells us if a property is for sale or rent; the public detail pages are split the same way.
const detailPath = (property) => (property.propertyType === 'rental' ? `/Rentaldetails/${property._id}` : `/Saledetails/${property._id}`);

// Sale prices the way people say them (lakh / crore), rent per month.
function priceText(property) {
  if (property.propertyType === 'rental') {
    return property.monthlyRent ? `₹${Number(property.monthlyRent).toLocaleString('en-IN')} / month` : 'Price on request';
  }
  const n = Number(property.price);
  if (!n) return 'Price on request';
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} Lakh`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function PropertyCard({ property, onOpen }) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        border: '1px solid #e7edf3',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(16,42,67,.025)',
        '&:hover': { borderColor: '#b7dcd6', boxShadow: '0 14px 28px rgba(16,42,67,.09)' },
      }}
      onClick={() => onOpen(property)}
    >
      <Box sx={{ position: 'relative', width: '100%', height: { xs: 190, sm: 210 }, bgcolor: '#eef2f6' }}>
        {property.images?.[0] ? (
          <Box component="img" src={property.images[0]} alt={property.title || 'Property photo'} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', color: '#94a3b8' }}><ImageOff size={36} /></Box>
        )}
        <Chip
          label={property.isActive ? 'Live · चालू' : 'Waiting · जाँच में'}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 700, bgcolor: property.isActive ? '#d1fae5' : '#fef3c7', color: property.isActive ? '#065f46' : '#92400e' }}
        />
        <Chip
          label={property.propertyType === 'rental' ? 'Rent · किराया' : 'Sale · बिक्री'}
          size="small"
          sx={{ position: 'absolute', top: 12, left: 12, fontWeight: 700, bgcolor: 'rgba(15,23,42,.78)', color: '#fff' }}
        />
      </Box>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#0f172a', lineHeight: 1.3 }}>{property.title || 'Property'}</Typography>
        <Typography sx={{ fontSize: 14, color: '#64748b' }}>{property.Sector || 'Location not added'}</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: 20, color: GREEN, mt: 0.5 }}>{priceText(property)}</Typography>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ExternalLink size={18} />}
          onClick={(e) => { e.stopPropagation(); onOpen(property); }}
          sx={{ mt: 'auto', minHeight: 48, fontSize: 15, fontWeight: 800, borderRadius: '12px', borderColor: '#b8dcd6', color: GREEN }}
        >
          Open property · प्रॉपर्टी खोलें
        </Button>
      </CardContent>
    </Card>
  );
}

const PartnerHubProperties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ type: 'all', status: 'all' });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const latestRequest = useRef(0);

  const fetchProperties = useCallback(async () => {
    const token = localStorage.getItem('partnerAccessToken');
    if (!token) {
      navigate('/partner/login');
      return;
    }
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: pagination.limit, type: filters.type, status: filters.status });
      const res = await fetch(`${process.env.REACT_APP_Base_API}/api/partner/properties?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.status === 401) {
        navigate('/partner/login');
        return;
      }
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      if (requestId !== latestRequest.current) return; // a newer request is already on its way
      setProperties(data.properties || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (err) {
      if (requestId === latestRequest.current) setError("We couldn't load your properties. Please check your internet and try again. / आपकी प्रॉपर्टी लोड नहीं हो पाईं, इंटरनेट जाँचकर फिर कोशिश करें।");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [filters.type, filters.status, pagination.page, pagination.limit, navigate]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Search works on the listings already loaded, so typing never waits for the server.
  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return properties;
    return properties.filter((p) => `${p.title || ''} ${p.Sector || ''}`.toLowerCase().includes(text));
  }, [properties, search]);

  const openProperty = (property) => navigate(detailPath(property));

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: '-.8px', color: '#102a43', mb: 0.5, fontSize: { xs: 26, md: 34 } }}>
            My Properties
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            All your listings in one place · आपकी सभी प्रॉपर्टी
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PostPropertyIcon size={20} />}
          onClick={() => navigate('/partner/properties/add')}
          sx={{ backgroundColor: GREEN, fontWeight: 800, textTransform: 'none', minHeight: 52, px: 2.5, boxShadow: 'none', width: { xs: '100%', sm: 'auto' }, '&:hover': { backgroundColor: '#115e59', boxShadow: 'none' } }}
        >
          Add Property · प्रॉपर्टी जोड़ें
        </Button>
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ mb: 3, p: { xs: 1.5, sm: 2 }, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'minmax(240px, 1.5fr) 1fr 1fr' }, gap: 1.5, border: '1px solid #e7edf3', borderRadius: '16px', bgcolor: '#fff' }}>
        <TextField
          placeholder="Search by name or sector"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ enterKeyHint: 'search', 'aria-label': 'Search properties' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} color="#9ca3af" /></InputAdornment> }}
          sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#f9fafb' } }}
        />
        <TextField select label="Type" value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#f9fafb' } }}>
          <MenuItem value="all">All Types</MenuItem>
          <MenuItem value="sale">For Sale</MenuItem>
          <MenuItem value="rental">For Rent</MenuItem>
        </TextField>
        <TextField select label="Status" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#f9fafb' } }}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="active">Live</MenuItem>
          <MenuItem value="pending">Waiting</MenuItem>
        </TextField>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, fontSize: 15, alignItems: 'center' }} action={<Button color="inherit" size="small" onClick={fetchProperties} sx={{ fontWeight: 800 }}>Try again</Button>}>
          {error}
        </Alert>
      )}

      {/* Properties Grid */}
      {loading && properties.length === 0 ? (
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rounded" height={340} />
            </Grid>
          ))}
        </Grid>
      ) : visible.length === 0 && !error ? (
        <Box sx={{ textAlign: 'center', py: 8, px: 2, backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <Typography variant="h6" sx={{ color: '#475569', mb: 1 }}>
            {search ? 'No property matches your search' : 'No properties yet'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
            {search ? 'खोज से कोई प्रॉपर्टी नहीं मिली' : 'Add your first listing to get started · पहली प्रॉपर्टी जोड़ें'}
          </Typography>
          {!search && (
            <Button variant="contained" startIcon={<PostPropertyIcon size={20} />} onClick={() => navigate('/partner/properties/add')} sx={{ backgroundColor: GREEN, fontWeight: 800, minHeight: 52, px: 3, '&:hover': { backgroundColor: '#115e59' } }}>
              Add Property
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Box sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
            <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
              {visible.map((property) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`${property.propertyType}-${property._id}`}>
                  <PropertyCard property={property} onOpen={openProperty} />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1.5} sx={{ pb: 2 }}>
              <Button variant="outlined" disabled={pagination.page <= 1 || loading} onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))} sx={{ minHeight: 48, minWidth: 96, fontWeight: 800 }}>
                ← Previous
              </Button>
              <Typography sx={{ fontWeight: 700, color: '#334155' }}>Page {pagination.page} of {pagination.pages}</Typography>
              <Button variant="outlined" disabled={pagination.page >= pagination.pages || loading} onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))} sx={{ minHeight: 48, minWidth: 96, fontWeight: 800 }}>
                Next →
              </Button>
            </Stack>
          )}
        </>
      )}
    </Container>
  );
};

export default PartnerHubProperties;
