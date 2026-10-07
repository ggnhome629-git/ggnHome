/**
 * Property Ranking Scheduler
 * Runs nightly batch ranking recalculation for all properties
 * Scheduled for 2 AM daily using node-cron
 */

const cron = require('node-cron');
const PropertyRankingService = require('../services/PropertyRankingService');

// Run at 2 AM daily (UTC)
// Format: minute hour day month dayOfWeek
// 0 2 * * * = 2:00 AM every day
const rankingSchedule = '0 2 * * *';

const startRankingScheduler = () => {
  console.log('📊 Ranking scheduler initialized, will run daily at 2 AM UTC');

  cron.schedule(rankingSchedule, async () => {
    try {
      console.log('🔄 Starting nightly ranking recalculation...');
      const startTime = Date.now();

      const result = await PropertyRankingService.updateAllRankings();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Ranking recalculation complete in ${duration}s`);
      console.log(`   Updated: ${result.updated}, Failed: ${result.failed}`);

      // Log distribution
      if (result.distribution) {
        console.log('   Tier distribution:', {
          platinum: result.distribution.platinum || 0,
          gold: result.distribution.gold || 0,
          silver: result.distribution.silver || 0,
          bronze: result.distribution.bronze || 0,
          new: result.distribution.new || 0,
          rejected: result.distribution.rejected || 0,
          quarantined: result.distribution.quarantined || 0,
        });
      }
    } catch (error) {
      console.error('❌ Error in ranking scheduler:', error);
      // Don't rethrow - let the scheduler keep running
    }
  });
};

module.exports = { startRankingScheduler };
