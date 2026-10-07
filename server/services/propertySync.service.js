/**
 * Property Sync Service
 * Verifies existing NoBroker properties, checks if still live, price changes, image changes
 * Dynamically schedules verification based on property count
 */

const axios = require("axios");
const cheerio = require("cheerio");
const { logger } = require("../config/logger");

class PropertySyncService {
  constructor() {
    this.isRunning = false;
    this.currentJob = null;
    this.stats = {
      totalRun: 0,
      successfulRuns: 0,
      failedRuns: 0,
      propertiesVerified: 0,
      propertiesLive: 0,
      propertiesDelisted: 0,
      priceChanges: 0,
      imageChanges: 0,
      lastRun: null,
      nextRun: null,
    };
    this.verificationLogs = [];
    this.timeout = 15000; // 15 second timeout (increased from 10s for verification)
    this.retryAttempts = 2; // Reduced to 2 for rate limit friendliness
    this.retryDelay = 3000; // 3 second delay between retries
    this.minDelayBetweenRequests = 2000; // 2 second delay between each property check
  }

  /**
   * Determine verification frequency dynamically based on property count
   */
  calculateNextVerification(propertyCount) {
    if (propertyCount === 0) {
      return null; // No properties to verify
    }

    // Dynamic scheduling logic
    if (propertyCount < 50) {
      // Small dataset: verify every 1-2 days (frequent)
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (propertyCount < 200) {
      // Medium dataset: verify every 2-3 days
      return new Date(Date.now() + 48 * 60 * 60 * 1000);
    } else if (propertyCount < 500) {
      // Large dataset: verify every 3-4 days
      return new Date(Date.now() + 72 * 60 * 60 * 1000);
    } else {
      // Very large dataset: verify every 4-5 days (spread out to avoid rate limits)
      return new Date(Date.now() + 96 * 60 * 60 * 1000);
    }
  }

  /**
   * Start property verification job
   */
  async startVerificationJob(source = "nobroker") {
    if (this.isRunning) {
      throw new Error("Verification already running");
    }

    this.isRunning = true;
    this.stats.totalRun += 1;

    const jobId = `verify_${Date.now()}`;
    this.currentJob = {
      jobId,
      status: "running",
      source,
      startTime: new Date(),
      progress: {
        total: 0,
        verified: 0,
        live: 0,
        delisted: 0,
        currentProperty: null,
      },
    };

    this.addLog("info", "Property verification started", { source });
    logger.scraper("info", "Property verification job started", { source });

    try {
      await this.runVerification(source);
      this.stats.successfulRuns += 1;
      this.currentJob.status = "completed";
      this.addLog("info", "Property verification completed successfully", {
        verified: this.currentJob.progress.verified,
        live: this.currentJob.progress.live,
        delisted: this.currentJob.progress.delisted,
      });
    } catch (error) {
      this.stats.failedRuns += 1;
      this.currentJob.status = "failed";
      this.addLog("error", "Property verification failed", {
        error: error.message,
      });
      logger.scraper("error", "Property verification failed", {
        error: error.message,
      });
    } finally {
      this.stats.lastRun = new Date();
      this.isRunning = false;

      // Calculate next verification time
      const propertyCount = this.currentJob.progress.total;
      this.stats.nextRun = this.calculateNextVerification(propertyCount);

      this.currentJob.endTime = new Date();
      this.currentJob.completedAt = new Date().toISOString();
    }
  }

  /**
   * Main verification logic
   */
  async runVerification(source) {
    // This would fetch properties from database
    // For now, return mock data structure
    // In real implementation: const properties = await Property.find({ source });

    const properties = [
      {
        _id: "prop_1",
        sourceId: "nobroker_123",
        title: "2 BHK Apartment",
        price: 45000,
        location: "Gurgaon",
        sourceUrl: "https://www.nobroker.in/property/rent/gurgaon/...",
        images: ["img1.jpg", "img2.jpg"],
        lastVerified: null,
      },
      // ... more properties from DB
    ];

    this.currentJob.progress.total = properties.length;

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];

      // Update current property being checked
      this.currentJob.progress.currentProperty = {
        title: property.title,
        location: property.location,
        progress: `${i + 1}/${properties.length}`,
      };

      try {
        // Fetch current data from source
        const currentData = await this.fetchPropertyData(property.sourceUrl);

        if (!currentData) {
          // Property delisted
          this.currentJob.progress.delisted += 1;
          this.addLog("warn", "Property delisted", {
            title: property.title,
            location: property.location,
          });

          // Update property in DB: mark as delisted
          // await Property.updateOne({ _id: property._id }, { status: 'delisted', verifiedAt: new Date() });
        } else {
          // Property still live
          this.currentJob.progress.live += 1;

          // Check for changes
          const changes = this.detectChanges(property, currentData);

          if (changes.priceChanged) {
            this.stats.priceChanges += 1;
            this.addLog("info", "Price changed", {
              title: property.title,
              oldPrice: property.price,
              newPrice: currentData.price,
            });
          }

          if (changes.imagesChanged) {
            this.stats.imageChanges += 1;
            this.addLog("info", "Images changed", {
              title: property.title,
              oldCount: property.images?.length,
              newCount: currentData.images?.length,
            });
          }

          // Update property in DB
          // await Property.updateOne(
          //   { _id: property._id },
          //   {
          //     ...currentData,
          //     verifiedAt: new Date(),
          //     isLive: true,
          //     changes: changes.summary,
          //   }
          // );
        }

        this.currentJob.progress.verified += 1;
        this.stats.propertiesVerified += 1;

        // Add delay between requests to avoid rate limiting
        if (i < properties.length - 1) {
          await this.sleep(this.minDelayBetweenRequests);
        }
      } catch (error) {
        this.addLog("error", "Failed to verify property", {
          title: property.title,
          error: error.message,
        });
        logger.scraper("error", "Property verification failed", {
          property: property.title,
          error: error.message,
        });
      }
    }

