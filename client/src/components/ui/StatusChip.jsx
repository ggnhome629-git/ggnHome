import React from 'react';
import { Chip } from '@mui/material';

/**
 * PART 11 StatusChip — dot + label, colour never used alone.
 * One shared mapping used across visits, enquiries, support tickets,
 * service requests and requirements.
 */
const TONES = {
  pending: { bg: 'rgba(245,158,11,0.14)', fg: '#B45309' },
  'pending-review': { bg: 'rgba(245,158,11,0.14)', fg: '#B45309' },
  new: { bg: 'rgba(139,92,246,0.14)', fg: '#6D28D9' },
  edited: { bg: 'rgba(245,158,11,0.14)', fg: '#B45309' },
  'in-progress': { bg: 'rgba(33,150,243,0.14)', fg: '#1565C0' },
  scheduled: { bg: 'rgba(33,150,243,0.14)', fg: '#1565C0' },
  queued: { bg: 'rgba(33,150,243,0.14)', fg: '#1565C0' },
  requested: { bg: 'rgba(33,150,243,0.14)', fg: '#1565C0' },
  confirmed: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  'visit-scheduled': { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  completed: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  live: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  approved: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  active: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  online: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  sent: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  open: { bg: 'rgba(139,92,246,0.14)', fg: '#6D28D9' },
  'in-progress': { bg: 'rgba(33,150,243,0.14)', fg: '#1565C0' },
  resolved: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
  closed: { bg: 'rgba(74,222,128,0.14)', fg: '#059669' },
  cancelled: { bg: 'rgba(220,38,38,0.14)', fg: '#B91C1C' },
  fail: { bg: 'rgba(220,38,38,0.14)', fg: '#B91C1C' },
  error: { bg: 'rgba(220,38,38,0.14)', fg: '#B91C1C' },
  rejected: { bg: 'rgba(220,38,38,0.14)', fg: '#B91C1C' },
  suspended: { bg: 'rgba(220,38,38,0.14)', fg: '#B91C1C' },
  'cooling-down': { bg: 'rgba(34,211,238,0.16)', fg: '#0E7490' },
  expired: { bg: 'rgba(71,85,105,0.16)', fg: '#334155' },
  paused: { bg: 'rgba(100,116,139,0.16)', fg: '#475569' },
  offline: { bg: 'rgba(100,116,139,0.16)', fg: '#475569' },
  disabled: { bg: 'rgba(100,116,139,0.16)', fg: '#475569' },
  inactive: { bg: 'rgba(100,116,139,0.16)', fg: '#475569' },
  saved: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
};

const labelFor = (status) =>
  String(status)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function StatusChip({ status, size = 'small', sx }) {
  const key = String(status || '').toLowerCase();
  const tone = TONES[key] || { bg: 'rgba(100,116,139,0.16)', fg: '#475569' };
  return (
    <Chip
      size={size}
      label={labelFor(status)}
      sx={{
        backgroundColor: tone.bg,
        color: tone.fg,
        fontWeight: 700,
        borderRadius: '999px',
        '& .MuiChip-dot': { backgroundColor: tone.fg },
        ...sx,
      }}
    />
  );
}
