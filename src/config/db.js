const { Pool, types } = require("pg");

// Fix: Return DATE columns as strings (YYYY-MM-DD) to prevent timezone conversion issues
types.setTypeParser(1082, (str) => str);

const sslEnabled = String(process.env.PG_SSL || "").toLowerCase() === "true";

const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,

  // Connection Pool Optimization for Performance
  max: 20,                      // Maximum number of connections in pool
  min: 5,                       // Minimum number of idle connections
  idleTimeoutMillis: 30000,     // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout for acquiring new connection
  maxUses: 7500,                // Rotate connections after 7500 uses
  allowExitOnIdle: false        // Keep pool alive even when idle
});

// Error handling for unexpected pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected database pool error:', err);
});

// Optional: Log new connections (comment out in production)
// pool.on('connect', () => {
//   console.log('New database connection established');
// });

module.exports = pool;
