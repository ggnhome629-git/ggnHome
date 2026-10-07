// SEO utilities for meta tag management, Open Graph, Twitter cards, and structured data
// Use these utilities to set page-specific metadata across the app

import React from 'react';

/**
 * Generate Page Meta Tags
 * Updates document head with meta tags for title, description, og:tags, twitter:card
 */
export const setPageMeta = ({
  title = 'GgnHome — Get Space & Get Rewarded',
  description = 'Search, rent or buy verified properties in Gurgaon. Personalised recommendations and AI-powered search.',
  keywords = 'real estate, property search, rent, buy, Gurgaon, properties',
  ogImage = 'https://www.ggnhome.com/og-image-whatsapp.jpg?v=2',
  ogType = 'website',
  ogUrl = 'https://www.ggnhome.com/',
  twitterCard = 'summary_large_image',
  canonical = null,
  author = 'GgnHome',
} = {}) => {
  // Set title
  document.title = title;
  updateMetaTag('og:title', title);
  updateMetaTag('twitter:title', title);

  // Set description
  updateMetaTag('description', description);
  updateMetaTag('og:description', description);
  updateMetaTag('twitter:description', description);

  // Set keywords
  updateMetaTag('keywords', keywords);

  // Set Open Graph tags
  updateMetaTag('og:type', ogType);
  updateMetaTag('og:url', ogUrl);
  updateMetaTag('og:image', ogImage);
  updateMetaTag('og:image:alt', title);
  updateMetaTag('og:site_name', 'GgnHome');
  updateMetaTag('og:locale', 'en_IN');

  // Set Twitter Card tags
  updateMetaTag('twitter:card', twitterCard);
  updateMetaTag('twitter:image', ogImage);
  updateMetaTag('twitter:site', '@GgnHome');

  // Set author
  updateMetaTag('author', author);

  // Set canonical URL
  if (canonical) {
    updateCanonicalLink(canonical);
  }
};

/**
 * Helper: Update or create meta tag
 */
const updateMetaTag = (name, content) => {
  if (!content) return;

  let tag = document.querySelector(
    `meta[name="${name}"], meta[property="${name}"]`
  );

  if (!tag) {
    tag = document.createElement('meta');
    const isProperty = name.startsWith('og:') || name.startsWith('twitter:');
    if (isProperty) {
      tag.setAttribute('property', name);
    } else {
      tag.setAttribute('name', name);
    }
    document.head.appendChild(tag);
  }

  tag.content = content;
};

/**
 * Helper: Update canonical link
 */
const updateCanonicalLink = (url) => {
  let link = document.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = url;
};

/**
 * Add JSON-LD Structured Data to page
 * Supports: Property, Organization, BreadcrumbList, FAQPage, LocalBusiness
 */
export const addStructuredData = (schemaData) => {
  if (!schemaData) return;

  // Remove existing script if present
  const existingScript = document.querySelector(
    'script[data-schema-type="' + schemaData['@type'] + '"]'
  );
  if (existingScript) {
    existingScript.remove();
  }

  // Create and append new script
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-schema-type', schemaData['@type']);
  script.textContent = JSON.stringify(schemaData);
  document.head.appendChild(script);
};

/**
 * Property Schema (for Property Detail Pages)
 */
export const propertySchema = ({
  id,
  name,
  description,
  price,
  currency = 'INR',
  image,
  address,
  floor,
  bhk,
  bath,
  sqft,
  furnishing,
  parking,
  possession,
  isRental = false,
}) => {
  const basePrice = {
    '@type': 'PriceSpecification',
    priceCurrency: currency,
    price: price.toString(),
  };

  if (isRental) {
    basePrice.priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateProperty',
    name: name || `${bhk} BHK Property in ${address}`,
    description:
      description ||
      `${bhk} BHK ${isRental ? 'rental' : 'sale'} property in ${address}. ₹${price}`,
    image: image || 'https://www.ggnhome.com/og-image-whatsapp.jpg',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: 'Gurgaon',
      addressRegion: 'Haryana',
      postalCode: 'India',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '28.4595',
      longitude: '77.0266',
    },
    numberOfRooms: bhk || 1,
    numberOfBathroomsTotal: bath || 1,
    floorSize: {
      '@type': 'QuantitativeValue',
      unitCode: 'SQM',
      value: sqft || 'Variable',
    },
    pricingInfo: basePrice,
    amenityFeature: [
      furnishing && { '@type': 'LocationFeatureSpecification', name: furnishing },
      parking && { '@type': 'LocationFeatureSpecification', name: `${parking} Parking` },
      possession && { '@type': 'LocationFeatureSpecification', name: `Possession: ${possession}` },
    ].filter(Boolean),
    url: `https://www.ggnhome.com/${isRental ? 'Rentaldetails' : 'Saledetails'}/prop_${id}`,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: currency,
      price: price.toString(),
      pricingInfo: basePrice,
    },
  };
};

/**
 * Organization Schema (for Homepage/Footer)
 */
