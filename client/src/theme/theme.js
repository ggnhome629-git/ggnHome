import { createTheme } from "@mui/material/styles";

// ---------------------------------------------------------------------------
// Design tokens
//
// Colors are built from the brand palette already defined for ggnHome
// (see Colorpallet.txt): Prussian Blue, Slate Blue, Teal, Cyan, Alabaster.
// Everything else (spacing, motion timings, radii, shadow levels) follows the
// values specified in the UI/UX redesign brief so every page pulls from the
// same tokens instead of hardcoding one-off values.
// ---------------------------------------------------------------------------

export const brand = {
  prussianBlue: "#003366",
  slateBlue: "#4A6A8A",
  teal: "#00A79D",
  cyan: "#22D3EE",
  alabaster: "#F4F7F9",
  white: "#FFFFFF",
  charcoal: "#333333",
};

// 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 / 160 — index i maps to
// theme.spacing(i) in the MUI convention below (MUI multiplies by this base).
export const spacingScale = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160];

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
};

export const elevationShadows = {
  0: "none",
  1: "0 1px 2px rgba(0, 51, 102, 0.06), 0 1px 3px rgba(0, 51, 102, 0.08)",
  2: "0 4px 10px rgba(0, 51, 102, 0.08), 0 2px 4px rgba(0, 51, 102, 0.06)",
  3: "0 12px 28px rgba(0, 51, 102, 0.12), 0 4px 8px rgba(0, 51, 102, 0.06)",
};

// Seconds. Keep every animation on one of these three so motion feels
// consistent across the whole product rather than ad-hoc per component.
export const motionDuration = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.7,
};

export const motionEase = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
};

const theme = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  spacing: 4, // theme.spacing(1) === 4px, matching the scale above
  shape: {
    borderRadius: radii.md,
  },
  palette: {
    mode: "light",
    primary: {
      main: brand.prussianBlue,
      light: "#2C5A8C",
      dark: "#001F3F",
      contrastText: brand.white,
    },
    secondary: {
      main: brand.teal,
      light: "#3FC2B8",
      dark: "#00857D",
      contrastText: brand.white,
    },
    info: {
      main: brand.cyan,
      contrastText: brand.prussianBlue,
    },
    success: {
      main: "#2E9E6B",
    },
    warning: {
      main: "#C88A2A",
    },
    error: {
      main: "#C0402E",
    },
    background: {
      default: brand.alabaster,
      paper: brand.white,
    },
    text: {
      primary: brand.charcoal,
      secondary: brand.slateBlue,
    },
    divider: "rgba(51, 51, 51, 0.1)",
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ].join(","),
    // Editorial, restrained hierarchy. clamp() lets each style flex fluidly
    // between mobile and desktop instead of jumping at breakpoints.
    display: {
      fontSize: "clamp(2.75rem, 5vw, 5.5rem)",
      fontWeight: 700,
      lineHeight: 1.05,
      letterSpacing: "-0.02em",
    },
    h1: {
      fontSize: "clamp(2.25rem, 4vw, 3.5rem)",
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
      fontWeight: 700,
      lineHeight: 1.15,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontSize: "clamp(1.375rem, 2.2vw, 1.75rem)",
      fontWeight: 600,
      lineHeight: 1.25,
    },
    h4: {
      fontSize: "clamp(1.125rem, 1.6vw, 1.375rem)",
      fontWeight: 600,
      lineHeight: 1.3,
    },
    subtitle1: {
      // "Body Large"
      fontSize: "1.125rem",
      lineHeight: 1.5,
      fontWeight: 400,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
      fontWeight: 400,
    },
    body2: {
      // "Body Small"
      fontSize: "0.875rem",
      lineHeight: 1.55,
      fontWeight: 400,
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.4,
      color: brand.slateBlue,
    },
    overline: {
      fontSize: "0.6875rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shadows: [
    "none",
    elevationShadows[1],
    elevationShadows[1],
    elevationShadows[2],
    elevationShadows[2],
    elevationShadows[2],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
    elevationShadows[3],
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*": {
          scrollBehavior: "smooth",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*": {
            animationDuration: "0.001ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.001ms !important",
            scrollBehavior: "auto !important",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radii.sm,
          paddingInline: 20,
          paddingBlock: 10,
        },
        containedPrimary: {
          boxShadow: elevationShadows[1],
          "&:hover": {
            boxShadow: elevationShadows[2],
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radii.lg,
          boxShadow: elevationShadows[1],
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radii.sm,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
  },
});

export default theme;
