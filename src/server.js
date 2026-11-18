/**
 * Smart Recipe Generator - Server Entry Point
 */

const app = require('./app');
const { getPool } = require('./db/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Initialize Database connection (MySQL or fallback)
  await getPool();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Smart Recipe Generator berjalan di port ${PORT}`);
    console.log(`  Akses aplikasi: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
