const { Pool } = require('pg');
require('dotenv').config();

// ============================================================
// Supports BOTH:
//  - Local dev: individual DB_HOST / DB_USER / etc.
//  - Production (Render/Railway/Heroku): single DATABASE_URL
// ============================================================
let poolConfig;

if (process.env.DATABASE_URL) {
    // Production — using connection string
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost')
            ? false
            : { rejectUnauthorized: false }, // Render requires this
    };
} else {
    // Local development
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'schoolbus_db',
    };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL error:', err);
});

module.exports = pool;