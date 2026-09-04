import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Gift, Home, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatedNumber } from '../../components/motion';
import { radii, elevationShadows } from '../../theme/theme';

/** Soft blurred orb used as ambient decoration on each banner. */
function GlowOrb({ size = 220, sx }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        filter: `blur(${size / 4}px)`,
        pointerEvents: 'none',
        ...sx,
      }}
    />
  );
}

/** Small pill used for the "Trusted by 500+" / "Cashback" style stat cards. */
function StatCard({ kicker, value, suffix, sub, tone = 'light' }) {
  const light = tone === 'light';
  return (
    <Stack
      spacing={1}
      alignItems="center"
      sx={{
        px: { xs: 5, md: 8 },
        py: { xs: 4, md: 6 },
        borderRadius: `${radii.md}px`,
        textAlign: 'center',
        minWidth: { md: 180 },
        backgroundColor: light ? 'rgba(255,255,255,0.15)' : 'background.paper',
        border: light ? '2px solid rgba(255,255,255,0.2)' : 'none',
        boxShadow: light ? 'none' : elevationShadows[2],
        backdropFilter: light ? 'blur(10px)' : 'none',
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: light ? 'secondary.light' : 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        {kicker}
      </Typography>
      <Typography variant="h1" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, color: light ? 'common.white' : 'primary.main' }}>
        <AnimatedNumber value={value} suffix={suffix} />
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: light ? 'rgba(255,255,255,0.85)' : 'text.secondary' }}>
          {sub}
        </Typography>
      )}
    </Stack>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } },
};

