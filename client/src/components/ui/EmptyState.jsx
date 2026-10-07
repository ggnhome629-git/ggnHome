import React from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import { radii } from './Theme';

/**
 * PART 11 EmptyState — icon + title + description + a primary CTA. The
 * default for all three states every screen must render.
 */
export default function EmptyState({
  icon: Icon = Box,
  title,
  description,
  action,
  actionLabel = 'Action',
  actionVariant = 'contained',
  sx,
}) {
  return (
    <Box
      sx={{
        py: 10,
        px: 4,
        textAlign: 'center',
        backgroundColor: 'background.paper',
        borderRadius: radii.lg,
        border: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
    >
      {Icon && (
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'rgba(0,167,157,0.10)',
            display: 'grid',
            placeItems: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Icon size={30} color="#00A79D" />
        </Box>
      )}
      {title && (
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800, mb: 1 }}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}
