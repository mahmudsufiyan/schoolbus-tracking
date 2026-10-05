const express = require('express');
const pool = require('../db');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

// GET all stops
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT s.*, b.bus_number
             FROM stops s
             LEFT JOIN buses b ON s.bus_id = b.id
             ORDER BY s.bus_id, s.stop_order`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching stops:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST create stop (Admin only)
router.post('/', verifyToken, checkRole(['admin']), async (req, res) => {
    const { bus_id, stop_name, stop_order, latitude, longitude, estimated_time_minutes } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO stops (bus_id, stop_name, stop_order, latitude, longitude, estimated_time_minutes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [bus_id, stop_name, stop_order, latitude, longitude, estimated_time_minutes || 5]
        );
        res.status(201).json({ success: true, stop: result.rows[0] });
    } catch (error) {
        console.error('Error creating stop:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Stop order already exists for this bus' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE stop (Admin only)
router.delete('/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM stops WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Stop not found' });
        }

        res.json({ success: true, message: 'Stop deleted' });
    } catch (error) {
        console.error('Error deleting stop:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;