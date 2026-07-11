const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const logger = require('./logger');

const initDatabase = async () => {
  logger.info('Starting Database Initialization...');
  try {
    const schemaPath = path.join(__dirname, '../../sql/schema.sql');
    const seedPath = path.join(__dirname, '../../sql/seed.sql');

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at: ${seedPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    logger.info('Executing DDL Schema...');
    await pool.query(schemaSql);
    logger.info('Database Schema created successfully.');

    logger.info('Executing Seed Script...');
    await pool.query(seedSql);
    logger.info('Database Seed data inserted successfully.');

    logger.info('Database Initialization Complete.');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

initDatabase();
