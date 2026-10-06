import React, { useState } from 'react';
import { Box, Button, Container, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { GURGAON_LOCALITIES } from '../../data/cityPropertyOptions';
import { radii } from '../../theme/theme';

const TABS = [
  { key: 'rent', label: 'Flats for rent', type: 'rent' },
  { key: 'sale', label: 'Homes for sale', type: 'sale' },
  { key: 'plots', label: 'Plots', type: 'sale' },
];

const MOBILE_VISIBLE = 6;

/**
 * Locality shortcuts for Gurgaon: pick a category, tap a locality, land on
 * the search page already filtered. Chips wrap on every screen; phones show
 * a short list with "Show all".
 */
const PropertyCitiesComponent = () => {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const [tab, setTab] = useState(TABS[0]);
  const [expanded, setExpanded] = useState(false);

  const all = GURGAON_LOCALITIES[tab.key];
  const visible = isPhone && !expanded ? all.slice(0, MOBILE_VISIBLE) : all;

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
      <Typography variant="overline" sx={{ color: 'secondary.main', display: 'block', mb: 2 }}>
        Explore Gurgaon
      </Typography>
      <Typography variant="h2" sx={{ color: 'primary.main', mb: { xs: 5, md: 7 } }}>
        Popular localities
      </Typography>

      <Stack
        direction="row"
        spacing={{ xs: 5, md: 7 }}
        sx={{ overflowX: 'auto', mb: { xs: 5, md: 7 }, borderBottom: '1px solid', borderColor: 'divider', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {TABS.map((t) => {
          const active = tab.key === t.key;
          return (
            <Box
              key={t.key}
              component="button"
              type="button"
              aria-pressed={active}
              onClick={() => {
                setTab(t);
                setExpanded(false);
              }}
              sx={{
                position: 'relative',
                pb: 3,
                flexShrink: 0,
                border: 0,
                background: 'none',
                cursor: 'pointer',
                font: 'inherit',
                whiteSpace: 'nowrap',
                fontSize: { xs: 14, md: 15 },
                fontWeight: active ? 700 : 500,
                color: active ? 'primary.main' : 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {t.label}
              {active && (
                <Box
                  component={motion.div}
                  layoutId="locality-tab-underline"
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
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(6, minmax(0, 1fr))' },
        }}
      >
        {visible.map((area) => (
          <Stack
            key={area}
            component={RouterLink}
            to={`/search/${encodeURIComponent(area)}?type=${tab.type}`}
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{
              minWidth: 0,
              px: { xs: 3, md: 4 },
              py: { xs: 2.5, md: 3 },
              borderRadius: `${radii.md}px`,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              color: 'text.primary',
              textDecoration: 'none',
              fontSize: { xs: 13, md: 14 },
              fontWeight: 500,
              transition: 'border-color .2s ease, color .2s ease, background-color .2s ease',
              '&:hover': { borderColor: 'secondary.main', color: 'primary.main', backgroundColor: 'rgba(0,167,157,0.05)' },
            }}
          >
            <MapPin size={14} color="#00A79D" style={{ flexShrink: 0 }} aria-hidden />
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {area}
            </Box>
          </Stack>
        ))}
      </Box>

      {isPhone && all.length > MOBILE_VISIBLE && (
        <Button onClick={() => setExpanded((v) => !v)} sx={{ mt: 4, px: 0, color: 'secondary.main', fontWeight: 700 }}>
          {expanded ? 'Show less' : `Show all ${all.length} localities`}
        </Button>
      )}
    </Container>
  );
};

export default PropertyCitiesComponent;
