import React from 'react';
import { Box, Stack, Typography, Link as MuiLink, IconButton } from '@mui/material';
import { radii } from '../../theme/theme';
import {
  Home,
  Search,
  Heart,
  User,
  Plus,
  MessageSquare,
  FileText,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
} from 'lucide-react';

/**
 * PART 11 Footer — one copy: Company, Buy/Rent, Post, Support, Legal, app
 * badges. Saved (user) and agent footers are collapsed into this single
 * component.
 */
export default function Footer({ pathname = '/' }) {
  const isAgent = /\/agent\//.test(pathname);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Search', href: '/search' },
    { label: 'Saved', href: '/savedproperties' },
    { label: 'Post', href: '/add-property' },
    { label: 'Profile', href: '/profile' },
  ];

  const categoryLinks = [
    { label: 'Buy', href: '/search?category=buy' },
    { label: 'Rent', href: '/search?category=rent' },
  ];

  const supportLinks = [
    { label: 'Help Centre', href: '/support' },
    { label: 'FAQ', href: '/support#faq' },
    { label: 'Tickets', href: '/support/tickets' },
  ];

  const legalLinks = [
    { label: 'Terms of service', href: '/legal/terms' },
    { label: 'Privacy policy', href: '/legal/privacy' },
    { label: 'Cookie policy', href: '/legal/cookies' },
    { label: 'Sitemap', href: '/sitemap' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'primary.main',
        color: '#fff',
        py: { xs: 8, md: 10 },
        mt: 'auto',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 3, md: 6 },
          display: 'grid',
          gap: 6,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
        }}
      >
        {/* Brand */}
        <Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #002244, #00A79D)',
              display: 'grid',
              placeItems: 'center',
              mb: 2,
            }}
          >
            <Globe size={22} color="#fff" />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
            ggn<span style={{ color: '#22D3EE' }}>Home</span>
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 1 }}>
            Find your next home in Gurgaon — verified listings, direct owner
            connect, and rewards every visit.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mt: 3,
              flexWrap: 'wrap',
            }}
          >
            <IconButton
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.1)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
            >
              <Instagram size={16} />
            </IconButton>
            <IconButton
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.1)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
            >
              <Facebook size={16} />
            </IconButton>
            <IconButton
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.1)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
            >
              <Twitter size={16} />
            </IconButton>
            <IconButton
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.1)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
            >
              <Linkedin size={16} />
            </IconButton>
          </Box>
        </Box>

        {/* Buy / Rent */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Buy & Rent
          </Typography>
          <Stack spacing={1}>
            {categoryLinks.map((l) => (
              <MuiLink
                key={l.label}
                href={l.href}
                underline="hover"
                sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}
              >
                {l.label}
              </MuiLink>
            ))}
          </Stack>
        </Box>

        {/* Post */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Post a property
          </Typography>
          <Stack spacing={1}>
            {[
              { label: 'Rental', href: '/add-property?type=rental' },
              { label: 'Sale', href: '/add-property?type=sale' },
              { label: 'Agent', href: '/agent/add-property' },
              { label: 'Flatmates', href: '/flatmateslistingform' },
            ].map((l) => (
              <MuiLink
                key={l.label}
                href={l.href}
                underline="hover"
                sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}
              >
                {l.label}
              </MuiLink>
            ))}
          </Stack>
        </Box>

        {/* Support */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Support
          </Typography>
          <Stack spacing={1}>
            {supportLinks.map((l) => (
              <MuiLink
                key={l.label}
                href={l.href}
                underline="hover"
                sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}
              >
                {l.label}
              </MuiLink>
            ))}
          </Stack>
        </Box>

        {/* Legal */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Legal
          </Typography>
          <Stack spacing={1}>
            {legalLinks.map((l) => (
              <MuiLink
                key={l.label}
                href={l.href}
                underline="hover"
                sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}
              >
                {l.label}
              </MuiLink>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 3, md: 6 },
          borderTop: '1px solid rgba(255,255,255,0.12)',
          mt: 6,
          pb: 4,
          pt: 3,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { md: 'center' },
          gap: 2,
        }}
      >
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 600 }}>
          © {new Date().getFullYear()} ggnHome. All rights reserved. Gurgaon-first, verified owners.
        </Typography>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}
        >
          <IconButton
            size="small"
            href="https://ggnhome.com/app"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ backgroundColor: 'rgba(255,255,255,0.1)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M12 2l4 5-4 5-4-5 4-5z"/><path d="M5 9h14M5 9l4-4 4 4M5 15h14M5 15l4 4 4-4"/></svg>
          </IconButton>
          <IconButton
            size="small"
            href="https://ggnhome.com"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ backgroundColor: 'rgba(255,255,255,0.1)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
          >
            <Phone size={16} />
          </IconButton>
          <IconButton
            size="small"
            href="mailto:support@ggnhome.com"
            sx={{ backgroundColor: 'rgba(255,255,255,0.1)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
          >
            <Mail size={16} />
          </IconButton>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
              <ShieldCheck size={13} color="rgba(255,255,255,0.7)" />
              Verified listings
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
              <MapPin size={13} color="rgba(255,255,255,0.7)" />
              Gurgaon-first
            </Box>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
