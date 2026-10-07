/**
 * Run all scrapers
 */

const ScraperManager = require('../index');

async function main() {
  const manager = new ScraperManager();

  try {
    await manager.connectDB();
    await manager.runAll();
  } catch (error) {
    console.error('Error running all scrapers:', error);
    process.exit(1);
  } finally {
    await manager.disconnectDB();
  }
}

main();
