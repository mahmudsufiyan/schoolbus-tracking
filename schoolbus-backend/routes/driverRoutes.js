const express = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

// ============================================================
// GET /api/drivers/me - Current driver's profile
// Uses buses.driver_id JOIN (no users.bus_id column needed)
// ============================================================
router.get('/me', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.phone, u.is_approved, u.is_active, u.created_at,
                    b.id AS bus_id, b.bus_number, b.plate_number, b.capacity, b.status AS bus_status
             FROM users u
             LEFT JOIN buses b ON b.driver_id = u.id
             WHERE u.id = $1 AND u.role = 'driver'`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching driver profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// GET /api/drivers - All drivers (Admin only)
// ============================================================
router.get('/', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.phone, u.role,
                    u.is_approved, u.is_active, u.created_at,
                    b.id AS bus_id, b.bus_number
             FROM users u
             LEFT JOIN buses b ON b.driver_id = u.id
             WHERE u.role = 'driver'
             ORDER BY u.full_name`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// GET /api/drivers/:id - One driver (Admin only)
// ============================================================
router.get('/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.phone,
                    u.is_approved, u.is_active, u.created_at,
                    b.id AS bus_id, b.bus_number
             FROM users u
             LEFT JOIN buses b ON b.driver_id = u.id
             WHERE u.id = $1 AND u.role = 'driver'`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching driver:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// POST /api/drivers - Create driver (Admin only)
// ============================================================
router.post('/', verifyToken, checkRole(['admin']), async (req, res) => {
    const { full_name, email, password, phone, bus_id } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existing = await client.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password || '123456', 10);

        const result = await client.query(
            `INSERT INTO users (full_name, email, password, phone, role, is_approved, is_active)
             VALUES ($1, $2, $3, $4, 'driver', TRUE, TRUE)
             RETURNING id, full_name, email, phone, is_approved, is_active, created_at`,
            [full_name, email, hashedPassword, phone]
        );

        // If bus assigned, update buses table
        if (bus_id) {
            await client.query(
                `UPDATE buses SET driver_id = $1 WHERE id = $2`,
                [result.rows[0].id, bus_id]
            );
            result.rows[0].bus_id = bus_id;
        }

        await client.query('COMMIT');

        const io = req.app.get('io');
        io.to('admin').emit('driver-created', result.rows[0]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating driver:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// ============================================================
// PUT /api/drivers/:id - Update driver (Admin only)
// ============================================================
router.put('/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone, bus_id, is_active } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE users
             SET full_name = COALESCE($1, full_name),
                 email = COALESCE($2, email),
                 phone = COALESCE($3, phone),
                 is_active = COALESCE($4, is_active),
                 updated_at = NOW()
             WHERE id = $5 AND role = 'driver'
             RETURNING id, full_name, email, phone, is_approved, is_active`,
            [full_name, email, phone, is_active, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Handle bus assignment
        if (bus_id !== undefined) {
            // Remove from any current bus
            await client.query(
                `UPDATE buses SET driver_id = NULL WHERE driver_id = $1`,
                [id]
            );
            // Assign to new bus
            if (bus_id) {
                await client.query(
                    `UPDATE buses SET driver_id = $1 WHERE id = $2`,
                    [id, bus_id]
                );
            }
        }

        await client.query('COMMIT');

        const io = req.app.get('io');
        io.to('admin').emit('driver-updated', result.rows[0]);

        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating driver:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// ============================================================
// DELETE /api/drivers/:id - Deactivate driver (Admin only)
// ============================================================
router.delete('/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE users SET is_active = FALSE, updated_at = NOW()
             WHERE id = $1 AND role = 'driver'
             RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Driver not found' });
        }

        await client.query(
            `UPDATE buses SET driver_id = NULL WHERE driver_id = $1`,
            [id]
        );

        await client.query('COMMIT');

        const io = req.app.get('io');
        io.to('admin').emit('driver-deleted', { id });

        res.json({ success: true, message: 'Driver deactivated' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting driver:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

module.exports = router;