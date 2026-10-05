const express = require('express');
const pool = require('../db');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();
const { notifyParentsOfBus } = require('../utils/notifyParents');

// =============================================
// GET all alerts
// =============================================
router.get('/', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, b.bus_number, u.full_name as driver_name
             FROM emergency_alerts a
             LEFT JOIN buses b ON a.bus_id = b.id
             LEFT JOIN users u ON a.driver_id = u.id
             ORDER BY a.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET active alerts only (police + admin helpers)
// =============================================
router.get('/active', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, b.bus_number, u.full_name as driver_name
             FROM emergency_alerts a
             LEFT JOIN buses b ON a.bus_id = b.id
             LEFT JOIN users u ON a.driver_id = u.id
             WHERE a.status IN ('active', 'acknowledged', 'responding')
             ORDER BY a.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching active alerts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// POST create alert (Driver)
// Notifies: police + admin + all parents on the bus
// =============================================
router.post('/', verifyToken, checkRole(['driver']), async (req, res) => {
    const { bus_id, latitude, longitude, message } = req.body;

    if (!bus_id) {
        return res.status(400).json({ message: 'Bus ID is required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO emergency_alerts (bus_id, driver_id, latitude, longitude, message, status)
             VALUES ($1, $2, $3, $4, $5, 'active')
             RETURNING *`,
            [bus_id, req.user.id, latitude || null, longitude || null, message || '🚨 Emergency activated!']
        );

        const alert = result.rows[0];
        const io = req.app.get('io');

        if (io) {
            // Enrich payload with bus_number + driver_name (non-fatal on failure)
            let busNumber = null;
            let driverName = null;
            try {
                const info = await pool.query(
                    `SELECT b.bus_number, u.full_name AS driver_name
                     FROM buses b
                     LEFT JOIN users u ON u.id = b.driver_id
                     WHERE b.id = $1`,
                    [bus_id]
                );
                if (info.rows[0]) {
                    busNumber = info.rows[0].bus_number;
                    driverName = info.rows[0].driver_name;
                }
            } catch (e) { /* non-fatal */ }

            const payload = {
                id: alert.id,
                alert_id: alert.id,
                bus_id: alert.bus_id,
                bus_number: busNumber,
                driver_name: driverName,
                latitude: alert.latitude,
                longitude: alert.longitude,
                message: alert.message,
                status: 'active',
                created_at: alert.created_at,
            };

            // 1. Police
            io.to('police').emit('emergency-alert', payload);
            console.log(`🚨 Alert sent to police for bus ${bus_id}`);

            // 2. Admin
            io.to('admin').emit('emergency-alert', payload);
            console.log(`🚨 Alert sent to admin for bus ${bus_id}`);

            // 3. Parents of students on this bus
            await notifyParentsOfBus(io, bus_id, {
                type: 'emergency',
                title: '🚨 Emergency Alert',
                message: 'Your child\'s bus has triggered an emergency alert. Help is on the way.',
                metadata: {
                    alert_id: alert.id,
                    bus_id: alert.bus_id,
                    latitude: alert.latitude,
                    longitude: alert.longitude,
                },
            });
        }

        res.status(201).json({
            success: true,
            alert,
            message: 'Emergency alert created and broadcast to police, admin, and parents'
        });
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// PUT acknowledge alert (Police or Admin)
// =============================================
router.put('/:id/acknowledge', verifyToken, checkRole(['police', 'admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE emergency_alerts
             SET status = 'acknowledged',
                 acknowledged_by = $1,
                 acknowledged_at = NOW()
             WHERE id = $2 AND status = 'active'
             RETURNING *`,
            [req.user.id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Alert not found or already acknowledged' });
        }

        const alert = result.rows[0];
        const io = req.app.get('io');
        if (io) {
            const payload = {
                id: alert.id,
                alert_id: alert.id,
                bus_id: alert.bus_id,
                status: 'acknowledged',
                acknowledged_by: alert.acknowledged_by,
                acknowledged_at: alert.acknowledged_at,
            };
            io.to('police').emit('alert-acknowledged', payload);
            io.to('admin').emit('alert-acknowledged', payload);
        }

        res.json({ success: true, alert });
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// PUT respond alert (Police or Admin)
// =============================================
router.put('/:id/respond', verifyToken, checkRole(['police', 'admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE emergency_alerts
             SET status = 'responding',
                 responded_by = $1,
                 responded_at = NOW()
             WHERE id = $2 AND status IN ('active', 'acknowledged')
             RETURNING *`,
            [req.user.id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Alert not found or already responding/resolved' });
        }

        const alert = result.rows[0];
        const io = req.app.get('io');
        if (io) {
            const payload = {
                id: alert.id,
                alert_id: alert.id,
                bus_id: alert.bus_id,
                status: 'responding',
                responded_by: alert.responded_by,
                responded_at: alert.responded_at,
            };
            io.to('police').emit('alert-responding', payload);
            io.to('admin').emit('alert-responding', payload);
        }

        res.json({ success: true, alert });
    } catch (error) {
        console.error('Error responding to alert:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// PUT resolve alert (Police or Admin)
// =============================================
router.put('/:id/resolve', verifyToken, checkRole(['police', 'admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE emergency_alerts
             SET status = 'resolved',
                 resolved_by = $1,
                 resolved_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [req.user.id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        const alert = result.rows[0];
        const io = req.app.get('io');

        if (io) {
            const payload = {
                id: alert.id,
                alert_id: alert.id,
                bus_id: alert.bus_id,
                status: 'resolved',
                resolved_at: alert.resolved_at,
            };
            io.to(`bus-${alert.bus_id}`).emit('alert-resolved', payload);
            io.to('police').emit('alert-resolved', payload);
            io.to('admin').emit('alert-resolved', payload);
        }

        res.json({
            success: true,
            alert,
            message: 'Alert resolved successfully'
        });
    } catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;