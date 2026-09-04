import React, { useState } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { CITY_DATA } from '../../data/cityPropertyOptions';

const CITIES = Object.keys(CITY_DATA);

const COLUMNS = [
  { key: 'flats', heading: (city) => `Flats in ${city}`, label: (area) => `Flats in ${area}`, type: 'flats' },
  { key: 'houses', heading: (city) => `Houses for sale in ${city}`, label: (area) => `House for sale in ${area}`, type: 'houses' },
  { key: 'properties', heading: (city) => `Property in ${city}`, label: (area) => `Property in ${area}`, type: 'properties' },
  { key: 'plots', heading: (city) => `Plots in ${city}`, label: (area) => `Plots in ${area}`, type: 'plots' },
];

const SEARCH_URL = process.env.REACT_APP_PROPERTY_SEARCH_URL;

/**
 * SEO-oriented link farm: pick a city, get four columns of area-specific
 * search links. Pure navigation aid — no fetches, no app state beyond the
 * selected city.
 */
const PropertyCitiesComponent = () => {
  const [selectedCity, setSelectedCity] = useState('Bangalore');
  const data = CITY_DATA[selectedCity];

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
      <Typography variant="h2" sx={{ color: 'primary.main', mb: 2 }}>
        Property options in top cities
      </Typography>
      <Box sx={{ width: 56, height: 3, backgroundColor: 'secondary.main', borderRadius: 999, mb: 8 }} />

      <Stack
        direction="row"
        spacing={6}
        sx={{ overflowX: 'auto', pb: 3, mb: 8, borderBottom: '1px solid', borderColor: 'divider', "&::-webkit-scrollbar": { display: 'none' } }}
      >
        {CITIES.map((city) => {
          const active = selectedCity === city;
          return (
            <Box
              key={city}
              onClick={() => setSelectedCity(city)}
              sx={{
                position: 'relative',
                pb: 3,
                flexShrink: 0,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: 15,
                fontWeight: active ? 700 : 500,
                color: active ? 'primary.main' : 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {city}
              {active && (
                <Box
                  component={motion.div}
                  layoutId="city-tab-underline"
                  sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'secondary.main', borderRadius: 999 }}
                />
              )}
            </Box>
          );
        })}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 8, md: 10 },
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {COLUMNS.map((column) => (
          <Box key={column.key}>
            <Typography variant="h4" sx={{ color: 'primary.main', fontSize: '1rem', mb: 5 }}>
              {column.heading(selectedCity)}
            </Typography>
            <Stack spacing={3}>
              {data[column.key].map((area) => (
                <Box
                  key={area}
                  component="a"
                  href={`${SEARCH_URL}?city=${encodeURIComponent(area)}&type=${column.type}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: 14,
                    color: 'text.secondary',
                    textDecoration: 'none',
                    '&:hover': { color: 'primary.main' },
                    '&:hover .arrow': { opacity: 1, transform: 'translateX(0)' },
                  }}
                >
                  {column.label(area)}
                  <ChevronRight
                    size={14}
                    className="arrow"
                    style={{ opacity: 0, transform: 'translateX(-4px)', transition: 'all .2s ease' }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default PropertyCitiesComponent;
