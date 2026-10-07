import React from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import { radii } from '../../theme/theme';
import { Calendar, Clock, X } from 'lucide-react';

/**
 * PART 4 SlotPicker — 7-day date strip + time-slot chips, mirroring the
 * Zillow Instant Tour pattern the spec calls out.
 * `available` = Map<slotStart, boolean> passed in by the calling screen.
 */
export default function SlotPicker({
  slots,
  available,
  selected,
  onSelectSlot,
  onClose,
  title = 'Pick a time to visit',
}) {
  // Build a 7-day strip starting from tomorrow.
  const today = new Date();
  const strip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1 + i);
    return d;
  });

  const formatDate = (d) =>
    d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const isPast = (d) => d <= today;

  const timeChipStyle = (slotStart) => {
    const on = Boolean(available && available[slotStart]);
    return {
      backgroundColor: on ? '#00A79D' : 'rgba(0,51,102,0.06)',
      color: on ? '#fff' : 'text.secondary',
      border: on ? 'none' : '1px solid',
      borderColor: on ? 'transparent' : 'divider',
      cursor: on ? 'pointer' : 'not-allowed',
      opacity: on ? 1 : 0.5,
    };
  };

  return (
    <Box
      sx={{
        borderRadius: radii.lg,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        p: 4,
        maxWidth: 640,
      }}
    >
      <Typography variant="h3" sx={{ color: 'primary.main', mb: 2 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
        Choose a date, then a time slot that works for you.
      </Typography>

      {/* 7-day date strip */}
      <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 4 }}>
        {strip.map((d) => {
          const past = isPast(d);
          return (
            <Button
              key={d.toISOString()}
              size="small"
              disabled={past}
              onClick={() => onSelectSlot?.(d)}
              sx={{
                borderRadius: radii.md,
                fontWeight: 700,
                textTransform: 'none',
                px: 3,
                py: 2,
                backgroundColor: past ? 'rgba(255,255,255,0.3)' : 'transparent',
                color: past ? 'text.secondary' : 'primary.main',
                border: '1px solid',
                borderColor: past ? 'transparent' : 'divider',
                '&:hover': {
                  backgroundColor: past ? 'rgba(255,255,255,0.15)' : 'rgba(0,167,157,0.06)',
                },
              }}
            >
              <Calendar size={14} style={{ marginRight: 6, flexShrink: 0 }} />
              {formatDate(d)}
            </Button>
          );
        })}
      </Stack>

      {/* Time-slot chips — only available ones (the owner's availability
          calendar is the backend source of truth). */}
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={1.5}
        sx={{ justifyContent: 'center' }}
      >
        {(slots || []).map((slot) => {
          const s = new Date(slot);
          const key = s.toISOString();
          const on = Boolean(available && available[key]);
          return (
            <Button
              key={key}
              size="small"
              disabled={!on}
              onClick={() => onSelectSlot?.(s)}
              sx={{
                ...timeChipStyle(key),
                borderRadius: radii.md,
                fontWeight: 700,
                textTransform: 'none',
                px: 3.5,
                py: 2,
                minWidth: 84,
              }}
            >
              <Clock size={14} style={{ marginRight: 6, flexShrink: 0 }} />
              {s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Button>
          );
        })}
      </Stack>

      {!selected && (
        <Box sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
          <X size={16} style={{ display: 'block', margin: '0 auto 6px' }} />
          <Typography variant="body2">Select a date and time to book your visit.</Typography>
        </Box>
      )}
    </Box>
  );
}
