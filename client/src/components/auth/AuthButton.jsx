import React from "react";
import { Button, CircularProgress } from "@mui/material";

/**
 * Primary action for auth forms.
 *
 * The spinner lives inside the button, on the control the user just pressed,
 * rather than behind a full-screen overlay — the previous pattern blocked the
 * whole page (and did so for a fixed two seconds, including on validation
 * failures that never touched the network).
 */
export default function AuthButton({
  loading = false,
  loadingText,
  children,
  variant = "contained",
  disabled,
  startIcon,
  // Pulled out of props so a caller passing `sx` merges with the styles below
  // instead of replacing them wholesale.
  sx,
  ...props
}) {
  return (
    <Button
      type="submit"
      fullWidth
      size="large"
      variant={variant}
      disabled={loading || disabled}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      sx={{
        py: 3,
        fontSize: "1rem",
        ...(variant === "contained" && {
          background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
          color: "#FFFFFF",
          "&:hover": { background: "linear-gradient(135deg, #00857D 0%, #00A79D 100%)" },
          // MUI dims a disabled contained button by swapping its background;
          // the gradient overrides that, so restore the affordance explicitly.
          "&.Mui-disabled": { background: "#B7C7D4", color: "#FFFFFF" },
        }),
        ...sx,
      }}
      {...props}
    >
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