export default function Banners({ user }) {
  const navigate = useNavigate();

  const goToAddProperty = () => navigate(user ? '/add-property' : '/login');

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 6, md: 10 } }}>
      <Stack spacing={{ xs: 5, md: 7 }}>
        {/* Banner 1: legal protection */}
        <Box
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: `${radii.xl}px`,
            p: { xs: 6, md: 10 },
            background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)',
            boxShadow: '0 10px 30px rgba(0, 51, 102, 0.2)',
          }}
        >
          <GlowOrb sx={{ top: -50, right: -50, background: 'rgba(0, 167, 157, 0.18)' }} />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={6}
            alignItems={{ xs: 'stretch', md: 'center' }}
            sx={{ position: 'relative' }}
          >
            <Box
              sx={{
                width: { xs: 56, md: 80 },
                height: { xs: 56, md: 80 },
                borderRadius: '50%',
                backgroundColor: 'secondary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mx: { xs: 'auto', md: 0 },
                boxShadow: '0 4px 15px rgba(0, 167, 157, 0.3)',
              }}
            >
              <Shield size={36} color="#FFFFFF" strokeWidth={2.5} />
            </Box>

            <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography variant="h3" sx={{ color: 'common.white', mb: 3 }}>
                Ironclad legal protection
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', mb: 4 }}>
                Every property deal backed by thorough legal paper verification & expertly drafted agreements.
              </Typography>
              <Stack direction="row" spacing={5} flexWrap="wrap" justifyContent={{ xs: 'center', md: 'flex-start' }} useFlexGap>
                {['Title Verification', 'Agreement Drafting', 'Expert Consultation'].map((label) => (
                  <Stack key={label} direction="row" spacing={2} alignItems="center">
                    <CheckCircle size={18} color="#22D3EE" />
                    <Typography variant="body2" sx={{ color: 'secondary.light', fontWeight: 600 }}>
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <StatCard kicker="Trusted by" value={500} suffix="+" sub="Happy clients" />
          </Stack>
        </Box>

        {/* Banner 2: cashback offer */}
        <Box
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: `${radii.xl}px`,
            p: { xs: 6, md: 10 },
            background: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
            boxShadow: '0 10px 30px rgba(0, 167, 157, 0.25)',
          }}
        >
          <GlowOrb size={280} sx={{ bottom: -80, left: -80, background: 'rgba(255,255,255,0.12)' }} />
          <Box
            component={motion.div}
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            sx={{ position: 'absolute', top: 20, right: { xs: 16, md: 40 }, opacity: 0.35, display: { xs: 'none', sm: 'block' } }}
            aria-hidden
          >
            <Gift size={56} color="#FFFFFF" />
          </Box>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={6}
            alignItems={{ xs: 'stretch', md: 'center' }}
            sx={{ position: 'relative' }}
          >
            <Box
              sx={{
                width: { xs: 56, md: 80 },
                height: { xs: 56, md: 80 },
                borderRadius: '50%',
                backgroundColor: 'common.white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mx: { xs: 'auto', md: 0 },
                boxShadow: '0 4px 20px rgba(0, 51, 102, 0.15)',
              }}
            >
              <Gift size={36} color="#003366" strokeWidth={2.5} />
            </Box>

            <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Box
                sx={{
                  display: 'inline-block',
                  backgroundColor: 'rgba(255,255,255,0.28)',
                  color: 'common.white',
                  px: 4,
                  py: 1,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mb: 3,
                }}
              >
                🎉 Limited time offer
              </Box>
              <Typography variant="h3" sx={{ color: 'common.white', mb: 3 }}>
                Celebrate your new beginning
              </Typography>
              <Typography variant="body1" sx={{ color: 'primary.main', fontWeight: 500 }}>
                Close the deal and unlock exclusive cashback rewards plus premium goodies worth thousands.
              </Typography>
            </Box>

            <StatCard kicker="Get up to" value={1} suffix="K" sub="Cashback* · + free goodies" tone="paper" />
          </Stack>

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 6,
              p: 3,
              borderRadius: `${radii.sm}px`,
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'primary.main',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            *Terms & conditions apply. Offer valid on successful deal closure.
          </Typography>
        </Box>

        {/* Banner 3: post property free */}
        <Box
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: `${radii.xl}px`,
            p: { xs: 6, md: 10 },
            background: 'linear-gradient(135deg, #003366 0%, #4A6A8A 100%)',
            boxShadow: '0 10px 30px rgba(0, 51, 102, 0.2)',
          }}
        >
          <GlowOrb size={340} sx={{ top: -100, right: -100, background: 'rgba(34, 211, 238, 0.12)' }} />
          <GlowOrb size={280} sx={{ bottom: -80, left: -80, background: 'rgba(0, 167, 157, 0.12)' }} />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={7}
            alignItems={{ xs: 'stretch', md: 'center' }}
            sx={{ position: 'relative' }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 5 }}>
                <Box
                  sx={{
                    width: { xs: 44, md: 60 },
                    height: { xs: 44, md: 60 },
                    borderRadius: `${radii.md}px`,
                    backgroundColor: 'secondary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(34, 211, 238, 0.3)',
                  }}
                >
                  <Home size={28} color="#003366" strokeWidth={2.5} />
                </Box>
                <Box
                  sx={{
                    backgroundColor: 'secondary.main',
                    color: 'common.white',
                    px: 3,
                    py: 1,
                    borderRadius: `${radii.sm}px`,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  100% free
                </Box>
              </Stack>

              <Typography variant="h3" sx={{ color: 'common.white', mb: 4 }}>
                Post your property for free
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', mb: 6, maxWidth: 500 }}>
                List it with GgnHome and get genuine leads from verified buyers actively searching for properties.
              </Typography>

              <Stack direction="row" spacing={5} flexWrap="wrap" sx={{ mb: 7 }} useFlexGap>
                {['Reach Lakhs of Buyers', 'Verified Leads Only', 'Quick & Easy Setup'].map((label) => (
                  <Stack key={label} direction="row" spacing={2} alignItems="center">
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'secondary.light' }} />
                    <Typography variant="body2" sx={{ color: 'secondary.light', fontWeight: 600 }}>
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Button
                onClick={goToAddProperty}
                endIcon={<ArrowRight size={20} strokeWidth={3} />}
                sx={{
                  backgroundColor: 'secondary.main',
                  color: 'common.white',
                  px: 8,
                  py: 3,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  boxShadow: '0 8px 20px rgba(0, 167, 157, 0.4)',
                  '&:hover': { backgroundColor: 'secondary.light', boxShadow: '0 12px 25px rgba(34, 211, 238, 0.5)' },
                }}
              >
                Post property
              </Button>
            </Box>

            <Stack
              spacing={5}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: `${radii.md}px`,
                px: { xs: 6, md: 8 },
                py: { xs: 5, md: 6 },
                minWidth: { md: 250 },
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'secondary.light', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Properties listed
                </Typography>
                <Typography variant="h1" sx={{ color: 'common.white', fontSize: { xs: '1.75rem', md: '2.25rem' }, mt: 1 }}>
                  <AnimatedNumber value={1} suffix="k+" />
                </Typography>
              </Box>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                divider={<Box sx={{ width: { xs: '100%', sm: '1px' }, height: { xs: '1px', sm: 'auto' }, backgroundColor: 'rgba(255,255,255,0.2)' }} />}
                justifyContent="space-around"
                spacing={4}
                sx={{ borderTop: '1px solid rgba(255,255,255,0.2)', pt: 5 }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: 'common.white' }}>
                    <AnimatedNumber value={2} suffix="k+" />
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                    Monthly visits
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: 'common.white' }}>
                    <AnimatedNumber value={5} suffix="+" />
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                    Daily leads
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
