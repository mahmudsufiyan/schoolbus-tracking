const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');       // ✅ pure JS, works on Windows without build tools
const { verifyToken } = require('../middleware/auth');

// ============================================================
// GET /api/parent/children - Get all children for the logged-in parent
// ============================================================
router.get('/children', verifyToken, async (req, res) => {
    try {
        const parent_id = req.user.id;
        console.log('👨‍👩‍👧 Fetching children for parent:', parent_id);

        const result = await pool.query(
            `SELECT 
                s.id,
                s.full_name,
                s.grade,
                s.school_name,
                s.bus_id,
                s.parent_id,
                s.stop_id,
                st.stop_name,
                st.stop_order,
                s.is_active,
                b.bus_number,
                b.status AS bus_status,
                b.current_lat,
                b.current_lng,
                (SELECT status FROM trips WHERE bus_id = b.id AND status = 'in_progress' LIMIT 1) AS trip_status
             FROM students s
             LEFT JOIN buses b ON s.bus_id = b.id
             LEFT JOIN stops st ON s.stop_id = st.id
             WHERE s.parent_id = $1`,
            [parent_id]
        );

        console.log(`✅ Found ${result.rows.length} children`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error fetching parent children:', err);
        res.status(500).json({
            message: 'Server error',
            error: err.message,
            detail: err.detail,
        });
    }
});

// ============================================================
// GET /api/parent/child/:id/track - Real-time tracking for one child
// ============================================================
router.get('/child/:id/track', verifyToken, async (req, res) => {
    try {
        const childId = req.params.id;
        const parent_id = req.user.id;

        const check = await pool.query(
            `SELECT id FROM students WHERE id = $1 AND parent_id = $2`,
            [childId, parent_id]
        );
        if (check.rows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const result = await pool.query(
            `SELECT 
                s.id,
                s.full_name,
                s.grade,
                s.school_name,
                s.bus_id,
                s.stop_id,
                st.stop_name,
                st.stop_order,
                b.bus_number,
                b.status AS bus_status,
                b.current_lat,
                b.current_lng,
                t.id AS trip_id,
                t.status AS trip_status,
                t.started_at
             FROM students s
             LEFT JOIN buses b ON s.bus_id = b.id
             LEFT JOIN stops st ON s.stop_id = st.id
             LEFT JOIN trips t ON b.id = t.bus_id AND t.status = 'in_progress'
             WHERE s.id = $1`,
            [childId]
        );
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error('❌ Error tracking child:', err);
        res.status(500).json({
            message: 'Server error',
            error: err.message,
        });
    }
});

// ============================================================
// NOTIFICATIONS
// ============================================================

// GET /api/parent/notifications
router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const parent_id = req.user.id;
        const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
        const offset = parseInt(req.query.offset) || 0;

        const result = await pool.query(
            `SELECT id, type, title, message, read, metadata, created_at
             FROM notifications
             WHERE parent_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [parent_id, limit, offset]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('❌ GET /parent/notifications', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH /api/parent/notifications/:id/read
router.patch('/notifications/:id/read', verifyToken, async (req, res) => {
    try {
        const parent_id = req.user.id;
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE notifications SET read = TRUE
             WHERE id = $1 AND parent_id = $2
             RETURNING id, read`,
            [id, parent_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ success: true, notification: result.rows[0] });
    } catch (err) {
        console.error('❌ PATCH /parent/notifications/:id/read', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH /api/parent/notifications/read-all
router.patch('/notifications/read-all', verifyToken, async (req, res) => {
    try {
        const parent_id = req.user.id;
        await pool.query(
            `UPDATE notifications SET read = TRUE
             WHERE parent_id = $1 AND read = FALSE`,
            [parent_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('❌ PATCH /parent/notifications/read-all', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// DELETE /api/parent/notifications
router.delete('/notifications', verifyToken, async (req, res) => {
    try {
        const parent_id = req.user.id;
        await pool.query(`DELETE FROM notifications WHERE parent_id = $1`, [parent_id]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ DELETE /parent/notifications', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// CONTACTS
// GET /api/parent/contacts?child_id=optional
// ============================================================
router.get('/contacts', verifyToken, async (req, res) => {
    try {
        const parent_id = req.user.id;
        const childId = req.query.child_id;

        const childQ = childId
            ? `SELECT bus_id, school_name FROM students WHERE parent_id = $1 AND id = $2 LIMIT 1`
            : `SELECT bus_id, school_name FROM students WHERE parent_id = $1 AND bus_id IS NOT NULL LIMIT 1`;
        const childParams = childId ? [parent_id, childId] : [parent_id];
        const childResult = await pool.query(childQ, childParams);
        const child = childResult.rows[0] || null;

        let driver = null;
        if (child?.bus_id) {
            const r = await pool.query(
                `SELECT d.id, d.full_name, d.phone, b.bus_number
                 FROM buses b
                 LEFT JOIN users d ON d.id = b.driver_id
                 WHERE b.id = $1`,
                [child.bus_id]
            );
            if (r.rows[0]) {
                driver = {
                    id: r.rows[0].id,
                    full_name: r.rows[0].full_name || 'Driver',
                    phone: r.rows[0].phone,
                    bus_number: r.rows[0].bus_number,
                };
            }
        }

        // First admin user in system (refine if you have a school-admin link)
        let admin = null;
        try {
            const r = await pool.query(
                `SELECT id, full_name, phone, role FROM users WHERE role = 'admin' LIMIT 1`
            );
            if (r.rows[0]) admin = r.rows[0];
        } catch { /* ignore */ }

        const school = child?.school_name ? { name: child.school_name } : null;

        const emergency = [
            { label: 'Call 911', phone: '911' },
            { label: 'School Admin', phone: admin?.phone || '+251911000000' },
        ];

        const support = {
            email: 'support@schoolbus.com',
            phone: '+251911111111',
        };

        res.json({ driver, school, admin, emergency, support });
    } catch (err) {
        console.error('❌ GET /parent/contacts', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// PROFILE
// ============================================================

// GET /api/parent/profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const parent_id = req.user.id;
        const result = await pool.query(
            `SELECT id, full_name, email, phone, role, created_at
             FROM users WHERE id = $1`,
            [parent_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ GET /parent/profile', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/parent/profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const parent_id = req.user.id;
        const { full_name, phone } = req.body;

        const result = await pool.query(
            `UPDATE users
             SET full_name  = COALESCE($1, full_name),
                 phone      = COALESCE($2, phone),
                 updated_at = NOW()
             WHERE id = $3
             RETURNING id, full_name, email, phone, role`,
            [full_name || null, phone || null, parent_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ PUT /parent/profile', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/parent/change-password
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const parent_id = req.user.id;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password || new_password.length < 6) {
            return res.status(400).json({ message: 'Invalid password payload' });
        }

        // ⚠️ If your column is 'password_hash' instead of 'password', change below.
        const userResult = await pool.query(
            `SELECT password FROM users WHERE id = $1`,
            [parent_id]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const ok = await bcrypt.compare(current_password, userResult.rows[0].password);
        if (!ok) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const hash = await bcrypt.hash(new_password, 10);
        await pool.query(
            `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
            [hash, parent_id]
        );

        res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        console.error('❌ POST /parent/change-password', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;