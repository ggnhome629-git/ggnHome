import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Skeleton,
  TextField,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { Search, Plus, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AgentHubProperties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
  });

  useEffect(() => {
    fetchProperties();
  }, [filters, pagination.page]);

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('agentAccessToken');
      if (!token) {
        navigate('/agent/login');
        return;
      }

      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        type: filters.type,
        status: filters.status,
      });

      const res = await fetch(
        `${process.env.REACT_APP_Base_API}/api/hub/properties?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!res.ok) {
        if (res.status === 401) navigate('/agent/login');
        throw new Error('Failed to fetch properties');
      }

      const data = await res.json();
      setProperties(data.properties || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const PropertyCard = ({ property }) => (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-4px)',
        },
      }}
      onClick={() => navigate(`/property/${property._id}`)}
    >
      <Box
        sx={{
          width: '100%',
          height: 200,
          backgroundColor: '#f3f4f6',
          backgroundImage: property.images?.[0] ? `url(${property.images[0]})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        <Chip
          label={property.isActive ? 'Active' : 'Pending'}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: property.isActive ? '#d1fae5' : '#fee2e2',
            color: property.isActive ? '#065f46' : '#991b1b',
            fontWeight: 600,
          }}
        />
      </Box>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#0f172a' }}>
          {property.title}
        </Typography>
        <Typography variant="caption" sx={{ color: '#6b7280', mb: 2 }}>
          {property.Sector || 'Location not specified'}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: '#3b82f6', fontWeight: 700, mb: 2, fontSize: '1.25rem' }}
        >
          {property.propertyType === 'sale'
            ? `₹${(property.price / 100000).toFixed(1)}L`
            : `₹${property.monthlyRent?.toLocaleString('en-IN')}/month`
          }
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/hub/properties/${property._id}/edit`);
            }}
            sx={{ fontSize: '0.75rem', flex: 1 }}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              // Delete functionality would go here
            }}
            sx={{ fontSize: '0.75rem', flex: 1 }}
          >
            Delete
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
            My Properties
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Manage and track all your listings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={() => navigate('/hub/properties/add')}
          sx={{
            backgroundColor: '#3b82f6',
            fontWeight: 600,
            textTransform: 'none',
            py: 1.5,
            px: 3,
          }}
        >
          Add Property
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <TextField
          placeholder="Search properties..."
          size="small"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color="#9ca3af" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
            },
          }}
        />
        <TextField
          select
          label="Type"
          size="small"
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
            },
          }}
        >
          <MenuItem value="all">All Types</MenuItem>
          <MenuItem value="sale">For Sale</MenuItem>
          <MenuItem value="rental">For Rent</MenuItem>
        </TextField>
        <TextField
          select
          label="Status"
          size="small"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
            },
          }}
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
        </TextField>
      </Box>

      {/* Properties Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={350} />
            </Grid>
          ))}
        </Grid>
      ) : properties.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <Typography variant="h6" sx={{ color: '#6b7280', mb: 2 }}>
            No properties found
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
            Create your first listing to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={20} />}
            onClick={() => navigate('/hub/properties/add')}
            sx={{
              backgroundColor: '#3b82f6',
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Add Property
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {properties.map(property => (
              <Grid item xs={12} sm={6} md={4} key={property._id}>
                <PropertyCard property={property} />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Stack direction="row" justifyContent="center" spacing={1}>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={pagination.page === page ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setPagination(prev => ({ ...prev, page }))}
                  sx={{
                    backgroundColor: pagination.page === page ? '#3b82f6' : 'transparent',
                    color: pagination.page === page ? 'white' : '#3b82f6',
                  }}
                >
                  {page}
                </Button>
              ))}
            </Stack>
          )}
        </>
      )}
    </Container>
  );
};

export default AgentHubProperties;
