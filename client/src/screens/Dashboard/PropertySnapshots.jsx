import React, { useEffect, useState } from 'react';
import { Box, Container, Skeleton, Stack, Typography } from '@mui/material';
import AdsColumn from './adscolumn';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import { radii, elevationShadows } from '../../theme/theme';

const DESCRIPTION_PREVIEW_LENGTH = 250;

/**
 * Editorial "city snapshot" copy block with a sticky ad rail beside it.
 * City is picked at random from content.json on mount, matching prior
 * behaviour.
 */
export default function PropertySnapshot() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [cityData, setCityData] = useState(null);

  useEffect(() => {
    fetch('/content.json')
      .then((res) => res.json())
      .then((data) => {
        const cities = data.cities;
        setCityData(cities[Math.floor(Math.random() * cities.length)]);
      })
      .catch((err) => console.error('Failed to load city data:', err));
  }, []);

  if (!cityData) {
    return (
      <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
        <Skeleton variant="text" width={280} height={44} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={220} />
      </Container>
    );
  }

  const truncated =
    cityData.description.length > DESCRIPTION_PREVIEW_LENGTH
      ? `${cityData.description.slice(0, DESCRIPTION_PREVIEW_LENGTH)}…`
      : cityData.description;

  const stats = [
    { number: cityData.lowBudgetFlats.split(' ')[0], label: cityData.lowBudgetFlats },
    { number: cityData.propertiesForSale.split(' ')[0], label: cityData.propertiesForSale },
    { number: cityData.residentialAgents.split(' ')[0], label: cityData.residentialAgents },
    { number: cityData.residentialProjects.split(' ')[0], label: cityData.residentialProjects },
  ];

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 8, md: 10 }} alignItems="flex-start">
        <Box sx={{ flex: '1 1 65%', minWidth: 0 }}>
          <Typography variant="h2" sx={{ color: 'primary.main', mb: 6, position: 'relative', pb: 3 }}>
            {cityData.name} Property Snapshot
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: 56,
                height: 3,
                backgroundColor: 'info.main',
                borderRadius: 999,
              }}
            />
          </Typography>

          <Box
            sx={{
              p: { xs: 5, md: 8 },
              borderRadius: `${radii.lg}px`,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: elevationShadows[1],
            }}
          >
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 8 }}>
              {isExpanded ? cityData.description : truncated}{' '}
              <Box
                component="button"
                onClick={() => setIsExpanded((v) => !v)}
                sx={{
                  border: 'none',
                  background: 'none',
                  p: 0,
                  color: 'primary.main',
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { color: 'secondary.main' },
                }}
              >
                {isExpanded ? 'Read less' : 'Read more'}
              </Box>
            </Typography>

            <StaggerContainer
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 24,
              }}
            >
              {stats.map((stat) => (
                <StaggerItem key={stat.label}>
                  <Typography variant="h2" sx={{ color: 'primary.main', fontSize: { xs: '1.75rem', md: '2rem' } }}>
                    {stat.number}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    {stat.label}
                  </Typography>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </Box>
        </Box>

        <Box sx={{ flex: '1 1 35%', width: '100%', position: { md: 'sticky' }, top: { md: 96 } }}>
          <AdsColumn />
        </Box>
      </Stack>
    </Container>
  );
}
