/**
 * Smart Recipe Generator - Database Connection & Abstraction
 * Supports MySQL 8 via mysql2/promise, with in-memory fallback for test/offline environments
 */

const mysql = require('mysql2/promise');

let pool = null;
let isConnected = false;
let hasWarned = false;

// In-Memory store fallback
const inMemoryDb = {
  users: [],
  saved_recipes: [],
  userIdSeq: 1,
  recipeIdSeq: 1
};

async function getPool() {
  if (pool) return pool;

  // If in test mode or already failed, avoid repeated reconnection attempts
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_WITH_MYSQL) {
    return null;
  }

  // Try creating MySQL pool
  try {
    const config = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'smart_recipe_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

    const candidatePool = mysql.createPool(config);
    // Ping to verify connectivity and run non-destructive schema migrations
    const connection = await candidatePool.getConnection();
    try {
      await connection.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profil_pantangan JSON NULL');
      await connection.query('ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS catatan VARCHAR(1000) NULL');
    } catch (migErr) {
      // Ignore if columns already exist or MySQL version doesn't support IF NOT EXISTS in ALTER
    }
    connection.release();
    pool = candidatePool;
    isConnected = true;
    console.log('[DB] Terhubung ke basis data MySQL:', config.database);
    return pool;
  } catch (err) {
    if (!hasWarned) {
      console.warn('[DB] MySQL tidak dapat dihubungi, menggunakan In-Memory Adapter:', err.message);
      hasWarned = true;
    }
    isConnected = false;
    pool = null;
    return null;
  }
}

function resetInMemoryDb() {
  inMemoryDb.users = [];
  inMemoryDb.saved_recipes = [];
  inMemoryDb.userIdSeq = 1;
  inMemoryDb.recipeIdSeq = 1;
}

module.exports = {
  getPool,
  isMySQLConnected: () => isConnected,
  inMemoryDb,
  resetInMemoryDb
};
