require('dotenv').config();
const app = require('./app');
const { pool } = require('./src/config/db');
const logger = require('./src/config/logger');
const { initCronJobs } = require('./src/cron/cronJobs');

const PORT = process.env.PORT;

// Test DB connection before starting server
const startServer = async () => {
  try {
    // 1. Test database connection
    const client = await pool.connect();
    logger.info('Database connection success!');
    client.release();

    // 2. Test Cloudinary credentials and connectivity
    try {
      const cloudinary = require('./src/config/cloudinary');
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        await cloudinary.api.ping();
        logger.info('Cloudinary connection success!');
      } else {
        logger.warn('Cloudinary credentials missing. File uploads will fail.');
      }
    } catch (cloudinaryError) {
      logger.error('Cloudinary connection failure:', cloudinaryError.message || cloudinaryError);
    }

    // Initialize background scheduling
    initCronJobs();

    // Start listening
    const server = app.listen(PORT, () => {
      logger.info(`ViewPay Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api/v1/docs`);
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down server gracefully...');
      server.close(async () => {
        logger.info('Http server closed.');
        await pool.end();
        logger.info('Database pool ended. Exiting.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Database connection failure, server cannot start:', error);
    process.exit(1);
  }
};

// Handle process exception issues
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err);
  process.exit(1);
});

startServer();
