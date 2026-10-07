/**
 * Lightweight Headless Scraper for Render Free Tier (512 MB)
 * Uses Cheerio instead of Puppeteer to minimize memory usage
 * Falls back to HTTP requests with retry logic
 */

const axios = require("axios");
const cheerio = require("cheerio");
const { logger } = require("../config/logger");

class HeadlessScraper {
  constructor() {
    this.timeout = 10000; // 10 second timeout
    this.retryAttempts = 3;
    this.retryDelay = 2000; // 2 second delay between retries
    this.maxConcurrent = 2; // Limit concurrent requests for free tier
  }

  /**
   * Make HTTP request with retry logic
   * Optimized for free-tier servers
   */
  async fetchWithRetry(url, options = {}) {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      ...options.headers,
    };

    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: this.timeout,
          headers,
          maxRedirects: 5,
          ...options,
        });

        logger.scraper("info", "HTTP request successful", {
          url: url.substring(0, 100),
          attempt,
          status: response.status,
        });

        return response;
      } catch (error) {
        lastError = error;

        logger.scraper("warn", "HTTP request failed, retrying", {
          url: url.substring(0, 100),
          attempt,
          error: error.message,
        });

        // Wait before retrying (exponential backoff)
        if (attempt < this.retryAttempts) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Failed to fetch ${url} after ${this.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Parse HTML content using Cheerio
   * Memory-efficient alternative to Puppeteer
   */
  async parseHTML(html) {
    try {
      const $ = cheerio.load(html);
      return $;
    } catch (error) {
      logger.scraper("error", "HTML parsing failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Scrape NoBroker listings - lightweight version
   */
  async scrapeNoBroker() {
    logger.scraper("info", "Starting NoBroker scraper (lightweight)");

    const properties = [];
    const errors = [];

    try {
      // Scrape Gurgaon rental properties
      const rentalUrl = "https://www.nobroker.in/property/rent/gurgaon";

      try {
        const response = await this.fetchWithRetry(rentalUrl);
        const $ = await this.parseHTML(response.data);

        // Example selectors - adjust based on actual NoBroker HTML structure
        $("div[data-property]").each((index, element) => {
          try {
            if (index >= 10) return; // Limit to 10 per page to save resources

            const $el = cheerio.load(element);
            const property = {
              source: "nobroker",
              sourceId: $el.attr("data-property-id") || `nb_${Date.now()}_${index}`,
              title: $el.find("h2.property-title").text().trim(),
              price: this.parsePrice($el.find(".price").text()),
              location: $el.find(".location").text().trim(),
              bhk: this.parseBhk($el.find(".bhk").text()),
              bath: this.parseBath($el.find(".bath").text()),
              area: this.parseArea($el.find(".area").text()),
              furnished: $el.find(".furnished").text().toLowerCase().includes("furnished"),
              url: rentalUrl,
              scrapedAt: new Date(),
            };

            if (property.title && property.price) {
              properties.push(property);
            }
          } catch (err) {
            errors.push({
              index,
              error: err.message,
            });
          }
        });

        logger.scraper("info", "NoBroker rental scrape completed", {
          count: properties.length,
          errors: errors.length,
        });
      } catch (error) {
        errors.push({ url: rentalUrl, error: error.message });
        logger.scraper("error", "NoBroker rental scrape failed", {
          url: rentalUrl,
          error: error.message,
        });
      }

      return {
        source: "nobroker",
        count: properties.length,
        properties,
        errors,
      };
    } catch (error) {
      logger.scraper("error", "NoBroker scraper failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Scrape 99acres listings - lightweight version
   */
  async scrapeNinetyNineAcres() {
    logger.scraper("info", "Starting 99acres scraper (lightweight)");

    const properties = [];
    const errors = [];

    try {
      const rentalUrl = "https://www.99acres.com/search/home-rent-gurgaon";

      try {
        const response = await this.fetchWithRetry(rentalUrl);
        const $ = await this.parseHTML(response.data);

        // Example selectors - adjust based on actual 99acres HTML structure
        $(".property-card").each((index, element) => {
          try {
            if (index >= 10) return; // Limit to save resources

            const $el = cheerio.load(element);
            const property = {
              source: "99acres",
              sourceId: $el.attr("data-id") || `99acres_${Date.now()}_${index}`,
              title: $el.find(".property-name").text().trim(),
              price: this.parsePrice($el.find(".property-price").text()),
              location: $el.find(".property-location").text().trim(),
              bhk: this.parseBhk($el.find(".bhk-info").text()),
              bath: this.parseBath($el.find(".bath-info").text()),
              area: this.parseArea($el.find(".area-info").text()),
              furnished: $el.find(".furnished-info").text().toLowerCase().includes("furnished"),
              url: rentalUrl,
              scrapedAt: new Date(),
            };

            if (property.title && property.price) {
              properties.push(property);
            }
          } catch (err) {
            errors.push({
              index,
              error: err.message,
            });
          }
        });

        logger.scraper("info", "99acres scrape completed", {
          count: properties.length,
          errors: errors.length,
        });
      } catch (error) {
        errors.push({ url: rentalUrl, error: error.message });
        logger.scraper("error", "99acres scrape failed", {
          url: rentalUrl,
          error: error.message,
        });
      }

      return {
        source: "99acres",
        count: properties.length,
        properties,
        errors,
      };
    } catch (error) {
      logger.scraper("error", "99acres scraper failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Parse price string to number
   * Handles: "₹45,000", "45000", "45K", etc.
   */
  parsePrice(priceStr) {
    if (!priceStr) return null;

    // Remove currency symbols and commas
    let cleaned = priceStr
      .replace(/[₹$]/g, "")
      .replace(/,/g, "")
      .trim();

    // Handle K suffix (thousands)
    if (cleaned.endsWith("K")) {
      return parseInt(cleaned.replace("K", "")) * 1000;
    }

    // Handle L suffix (lakhs)
    if (cleaned.endsWith("L")) {
      return parseInt(cleaned.replace("L", "")) * 100000;
    }

    const num = parseInt(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Parse BHK from string
   * Handles: "2 BHK", "2-BHK", "2BHK", etc.
   */
  parseBhk(bhkStr) {
    if (!bhkStr) return null;
    const match = bhkStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Parse bathrooms from string
   */
  parseBath(bathStr) {
    if (!bathStr) return null;
    const match = bathStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Parse area from string
   * Handles: "800 sqft", "800sq.ft", "0.8 sqm", etc.
   */
  parseArea(areaStr) {
    if (!areaStr) return null;
    const match = areaStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Rate limit helper - process items sequentially to avoid rate limiting
   */
  async processSequentially(items, processor, delay = 1000) {
    const results = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const result = await processor(items[i]);
        results.push(result);

        // Add delay between requests
        if (i < items.length - 1) {
          await this.sleep(delay);
        }
      } catch (error) {
        logger.scraper("error", "Processing failed", {
          item: i,
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = new HeadlessScraper();
