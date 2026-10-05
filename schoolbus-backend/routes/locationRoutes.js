const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// POST /api/buses/location - Update bus GPS
router.post('/location', verifyToken, async (req, res) => {
    const { bus_id, latitude, longitude, speed } = req.body;
    try {
        await pool.query(
            `UPDATE buses SET current_lat = $1, current_lng = $2, last_location_update = NOW()
             WHERE id = $3`,
            [latitude, longitude, bus_id]
        );
        const io = req.app.get('io');
        io.emit('bus-location-updated', {
            bus_id,
            latitude,
            longitude,
            speed: speed || 0,
            timestamp: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;