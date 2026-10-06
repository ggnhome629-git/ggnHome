import React from "react";
import { Box, ButtonBase, FormHelperText, Stack, Typography } from "@mui/material";
import { Check } from "lucide-react";
import { radii } from "../../theme/theme";

/** Bold field label with optional "required" star and hint. */
export function FieldLabel({ children, required, hint, htmlFor }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography component={htmlFor ? "label" : "div"} htmlFor={htmlFor} sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.95rem" }}>
        {children}
        {required && (
          <Box component="span" sx={{ color: "#E11D48", ml: 0.5 }} aria-hidden>
            *
          </Box>
        )}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

/** A titled block inside a step. */
export function FormSection({ title, hint, required, error, children, id }) {
  return (
    <Box id={id} sx={{ mb: { xs: 6, md: 7 } }}>
      {title && (
        <FieldLabel required={required} hint={hint}>
          {title}
        </FieldLabel>
      )}
      {children}
      {error && (
        <FormHelperText error sx={{ mt: 1.5, fontSize: 13 }} role="alert">
          {error}
        </FormHelperText>
      )}
    </Box>
  );
}

/**
 * Pill-style choices (the pattern Housing/99acres/NoBroker all use instead
 * of dropdowns). `multiple` makes it a checkbox group.
 */
export function ChoiceChips({ options, value, onChange, multiple = false, ariaLabel, error, size = "md" }) {
  const selected = (v) => (multiple ? (value || []).includes(v) : value === v);
  const toggle = (v) => {
    if (!multiple) return onChange(value === v ? "" : v);
    const list = value || [];
    onChange(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };
  return (
    <Stack direction="row" useFlexGap flexWrap="wrap" gap={2} role={multiple ? "group" : "radiogroup"} aria-label={ariaLabel}>
      {options.map((opt) => {
        const o = typeof opt === "string" ? { value: opt, label: opt } : opt;
        const on = selected(o.value);
        const Icon = o.icon;
        return (
          <ButtonBase
            key={o.value}
            role={multiple ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => toggle(o.value)}
            sx={{
              gap: 1.5,
              px: size === "sm" ? 3 : 4,
              py: size === "sm" ? 1.5 : 2.25,
              borderRadius: 999,
              border: "1.5px solid",
              borderColor: on ? "secondary.main" : error ? "#FCA5A5" : "divider",
              backgroundColor: on ? "rgba(0,167,157,0.08)" : "background.paper",
              color: on ? "secondary.dark" : "text.primary",
              fontWeight: on ? 700 : 500,
              fontSize: size === "sm" ? 13 : 14,
              transition: "all .15s ease",
              "&:hover": { borderColor: "secondary.main" },
              "&.Mui-focusVisible": { outline: "3px solid", outlineColor: "secondary.light" },
            }}
          >
            {on && multiple ? <Check size={14} /> : Icon ? <Icon size={15} /> : null}
            {o.label}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

/** Large icon tiles for the first, most important choices. */
export function ChoiceTiles({ options, value, onChange, ariaLabel, columns = { xs: 2, sm: 3, md: 4 }, error }) {
  const cols = Object.fromEntries(Object.entries(columns).map(([k, n]) => [k, `repeat(${n}, 1fr)`]));
  return (
    <Box role="radiogroup" aria-label={ariaLabel} sx={{ display: "grid", gap: 3, gridTemplateColumns: cols }}>
      {options.map((o) => {
        const on = value === o.value;
        const Icon = o.icon;
        return (
          <ButtonBase
            key={o.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            sx={{
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              gap: 2,
              p: 4,
              borderRadius: `${radii.md}px`,
              border: "1.5px solid",
              borderColor: on ? "secondary.main" : error ? "#FCA5A5" : "divider",
              backgroundColor: on ? "rgba(0,167,157,0.06)" : "background.paper",
              boxShadow: on ? "0 0 0 3px rgba(0,167,157,0.15)" : "none",
              transition: "all .15s ease",
              position: "relative",
              "&:hover": { borderColor: "secondary.main", transform: "translateY(-1px)" },
            }}
          >
            {on && (
              <Box sx={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", backgroundColor: "secondary.main", color: "#fff", display: "grid", placeItems: "center" }}>
                <Check size={13} />
              </Box>
            )}
            {Icon && (
              <Box sx={{ width: 40, height: 40, borderRadius: "12px", display: "grid", placeItems: "center", backgroundColor: on ? "secondary.main" : "#EEF3F8", color: on ? "#fff" : "primary.main" }}>
                <Icon size={20} />
              </Box>
            )}
            <Box>
              <Typography sx={{ fontWeight: 700, color: "primary.main", fontSize: 15 }}>{o.label}</Typography>
              {o.hint && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.35 }}>
                  {o.hint}
                </Typography>
              )}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