export const organizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  name: 'GgnHome',
  url: 'https://www.ggnhome.com',
  logo: 'https://www.ggnhome.com/Logo2.jpg',
  description: 'Search, rent or buy verified properties in Gurgaon',
  telephone: '+91-XXXXXXXXXX',
  email: 'support@ggnhome.com',
  sameAs: [
    'https://www.facebook.com/GgnHome',
    'https://www.twitter.com/GgnHome',
    'https://www.instagram.com/GgnHome',
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Gurgaon',
    addressRegion: 'Haryana',
    postalCode: '122001',
    addressCountry: 'IN',
  },
  areaServed: 'Gurgaon',
  knowsAbout: ['Real Estate', 'Property Search', 'Rental Properties', 'Property Sales'],
});

/**
 * BreadcrumbList Schema (for navigation)
 */
export const breadcrumbSchema = (breadcrumbs = []) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: breadcrumbs.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url || 'https://www.ggnhome.com',
  })),
});

/**
 * FAQPage Schema (for FAQ sections)
 */
export const faqSchema = (faqs = []) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

/**
 * LocalBusiness Schema (for company info)
 */
export const localBusinessSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'GgnHome',
  image: 'https://www.ggnhome.com/Logo2.jpg',
  description: 'Real estate platform for property search, rental and sales in Gurgaon',
  url: 'https://www.ggnhome.com',
  telephone: '+91-XXXXXXXXXX',
  email: 'support@ggnhome.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Gurgaon',
    addressLocality: 'Gurgaon',
    addressRegion: 'Haryana',
    postalCode: '122001',
    addressCountry: 'IN',
  },
  sameAs: [
    'https://www.facebook.com/GgnHome',
    'https://www.twitter.com/GgnHome',
  ],
  priceRange: '₹20L - ₹50Cr',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.5',
    reviewCount: '1250',
  },
});

/**
 * React Hook for SEO Management
 * Usage: useSEO({ title, description, keywords, ... })
 */
export const useSEO = (config) => {
  React.useEffect(() => {
    setPageMeta(config);
  }, [config]);
};

/**
 * Component for breadcrumb navigation with SEO support
 */
export const BreadcrumbSEO = ({ items = [] }) => {
  React.useEffect(() => {
    if (items.length > 0) {
      addStructuredData(breadcrumbSchema(items));
    }
  }, [items]);

  return null; // Schema-only component, no UI
};

/**
 * SEO Configuration for all major pages
 * Import and use in respective page components
 */
export const SEO_CONFIG = {
  home: {
    title: 'GgnHome — Get Space & Get Rewarded',
    description:
      'Search, rent or buy verified properties in Gurgaon. Personalised recommendations and AI-powered search. Register, deal, and get rewarded up to ₹1,000.',
    keywords: 'property search, rent, buy, Gurgaon, real estate, properties',
    ogType: 'website',
  },
  search: {
    title: 'Property Search - GgnHome',
    description:
      'Find verified rental and sale properties in Gurgaon with advanced filters. Compare prices, amenities, and more.',
    keywords:
      'property search, rent, buy, filter properties, Gurgaon apartments, houses',
  },
  myProperties: {
    title: 'My Properties - GgnHome',
    description:
      'Manage your listed properties. View performance metrics, analytics, and enquiries.',
    keywords: 'my properties, property management, listings, analytics',
  },
  savedProperties: {
    title: 'Saved Properties - GgnHome',
    description: 'View your saved favorite properties. Track new listings matching your preferences.',
    keywords: 'saved properties, favorites, wishlist, property management',
  },
  analytics: {
    title: 'Analytics - GgnHome',
    description:
      'View detailed analytics and performance metrics for your property listings. Track views, saves, enquiries, and more.',
    keywords: 'property analytics, performance metrics, property management',
  },
  pricePredictor: {
    title: 'Price Predictor - GgnHome',
    description:
      'Predict property prices in Gurgaon using AI. Get accurate valuations for rental and sale properties.',
    keywords: 'price predictor, property valuation, price estimation, AI',
  },
  flatmates: {
    title: 'Flatmates - GgnHome',
    description:
      'Find compatible flatmates in Gurgaon. Search and connect with people looking to share accommodation.',
    keywords: 'flatmates, roommates, sharing, accommodation, Gurgaon',
  },
  support: {
    title: 'Support - GgnHome',
    description:
      'Get help and support for GgnHome. Find answers to common questions and contact support.',
    keywords: 'support, help, FAQ, contact, customer service',
  },
  about: {
    title: 'About GgnHome',
    description:
      'Learn about GgnHome — the platform for property search, rental, and sales in Gurgaon. Our mission, values, and team.',
    keywords: 'about, company, mission, team, real estate',
  },
};

/**
 * Image SEO guidelines and alt text generator
 */
export const getImageAltText = ({
  bhk,
  propertyType,
  furnishing,
  location,
}) => {
  const type = propertyType === 'rental' ? 'rental' : 'sale';
  return `${bhk || ''} BHK ${furnishing || ''} property for ${type} in ${
    location || 'Gurgaon'
  }`.replace(/\s+/g, ' ').trim();
};

/**
 * Canonical URL for pagination
 */
export const getCanonicalUrl = (path, page = 1) => {
  if (page <= 1) {
    return `https://www.ggnhome.com${path}`;
  }
  return `https://www.ggnhome.com${path}?page=${page}`;
};

export default {
  setPageMeta,
  addStructuredData,
  propertySchema,
  organizationSchema,
  breadcrumbSchema,
  faqSchema,
  localBusinessSchema,
  useSEO,
  BreadcrumbSEO,
  SEO_CONFIG,
  getImageAltText,
  getCanonicalUrl,
};
