import React from "react";
import { Box, Button, ButtonBase, CircularProgress, Container, LinearProgress, Stack, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { VisibilityScoreCard, VisibilityScorePill } from "./VisibilityScore";
import { radii } from "../../theme/theme";

function StepRail({ steps, current, reached, onStepClick }) {
  return (
    <Box component="nav" aria-label="Form steps" sx={{ position: "sticky", top: 96, p: 4, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider" }}>
      {steps.map((s, i) => {
        const done = i < current || (s.complete && i <= reached);
        const active = i === current;
        const reachable = i <= reached;
        const Icon = s.icon;
        return (
          <ButtonBase
            key={s.label}
            disabled={!reachable}
            onClick={() => onStepClick(i)}
            aria-current={active ? "step" : undefined}
            sx={{ width: "100%", justifyContent: "flex-start", gap: 3, p: 2.5, borderRadius: `${radii.md}px`, position: "relative", backgroundColor: active ? "#EEF7F6" : "transparent", "&:hover": { backgroundColor: reachable ? "#F4F7F9" : "transparent" } }}
          >
            <Box sx={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, backgroundColor: done ? "secondary.main" : active ? "primary.main" : "#E6EDF3", color: done || active ? "#fff" : "text.secondary" }}>
              {done && !active ? <Check size={16} /> : Icon ? <Icon size={15} /> : i + 1}
            </Box>
            <Box sx={{ textAlign: "left" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.2 }}>
                Step {i + 1}
              </Typography>
              <Typography sx={{ fontSize: 14, fontWeight: active ? 800 : 600, color: active ? "primary.main" : reachable ? "text.primary" : "text.disabled" }}>{s.label}</Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

function StepStrip({ steps, current, reached, onStepClick }) {
  return (
    <Stack direction="row" spacing={2} sx={{ overflowX: "auto", pb: 1, mb: 4, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
      {steps.map((s, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <ButtonBase
            key={s.label}
            disabled={i > reached}
            onClick={() => onStepClick(i)}
            sx={{ flexShrink: 0, gap: 1.5, px: 3, py: 1.5, borderRadius: 999, border: "1.5px solid", borderColor: active ? "primary.main" : "divider", backgroundColor: active ? "primary.main" : "background.paper", color: active ? "#fff" : done ? "secondary.dark" : "text.secondary", fontSize: 13, fontWeight: 700 }}
          >
            {done ? <Check size={14} /> : <span>{i + 1}</span>}
            {s.label}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

/**
 * Page shell shared by the post-property and post-flatmate forms:
 *   phone   — progress bar + score pill on top, sticky Back/Continue bar
 *   tablet  — step pills above the form, score/trust column on the right
 *   laptop  — step rail | form | score, trust & promos
 */
export default function PostFormLayout({
  nav,
  eyebrow,
  title,
  subtitle,
  badges = [],
  steps,
  current,
  reached,
  onStepClick,
  score,
  missing,
  aside,
  notice,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextIcon,
  loading = false,
}) {
  const step = steps[current];
  const progress = ((current + 1) / steps.length) * 100;
  const NextIcon = nextIcon || ArrowRight;

  const actions = (
    <Stack direction="row" spacing={3} justifyContent="space-between" alignItems="center">
      <Button variant="text" onClick={onBack} disabled={current === 0 || loading} startIcon={<ArrowLeft size={16} />} sx={{ visibility: current === 0 ? "hidden" : "visible", fontWeight: 700 }}>
        Back
      </Button>
      <Button
        variant="contained"
        color="secondary"
        size="large"
        onClick={onNext}
        disabled={loading}
        endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <NextIcon size={16} />}
        sx={{ px: { xs: 6, md: 8 }, py: 1.75, fontWeight: 800, borderRadius: 999, boxShadow: "0 8px 20px rgba(0,167,157,0.3)", flex: { xs: 1, sm: "0 0 auto" }, maxWidth: { xs: 260, sm: "none" } }}
      >
        {nextLabel}
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F4F7F9", pb: { xs: 24, md: 12 } }}>
      {nav}

      {/* Header band */}
      <Box sx={{ position: "relative", overflow: "hidden", color: "#fff", background: "linear-gradient(120deg, #002244 0%, #003366 45%, #0B5C7A 100%)", pt: { xs: 6, md: 9 }, pb: { xs: 14, md: 18 } }}>
        <Box aria-hidden sx={{ position: "absolute", right: -80, top: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,167,157,0.35), transparent 70%)" }} />
        <Box aria-hidden sx={{ position: "absolute", left: "35%", bottom: -120, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(246,196,83,0.18), transparent 70%)" }} />
        <Container maxWidth="xl" sx={{ position: "relative" }}>
          {eyebrow && (
            <Typography variant="overline" sx={{ color: "#F6C453", fontWeight: 800, letterSpacing: 1.4 }}>
              {eyebrow}
            </Typography>
          )}
          <Typography component="h1" sx={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: { xs: "1.9rem", sm: "2.3rem", md: "2.8rem" }, lineHeight: 1.15 }}>
            {title}
          </Typography>
          {subtitle && <Typography sx={{ mt: 2, maxWidth: 640, color: "rgba(255,255,255,0.82)", fontSize: { xs: 14, md: 16 } }}>{subtitle}</Typography>}
          {badges.length > 0 && (
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={2} sx={{ mt: 4 }}>
              {badges.map(({ icon: Icon, label }) => (
                <Stack key={label} direction="row" spacing={1.5} alignItems="center" sx={{ px: 3, py: 1.25, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 13, fontWeight: 600 }}>
                  {Icon && <Icon size={14} color="#F6C453" />}
                  <span>{label}</span>
                </Stack>
              ))}
            </Stack>
          )}
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: { xs: -10, md: -12 }, position: "relative" }}>
        <Box sx={{ display: "grid", gap: { xs: 5, md: 6 }, alignItems: "start", gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) 300px", lg: "230px minmax(0,1fr) 320px" } }}>
          <Box sx={{ display: { xs: "none", lg: "block" } }}>
            <StepRail steps={steps} current={current} reached={reached} onStepClick={onStepClick} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            {/* Phone: progress + score */}
            <Box sx={{ display: { xs: "block", md: "none" }, p: 4, mb: 4, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Step {current + 1} of {steps.length}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, color: "primary.main" }}>{step.label}</Typography>
                </Box>
                <VisibilityScorePill score={score} missing={missing} onJump={onStepClick} />
              </Stack>
              <LinearProgress variant="determinate" value={progress} color="secondary" sx={{ height: 6, borderRadius: 3, backgroundColor: "#E6EDF3" }} />
            </Box>
            <Box sx={{ display: { xs: "none", md: "block", lg: "none" } }}>
              <StepStrip steps={steps} current={current} reached={reached} onStepClick={onStepClick} />
            </Box>

            {notice}

            <Box sx={{ p: { xs: 5, sm: 6, md: 8 }, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", boxShadow: "0 10px 30px rgba(0,51,102,0.06)" }}>
              <Box sx={{ mb: { xs: 5, md: 7 } }}>
                <Typography component="h2" sx={{ fontSize: { xs: "1.35rem", md: "1.7rem" }, fontWeight: 800, color: "primary.main" }}>
                  {step.heading || step.label}
                </Typography>
                {step.hint && (
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                    {step.hint}
                  </Typography>
                )}
              </Box>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={current} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  {children}
                </motion.div>
              </AnimatePresence>
              <Box sx={{ display: { xs: "none", md: "block" }, mt: 8, pt: 6, borderTop: "1px solid", borderColor: "divider" }}>{actions}</Box>
            </Box>

            {/* Phone/tablet: trust + promos under the form */}
            <Box sx={{ display: { xs: "block", md: "none" }, mt: 5 }}>
              <Stack spacing={5}>{aside}</Stack>
            </Box>
          </Box>

          <Box sx={{ display: { xs: "none", md: "block" }, position: "sticky", top: 96 }}>
            <Stack spacing={5}>
              <VisibilityScoreCard score={score} missing={missing} onJump={onStepClick} />
              {aside}
            </Stack>
          </Box>
        </Box>
      </Container>

      {/* Phone: sticky actions */}
      <Box sx={{ display: { xs: "block", md: "none" }, position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1100, px: 4, py: 3, backgroundColor: "rgba(255,255,255,0.97)", backdropFilter: "blur(8px)", borderTop: "1px solid", borderColor: "divider", boxShadow: "0 -6px 20px rgba(0,51,102,0.08)" }}>
        {actions}
      </Box>
    </Box>
  );
}
