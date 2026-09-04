// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const USER_API = process.env.REACT_APP_USER_ME_API || "/user/me";
  const REVALIDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes (adjustable)

  const fetchUser = useCallback(async (opts = { force: false }) => {
    if (!opts.force && user) {
      // If we have a user cached, still attempt a background revalidate but don't block UI
      // We'll do a background fetch below as well.
    }
    setLoading(prev => (opts.force ? true : prev));
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(USER_API, {
        method: "GET",
        credentials: "include", // keep cookie auth
        headers: {
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        // treat 401/403 as logged-out
        if (res.status === 401 || res.status === 403) {
          setUser(null);

          try {
            sessionStorage.removeItem("user");
          } catch (e) {}

          try {
            localStorage.removeItem("accessToken");
          } catch (e) {}

          // notify other parts of app (agent context, nav, etc.)
          window.dispatchEvent(new Event("auth:logout"));

          setLoading(false);
          return null;
        }
        const text = await res.text();
        throw new Error(`Fetch error ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (data) {
        setUser(data);
        try {
          sessionStorage.setItem("user", JSON.stringify(data));
        } catch (e) {
          // sessionStorage quota error - ignore
        }
      } else {
        setUser(null);
        sessionStorage.removeItem("user");
      }
      setLoading(false);
      return data;
    } catch (err) {
      console.error("Auth fetchUser error:", err);
      setError(err);
      setLoading(false);
      return null;
    }
  }, [USER_API, user]);

  useEffect(() => {
    // Always validate auth with backend on first load
    fetchUser({ force: true });

    const id = setInterval(() => {
      fetchUser({ force: true });
    }, REVALIDATE_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onAuthLogout = () => {
      setUser(null);
      try {
        sessionStorage.removeItem("user");
      } catch (e) {}
    };

    window.addEventListener("auth:logout", onAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", onAuthLogout);
    };
  }, []);

const logout = useCallback(async () => {
  try {
    await fetch(`${process.env.REACT_APP_LOGOUT_API}`, {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {
    console.warn("Logout call failed:", e);
  }

  setUser(null);

  try {
    sessionStorage.removeItem("user");
  } catch (e) {}

  // ✅ IMPORTANT: clear token fallback
  try {
    localStorage.removeItem("accessToken");
  } catch (e) {}

  try {
    localStorage.removeItem("agentAccessToken");
    localStorage.removeItem("agentRefreshToken");
  } catch (e) {}

  window.dispatchEvent(new Event("auth:logout"));
}, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, error, fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}