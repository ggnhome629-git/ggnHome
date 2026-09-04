import React from "react";
import { Box, Container, Stack, Typography, Button } from "@mui/material";
import { ChevronRight } from "lucide-react";
import Reveal from "../motion/Reveal";

/**
 * One vertical rhythm for every dashboard section: same container width, same
 * gutters, same reveal-on-scroll. Sections that already ship their own heading
 * simply omit `title` and only inherit the spacing + reveal.
 *
 * <SectionShell overline="Nearby" title="Properties in your area" action={{...}}>
 */
export default function SectionShell({
  children,
  overline,
  title,
  description,
  action,
  tone = "default", // "default" | "muted"
  disableContainer = false,
  disableReveal = false,
  py = { xs: 10, md: 16 },
  id,
  sx,
}) {
  const hasHeader = Boolean(overline || title || description || action);

  const header = hasHeader ? (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "flex-end" }}
      spacing={4}
      sx={{ mb: { xs: 6, md: 8 } }}
    >
      <Box sx={{ maxWidth: 640 }}>
        {overline && (
          <Typography
            variant="overline"
            sx={{ color: "secondary.main", display: "block", mb: 2 }}
          >
            {overline}
          </Typography>
        )}
        {title && (
          <Typography variant="h2" sx={{ color: "primary.main" }}>
            {title}
          </Typography>
        )}
        {description && (
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 3 }}>
            {description}
          </Typography>
        )}
      </Box>

      {action && (
        <Button
          onClick={action.onClick}
          endIcon={<ChevronRight size={18} />}
          sx={{
            color: "secondary.main",
            flexShrink: 0,
            px: 0,
            "&:hover": { background: "transparent", color: "primary.main" },
            "& .MuiButton-endIcon": { transition: "transform .2s ease" },
            "&:hover .MuiButton-endIcon": { transform: "translateX(3px)" },
          }}
        >
          {action.label}
        </Button>
      )}
    </Stack>
  ) : null;

  const body = disableContainer ? (
    <>
      {header && <Container maxWidth="xl">{header}</Container>}
      {children}
    </>
  ) : (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 } }}>
      {header}
      {children}
    </Container>
  );

  return (
    <Box
      component="section"
      id={id}
      sx={{
        py,
        backgroundColor: tone === "muted" ? "background.default" : "background.paper",
        ...sx,
      }}
    >
      {disableReveal ? body : <Reveal amount={0.05}>{body}</Reveal>}
    </Box>
  );
}
