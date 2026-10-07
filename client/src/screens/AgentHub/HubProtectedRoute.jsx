import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button } from '@mui/material';
import PageLoader from '../../components/ui/PageLoader';

const HubProtectedRoute = ({ element }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('agentAccessToken');
        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        // Verify token is valid by checking with backend
        const res = await fetch(`${process.env.REACT_APP_Base_API}/api/hub/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('agentAccessToken');
            setIsAuthenticated(false);
            return;
          }
          throw new Error('Auth verification failed');
        }

        setIsAuthenticated(true);
      } catch (err) {
        console.error('Auth error:', err);
        setError(err.message);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isAuthenticated === null) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/agent/login" replace />;
  }

  if (error) {
    return (
      <Container sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="error" sx={{ mb: 3 }}>
            Authentication Error
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/agent/login')}
            sx={{ backgroundColor: '#3b82f6' }}
          >
            Go to Login
          </Button>
        </Box>
      </Container>
    );
  }

  return element;
};

export default HubProtectedRoute;
