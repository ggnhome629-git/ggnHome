import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import PageLoader from '../../components/ui/PageLoader';

const PartnerHubProtectedRoute = ({ element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('partnerAccessToken');
        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        const res = await fetch(`${process.env.REACT_APP_Base_API}/api/partner/dashboard`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('partnerAccessToken');
          }
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
      } catch (err) {
        console.error('Auth error:', err);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/partner/login" replace />;
  return element;
};

export default PartnerHubProtectedRoute;
