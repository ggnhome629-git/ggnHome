import React, { useState } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { Eye, EyeOff } from "lucide-react";

/**
 * The text input every auth form uses.
 *
 * Deliberately a labelled MUI TextField rather than a placeholder-only input:
 * a placeholder disappears the moment someone types, so a half-filled form
 * stops saying which field is which — and screen readers get nothing to
 * announce. `helperText` carries validation errors inline, next to the field
 * that's wrong, instead of in a banner at the top of the card.
 */
export default function AuthField({
  icon: Icon,
  error,
  helperText,
  type = "text",
  // Pulled out so a caller's `sx` merges with the spacing below rather than
  // replacing it.
  sx,
  ...props
}) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <TextField
      fullWidth
      type={isPassword && revealed ? "text" : type}
      error={Boolean(error)}
      helperText={error || helperText || " "}
      // Outlined labels sit above the box, so without this the previous
      // field's helper text runs into the next field's label.
      sx={{ mb: 3, ...sx }}
      slotProps={{
        input: {
          startAdornment: Icon ? (
            <InputAdornment position="start">
              <Icon size={17} color="#4A6A8A" />
            </InputAdornment>
          ) : undefined,
          endAdornment: isPassword ? (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setRevealed((v) => !v)}
                edge="end"
                size="small"
                // Icon-only control: without this it announces as an unlabelled
                // button.
                aria-label={revealed ? "Hide password" : "Show password"}
              >
                {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
        // Reserve the helper line always, so a field appearing in an error
        // state doesn't shove the rest of the form down.
        formHelperText: { sx: { minHeight: 20, mx: 0.5 } },
      }}
      {...props}
    />
  );
}
