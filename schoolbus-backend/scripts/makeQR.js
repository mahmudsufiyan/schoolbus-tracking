// scripts/makeQR.js
// Usage:  node scripts/makeQR.js "moha safi ebr"
const QRCode = require('qrcode');
const pool = require('../db');

const search = process.argv[2] || 'moha safi ebr';

(async () => {
    try {
        const r = await pool.query(
            `SELECT id, full_name, grade, school_name, bus_id, parent_id, qr_token
             FROM students
             WHERE full_name ILIKE $1
             ORDER BY id
             LIMIT 1`,
            [`%${search}%`]
        );

        if (r.rows.length === 0) {
            console.log('❌ No student matched:', search);
            process.exit(1);
        }

        const s = r.rows[0];

        if (!s.qr_token) {
            console.log('⚠️ Student has no qr_token. Backfilling…');
            const upd = await pool.query(
                `UPDATE students
                 SET qr_token = md5(random()::text || clock_timestamp()::text || id::text)
                            || md5(random()::text || id::text),
                     qr_token_expires = NOW() + INTERVAL '1 year'
                 WHERE id = $1
                 RETURNING qr_token`,
                [s.id]
            );
            s.qr_token = upd.rows[0].qr_token;
        }

        console.log('==================================================');
        console.log('Student ID :', s.id);
        console.log('Full Name  :', s.full_name);
        console.log('Grade      :', s.grade);
        console.log('School     :', s.school_name);
        console.log('Bus ID     :', s.bus_id);
        console.log('Parent ID  :', s.parent_id || '(none)');
        console.log('QR Token   :', s.qr_token);
        console.log('==================================================');

        const out = `qr-${s.id}-${s.full_name.replace(/\s+/g, '_')}.png`;
        await QRCode.toFile(out, s.qr_token, { width: 800, margin: 4 });
        console.log('✅ Created:', out);
        process.exit(0);
    } catch (err) {
        console.error('❌', err);
        process.exit(1);
    }
})();