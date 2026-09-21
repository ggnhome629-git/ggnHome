import React, { useEffect, useMemo, useRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { radii } from "../../theme/theme";

/**
 * Segmented OTP entry.
 *
 * One box per digit, with the behaviour people expect from an SMS/email code:
 * typing advances, backspace on an empty box steps back, arrow keys move, and
 * pasting the whole code from the email fills every box at once instead of
 * dropping all six characters into the first one.
 */
export default function OtpInput({
  value = "",
  onChange,
  length = 6,
  error,
  disabled = false,
  autoFocus = true,
}) {
  const inputsRef = useRef([]);
  const digits = useMemo(
    () => Array.from({ length }, (_, i) => value[i] || ""),
    [value, length]
  );

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next) => onChange(next.slice(0, length));

  const handleChange = (index, raw) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;

    // Typing over a filled box replaces that digit; a multi-character value
    // (autofill, or a fast paste into one box) spreads from here.
    const chars = value.split("");
    typed.split("").forEach((char, offset) => {
      if (index + offset < length) chars[index + offset] = char;
    });

    const next = chars.join("").slice(0, length);
    commit(next);

    const focusAt = Math.min(index + typed.length, length - 1);
    inputsRef.current[focusAt]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const chars = value.split("");
      if (chars[index]) {
        // Clear this box, stay put.
        chars[index] = "";
        commit(chars.join(""));
      } else if (index > 0) {
        // Already empty — step back and clear that one instead.
        chars[index - 1] = "";
        commit(chars.join(""));
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    commit(pasted);
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <Box>
      <Stack direction="row" spacing={{ xs: 2, sm: 3 }} justifyContent="center" sx={{ width: "100%" }}>
        {digits.map((digit, index) => (
          <Box
            key={index}
            component="input"
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1} of ${length}`}
            sx={{
              // Flexible rather than fixed: on a narrow phone six fixed-width
              // boxes plus their focus rings ran past the card's padding.
              flex: 1,
              minWidth: 0,
              maxWidth: { xs: 48, sm: 52 },
              height: { xs: 52, sm: 60 },
              textAlign: "center",
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
              fontWeight: 700,
              fontFamily: "inherit",
              color: "primary.main",
              borderRadius: `${radii.md}px`,
              border: "2px solid",
              borderColor: error ? "error.main" : "divider",
              backgroundColor: "background.paper",
              outline: "none",
              transition: "border-color .2s, box-shadow .2s",
              "&:focus": {
                borderColor: error ? "error.main" : "secondary.main",
                boxShadow: `0 0 0 3px ${error ? "rgba(192,64,46,0.16)" : "rgba(0,167,157,0.18)"}`,
              },
              "&:disabled": { backgroundColor: "background.default", color: "text.secondary" },
            }}
          />
        ))}
      </Stack>

      {error && (
        <Typography variant="caption" sx={{ display: "block", mt: 2, textAlign: "center", color: "error.main" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
