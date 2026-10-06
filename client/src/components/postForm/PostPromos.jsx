import React from "react";
import { Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PromoCard from "../promo/PromoCard";
import usePromos from "../promo/usePromos";
import { openLink } from "../promo/openLink";

/** Admin promos for the post forms (placement "post"). Nothing shows when the admin has none. */
export default function PostPromos({ type = "", count = 1 }) {
  const navigate = useNavigate();
  const { promos } = usePromos("post", type);
  if (!promos.length) return null;
  return (
    <Stack spacing={4}>
      {promos.slice(0, count).map((p) => (
        <PromoCard key={p._id || p.title} promo={p} minHeight={180} onClick={() => openLink(navigate, p.link)} />
      ))}
    </Stack>
  );
}
