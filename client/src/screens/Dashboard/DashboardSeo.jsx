import React from "react";
import { Helmet } from "react-helmet";

/**
 * All document/SEO metadata for the dashboard (the site's landing route).
 * Extracted out of dashboard.jsx verbatim so the page component stays about
 * layout and behaviour rather than 150 lines of meta tags.
 */
export default function DashboardSeo() {
  return (
    <Helmet>
      {/* Basic document settings */}
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>GgnHome — Buy, Rent & Discover Verified Properties in Gurgaon | Launching 4 Dec</title>
      <link rel="canonical" href="https://www.ggnhome.com/" />
    
      {/* Primary SEO meta */}
      <meta name="description" content="GgnHome helps you find verified properties in Gurgaon — rent or buy 1BHK, 2BHK, 3BHK and more. Smart filters, AI property search, personalised recommendations, sector-based listings, and instant visit scheduling. Launching 4 Dec 11:00 AM — discover homes near you." />
      <meta name="keywords" content="flats near metro gurgaon, cheap rent gurgaon, bachelor friendly rooms gurgaon, no broker flats gurgaon, owner listed properties gurgaon, pet friendly apartments gurgaon, furnished flats gurgaon, Gurgaon real estate, Gurgaon property, rent in Gurgaon, buy property Gurgaon, 2BHK Gurgaon, Sector 46 Gurgaon, property search Gurgaon, GgnHome" />
      <meta name="robots" content="index, follow, max-snippet:320, max-image-preview:large, max-video-preview:-1" />
      <meta name="news_keywords" content="Trending in Gurgaon, Apartments trending, Hot properties today" />
    
      {/* Social / Open Graph */}
      <meta property="og:locale" content="en_IN" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="GgnHome" />
      <meta property="og:title" content="GgnHome — Get Space & Get Rewarded" />
      <meta property="og:description" content="Register with us, Deal with us & Get Rewarded. Personalised recommendations, AI search, sector filters and easy scheduling. Visit GgnHome now." />
      <meta property="og:url" content="https://www.ggnhome.com/" />
      <meta property="og:image" content="https://www.ggnhome.com/og-image-whatsapp.jpg?v=1" />
      <meta property="og:image:secure_url" content="https://www.ggnhome.com/og-image-whatsapp.jpg?v=1" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:alt" content="GgnHome — Get Space & Get Rewarded" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:phone_number" content="+91-XXXXXXXXXX" />
      <meta property="og:updated_time" content={new Date().toISOString()} />
    
      {/* Video preview for social platforms (optional - provide a valid URL) */}
      {/* Remove or replace these if you don't host the file */}
      <meta property="og:video" content="https://www.ggnhome.com/intro.mp4" />
      <meta property="og:video:type" content="video/mp4" />
      <meta property="og:video:width" content="1080" />
      <meta property="og:video:height" content="1920" />
    
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@GgnHome" />
      <meta name="twitter:creator" content="@GgnHome" />
      <meta name="twitter:title" content="GgnHome — Get Space & Get Rewarded" />
      <meta name="twitter:description" content="Register with us, Deal with us & Get Rewarded. Personalised recommendations, AI search, sector filters and easy scheduling. Visit GgnHome now." />
      <meta name="twitter:image" content="https://www.ggnhome.com/og-image-whatsapp.jpg?v=1" />
    
      {/* App-like meta & preconnect */}
      <meta name="theme-color" content="#00A79D" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <link rel="manifest" href="/manifest.json" />
      {/* Recommended: place Logo2.jpg and logo512.png in public/ */}
      <link rel="apple-touch-icon" href="/Logo2.jpg" />
      <link rel="icon" href="/Logo2.jpg" />
      <link rel="alternate" href="https://www.ggnhome.com/" hreflang="en-IN" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      {/* preload only if you really use the image immediately; better point to Logo2.jpg */}
      <link rel="preload" href="/Logo2.jpg" as="image" />
    
      {/* Social / WhatsApp friendly image type */}
      <meta property="og:image:width:whatsapp" content="1200" />
      <meta property="og:image:height:whatsapp" content="1200" />
    
      {/* Verification tokens (commented placeholders) */}
      {/* <meta name="google-site-verification" content="YOUR_GOOGLE_VERIFICATION_TOKEN" /> */}
      {/* <meta name="bingbot" content="YOUR_BING_VERIFICATION_TOKEN" /> */}
    
      {/* Structured data: Organization + Website + LocalBusiness */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "name": "GgnHome",
              "url": "https://www.ggnhome.com/",
              "logo": "https://www.ggnhome.com/Logo2.jpg",
              "sameAs": [
                "https://www.facebook.com/ggnhome",
                "https://www.linkedin.com/company/ggnhome",
                "https://www.instagram.com/ggnhome"
              ]
            },
            {
              "@type": "WebSite",
              "url": "https://www.ggnhome.com/",
              "name": "GgnHome",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.ggnhome.com/search?query={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            },
            {
              "@type": "LocalBusiness",
              "name": "GgnHome",
              "image": "https://www.ggnhome.com/Logo2.jpg",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Gurgaon",
                "addressRegion": "Haryana",
                "addressCountry": "IN"
              },
              "telephone": "+91-XXXXXXXXXX",
              "url": "https://www.ggnhome.com/"
            }
          ]
        })}
      </script>
    
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          "name": "GgnHome",
          "url": "https://www.ggnhome.com/",
          "areaServed": "Gurgaon, Haryana",
          "availableLanguage": ["Hindi", "English"],
          "openingHours": "Mo-Su 00:00-23:59",
          "priceRange": "₹",
          "image": "https://www.ggnhome.com/Logo2.jpg"
        })}
      </script>
    
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Top Property Sectors in Gurgaon",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Sector 46 Gurgaon" },
            { "@type": "ListItem", "position": 2, "name": "Sector 57 Gurgaon" },
            { "@type": "ListItem", "position": 3, "name": "DLF Phase 3" },
            { "@type": "ListItem", "position": 4, "name": "Sushant Lok" }
          ]
        })}
      </script>
    
      {/* Launch / event metadata for social buzz */}
      <meta property="og:release_date" content="2025-12-04T11:00:00+05:30" />
      <meta property="og:availability" content="preorder" />
    
      {/* Helpful meta for accessibility & indexing */}
      <meta name="author" content="GgnHome" />
      <meta name="rating" content="general" />
    </Helmet>
  );
}
