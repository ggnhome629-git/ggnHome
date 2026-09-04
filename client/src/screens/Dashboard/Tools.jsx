import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { ArrowRight, BarChart3, Sparkles, Star, Target, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HoverLift, StaggerContainer, StaggerItem } from '../../components/motion';
import { radii, elevationShadows } from '../../theme/theme';

const AVAILABLE_TOOLS = [
  {
    id: 1,
    name: 'Price Predictor',
    tagline: 'Predict market prices with AI-powered accuracy',
    description:
      'Our machine learning model analyzes historical data, market trends, and multiple variables to provide accurate price predictions.',
    icon: TrendingUp,
    color: '#00A79D',
    gradient: 'linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)',
    features: ['Real-time price analysis', 'Historical data insights', 'AI-powered predictions'],
    stats: [
      { label: 'Accuracy', value: '94%' },
      { label: 'Predictions', value: '10K+' },
      { label: 'Users', value: '2.5K+' },
    ],
    badge: 'Most popular',
  },
];

const UPCOMING_TOOLS = [
  { name: 'Inventory Manager', description: 'Track and manage your inventory in real-time', icon: BarChart3 },
  { name: 'Market Analyzer', description: 'Deep dive into market trends and insights', icon: Target },
  { name: 'Smart Dashboard', description: 'Unified view of all your business metrics', icon: Sparkles },
];

export default function ToolsShowcase() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
      <Typography variant="overline" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mb: 2 }}>
        Powerful tools
      </Typography>
      <Typography variant="h2" sx={{ textAlign: 'center', color: 'primary.main', mb: 3 }}>
        Available now
      </Typography>
      <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', maxWidth: 560, mx: 'auto', mb: { xs: 8, md: 10 } }}>
        Start using our premium tools today and make data-driven decisions.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 6,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          mb: { xs: 10, md: 14 },
        }}
      >
        {AVAILABLE_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <HoverLift key={tool.id} scale={1.01} lift={6}>
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: `${radii.lg}px`,
                  overflow: 'hidden',
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: elevationShadows[2],
                }}
              >
                {tool.badge && (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      zIndex: 1,
                      px: 3,
                      py: 1,
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                      color: 'common.white',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <Star size={13} />
                    <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 700 }}>
                      {tool.badge}
                    </Typography>
                  </Stack>
                )}

                <Box sx={{ background: tool.gradient, p: { xs: 6, md: 8 }, position: 'relative', overflow: 'hidden' }}>
                  <Box
                    aria-hidden
                    sx={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }}
                  />
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 5,
                    }}
                  >
                    <Icon size={32} color="#FFFFFF" />
                  </Box>
                  <Typography variant="h3" sx={{ color: 'common.white', mb: 2 }}>
                    {tool.name}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    {tool.tagline}
                  </Typography>
                </Box>

                <Box sx={{ p: { xs: 6, md: 8 } }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 6 }}>
                    {tool.description}
                  </Typography>

                  <Typography variant="h4" sx={{ color: 'primary.main', fontSize: '0.95rem', mb: 4 }}>
                    Key features
                  </Typography>
                  <Stack spacing={2} sx={{ mb: 6 }}>
                    {tool.features.map((feature) => (
                      <Stack key={feature} direction="row" spacing={2} alignItems="center">
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: tool.color }} />
                        <Typography variant="body2" sx={{ color: 'text.primary' }}>
                          {feature}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 4,
                      p: 5,
                      borderRadius: `${radii.md}px`,
                      backgroundColor: 'background.default',
                      mb: 6,
                    }}
                  >
                    {tool.stats.map((stat) => (
                      <Box key={stat.label} sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ color: tool.color }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          {stat.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    fullWidth
                    endIcon={<ArrowRight size={18} />}
                    onClick={() => navigate(`${process.env.REACT_APP_PRICE_PREDICTOR_PAGE}`)}
                    sx={{
                      background: tool.gradient,
                      color: 'common.white',
                      py: 3,
                      '&:hover': { background: tool.gradient, filter: 'brightness(1.05)' },
                    }}
                  >
                    Try price predictor
                  </Button>
                </Box>
              </Box>
            </HoverLift>
          );
        })}
      </Box>

      <Typography variant="overline" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mb: 2 }}>
        Coming soon
      </Typography>
      <Typography variant="h2" sx={{ textAlign: 'center', color: 'primary.main', mb: { xs: 8, md: 10 } }}>
        More tools in development
      </Typography>

      <StaggerContainer
        style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
      >
        {UPCOMING_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <StaggerItem key={tool.name}>
              <Box
                sx={{
                  position: 'relative',
                  textAlign: 'center',
                  p: { xs: 6, md: 7 },
                  borderRadius: `${radii.lg}px`,
                  border: '2px dashed',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    px: 3,
                    py: 1,
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #4A6A8A 0%, #003366 100%)',
                    color: 'common.white',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Coming soon
                </Box>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 5,
                    borderRadius: '50%',
                    backgroundColor: 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={28} color="#4A6A8A" />
                </Box>
                <Typography variant="h4" sx={{ color: 'primary.main', mb: 2 }}>
                  {tool.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tool.description}
                </Typography>
              </Box>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </Container>
  );
}
