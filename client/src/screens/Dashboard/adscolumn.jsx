import React, { useEffect, useState } from 'react';
import { Box, IconButton, Stack } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { motionDuration } from '../../theme/motion';
import { radii, elevationShadows } from '../../theme/theme';

const AD_IMAGES = [
  'https://res.cloudinary.com/dvapbd2xx/image/upload/v1762606793/Ad1_hkbhkl.jpg',
  'https://res.cloudinary.com/dvapbd2xx/image/upload/v1762606793/Ad2_fxa7ty.jpg',
  'https://res.cloudinary.com/dvapbd2xx/image/upload/v1762606793/ad3_q7p0ez.jpg',
  'https://res.cloudinary.com/dvapbd2xx/image/upload/v1762606794/ad4_soaq99.jpg',
];

/**
 * Sticky ad rail shown alongside the property-snapshot copy. Purely
 * decorative rotation — pauses on hover/manual pause rather than fighting
 * the reader.
 */
export default function AutoRotatingAds() {
  const [currentAd, setCurrentAd] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return undefined;
    const interval = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % AD_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const goToAd = (index) => setCurrentAd(index);
  const nextAd = () => setCurrentAd((prev) => (prev + 1) % AD_IMAGES.length);
  const prevAd = () =>
    setCurrentAd((prev) => (prev - 1 + AD_IMAGES.length) % AD_IMAGES.length);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 320,
        mx: 'auto',
        borderRadius: `${radii.lg}px`,
        overflow: 'hidden',
        backgroundColor: 'background.default',
        boxShadow: elevationShadows[2],
        border: '1px solid',
        borderColor: 'divider',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Box sx={{ position: 'relative', aspectRatio: '4 / 5', backgroundColor: '#000' }}>
        <AnimatePresence mode="wait">
          <Box
            key={currentAd}
            component={motion.img}
            src={AD_IMAGES[currentAd]}
            alt={`Advertisement ${currentAd + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionDuration.normal }}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </AnimatePresence>

        <IconButton
          size="small"
          onClick={() => setIsPaused((p) => !p)}
          aria-label={isPaused ? 'Resume rotation' : 'Pause rotation'}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1,
            backgroundColor: 'rgba(255,255,255,0.85)',
            '&:hover': { backgroundColor: 'common.white' },
          }}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
        </IconButton>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 4, height: 56 }}
      >
        <IconButton onClick={prevAd} aria-label="Previous ad" sx={{ color: 'primary.main' }}>
          <ChevronLeft size={20} />
        </IconButton>

        <Stack direction="row" spacing={2} alignItems="center">
          {AD_IMAGES.map((_, index) => (
            <Box
              key={index}
              component="button"
              onClick={() => goToAd(index)}
              aria-label={`Go to ad ${index + 1}`}
              sx={{
                p: 0,
                border: 'none',
                cursor: 'pointer',
                width: index === currentAd ? 20 : 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: index === currentAd ? 'primary.main' : 'divider',
                transition: 'all .3s ease',
              }}
            />
          ))}
        </Stack>

        <IconButton onClick={nextAd} aria-label="Next ad" sx={{ color: 'primary.main' }}>
          <ChevronRight size={20} />
        </IconButton>
      </Stack>
    </Box>
  );
}
