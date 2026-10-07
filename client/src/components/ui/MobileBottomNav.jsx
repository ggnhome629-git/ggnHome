import React from 'react';
import { Box, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { Home, Search, Heart, Plus, User } from 'lucide-react';

/**
 * PART 11 MobileBottomNav — Home / Search / Saved / Post / Profile on the
 * bottom of mobile screens only. Desktop still uses the shared site header.
 */
export default function MobileBottomNav({
  value = 0,
  onChange,
  label = 'Home',
}) {
  const items = [
    { value: 0, icon: Home, label: 'Home', path: '/' },
    { value: 1, icon: Search, label: 'Search', path: '/search' },
    { value: 2, icon: Heart, label: 'Saved', path: '/savedproperties' },
    { value: 3, icon: Plus, label: 'Post', path: '/add-property' },
    { value: 4, icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTop: '1px solid',
        borderColor: 'divider',
        px: 2,
        py: 1.5,
        zIndex: 999,
      }}
    >
      <BottomNavigation
        value={value}
        onChange={(_, v) => onChange?.(v)}
        showLabels
        sx={{
          '& .MuiBottomNavigation-action': {
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'text.secondary',
            minWidth: 64,
            borderRadius: '12px',
            margin: 0,
            backgroundColor: 'transparent',
            '&.Mui-selected': {
              color: '#00A79D',
              backgroundColor: 'rgba(0,167,157,0.08)',
            },
            '&:hover': { backgroundColor: 'rgba(0,167,157,0.08)' },
          },
        }}
      >
        {items.map(({ value: v, icon: Icon, label: l, path }) => (
          <BottomNavigationAction
            key={v}
            value={v}
            label={l}
            icon={<Icon size={20} />}
            onClick={() => typeof window !== 'undefined' && (window.location.href = path)}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
