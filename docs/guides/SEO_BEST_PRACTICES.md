# GgnHome SEO Best Practices Guide

## Overview
This guide covers professional SEO implementation across GgnHome. All pages should follow these practices to maximize search visibility and user experience.

---

## 1. Core SEO Files

### robots.txt
- Location: `/client/public/robots.txt`
- Purpose: Instructs search engines which pages to crawl
- Current Configuration:
  - Disallows admin, agent, user areas
  - Filters out tracking parameters (utm_, ref, fbclid)
  - Crawl delays for slow bots (10s) and major engines (0-1s)
  - Request rate: 30 requests/minute

### Sitemaps
Three sitemaps for different content types:

1. **sitemap.xml** - Static pages
   - Homepage, about, support, services
   - Search, analytics, dashboard pages
   - Update frequency: weekly

2. **sitemap-properties.xml** - Dynamic property listings
   - Top 50,000 active properties by views/recency
   - Includes image metadata
   - Update frequency: monthly or when properties added
   - Production endpoint: `/api/sitemap/properties`

3. **sitemap-localities.xml** - Sector/locality search pages
   - Popular sectors with 10+ active properties
   - Search filter combinations
   - Update frequency: weekly
   - Production endpoint: `/api/sitemap/localities`

---

## 2. Meta Tags Implementation

### Using `setPageMeta()` Utility

```javascript
import { setPageMeta } from '../utils/seoUtils';

// In your page component useEffect
useEffect(() => {
  setPageMeta({
    title: 'Property Search - GgnHome',
    description: 'Find rental and sale properties in Gurgaon',
    keywords: 'property search, rent, buy, Gurgaon',
    ogImage: 'https://www.ggnhome.com/property-image.jpg',
    canonical: 'https://www.ggnhome.com/search',
  });
}, []);
```

### Pre-configured SEO Configs
Use `SEO_CONFIG` for consistent meta tags:

```javascript
import { SEO_CONFIG, setPageMeta } from '../utils/seoUtils';

useEffect(() => {
  setPageMeta(SEO_CONFIG.search);
}, []);
```

### OpenGraph Tags
Automatically handled by `setPageMeta()`:
- `og:title` - Page title
- `og:description` - Page description
- `og:image` - Social sharing image
- `og:type` - Content type (website, article)
- `og:url` - Canonical URL
- `og:site_name` - 'GgnHome'
- `og:locale` - 'en_IN'

### Twitter Card Tags
```javascript
// Automatically set by setPageMeta()
{
  "twitter:card": "summary_large_image",
  "twitter:title": "...",
  "twitter:description": "...",
  "twitter:image": "...",
  "twitter:site": "@GgnHome"
}
```

---

## 3. Structured Data (JSON-LD)

### Property Schema
For property detail pages:

```javascript
import { addStructuredData, propertySchema } from '../utils/seoUtils';

useEffect(() => {
  const schema = propertySchema({
    id: property.id,
    name: property.title,
    description: property.description,
    price: property.price,
    image: property.image,
    address: property.location,
    floor: property.floor,
    bhk: property.bedrooms,
    bath: property.bathrooms,
    sqft: property.area,
    furnishing: property.furnishing,
    parking: property.parking,
    possession: property.possession,
    isRental: property.type === 'rental',
  });
  
  addStructuredData(schema);
}, [property]);
```

### Organization Schema
For homepage/footer:

```javascript
import { addStructuredData, organizationSchema } from '../utils/seoUtils';

useEffect(() => {
  addStructuredData(organizationSchema());
}, []);
```

### Breadcrumb Schema
For navigation hierarchy:

```javascript
import { addStructuredData, breadcrumbSchema } from '../utils/seoUtils';

const breadcrumbs = [
  { name: 'Home', url: 'https://www.ggnhome.com' },
  { name: 'Properties', url: 'https://www.ggnhome.com/search' },
  { name: 'Sector 31', url: 'https://www.ggnhome.com/search?sector=31' },
];

useEffect(() => {
  addStructuredData(breadcrumbSchema(breadcrumbs));
}, []);
```

### FAQ Schema
For FAQ sections:

```javascript
import { addStructuredData, faqSchema } from '../utils/seoUtils';

const faqs = [
  {
    question: 'How do I search for properties?',
    answer: 'Use the search bar to filter by location, price, and amenities.',
  },
  {
    question: 'Is registration required?',
    answer: 'Registration is optional for browsing, but required to contact sellers.',
  },
];

useEffect(() => {
  addStructuredData(faqSchema(faqs));
}, []);
```

---

## 4. Image SEO

### Alt Text Guidelines
Every image must have descriptive alt text:

