import React from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { radii } from '../../theme/theme';

/**
 * PART 11 ErrorRetry — primary error state for every screen: message, retry
 * (onError) and a "go home" escape route. Never a bare console.error-only
 * failure, and never an alert().
 */
export default function ErrorRetry({
  title = 'Something went wrong',
  message = 'We could not load this page. Try again or go back to safety.',
  onError,
  onHome,
  homeLabel = 'Go home',
  buttonLabel = 'Try again',
  sx,
}) {
  return (
    <Box
      sx={{
        py: 12,
        px: 4,
        textAlign: 'center',
        backgroundColor: 'background.paper',
        borderRadius: radii.lg,
        border: '1px solid',
        borderColor: 'error.main',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        ...sx,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'rgba(239,68,68,0.10)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <AlertTriangle size={32} color="#EF4444" />
      </Box>
      <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460, mx: 'auto' }}>
        {message}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ gap: 2 }}>
        <Button
          variant="contained"
          onClick={() => onError?.()}
          disabled={!onError}
          startIcon={<RefreshCw size={16} />}
          sx={{ borderRadius: radii.md, fontWeight: 600 }}
        >
          {buttonLabel}
        </Button>
        {onHome && (
          <Button
            variant="outlined"
            onClick={() => onHome()}
            endIcon={<ArrowRight size={16} />}
            sx={{ borderRadius: radii.md, fontWeight: 600 }}
          >
            {homeLabel}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
