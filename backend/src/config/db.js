const { Pool } = require('pg');
const logger = require('./logger');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'viewpay'}`,
  ssl: (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech')) || process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
  max: 20, // max number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err);
});

module.exports = {
  pool,
  /**
   * Run a raw query
   * @param {string} text 
   * @param {any[]} params 
   */
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Query execution error', { text, error });
      throw error;
    }
  },
  
  /**
   * Execute transaction block
   * @param {function(Client): Promise<any>} callback 
   */
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rollback error', error);
      throw error;
    } finally {
      client.release();
    }
  }
};
