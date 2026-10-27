import { API_BASE } from "../../utils/apiBase";
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import PageLoader from '../../components/ui/PageLoader';


// The sign-in check makes network calls, so it is remembered for a few minutes: opening another
// partner page then shows the page at once instead of a loading screen.
const VERIFY_TTL_MS = 5 * 60 * 1000;
let verified = { token: "", at: 0 };
const verifiedRecently = () => {
  const token = localStorage.getItem('partnerAccessToken') || '';
  return !!token && verified.token === token && Date.now() - verified.at < VERIFY_TTL_MS;
};

const PartnerHubProtectedRoute = ({ element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => (verifiedRecently() ? true : null));

  useEffect(() => {
    let cancelled = false;
    if (verifiedRecently()) return undefined;

    const checkAuth = async () => {
      try {
        // Admins enter the exact same PartnerHub pages through a dedicated,
        // admin-owned partner profile. This endpoint is server-side admin gated.
        const adminToken = localStorage.getItem('accessToken');
        if (adminToken) {
          const adminSession = await fetch(`${API_BASE}/api/admin/partner-session`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (adminSession.ok) {
            const data = await adminSession.json();
            if (data.agentAccessToken) {
              localStorage.setItem('partnerAccessToken', data.agentAccessToken);
            }
          }
        }

        const token = localStorage.getItem('partnerAccessToken');
        if (!token) {
          if (!cancelled) setIsAuthenticated(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/partner/dashboard`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 401) localStorage.removeItem('partnerAccessToken');
          verified = { token: '', at: 0 };
          if (!cancelled) setIsAuthenticated(false);
          return;
        }

        verified = { token, at: Date.now() };
        if (!cancelled) setIsAuthenticated(true);
      } catch (err) {
        console.error('PartnerHub auth error:', err);
        if (!cancelled) setIsAuthenticated(false);
      }
    };

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  if (isAuthenticated === null) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/partner/login" replace />;
  return element;
};

export default PartnerHubProtectedRoute;
