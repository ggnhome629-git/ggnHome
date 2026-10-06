import React, { useState } from "react";
import { Box, ButtonBase, Drawer, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { scoreTone } from "./scoring";
import { radii } from "../../theme/theme";

function Ring({ score, size = 112, stroke = 10 }) {
  const tone = scoreTone(score);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6EDF3" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <Stack alignItems="center" justifyContent="center" sx={{ position: "absolute", inset: 0 }}>
        <Typography component="span" sx={{ fontSize: size * 0.28, fontWeight: 800, color: "primary.main", lineHeight: 1 }}>
          {score}
        </Typography>
        <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, color: tone.color, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {tone.label}
        </Typography>
      </Stack>
    </Box>
  );
}

function Tips({ missing, onJump, limit = 5 }) {
  if (!missing.length) {
    return (
      <Typography variant="body2" sx={{ color: "#16A34A", fontWeight: 600 }}>
        Perfect! Your listing has every detail people look for.
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {missing.slice(0, limit).map((m) => (
        <ButtonBase
          key={m.key}
          onClick={() => onJump?.(m.step)}
          sx={{
            justifyContent: "space-between",
            px: 3,
            py: 2,
            borderRadius: `${radii.md}px`,
            backgroundColor: "#F4F7F9",
            textAlign: "left",
            "&:hover": { backgroundColor: "#E8F6F5" },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
            {m.label}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: "secondary.main", flexShrink: 0, ml: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
              +{m.gain}
            </Typography>
            <ChevronRight size={14} />
          </Stack>
        </ButtonBase>
      ))}
    </Stack>
  );
}

/** Sidebar card: ring + "add these to reach 100" list. */
export function VisibilityScoreCard({ score, missing, onJump }) {
  return (
    <Box sx={{ p: 5, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" spacing={4} alignItems="center" sx={{ mb: 4 }}>
        <Ring score={score} />
        <Box>
          <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.05rem" }}>Visibility Score</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            Complete listings answer people's questions up front and get more serious enquiries.
          </Typography>
        </Box>
      </Stack>
      {missing.length > 0 && (
        <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 1.5 }}>
          Add these to reach 100
        </Typography>
      )}
      <Tips missing={missing} onJump={onJump} />
    </Box>
  );
}

/** Compact pill for phones; tapping opens the tips in a bottom sheet. */
export function VisibilityScorePill({ score, missing, onJump }) {
  const [open, setOpen] = useState(false);
  const tone = scoreTone(score);
  return (
    <>
      <ButtonBase
        onClick={() => setOpen(true)}
        aria-label={`Visibility score ${score} of 100. Show tips`}
        sx={{ px: 2.5, py: 1.25, borderRadius: 999, backgroundColor: "#F4F7F9", border: "1px solid", borderColor: "divider", gap: 1.5 }}
      >
        <Sparkles size={14} color={tone.color} />
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "primary.main" }}>{score}</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>/100</Typography>
      </ButtonBase>
      <Drawer anchor="bottom" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20, p: 5, pb: 7 } }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "divider", mx: "auto", mb: 4 }} />
        <Stack direction="row" spacing={4} alignItems="center" sx={{ mb: 4 }}>
          <Ring score={score} size={88} stroke={8} />
          <Box>
            <Typography sx={{ fontWeight: 800, color: "primary.main" }}>Visibility Score</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Fill in the items below to reach 100.
            </Typography>
          </Box>
        </Stack>
        <Tips
          missing={missing}
          limit={8}
          onJump={(step) => {
            setOpen(false);
            onJump?.(step);
          }}
        />
      </Drawer>
    </>
  );
}
