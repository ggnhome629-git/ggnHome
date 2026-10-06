import React, { useEffect, useState } from "react";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FlatmateCard from "./FlatmateCard";
import useFlatmateBookmarks from "./useFlatmateBookmarks";
import { radii } from "../../theme/theme";

/** Rooms saved from flatmate search (kept in this browser). */
export default function SavedFlatmates({ onCount }) {
  const navigate = useNavigate();
  const [saved, toggle] = useFlatmateBookmarks();
  const [items, setItems] = useState(null);
  const ids = [...saved].join(",");

  useEffect(() => {
    if (!ids) {
      setItems([]);
      return undefined;
    }
    let cancelled = false;
    fetch(`${process.env.REACT_APP_Base_API}/api/flatmates/listings/by-ids?ids=${encodeURIComponent(ids)}`)
      .then((r) => (r.ok ? r.json() : { data: { items: [] } }))
      .then((d) => !cancelled && setItems(d.data?.items || []))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
    // Only refetch when a room is added, not on every unsave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = (items || []).filter((l) => saved.has(l._id));
  useEffect(() => {
    if (items) onCount?.(visible.length);
  }, [items, visible.length, onCount]);

  if (!items) {
    return (
      <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={340} sx={{ borderRadius: `${radii.lg}px` }} />
        ))}
      </Box>
    );
  }
  if (!visible.length) {
    return (
      <Stack alignItems="center" spacing={4} sx={{ py: 16, px: 6, textAlign: "center", backgroundColor: "background.paper", borderRadius: `${radii.lg}px`, border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "rgba(0,167,157,0.1)", color: "secondary.main" }}>
          <Users size={28} />
        </Box>
        <Typography variant="h3" sx={{ color: "primary.main", fontSize: "1.25rem" }}>
          No Saved Rooms Yet
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
          Tap the heart on any room in flatmate search to keep it here.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/flatmatessearch")}>
          Find Flatmates
        </Button>
      </Stack>
    );
  }
  return (
    <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
      {visible.map((l) => (
        <FlatmateCard key={l._id} listing={l} isSaved onToggleSave={toggle} onClick={() => navigate(`/flatmatesearchpropertymodal/${l._id}`)} />
      ))}
    </Box>
  );
}
