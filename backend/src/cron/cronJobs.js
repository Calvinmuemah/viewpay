const cron = require('node-cron');
const db = require('../config/db');
const logger = require('../config/logger');

// Reset daily spending limits for all active campaigns at midnight (00:00)
const initCronJobs = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily cron job: Resetting campaign daily budgets...');
    try {
      const res = await db.query('UPDATE campaigns SET daily_spent = 0.00');
      logger.info(`Successfully reset daily spent limits for ${res.rowCount} campaigns.`);
    } catch (error) {
      logger.error('Error executing daily campaign budget reset cron:', error);
    }
  });

  logger.info('Background scheduler initialized successfully.');
};

module.exports = {
  initCronJobs
};
