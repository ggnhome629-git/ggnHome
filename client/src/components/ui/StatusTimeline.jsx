import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { radii } from '../../theme/theme';
import { CheckCircle, Clock, XCircle, AlertTriangle, ChevronRight } from 'lucide-react';

/**
 * PART 11 StatusTimeline — vertical timeline for visits, tickets, requests,
 * requirements. Each item: numbered badge, label, meta, connector line.
 */
export default function StatusTimeline({
  items,
  orientation = 'vertical',
  showDates = true,
  sx,
}) {
  return (
    <Stack
      direction={orientation === 'horizontal' ? 'row' : 'column'}
      spacing={0}
      sx={{
        position: 'relative',
        pt: 2,
        pb: 6,
        ...sx,
      }}
    >
      {items.map((item, index) => {
        const Icon = item.icon || (item.status === 'done' ? CheckCircle : Clock);
        const isDone = item.status === 'done';
        const isCurrent = item.status === 'current';
        const connector =
          orientation === 'vertical' && index < items.length - 1;

        return (
          <Box
            key={item.key || index}
            sx={{
              position: 'relative',
              pb: 6,
              pl: 0,
              '&:last-child': { pb: 0 },
            }}
          >
            {connector && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 18,
                  top: 22,
                  bottom: -22,
                  width: 2,
                  backgroundColor: 'divider',
                }}
              />
            )}
            <Stack
              direction="row"
              spacing={2.5}
              alignItems="flex-start"
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: isDone
                    ? 'success.main'
                    : isCurrent
                    ? 'secondary.main'
                    : 'background.default',
                  color: isDone || isCurrent ? '#fff' : 'text.secondary',
                  flexShrink: 0,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                {isDone ? (
                  <CheckCircle size={18} color="#fff" />
                ) : isCurrent ? (
                  <Clock size={18} color="#fff" />
                ) : (
                  item.statusChar || (index + 1)
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    color: isDone ? 'success.main' : isCurrent ? 'secondary.main' : 'text.primary',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.label}
                </Typography>
                {item.meta && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                    {item.meta}
                  </Typography>
                )}
                {item.status === 'current' && (
                  <Typography variant="caption" sx={{ color: 'secondary.main', display: 'block', mt: 0.5 }}>
                    In progress
                  </Typography>
                )}
              </Box>
              {item.action && (
                <Typography
                  variant="caption"
                  sx={{ color: 'secondary.main', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                >
                  {item.action}
                </Typography>
              )}
            </Stack>
            {item.status === 'error' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, px: 2, py: 1, borderRadius: radii.sm, backgroundColor: 'rgba(239,68,68,0.08)', color: 'error.main' }}>
                <AlertTriangle size={13} />
                <Typography variant="caption">{item.error}</Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
