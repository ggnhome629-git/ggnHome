import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import { radii } from './Theme';

/**
 * PART 11 SkeletonCard — a card-shaped placeholder that holds the shape of
 * the content it stands in for. Always renders structure, never null.
 */
export default function SkeletonCard({ count = 3, height = 260, variant = 'rounded', sx }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 4,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: `repeat(${count}, 1fr)` },
        ...sx,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant === 'rounded' ? 'rounded' : 'rectangular'}
          height={height}
          sx={{
            borderRadius: radii.lg,
            animation: 'wave 1.6s ease-in-out infinite',
            background: 'linear-gradient(90deg, rgba(0,167,157,0.06), rgba(0,167,157,0.18), rgba(0,167,157,0.06))',
          }}
        />
      ))}
    </Box>
  );
}