    logger.scraper("info", "Property verification completed", {
      total: this.currentJob.progress.total,
      verified: this.currentJob.progress.verified,
      live: this.currentJob.progress.live,
      delisted: this.currentJob.progress.delisted,
      priceChanges: this.stats.priceChanges,
      imageChanges: this.stats.imageChanges,
    });
  }

  /**
   * Fetch current property data from NoBroker
   * Returns null if property not found (delisted)
   */
  async fetchPropertyData(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        maxRedirects: 5,
      });

      if (response.status === 404) {
        return null; // Property delisted
      }

      const $ = cheerio.load(response.data);

      // Parse property data
      const data = {
        title: $("h1.property-title").text().trim(),
        price: this.parsePrice($(".price").text()),
        location: $(".location").text().trim(),
        bhk: this.parseBhk($(".bhk").text()),
        area: this.parseArea($(".area").text()),
        images: $("img.property-image")
          .map((_, el) => $(el).attr("src"))
          .get(),
        description: $(".description").text().trim(),
        updatedAt: new Date(),
      };

      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Property delisted
      }
      throw new Error(`Failed to fetch property: ${error.message}`);
    }
  }

  /**
   * Detect changes between old and new property data
   */
  detectChanges(oldProperty, newProperty) {
    const changes = {
      priceChanged: oldProperty.price !== newProperty.price,
      imagesChanged:
        oldProperty.images?.length !== newProperty.images?.length,
      descriptionChanged: oldProperty.description !== newProperty.description,
      summary: [],
    };

    if (changes.priceChanged) {
      changes.summary.push(
        `Price changed from ₹${oldProperty.price} to ₹${newProperty.price}`
      );
    }

    if (changes.imagesChanged) {
      changes.summary.push(
        `Images changed from ${oldProperty.images?.length} to ${newProperty.images?.length}`
      );
    }

    if (changes.descriptionChanged) {
      changes.summary.push("Description updated");
    }

    return changes;
  }

  /**
   * Parse price from string
   */
  parsePrice(priceStr) {
    if (!priceStr) return null;

    let cleaned = priceStr
      .replace(/[₹$]/g, "")
      .replace(/,/g, "")
      .trim();

    if (cleaned.endsWith("K")) {
      return parseInt(cleaned.replace("K", "")) * 1000;
    }

    if (cleaned.endsWith("L")) {
      return parseInt(cleaned.replace("L", "")) * 100000;
    }

    const num = parseInt(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Parse BHK from string
   */
  parseBhk(bhkStr) {
    if (!bhkStr) return null;
    const match = bhkStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Parse area from string
   */
  parseArea(areaStr) {
    if (!areaStr) return null;
    const match = areaStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Get current verification status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentJob: this.currentJob,
      stats: this.stats,
      nextVerificationSchedule: this.stats.nextRun,
    };
  }

  /**
   * Get verification logs
   */
  getLogs(limit = 100) {
    return this.verificationLogs.slice(-limit).reverse();
  }

  /**
   * Add log entry
   */
  addLog(level, message, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    };

    this.verificationLogs.push(logEntry);

    // Keep only last 1000 logs
    if (this.verificationLogs.length > 1000) {
      this.verificationLogs = this.verificationLogs.slice(-1000);
    }
  }

  /**
   * Stop verification job
   */
  stopJob() {
    if (!this.isRunning) {
      throw new Error("No verification running");
    }

    this.isRunning = false;
    this.addLog("info", "Verification stopped by user");
    return {
      status: "stopped",
      message: "Verification job stopped",
      progress: this.currentJob.progress,
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get detailed verification report
   */
  getDetailedReport() {
    return {
      summary: {
        totalPropertiesInDB: this.currentJob?.progress.total || 0,
        propertiesVerified: this.currentJob?.progress.verified || 0,
        propertiesRemaining:
          (this.currentJob?.progress.total || 0) -
          (this.currentJob?.progress.verified || 0),
        percentageComplete:
          this.currentJob?.progress.total > 0
            ? Math.round(
                (this.currentJob.progress.verified /
                  this.currentJob.progress.total) *
                  100
              )
            : 0,
      },
      liveStatus: {
        live: this.currentJob?.progress.live || 0,
        delisted: this.currentJob?.progress.delisted || 0,
      },
      changes: {
        priceChanges: this.stats.priceChanges,
        imageChanges: this.stats.imageChanges,
      },
      currentlyChecking: this.currentJob?.progress.currentProperty || null,
      jobTiming: {
        startTime: this.currentJob?.startTime || null,
        endTime: this.currentJob?.endTime || null,
        elapsedSeconds: this.currentJob
          ? Math.floor(
              (this.currentJob.endTime || new Date() - this.currentJob.startTime) /
                1000
            )
          : 0,
      },
      scheduling: {
        lastRun: this.stats.lastRun,
        nextScheduledRun: this.stats.nextRun,
        daysSinceLastRun: this.stats.lastRun
          ? Math.floor((new Date() - new Date(this.stats.lastRun)) / (1000 * 60 * 60 * 24))
          : null,
      },
      performanceMetrics: {
        totalRuns: this.stats.totalRun,
        successfulRuns: this.stats.successfulRuns,
        failedRuns: this.stats.failedRuns,
        successRate:
          this.stats.totalRun > 0
            ? Math.round(
                (this.stats.successfulRuns / this.stats.totalRun) * 100
              )
            : 0,
      },
    };
  }
}

module.exports = new PropertySyncService();
