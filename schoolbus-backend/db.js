
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
            : { rejectUnauthorized: false },
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

// ============================================================
// TEMPORARY DATABASE DIAGNOSTICS
// ============================================================
(async () => {
    try {
        const result = await pool.query(`
            SELECT
                current_database() AS database_name,
                current_schema() AS schema_name,
                current_user AS database_user
        `);

        console.log('🔍 DATABASE INFO:', result.rows[0]);

        const columns = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'student_scans'
            ORDER BY ordinal_position
        `);

        console.log(
            '🔍 STUDENT SCANS COLUMNS:',
            columns.rows.map(row => row.column_name)
        );

    } catch (error) {
        console.error('❌ DATABASE DIAGNOSTIC ERROR:', error);
    }
})();

module.exports = pool;
