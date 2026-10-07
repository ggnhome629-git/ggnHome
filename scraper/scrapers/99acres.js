const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const RentalProperty = require('../models/RentalProperty');
const {
  sleep,
  retry,
  parsePrice,
  parseArea,
  normalizeSector,
  extractBHK,
  validateProperty,
  deduplicateBySourceId
} = require('../utils/helpers');

/**
 * 99acres Scraper
 * Scrapes rental properties from 99acres.com
 */
class NinetyNineAcresScraper {
  constructor() {
    this.baseUrl = process.env.NINETY_NINE_ACRES_API_BASE || 'https://www.99acres.com';
    this.searchUrl = process.env.NINETY_NINE_ACRES_SEARCH_URL || 'https://www.99acres.com/search/property/rent/in-gurugram';
    this.pagesToScrape = parseInt(process.env.NINETY_NINE_ACRES_PAGES_TO_SCRAPE || '5');
    this.delay = parseInt(process.env.SCRAPER_DELAY_MS || '2000');
    this.timeout = parseInt(process.env.SCRAPER_TIMEOUT || '30000');
    this.affiliateId = process.env.AFFILIATE_99ACRES_ID || '';
    this.commission = parseInt(process.env.AFFILIATE_COMMISSION_99ACRES || '10');

    // Initialize axios with defaults
    this.client = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
  }

