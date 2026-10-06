import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import PageLoader from "../../components/ui/PageLoader";
import { useAuth } from "../../Context/AuthContext";

export default function ProtectedRoutes({ redirectTo = "/login" }) {
  const { user, loading: contextLoading } = useAuth();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const userToken = localStorage.getItem("accessToken");

  const USER_API =
    process.env.REACT_APP_USER_ME_API ||
    (process.env.REACT_APP_Base_API
      ? `${String(process.env.REACT_APP_Base_API).replace(/\/$/, "")}/user/me`
      : "/user/me");

  useEffect(() => {
    let cancelled = false;

    const verifyUser = async () => {
      // ✅ Trust context if user already exists
      if (user) {
        if (!cancelled) {
          setAuthorized(true);
          setChecking(false);
        }
        return;
      }

      try {
        const res = await fetch(USER_API, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        });

        if (!cancelled && res.ok) {
          setAuthorized(true);
        } else if (!cancelled) {
          setAuthorized(false);
        }
      } catch (e) {
        if (!cancelled) setAuthorized(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    // wait until AuthContext finishes initial load
    if (!contextLoading) {
      verifyUser();
    }

    return () => {
      cancelled = true;
    };
  }, [user, contextLoading, USER_API]);

  // ⏳ Loading state
  if (checking || contextLoading) {
    return (
      <PageLoader />
    );
  }

  // ❌ Not logged in → redirect to login
  if (!authorized) {
    return (
      <Navigate
        to={redirectTo}
        replace
        // `from` sends the user back here after logging in, not to the dashboard.
        state={{
          message: "Please login to access this page",
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  // ✅ Logged in
  return <Outlet />;
}