```javascript
import { getImageAltText } from '../utils/seoUtils';

// Generate automatically
const altText = getImageAltText({
  bhk: 2,
  propertyType: 'rental',
  furnishing: 'Semi-furnished',
  location: 'Sector 31',
});
// Result: "2 BHK Semi-furnished property for rental in Sector 31"

// Use in img tag
<img src={image} alt={altText} />
```

### Image Metadata
Include in image sitemaps:
- `image:loc` - Image URL
- `image:title` - Descriptive title
- `image:caption` - Image caption
- Optimize image dimensions: 1200x630px for social, 800x600px minimum for properties

### Image Optimization
- Use WebP format with fallbacks
- Compress images (< 200KB for thumbnails, < 1MB for detail images)
- Use responsive images with srcset
- Load high-priority images with rel="preload"

---

## 5. Page-Specific Implementation

### Homepage
```javascript
import { SEO_CONFIG, setPageMeta, addStructuredData, organizationSchema } from '../utils/seoUtils';

export default function Home() {
  useEffect(() => {
    setPageMeta(SEO_CONFIG.home);
    addStructuredData(organizationSchema());
  }, []);
  
  return (
    // ... component JSX
  );
}
```

### Property Detail Page
```javascript
import { setPageMeta, addStructuredData, propertySchema, breadcrumbSchema } from '../utils/seoUtils';

export default function PropertyDetail() {
  useEffect(() => {
    setPageMeta({
      title: `${property.bhk} BHK ${property.furnishing} in ${property.location} - ₹${property.price}`,
      description: property.description,
      ogImage: property.image,
      canonical: window.location.href,
    });
    
    addStructuredData(propertySchema({
      id: property.id,
      name: property.title,
      // ... other fields
    }));
    
    addStructuredData(breadcrumbSchema([
      { name: 'Home', url: 'https://www.ggnhome.com' },
      { name: 'Search', url: 'https://www.ggnhome.com/search' },
      { name: property.location },
    ]));
  }, [property]);
  
  return (
    // ... component JSX
  );
}
```

### Search Results Page
```javascript
import { setPageMeta } from '../utils/seoUtils';

export default function Search() {
  useEffect(() => {
    setPageMeta({
      title: `Search Properties in ${searchParams.sector || 'Gurgaon'} - GgnHome`,
      description: `Find ${searchParams.type || 'rental and sale'} properties in ${searchParams.sector || 'Gurgaon'}.`,
      canonical: window.location.href,
    });
  }, [searchParams]);
  
  return (
    // ... component JSX
  );
}
```

### Analytics Page
```javascript
import { SEO_CONFIG, setPageMeta } from '../utils/seoUtils';

export default function Analytics() {
  useEffect(() => {
    setPageMeta(SEO_CONFIG.analytics);
  }, []);
  
  return (
    // ... component JSX
  );
}
```

---

## 6. Canonical URLs

### Purpose
Prevent duplicate content issues by specifying the preferred URL.

### Implementation
```javascript
// In page component
setPageMeta({
  canonical: window.location.href,
});

// Or for paginated content
import { getCanonicalUrl } from '../utils/seoUtils';

const canonicalUrl = getCanonicalUrl('/search', currentPage);
setPageMeta({ canonical: canonicalUrl });
```

### Rules
- Homepage: `https://www.ggnhome.com/`
- Section pages: Use current URL
- Paginated pages: Canonical points to first page (no page param)
- Property details: Use direct property URL (not via search with filters)

---

## 7. Mobile SEO

