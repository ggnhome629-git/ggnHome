import React from "react";
import { Helmet } from "react-helmet";

const SITE_URL = "https://www.ggnhome.com";
const DEFAULT_TITLE = "Buy & Rent Properties in Gurgaon | GgnHome";
const DEFAULT_DESCRIPTION =
  "Find homes for rent and flats for sale in Gurgaon. Search by locality, BHK, budget and property type on GgnHome.";

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "GgnHome",
      url: `${SITE_URL}/`,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/Logo2.jpg`,
      },
      sameAs: [
        "https://www.facebook.com/ggnhome",
        "https://www.linkedin.com/company/ggnhome",
        "https://www.instagram.com/ggnhome",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "GgnHome",
      inLanguage: "en-IN",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

/**
 * SEO metadata for the public homepage. Keep claims factual and avoid
 * placeholder phone numbers, unverified review counts, or expired launch data.
 */
export default function DashboardSeo() {
  return (
    <Helmet>
      <html lang="en-IN" />
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{DEFAULT_TITLE}</title>
      <meta name="description" content={DEFAULT_DESCRIPTION} />
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <link rel="canonical" href={`${SITE_URL}/`} />
      <link rel="alternate" hrefLang="en-IN" href={`${SITE_URL}/`} />

      <meta property="og:locale" content="en_IN" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="GgnHome" />
      <meta property="og:title" content={DEFAULT_TITLE} />
      <meta property="og:description" content={DEFAULT_DESCRIPTION} />
      <meta property="og:url" content={`${SITE_URL}/`} />
      <meta property="og:image" content={`${SITE_URL}/og-image-whatsapp.jpg?v=2`} />
      <meta property="og:image:alt" content="GgnHome property search in Gurgaon" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={DEFAULT_TITLE} />
      <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
      <meta name="twitter:image" content={`${SITE_URL}/og-image-whatsapp.jpg?v=2`} />

      <script type="application/ld+json">
        {JSON.stringify(ORGANIZATION_SCHEMA)}
      </script>
    </Helmet>
  );
}
