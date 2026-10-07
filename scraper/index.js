#!/usr/bin/env node

/**
 * ggnHome Property Scraper
 *
 * Main entry point for property scraping system
 * Supports: NoBroker, 99acres, and other platforms
 *
 * Usage:
 *   npm start              - Run all scrapers once
 *   npm run scrape:all     - Run all scrapers
 *   npm run scrape:nobroker - Run NoBroker only
 *   npm run scrape:99acres  - Run 99acres only
 *   npm run schedule       - Start scheduler (runs daily/weekly)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');

// Import scrapers
const NoBrokerScraper = require('./scrapers/nobroker');
const NinetyNineAcresScraper = require('./scrapers/99acres');
const ScraperLog = require('./models/ScraperLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ggnhome';

/**
 * Main scraper runner
 */
class ScraperManager {
  constructor() {
    this.scrapers = {
      nobroker: new NoBrokerScraper(),
      ninetyNineAcres: new NinetyNineAcresScraper()
    };
    this.isRunning = false;
  }

  /**
   * Initialize database connection
   */
  async connectDB() {
    try {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info('Database connected successfully');
      return true;
    } catch (error) {
      logger.error('Database connection failed', error);
      return false;
    }
  }

  /**
   * Disconnect database
   */
  async disconnectDB() {
    try {
      await mongoose.disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Database disconnect failed', error);
    }
  }

  /**
   * Run all scrapers
   */
  async runAll() {
    if (this.isRunning) {
      logger.warn('Scraper already running');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    const runLog = {
      startedAt: startTime,
      scrapers: {}
    };

    try {
      logger.info('Starting all scrapers...');

      // Run NoBroker scraper
      logger.info('Running NoBroker scraper...');
      runLog.scrapers.nobroker = await this.scrapers.nobroker.run();

      // Run 99acres scraper
      logger.info('Running 99acres scraper...');
      runLog.scrapers.ninetyNineAcres = await this.scrapers.ninetyNineAcres.run();

      runLog.completedAt = new Date();
      runLog.status = 'success';
      runLog.totalDuration = runLog.completedAt - startTime;

      logger.info('All scrapers completed successfully', runLog);

      // Save to log
      await this.saveRunLog(runLog);

      return runLog;
    } catch (error) {
      runLog.status = 'failed';
      runLog.error = error.message;
      runLog.completedAt = new Date();
      runLog.totalDuration = runLog.completedAt - startTime;

      logger.error('Scraper run failed', error, runLog);
      await this.saveRunLog(runLog);

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Save run log to database
   */
  async saveRunLog(log) {
    try {
      await ScraperLog.create(log);
    } catch (error) {
      logger.error('Failed to save scraper log', error);
    }
  }

  /**
   * Run specific scraper
   */
  async runScraper(name) {
    if (this.isRunning) {
      logger.warn('Scraper already running');
      return;
    }

    this.isRunning = true;
    const scraper = this.scrapers[name];

    if (!scraper) {
      logger.error(`Unknown scraper: ${name}`);
      this.isRunning = false;
      return;
    }

    try {
      logger.info(`Running ${name} scraper...`);
      const result = await scraper.run();
      logger.info(`${name} scraper completed`, result);
      return result;
    } catch (error) {
      logger.error(`${name} scraper failed`, error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get scraper status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scrapers: Object.keys(this.scrapers)
    };
  }
}

/**
 * CLI Entry point
 */
async function main() {
  const manager = new ScraperManager();

  // Connect to database
  const connected = await manager.connectDB();
  if (!connected) {
    process.exit(1);
  }

  try {
    const command = process.argv[2] || 'all';

    switch (command) {
      case 'all':
        await manager.runAll();
        break;
      case 'nobroker':
        await manager.runScraper('nobroker');
        break;
      case '99acres':
        await manager.runScraper('ninetyNineAcres');
        break;
      case 'status':
        console.log(manager.getStatus());
        break;
      default:
        console.log(`
Usage:
  node index.js all          - Run all scrapers
  node index.js nobroker     - Run NoBroker scraper
  node index.js 99acres      - Run 99acres scraper
  node index.js status       - Show scraper status
        `);
    }
  } catch (error) {
    logger.error('Fatal error', error);
    process.exit(1);
  } finally {
    await manager.disconnectDB();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ScraperManager;
