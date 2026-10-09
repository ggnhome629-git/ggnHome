import React, { useEffect, useState } from 'react';
import { Box, Container, Grid, Paper, Typography, Skeleton, Button, Card, CardContent, Stack } from '@mui/material';
import { BarChart3, Home, MessageSquare, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PartnerHubDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('partnerAccessToken');
        if (!token) {
          navigate('/partner/login');
          return;
        }

        const res = await fetch(`${process.env.REACT_APP_Base_API}/api/partner/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 401) {
            navigate('/partner/login');
            return;
          }
          throw new Error('Failed to fetch dashboard');
        }

        const data = await res.json();
        setDashboard(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const StatCard = ({ icon: Icon, label, value, color = '#3b82f6' }) => (
    <Card sx={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '8px',
              backgroundColor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={24} color={color} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.5rem', color: '#0f172a' }}>
              {value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
          Welcome back, {dashboard?.agent?.name}! 👋
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          Here's an overview of your partner portal performance.
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={Home}
            label="Total Properties"
            value={dashboard?.stats?.totalProperties || 0}
            color="#3b82f6"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={MessageSquare}
            label="Total Leads"
            value={dashboard?.stats?.totalEnquiries || 0}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={TrendingUp}
            label="New Leads"
            value={dashboard?.stats?.newEnquiries || 0}
            color="#f59e0b"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={BarChart3}
            label="Partner Rating"
            value={dashboard?.agent?.rating?.toFixed(1) || 'N/A'}
            color="#8b5cf6"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 3 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => navigate('/partner/properties?action=add')}
              fullWidth
              sx={{
                backgroundColor: '#3b82f6',
                color: 'white',
                fontWeight: 600,
                py: 1.5,
                textTransform: 'none',
                borderRadius: '8px',
              }}
            >
              Add New Property
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/partner/properties')}
              fullWidth
              sx={{
                borderColor: '#3b82f6',
                color: '#3b82f6',
                fontWeight: 600,
                py: 1.5,
                textTransform: 'none',
                borderRadius: '8px',
            }}
            >
              View All Properties
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/partner/leads')}
              fullWidth
              sx={{
                borderColor: '#10b981',
                color: '#10b981',
                fontWeight: 600,
                py: 1.5,
                textTransform: 'none',
                borderRadius: '8px',
              }}
            >
              View Leads
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Recent Properties */}
      {(dashboard?.recentProperties?.sale?.length > 0 || dashboard?.recentProperties?.rental?.length > 0) && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 3 }}>
            Recent Properties
          </Typography>
          <Grid container spacing={3}>
            {dashboard?.recentProperties?.sale?.slice(0, 3).map(property => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={property._id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': { boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
                  }}
                  onClick={() => navigate(`/partner/properties/${property._id}`)}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: 200,
                      backgroundColor: '#f3f4f6',
                      backgroundImage: property.images?.[0] ? `url(${property.images[0]})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                      {property.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280', mb: 2 }}>
                      {property.Sector || 'Location not specified'}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                        ₹{(property.price / 100000).toFixed(1)}L
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          backgroundColor: property.isActive ? '#d1fae5' : '#fee2e2',
                          color: property.isActive ? '#065f46' : '#991b1b',
                          borderRadius: '4px',
                        }}
                      >
                        {property.isActive ? 'Active' : 'Pending'}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default PartnerHubDashboard;
