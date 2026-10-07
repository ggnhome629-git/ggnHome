import React from 'react';
import { Box, Typography, Slider, Stack, alpha } from '@mui/material';
import { radii } from '../../theme/theme';

/**
 * PART 11 RangeSlider — dual-handle budget/area slider with lakh/crore
 * labels, live text, and a typical-range hint for the chosen sector.
 */
export default function RangeSlider({
  value = [250000, 4000000],
  onChange,
  min = 0,
  max = 100000000,
  unit = '₹',
  unitLabel = 'month',
  liveText = 'Rs 25k - 40k',
  typicalHint = 'Typical range for your sector: ₹1.5L - ₹6L',
  showLabels = true,
  label = 'Set your budget',
  sx,
}) {
  const [display, setDisplay] = React.useState(liveText);

  // Format large INR numbers as 25k / 40k / 2.5 Cr.
  const format = (n) => {
    const abs = Math.abs(n);
    if (abs >= 1e7) return `${(n / 1e7).toFixed(2).replace(/\.00$/, '')} Cr`;
    if (abs >= 1e5) return `${(n / 1e5).toFixed(2).replace(/\.00$/, '')} L`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
    return `${n}`;
  };

  const displayValue =
    Array.isArray(value) && value.length === 2
      ? `${unit}${format(value[0])} - ${unit}${format(value[1])}`
      : format(value);

  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        maxWidth: 640,
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
          {label || 'Set your budget'}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          {display} {unitLabel}
        </Typography>
      </Box>

      <Slider
        value={value}
        min={min}
        max={max}
        onChange={(_, v) => {
          onChange?.(v);
          setDisplay(`${unit}${format(v[0])} - ${unit}${format(v[1])}`);
        }}
        valueLabelDisplay="on"
        getAriaValueText={(v) => `${unit}${format(v)}`}
        aria-label="budget range"
        sx={{
          height: 10,
          borderRadius: radii.lg,
          '& .MuiSlider-track': { borderRadius: radii.lg },
          '& .MuiSlider-thumb': {
            height: 22,
            width: 22,
            borderRadius: '50%',
            backgroundColor: '#fff',
            boxShadow: '0 0 0 6px rgba(0,167,157,0.25)',
            border: '2px solid #00A79D',
          },
          '& .MuiSlider-valueLabel': {
            borderRadius: radii.md,
            backgroundColor: 'primary.main',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.8rem',
            px: 1,
          },
        }}
      />

      {showLabels && (
        <Stack direction="row" spacing={3} sx={{ mt: 2, justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            ≤ {unit}{format(value[0])}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            ≥ {unit}{format(value[1])}
          </Typography>
        </Stack>
      )}

      {typicalHint && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 2, color: 'text.secondary', fontWeight: 600, fontStyle: 'italic' }}
        >
          {typicalHint}
        </Typography>
      )}
    </Box>
  );
}
