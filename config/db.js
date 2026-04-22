const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render') || process.env.DATABASE_URL.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : false // Enable SSL for cloud providers
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL Cloud Database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
