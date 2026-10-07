// Shared design tokens — replaces every inline COLORS / hex object inside the
// screens that the REMAINING_SCREENS spec targets (PART 11.7).
import { alpha } from '@mui/material/styles';

export const PRUSSIA = '#002244';
export const NAVY = '#003366';
export const MIDNIGHT = '#0B5C7A';
export const TEAL = '#00A79D';
export const CYAN = '#22D3EE';
export const PAPER = '#FFFFFF';
export const SURFACE = '#F4F7F9';
export const DIVIDER = '#E5E9EE';
export const TEXT_PRIMARY = '#1B2A3A';
export const TEXT_SECONDARY = '#5B6B7B';
export const TEXT_LINK = '#00A79D';
export const SUCCESS = '#10B981';
export const WARNING = '#F59E0B';
export const ERROR = '#EF4444';
export const INFO = '#003366';

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '24px',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const common = {
  borderRadius: (size = 'md') => radius[size],
  boxShadow: (level = 'md') => {
    if (level === 'sm') return '0 1px 3px rgba(0,51,102,0.1)';
    if (level === 'md') return '0 4px 12px rgba(0,51,102,0.08)';
    if (level === 'lg') return '0 8px 24px rgba(0,51,102,0.08)';
    return '0 16px 48px rgba(0,51,102,0.06)';
  },
  paper: {
    backgroundColor: PAPER,
    border: `1px solid ${DIVIDER}`,
    borderRadius: radius.lg,
    boxShadow: common.boxShadow('md'),
  },
};

export const theme = {
  palette: {
    primary: {
      main: PRUSSIA,
      light: NAVY,
      dark: '#0A2540',
    },
    secondary: {
      main: MIDNIGHT,
      light: '#4A6A8A',
      dark: '#1E3A5F',
    },
    accent: {
      main: TEAL,
      light: CYAN,
      dark: '#007666',
    },
    warn: { main: WARNING, contrastText: PAPER },
    error: { main: ERROR, contrastText: PAPER },
    success: { main: SUCCESS, contrastText: PAPER },
    info: { main: INFO, contrastText: PAPER },
    background: { default: SURFACE, paper: PAPER },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          fontWeight: 600,
          textTransform: 'none',
          padding: '10px 18px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: radius.lg, border: `1px solid ${DIVIDER}` },
      },
    },
  },
};

// Theme hook used by the shared components below (no new deps).
export function useTheme() {
  return { palette: theme.palette, common, radius, spacing };
}