### Viewport Meta Tag
Already set in index.html:
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### Mobile-Specific Tags
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="theme-color" content="#00A79D" />
```

### Mobile Best Practices
- Responsive design (CSS grid, flexbox)
- Touch-friendly buttons (min 44x44px)
- Legible text (min 16px base font)
- Fast loading (< 3s on 3G)
- No intrusive interstitials

---

## 8. Technical SEO Checklist

### On-Page
- ✅ Unique, descriptive titles (50-60 chars)
- ✅ Meta descriptions (150-160 chars)
- ✅ Proper heading hierarchy (H1, H2, H3)
- ✅ Image alt text on all images
- ✅ Canonical URLs
- ✅ Structured data (JSON-LD)
- ✅ Mobile responsive
- ✅ Page speed optimization

### Off-Page
- ✅ Backlinks from quality sites
- ✅ Social signals
- ✅ Business listings (Google My Business)
- ✅ Schema markup for local business

### Infrastructure
- ✅ HTTPS enabled (required)
- ✅ Sitemap.xml submitted
- ✅ robots.txt configured
- ✅ Google Search Console connected
- ✅ Google Analytics 4 tracking
- ✅ Core Web Vitals optimized

---

## 9. Performance Optimization (Core Web Vitals)

### Largest Contentful Paint (LCP)
- Target: < 2.5 seconds
- Actions:
  - Preload critical resources
  - Minimize render-blocking CSS/JS
  - Optimize images
  - Cache strategy

### First Input Delay (FID)
- Target: < 100ms
- Actions:
  - Break long JavaScript tasks
  - Defer non-critical scripts
  - Use requestIdleCallback()

### Cumulative Layout Shift (CLS)
- Target: < 0.1
- Actions:
  - Reserve space for ads/images
  - Use CSS aspect-ratio
  - Avoid layout shifts with animations

### Implemented Optimizations
- Service worker caching for offline
- Image preloading for LCP
- Lazy loading for below-fold content
- Code splitting with React lazy()
- Minification and compression

---

## 10. Monitoring and Analytics

### Google Search Console
- Monitor search performance
- Fix crawl errors
- Review rich results (structured data)
- Check Core Web Vitals

### Google Analytics 4
Track:
- Page views
- User engagement
- Bounce rate
- Conversion rate (enquiries, registrations)
- Device/browser breakdown

### Key Metrics
- Organic search traffic
- Click-through rate (CTR)
- Average position in SERP
- Keyword rankings
- Backlink profile

---

## 11. Content Guidelines

### Title Tags (50-60 characters)
```
❌ Property
✅ 2 BHK Rental in Sector 31, Gurgaon - ₹45,000/month - GgnHome
```

### Meta Descriptions (150-160 characters)
```
❌ This is a property page.
✅ Spacious 2 BHK semi-furnished apartment in Sector 31. Parking, gym, 24/7 security. ₹45K/month. View now!
```

### Heading Hierarchy
```
❌ Multiple H1 tags
✅ One H1 per page, multiple H2s, nested H3s

<h1>2 BHK Rental in Sector 31</h1>
  <h2>Overview</h2>
    <h3>Basic Details</h3>
    <h3>Amenities</h3>
  <h2>Location</h2>
  <h2>Pricing</h2>
```

---

## 12. Link Building Strategy

### Internal Linking
- Link related properties from detail pages
- Use descriptive anchor text
- Link to relevant filters on search results
- Deep link to important pages from navigation

### External Linking
- Get backlinks from real estate directories
- Partner with property blogs
- Press releases for major announcements
- Industry associations

---

## 13. Dynamic Content SEO

### Server-Side Rendering (SSR)
For better SEO, consider Next.js for:
- Pre-rendered property detail pages
- Search results pages
- Dynamic meta tags per page
- Automatic sitemap generation

### Current Workaround
Using meta tag injection via seoUtils.js:
- Works with client-side React
- Adds structured data after page load
- Service worker caches for offline

---

## 14. Common SEO Mistakes to Avoid

❌ **Duplicate Content**
- Use canonical tags
- Don't create filter parameter combinations for SEO

❌ **Thin Content**
- Property descriptions should be 200+ words
- Add value beyond real estate data

❌ **Broken Links**
- Test links regularly
- Update dead property links
- Use 301 redirects for moved content

❌ **Poor Mobile Experience**
- Test on actual mobile devices
- Use responsive images
- Ensure touch-friendly interface

❌ **Keyword Stuffing**
- Natural language content
- Target intent, not just keywords
- 1-2% keyword density

❌ **Ignored User Signals**
- Fix bounce rate issues
- Improve page speed
- Enhance user engagement

---

## 15. Implementation Roadmap

### Phase 1 (Complete ✅)
- [x] robots.txt with crawl delays
- [x] Static sitemaps
- [x] Meta tag infrastructure
- [x] JSON-LD schema support
- [x] Image SEO utilities

### Phase 2 (In Progress)
- [ ] Dynamic property sitemap generation
- [ ] Dynamic locality sitemap generation
- [ ] SEO audits for existing pages
- [ ] Image optimization across site

### Phase 3 (Future)
- [ ] Server-side rendering with Next.js
- [ ] Automatic schema generation from data
- [ ] AMP pages for mobile
- [ ] Voice search optimization

### Phase 4 (Continuous)
- [ ] Monitor Search Console
- [ ] Track Core Web Vitals
- [ ] Analyze user engagement
- [ ] Iterate content strategy

---

## 16. Resources

### Tools
- Google Search Console: https://search.google.com/search-console
- Google PageSpeed Insights: https://pagespeed.web.dev
- Schema Markup Validator: https://schema.org/docs/
- Lighthouse: Built into Chrome DevTools

### References
- Google SEO Starter Guide: https://developers.google.com/search/docs/beginner/seo-starter-guide
- Core Web Vitals Guide: https://web.dev/vitals/
- Structured Data Docs: https://schema.org/
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly

---

## Questions?
For SEO implementation questions, refer to the code examples in this guide or the seoUtils.js utility file.
