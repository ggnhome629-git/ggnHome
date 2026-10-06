import React from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { radii } from "../../theme/theme";

const TONES = {
  error: { icon: XCircle, color: "#DC2626", bg: "#FEF2F2" },
  warn: { icon: AlertTriangle, color: "#B45309", bg: "#FFFBEB" },
  ok: { icon: CheckCircle2, color: "#15803D", bg: "#F0FDF4" },
};

/** "Listing check" list on the review step; each row can jump to its step. */
export default function ReviewChecks({ checks, onJump }) {
  return (
    <Stack spacing={2}>
      {checks.map((c) => {
        const t = TONES[c.level] || TONES.ok;
        const Icon = t.icon;
        const clickable = c.step != null && c.level !== "ok";
        return (
          <ButtonBase
            key={c.text}
            disabled={!clickable}
            onClick={() => onJump?.(c.step)}
            sx={{ justifyContent: "flex-start", textAlign: "left", gap: 3, px: 4, py: 3, borderRadius: `${radii.md}px`, backgroundColor: t.bg, "&.Mui-disabled": { color: "inherit" } }}
          >
            <Icon size={18} color={t.color} style={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                {c.text}
              </Typography>
            </Box>
            {clickable && (
              <Typography variant="caption" sx={{ fontWeight: 800, color: t.color, flexShrink: 0 }}>
                Fix
              </Typography>
            )}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}
