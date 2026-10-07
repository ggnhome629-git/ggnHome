/**
 * Scheduler for property scrapers
 * Runs scrapers on a schedule (default: Fridays at 9 AM)
 */

require('dotenv').config();
const cron = require('node-cron');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const ScraperManager = require('./index');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ggnhome';
const SCHEDULE_TIME = process.env.SCHEDULE_TIME || '0 9 * * 5'; // Fridays at 9 AM

class ScraperScheduler {
  constructor() {
    this.manager = new ScraperManager();
    this.task = null;
  }

  /**
   * Initialize scheduler
   */
  async init() {
    try {
      await this.manager.connectDB();
      logger.info('Scheduler initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduler', error);
      throw error;
    }
  }

  /**
   * Start scheduler
   */
  async start() {
    if (!this.task) {
      logger.info(`Starting scheduler with schedule: ${SCHEDULE_TIME}`);

      this.task = cron.schedule(SCHEDULE_TIME, () => {
        logger.info('Scheduled scraper run started');
        this.runScraping().catch(error => {
          logger.error('Scheduled scraper run failed', error);
        });
      });

      logger.info('Scheduler started successfully');
    } else {
      logger.warn('Scheduler is already running');
    }
  }

  /**
   * Stop scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Run scraping immediately
   */
  async runScraping() {
    try {
      logger.info('Running scheduled scrapers...');
      await this.manager.runAll();
      logger.info('Scheduled scrapers completed');
    } catch (error) {
      logger.error('Scheduled scrapers failed', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: !!this.task,
      schedule: SCHEDULE_TIME,
      nextRun: this.task ? 'See cron logs' : 'Not running'
    };
  }

  /**
   * Cleanup
   */
  async cleanup() {
    this.stop();
    await this.manager.disconnectDB();
  }
}

/**
 * CLI Entry point
 */
async function main() {
  const scheduler = new ScraperScheduler();

  try {
    await scheduler.init();

    const command = process.argv[2] || 'start';

    switch (command) {
      case 'start':
        await scheduler.start();
        console.log('Scheduler running. Press Ctrl+C to stop.');
        // Keep process running
        process.on('SIGINT', async () => {
          console.log('Stopping scheduler...');
          await scheduler.cleanup();
          process.exit(0);
        });
        break;

      case 'run':
        await scheduler.runScraping();
        await scheduler.cleanup();
        break;

      case 'status':
        console.log(scheduler.getStatus());
        await scheduler.cleanup();
        break;

      default:
        console.log(`
Usage:
  node scheduler.js start  - Start scheduler daemon
  node scheduler.js run    - Run scrapers immediately
  node scheduler.js status - Show scheduler status
        `);
        await scheduler.cleanup();
    }
  } catch (error) {
    logger.error('Scheduler error', error);
    await scheduler.cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ScraperScheduler;