  /**
   * Main run method
   */
  async run() {
    const startTime = Date.now();
    const result = {
      status: 'running',
      propertiesFound: 0,
      propertiesImported: 0,
      propertiesUpdated: 0,
      propertiesSkipped: 0,
      errors: []
    };

    try {
      logger.info('Starting 99acres scraper...');

      const properties = [];

      // Scrape multiple pages
      for (let page = 1; page <= this.pagesToScrape; page++) {
        try {
          logger.info(`Scraping 99acres page ${page}...`);

          const pageUrl = this.buildPageUrl(page);
          const pageProperties = await this.scrapePage(pageUrl);

          result.propertiesFound += pageProperties.length;
          properties.push(...pageProperties);

          // Delay between requests
          if (page < this.pagesToScrape) {
            await sleep(this.delay);
          }
        } catch (error) {
          logger.error(`Error scraping 99acres page ${page}`, error);
          result.errors.push(`Page ${page}: ${error.message}`);
        }
      }

      // Deduplicate by source ID
      const deduplicated = deduplicateBySourceId(properties);
      logger.info(`Deduplicated ${properties.length} to ${deduplicated.length} properties`);

      // Import properties to database
      const importResult = await this.importProperties(deduplicated);

      result.propertiesImported = importResult.imported;
      result.propertiesUpdated = importResult.updated;
      result.propertiesSkipped = importResult.skipped;
      result.status = 'success';

      logger.info('99acres scraper completed successfully', result);
    } catch (error) {
      logger.error('99acres scraper failed', error);
      result.status = 'failed';
      result.errors.push(error.message);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Build paginated URL
   */
  buildPageUrl(page) {
    const url = new URL(this.searchUrl);
    url.searchParams.set('page', page);
    return url.toString();
  }

  /**
   * Scrape single page
   */
  async scrapePage(url) {
    return retry(
      async () => {
        const response = await this.client.get(url);
        const $ = cheerio.load(response.data);

        const properties = [];

        // Parse property cards
        // Note: Selectors may need adjustment based on actual 99acres HTML structure
        $('.propertyCard, [data-testid="property-card"], .listingCard').each((index, element) => {
          try {
            const property = this.parsePropertyCard($, element);
            if (property) {
              properties.push(property);
            }
          } catch (error) {
            logger.debug(`Error parsing property card ${index}`, error);
          }
        });

        logger.info(`Scraped ${properties.length} properties from page`);
        return properties;
      },
      {
        maxAttempts: 3,
        delay: 1000,
        onRetry: (attempt, waitTime) => {
          logger.warn(`99acres page scrape attempt ${attempt}, retrying in ${waitTime}ms`);
        }
      }
    );
  }

  /**
   * Parse individual property card
   */
  parsePropertyCard($, element) {
    try {
      const $card = $(element);

      // Extract data from card (99acres specific selectors)
      const sourceListingId = $card.attr('data-id') || $card.find('[data-id]').attr('data-id');
      const title = $card.find('.title, .propertyTitle, h2').text().trim();
      const priceText = $card.find('.price, .rentPrice, [data-testid="price"]').text();
      const areaText = $card.find('.area, .carpet, [data-testid="area"]').text();
      const configText = $card.find('.config, .bhk, [data-testid="bhk"]').text();
      const sector = $card.find('.location, .city, [data-testid="location"]').text().trim();
      const sourceUrl = $card.find('a').first().attr('href') || '';
      const imageUrl = $card.find('img').first().attr('src') || $card.find('img').first().attr('data-src') || '';

      // Extract additional details from card text/elements
      const cardText = $card.text();
      const amenitiesText = $card.find('.amenities, .features, .specs, [data-testid="amenities"]').text();
      const addressText = $card.find('.address, .locality, .area-name, [data-testid="address"]').text().trim();

      if (!sourceListingId || !title) {
        return null;
      }

      // Parse extracted data
      const monthlyRent = parsePrice(priceText);
      const totalArea = parseArea(areaText);
      const bhk = extractBHK(configText || title);
      const normalizedSector = normalizeSector(sector || addressText);

      // Extract bedrooms and bathrooms
      const { bedrooms, bathrooms } = this.extractBedsBaths(configText || title, bhk);

      // Extract amenities and features
      const appliances = this.extractAppliances(amenitiesText || cardText);
      const amenities = this.extractAmenities(amenitiesText || cardText);
      const furnishing = this.detectFurnishing(title + ' ' + cardText);
      const parking = this.detectParking(amenitiesText || cardText);
      const petPolicy = this.detectPetPolicy(amenitiesText || cardText);

      // Build comprehensive property object
      const property = {
        // Basic info
        title,
        description: this.buildDescription(title, bedrooms, bathrooms, furnishing, parking),
        address: addressText || normalizedSector || 'Unknown',
        Sector: normalizedSector || 'Unknown',
        propertyType: this.detectPropertyType(configText || title),
        purpose: 'rent',

        // Specifications
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        totalArea: totalArea ? { sqft: totalArea, configuration: bhk } : { configuration: bhk },
        furnishing: furnishing || 'unfurnished',

        // Amenities & Features
        appliances: appliances,
        communityFeatures: amenities,
        parking: parking || null,
        petPolicy: petPolicy || null,

        // Financial
        monthlyRent: monthlyRent || 0,
        commission: this.commission,

        // Source tracking
        sourcePortal: '99acres',
        sourceListingId,
        sourceUrl: this.absoluteUrl(sourceUrl),
        sourceStatus: 'active',
        sourceCheckedAt: new Date(),

        // Media
        images: imageUrl ? [imageUrl] : [],

        // Ownership & Status
        ownerType: 'Admin',
        isActive: false,
        isPostedNew: true,
        defaultpropertytype: 'rental',

        // Ranking (will be calculated after save)
        ranking: {
          score: 0,
          status: 'ACTIVE',
          source: 'Scraped',
          updatedAt: new Date()
        }
      };

      // Validate
      const validation = validateProperty(property);
      if (!validation.isValid) {
        logger.debug(`Property validation failed: ${validation.errors.join(', ')}`);
        return null;
      }

      return property;
    } catch (error) {
      logger.debug('Error parsing property card', error);
      return null;
    }
  }

  /**
   * Extract bedrooms and bathrooms from BHK string
   */
  extractBedsBaths(text, bhkString) {
    let bedrooms = null;
    let bathrooms = null;

    // Try to extract from BHK string (e.g., "2 BHK")
    if (bhkString) {
      const bhkMatch = bhkString.match(/(\d+)\s*(?:BHK|RK|B)/i);
      if (bhkMatch) {
        bedrooms = parseInt(bhkMatch[1]);
      }
    }

    // Try to find explicit bathroom count
    const bathroomMatch = text.match(/(\d+)\s*(?:bath|bathroom)/i);
    if (bathroomMatch) {
      bathrooms = parseInt(bathroomMatch[1]);
    }

    // Default bathroom to bedrooms-1 if not specified
    if (bedrooms && !bathrooms) {
      bathrooms = Math.max(1, bedrooms - 1);
    }

    return { bedrooms, bathrooms };
  }

  /**
   * Extract appliances from amenities text
   */
  extractAppliances(text) {
    const appliances = [];
    const applianceKeywords = [
      'ac', 'air conditioning', 'refrigerator', 'fridge', 'microwave',
      'washing machine', 'washer', 'dishwasher', 'geyser', 'heater',
      'tv', 'furniture', 'bed', 'sofa', 'tv cabinet', 'modular kitchen'
    ];

    const textLower = text.toLowerCase();
    for (const keyword of applianceKeywords) {
      if (textLower.includes(keyword)) {
        appliances.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    }

    return appliances;
  }

  /**
   * Extract community features/amenities
   */
  extractAmenities(text) {
    const amenities = [];
    const amenityKeywords = [
      'gym', 'pool', 'swimming pool', 'garden', 'park', 'security',
      'lift', 'elevator', 'parking', 'playground', 'library',
      'community center', 'visitor parking', 'power backup', '24x7 water',
      'cctv', 'intercom', 'club house'
    ];

    const textLower = text.toLowerCase();
    for (const keyword of amenityKeywords) {
      if (textLower.includes(keyword)) {
        amenities.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    }

    return amenities;
  }

  /**
   * Detect parking info
   */
  detectParking(text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('covered parking')) return 'covered';
    if (textLower.includes('open parking')) return 'open';
    if (textLower.includes('no parking')) return 'none';
    if (textLower.includes('parking')) return 'available';
    return null;
  }

  /**
   * Detect pet policy
   */
  detectPetPolicy(text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('pet friendly') || textLower.includes('pets allowed')) return 'allowed';
    if (textLower.includes('no pets') || textLower.includes('pets not allowed')) return 'not allowed';
    return null;
  }

  /**
   * Build comprehensive description
   */
  buildDescription(title, bedrooms, bathrooms, furnishing, parking) {
    const parts = [title];

    if (bedrooms) parts.push(`${bedrooms} bedroom${bedrooms > 1 ? 's' : ''}`);
    if (bathrooms) parts.push(`${bathrooms} bathroom${bathrooms > 1 ? 's' : ''}`);
    if (furnishing && furnishing !== 'unfurnished') {
      parts.push(`${furnishing}`);
    }
    if (parking) parts.push(`${parking} parking`);

    return parts.join(' • ');
  }

  /**
   * Detect property type from title/config
   */
  detectPropertyType(text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('villa')) return 'villa';
    if (textLower.includes('apartment') || textLower.includes('apt')) return 'apartment';
    if (textLower.includes('house')) return 'house';
    if (textLower.includes('studio')) return 'studio';
    if (textLower.includes('plot')) return 'plot';
    return 'apartment';
  }

  /**
   * Detect furnishing from title/description
   */
  detectFurnishing(text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('fully furnished')) return 'furnished';
    if (textLower.includes('semi furnished')) return 'semi-furnished';
    if (textLower.includes('unfurnished')) return 'unfurnished';
    return 'unfurnished';
  }

  /**
   * Convert relative URL to absolute
   */
  absoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return this.baseUrl + url;
    return this.baseUrl + '/' + url;
  }

  /**
   * Import properties to database
   */
  async importProperties(properties) {
    const result = {
      imported: 0,
      updated: 0,
      skipped: 0
    };

    for (const property of properties) {
      try {
        // Check if property already exists
        const existing = await RentalProperty.findOne({
          sourcePortal: '99acres',
          sourceListingId: property.sourceListingId
        });

        if (existing) {
          // Update existing property
          await RentalProperty.updateOne(
            { _id: existing._id },
            {
              ...property,
              sourceCheckedAt: new Date(),
              sourceStatus: 'active'
            }
          );
          result.updated++;
        } else {
          // Create new property
          await RentalProperty.create(property);
          result.imported++;
        }
      } catch (error) {
        logger.error(`Error importing property ${property.sourceListingId}`, error);
        result.skipped++;
      }
    }

    logger.info('Import completed', result);
    return result;
  }
}

module.exports = NinetyNineAcresScraper;
