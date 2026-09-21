import React from "react";
import { Box, Stack } from "@mui/material";
import { radii } from "../../theme/theme";

/**
 * Segmented control for switching between auth modes (User / Agent, OTP /
 * Password). A real radio group under the hood, so arrow keys move between
 * options and the selected one is announced — the previous version was two
 * styled buttons with no state exposed to assistive tech.
 *
 * <AuthTabs value={mode} onChange={setMode}
 *   options={[{ value: "otp", label: "OTP" }, { value: "password", label: "Password" }]} />
 */
export default function AuthTabs({ value, onChange, options, ariaLabel = "Sign-in method" }) {
  return (
    <Stack
      direction="row"
      role="radiogroup"
      aria-label={ariaLabel}
      sx={{
        p: 1,
        mb: 6,
        gap: 1,
        borderRadius: `${radii.md}px`,
        backgroundColor: "background.default",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            sx={{
              flex: 1,
              py: 2.5,
              px: 2,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.875rem",
              fontWeight: 600,
              borderRadius: `${radii.sm}px`,
              transition: "background-color .2s, color .2s, box-shadow .2s",
              backgroundColor: selected ? "secondary.main" : "transparent",
              color: selected ? "common.white" : "text.secondary",
              boxShadow: selected ? "0 1px 3px rgba(0,51,102,0.16)" : "none",
              "&:hover": {
                backgroundColor: selected ? "secondary.dark" : "rgba(0,167,157,0.08)",
                color: selected ? "common.white" : "secondary.main",
              },
              "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: 2 },
            }}
          >
            {option.label}
          </Box>
        );
      })}
    </Stack>
  );
}
