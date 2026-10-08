import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { Bell, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { appFetch } from "../../utils/appApi";
import { isNativeApp, snapshot } from "../../utils/nativeApp";
import MobileBottomNav from "../Dashboard/MobileBottomNav";

const KEY = "ggn:inbox:v1";
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

/** App-only notification inbox (copies of the pushes sent to this account). */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState(() => snapshot.read(KEY, []));
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!user) return setLoading(false);
    try {
      const data = await appFetch("/notifications");
      setItems(data.items || []);
      snapshot.write(KEY, data.items || []);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    document.title = "Notifications | GgnHome";
    load();
  }, [load]);

  const open = async (n) => {
    if (!n.readAt) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)));
      appFetch(`/notifications/${n._id}/read`, { method: "PATCH" }).catch(() => {});
    }
    if (n.link && n.link.startsWith("/")) navigate(n.link);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    appFetch("/notifications/read-all", { method: "PATCH" }).catch(() => {});
  };

  if (!isNativeApp() && process.env.NODE_ENV === "production") return null;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F4F7F9", pb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pb: 2, pt: "calc(14px + env(safe-area-inset-top, 0px))", color: "#fff", backgroundImage: "linear-gradient(130deg,#002244,#003366 55%,#0B7A85)" }}>
        <Button onClick={() => navigate(-1)} aria-label="Back" sx={{ minWidth: 40, color: "#fff" }}><ChevronLeft /></Button>
        <Typography sx={{ flex: 1, fontWeight: 800, fontSize: "1.2rem" }}>Notifications</Typography>
        {items.some((n) => !n.readAt) && <Button onClick={markAll} sx={{ color: "#fff", fontWeight: 700, textTransform: "none" }}>Mark all read</Button>}
      </Stack>

      <Box sx={{ p: 2 }}>
        {offline && <Typography sx={{ fontSize: "0.75rem", color: "#92400E", mb: 1.5 }}>Offline — showing saved notifications</Typography>}
        {!user && (
          <Stack alignItems="center" spacing={2} sx={{ py: 8, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 800, color: "#003366" }}>Sign in to see your notifications</Typography>
            <Button variant="contained" onClick={() => navigate("/login", { state: { from: "/app/notifications" } })}>Sign in</Button>
          </Stack>
        )}
        {user && loading && !items.length && [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1.5, borderRadius: "14px" }} />)}
        {user && !loading && !items.length && (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: "center" }}>
            <Bell size={34} color="#9AA7B4" />
            <Typography sx={{ fontWeight: 800, color: "#003366" }}>Nothing yet</Typography>
            <Typography sx={{ color: "#5B6B7B", fontSize: "0.85rem", maxWidth: 260 }}>Popular homes and picks for you will show up here.</Typography>
          </Stack>
        )}
        {items.map((n) => (
          <Box
            key={n._id}
            component="button"
            type="button"
            onClick={() => open(n)}
            sx={{ appearance: "none", width: "100%", textAlign: "left", font: "inherit", cursor: "pointer", mb: 1.5, p: 2, borderRadius: "14px", border: "1px solid", borderColor: n.readAt ? "#E5E9EE" : "#99E0DA", backgroundColor: n.readAt ? "#fff" : "#F0FFFD", display: "flex", gap: 1.5 }}
          >
            <Box sx={{ width: 8, height: 8, mt: 0.8, borderRadius: "50%", flexShrink: 0, backgroundColor: n.readAt ? "transparent" : "#00A79D" }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: "#1B2B3A" }}>{n.title}</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "#5B6B7B", mt: 0.25 }}>{n.body}</Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "#9AA7B4", mt: 0.5 }}>{ago(n.createdAt)}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <MobileBottomNav user={user} />
    </Box>
  );
}
