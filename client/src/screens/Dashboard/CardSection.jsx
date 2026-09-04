import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StaggerContainer, StaggerItem } from '../../components/motion';
import ImageReveal from '../../components/motion/ImageReveal';
import { radii } from '../../theme/theme';

const CARDS = [
  { id: 1, img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop', title: 'Buying a home', caption: 'Resale homes across every sector', isNew: false },
  { id: 2, img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop', title: 'Renting a home', caption: 'Move-in ready rentals, owner listed', isNew: false },
  { id: 3, img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=600&fit=crop', title: 'Invest in Real Estate', caption: 'Yields, trends and entry points', isNew: true },
  { id: 4, img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop', title: 'Sell/Rent your property', caption: 'List free and reach verified buyers', isNew: false },
];

const CardSection = ({ user }) => {
  const navigate = useNavigate();

  // Helper: fetch random sector from history
  const getRandomSectorFromHistory = async () => {
    try {
      const res = await fetch(process.env.REACT_APP_SEARCH_HISTORY_API, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      if (!list.length) return null;
      const candidates = list
        .map((item) => {
          const sector = item?.sector || item?.area || item?.location || item?.place || item?.query || item?.text;
          return typeof sector === 'string' ? sector.trim() : null;
        })
        .filter(Boolean);
      if (!candidates.length) return null;
      return candidates[Math.floor(Math.random() * candidates.length)];
    } catch (e) {
      console.error('history fetch error', e);
      return null;
    }
  };

  const rememberSector = async () => {
    const histSector = await getRandomSectorFromHistory();
    const fallback = localStorage.getItem('lastSector') || 'Gurgaon';
    localStorage.setItem('lastSector', (histSector || fallback).trim());
  };

  const openBuyFlow = async () => {
    await rememberSector();
    navigate('/search?type=sale');
  };

  const openRentFlow = async () => {
    await rememberSector();
    navigate('/search?type=rent');
  };

  const handleCardClick = async (card) => {
    if (card.title === 'Buying a home') {
      await openBuyFlow();
    } else if (card.title === 'Renting a home') {
      await openRentFlow();
    } else if (card.title === 'Sell/Rent your property') {
      navigate(user ? '/add-property' : '/login');
    } else if (card.title === 'Invest in Real Estate') {
      navigate('/investrealestate');
    }
  };

  return (
    <StaggerContainer
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
      }}
    >
      {CARDS.map((card) => (
        <StaggerItem key={card.id}>
          <Box
            role="button"
            tabIndex={0}
            onClick={() => handleCardClick(card)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleCardClick(card);
            }}
            sx={{
              height: '100%',
              cursor: 'pointer',
              borderRadius: `${radii.lg}px`,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              overflow: 'hidden',
              transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s ease',
              '&:hover, &:focus-visible': {
                transform: 'translateY(-4px)',
                borderColor: 'transparent',
                boxShadow: 3,
              },
              '&:hover .card-media img': { transform: 'scale(1.05)' },
              '&:hover .card-arrow': { opacity: 1, transform: 'translate(0, 0)' },
            }}
          >
            <Box className="card-media" sx={{ '& img': { transition: 'transform .6s ease' } }}>
              <ImageReveal src={card.img} alt="" aspectRatio="16 / 10" />
            </Box>

            <Stack direction="row" spacing={3} alignItems="flex-start" sx={{ p: 5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h4" sx={{ color: 'primary.main', fontSize: '1rem' }}>
                    {card.title}
                  </Typography>
                  {card.isNew && (
                    <Chip
                      label="New"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 11,
                        backgroundColor: 'secondary.main',
                        color: 'common.white',
                      }}
                    />
                  )}
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                  {card.caption}
                </Typography>
              </Box>

              <Box
                className="card-arrow"
                sx={{
                  color: 'secondary.main',
                  opacity: 0,
                  transform: 'translate(-4px, 4px)',
                  transition: 'opacity .25s ease, transform .25s ease',
                }}
              >
                <ArrowUpRight size={18} />
              </Box>
            </Stack>
          </Box>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
};

export default CardSection;
