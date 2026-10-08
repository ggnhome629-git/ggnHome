import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { Heart, Home, PlusSquare, Search, Sparkles, User } from "lucide-react";
import { isNativeApp } from "../../utils/nativeApp";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Thumb-reach navigation for phones only. Hidden from the sm breakpoint up,
 * where the top navbar has room for everything.
 */
export default function MobileBottomNav({ user, onSearch }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = [
    {
      label: "Home",
      icon: Home,
      active: pathname === "/",
      onClick: () => (pathname === "/" ? window.scrollTo({ top: 0, behavior: "smooth" }) : navigate("/")),
    },
    { label: "Search", icon: Search, active: pathname.startsWith("/search"), onClick: onSearch || (() => navigate("/search")) },
    {
      label: "Saved",
      icon: Heart,
      active: pathname === "/savedproperties",
      onClick: () => navigate(user ? "/savedproperties" : "/login", user ? undefined : { state: { from: "/savedproperties" } }),
    },
    // The app swaps "Post" for the personalised feed; posting stays on the Account page / website.
    isNativeApp()
      ? { label: "For you", icon: Sparkles, active: pathname === "/app/for-you", onClick: () => navigate("/app/for-you") }
      : { label: "Post", icon: PlusSquare, onClick: () => navigate(user ? "/add-property" : "/login") },
    { label: user ? "Account" : "Login", icon: User, onClick: () => navigate(user ? "/my-properties" : "/login") },
  ];

  return (
    <>
      {/* Keeps the last content clear of the fixed bar. */}
      <Box aria-hidden sx={{ display: { xs: "block", sm: "none" }, height: 68 }} />
      <Box
        component="nav"
        aria-label="Quick navigation"
        sx={{
          display: { xs: "grid", sm: "none" },
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1100,
          height: 64,
          pb: "env(safe-area-inset-bottom)",
          backgroundColor: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid",
          borderColor: "divider",
          boxShadow: "0 -6px 20px rgba(0,31,63,0.08)",
        }}
      >
        {items.map(({ label, icon: Icon, onClick, active }) => (
          <ButtonBase
            key={label}
            onClick={onClick}
            aria-label={label}
            sx={{
              flexDirection: "column",
              gap: 0.5,
              color: active ? "primary.main" : "text.secondary",
            }}
          >
            <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden />
            <Typography sx={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</Typography>
          </ButtonBase>
        ))}
      </Box>
    </>
  );
}
