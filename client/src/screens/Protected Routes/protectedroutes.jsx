import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";

export default function ProtectedRoutes({ redirectTo = "/login" }) {
  const { user, loading: contextLoading } = useAuth();

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
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h3>Checking session…</h3>
        <p>Please wait</p>
      </div>
    );
  }

  // ❌ Not logged in → redirect to login
  if (!authorized) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ message: "Please login to access this page" }}
      />
    );
  }

  // ✅ Logged in
  return <Outlet />;
}
