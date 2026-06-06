const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Configure optimal connection pooling parameters
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
});

// The pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Helper to test the database connection on server startup
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the PostgreSQL database.');
    client.release();
  } catch (err) {
    console.error('Failed to connect to the PostgreSQL database:', err.message);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(), // Needed for transactions
  testConnection,
};
