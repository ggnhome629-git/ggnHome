import React, { Suspense, useEffect, useState } from "react";
import {
  Box,
  Dialog,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, SlidersHorizontal, X } from "lucide-react";
import { motionDuration, motionEase } from "../../theme/motion";
import { radii } from "../../theme/theme";

const Chatbot = React.lazy(() => import("./ChatBot"));

// The nudge is a suggestion, not an alarm: it waits, shows once, and stays
// gone for a long while — and for good once the user dismisses it.
const NUDGE_FIRST_DELAY = 9000;
const NUDGE_VISIBLE_MS = 9000;
const NUDGE_REPEAT_MS = 120000;

/**
 * One floating rail instead of two competing bubbles: assistant on top,
 * personalisation below, with a single dismissible nudge.
 */
export default function FloatingActions({ onOpenPreferences }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [chatOpen, setChatOpen] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  useEffect(() => {
    if (nudgeDismissed) return undefined;

    let hideTimer;
    const show = () => {
      setNudgeVisible(true);
      hideTimer = setTimeout(() => setNudgeVisible(false), NUDGE_VISIBLE_MS);
    };

    const firstTimer = setTimeout(show, NUDGE_FIRST_DELAY);
    const repeat = setInterval(show, NUDGE_REPEAT_MS + NUDGE_FIRST_DELAY);

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(hideTimer);
      clearInterval(repeat);
    };
  }, [nudgeDismissed]);

  const dismissNudge = () => {
    setNudgeVisible(false);
    setNudgeDismissed(true);
  };

  return (
    <>
      <Stack
        spacing={3}
        alignItems="flex-end"
        sx={{
          position: "fixed",
          right: { xs: 4, md: 8 },
          bottom: { xs: 4, md: 8 },
          zIndex: (t) => t.zIndex.speedDial,
        }}
      >
        <AnimatePresence>
          {nudgeVisible && !chatOpen && (
            <Stack
              component={motion.div}
              direction="row"
              spacing={2}
              alignItems="center"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: motionDuration.normal, ease: motionEase.decelerate }}
              sx={{
                px: 4,
                py: 3,
                borderRadius: `${radii.md}px`,
                backgroundColor: "primary.main",
                color: "common.white",
                boxShadow: "0 16px 40px rgba(0,20,45,0.28)",
                maxWidth: 300,
              }}
            >
              <Box
                role="button"
                tabIndex={0}
                onClick={onOpenPreferences}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onOpenPreferences();
                }}
                sx={{ cursor: "pointer" }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Tell us what you're looking for
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.72)" }}>
                  Get recommendations built around you →
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={dismissNudge}
                aria-label="Dismiss"
                sx={{ color: "rgba(255,255,255,0.72)" }}
              >
                <X size={16} />
              </IconButton>
            </Stack>
          )}
        </AnimatePresence>

        <Tooltip title="Personalise your feed" placement="left">
          <IconButton
            component={motion.button}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenPreferences}
            aria-label="Set your property preferences"
            sx={{
              width: 52,
              height: 52,
              backgroundColor: "background.paper",
              color: "primary.main",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 8px 24px rgba(0,20,45,0.14)",
              "&:hover": { backgroundColor: "background.paper" },
            }}
          >
            <SlidersHorizontal size={20} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Ask our assistant" placement="left">
          <IconButton
            component={motion.button}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setChatOpen(true)}
            aria-label="Open the property assistant"
            sx={{
              width: 60,
              height: 60,
              backgroundColor: "secondary.main",
              color: "common.white",
              boxShadow: "0 12px 32px rgba(0,167,157,0.36)",
              "&:hover": { backgroundColor: "secondary.dark" },
            }}
          >
            <MessageCircle size={24} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Dialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        fullScreen={fullScreen}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 20, 45, 0.44)",
              backdropFilter: "blur(6px)",
            },
          },
          paper: {
            sx: {
              borderRadius: { xs: 0, sm: `${radii.xl}px` },
              height: { xs: "100%", sm: 620 },
              overflow: "hidden",
            },
          },
        }}
      >
        <IconButton
          onClick={() => setChatOpen(false)}
          aria-label="Close assistant"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            backgroundColor: "background.default",
            "&:hover": { backgroundColor: "divider" },
          }}
        >
          <X size={18} />
        </IconButton>
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Suspense
            fallback={
              <Stack spacing={4} sx={{ p: 6 }}>
                <Skeleton variant="text" width="55%" height={32} />
                <Skeleton variant="rounded" height={72} />
                <Skeleton variant="rounded" height={72} width="80%" />
                <Skeleton variant="rounded" height={72} />
              </Stack>
            }
          >
            <Chatbot />
          </Suspense>
        </Box>
      </Dialog>
    </>
  );
}
