const express = require('express');
const pool = require('../db');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

// ============================================================
// GET /api/buses - Get all buses
// ============================================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT b.*, 
                    u.full_name AS driver_name,
                    u.phone AS driver_phone
             FROM buses b
             LEFT JOIN users u ON b.driver_id = u.id
             ORDER BY b.id`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching buses:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// GET /api/buses/:id/stops - Get stops for a specific bus
// IMPORTANT: This MUST come BEFORE /:id
// ============================================================
router.get('/:id/stops', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT id, stop_name, stop_order, latitude, longitude, bus_id
             FROM stops
             WHERE bus_id = $1
             ORDER BY stop_order ASC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error fetching stops:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// GET /api/buses/:id - Get bus by ID with driver info
// ============================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT b.*, 
                    u.id AS driver_id,
                    u.full_name AS driver_name,
                    u.phone AS driver_phone
             FROM buses b
             LEFT JOIN users u ON b.driver_id = u.id
             WHERE b.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching bus:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// POST /api/buses - Create bus (Admin only)
// ============================================================
router.post('/', verifyToken, checkRole(['admin']), async (req, res) => {
    const { bus_number, plate_number, capacity, driver_id } = req.body;

    try {
        // 🆕 If a driver is provided, make sure they're not already on another bus
        if (driver_id) {
            const existing = await pool.query(
                `SELECT id, bus_number FROM buses WHERE driver_id = $1`,
                [driver_id]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({
                    message: `Driver already assigned to bus ${existing.rows[0].bus_number}`,
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO buses (bus_number, plate_number, capacity, driver_id, status)
             VALUES ($1, $2, $3, $4, 'inactive')
             RETURNING *`,
            [bus_number, plate_number, capacity || 40, driver_id || null]
        );

        // 🆕 Tell any connected driver socket to rejoin the new bus room
        const io = req.app.get('io');
        if (io && driver_id) {
            io.emit('driver-assigned', {
                bus_id: Number(result.rows[0].id),
                driver_id: Number(driver_id),
            });
        }

        res.status(201).json({ success: true, bus: result.rows[0] });
    } catch (error) {
        console.error('Error creating bus:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Bus number or plate number already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// 🆕 PUT /api/buses/:id - Update bus (Admin only)
// Allows updating bus_number, plate_number, capacity, driver_id, status
// ============================================================
router.put('/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { bus_number, plate_number, capacity, driver_id, status } = req.body;

    try {
        // If a driver is being set, make sure they aren't already on another bus
        if (driver_id) {
            const existing = await pool.query(
                `SELECT id, bus_number FROM buses WHERE driver_id = $1 AND id <> $2`,
                [driver_id, id]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({
                    message: `Driver already assigned to bus ${existing.rows[0].bus_number}`,
                });
            }
        }

        const result = await pool.query(
            `UPDATE buses
             SET bus_number   = COALESCE($1, bus_number),
                 plate_number = COALESCE($2, plate_number),
                 capacity     = COALESCE($3, capacity),
                 driver_id    = $4,
                 status       = COALESCE($5, status)
             WHERE id = $6
             RETURNING *`,
            [
                bus_number || null,
                plate_number || null,
                capacity || null,
                driver_id || null,   // null = unassign
                status || null,
                id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        // Notify the driver's socket so they can rejoin the new bus room
        const io = req.app.get('io');
        if (io && driver_id) {
            io.emit('driver-assigned', {
                bus_id: Number(id),
                driver_id: Number(driver_id),
            });
        }

        res.json({ success: true, bus: result.rows[0] });
    } catch (error) {
        console.error('❌ PUT /buses/:id', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Bus number or plate number already exists' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============================================================
// 🆕 PUT /api/buses/:id/assign-driver - Quick assignment from the buses table
// Body: { driver_id: 4 }  (null to unassign)
// ============================================================
router.put('/:id/assign-driver', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { driver_id } = req.body;

    try {
        // Bus must exist
        const busCheck = await pool.query(`SELECT id FROM buses WHERE id = $1`, [id]);
        if (busCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        // If a driver is provided, validate it
        if (driver_id) {
            const driverCheck = await pool.query(
                `SELECT id FROM users WHERE id = $1 AND role = 'driver'`,
                [driver_id]
            );
            if (driverCheck.rows.length === 0) {
                return res.status(400).json({ message: 'User is not a driver' });
            }

            const existing = await pool.query(
                `SELECT bus_number FROM buses WHERE driver_id = $1 AND id <> $2`,
                [driver_id, id]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({
                    message: `Driver already assigned to bus ${existing.rows[0].bus_number}`,
                });
            }
        }

        const result = await pool.query(
            `UPDATE buses SET driver_id = $1 WHERE id = $2
             RETURNING id, bus_number, driver_id`,
            [driver_id || null, id]
        );

        // Notify driver socket
        const io = req.app.get('io');
        if (io && driver_id) {
            io.emit('driver-assigned', {
                bus_id: Number(id),
                driver_id: Number(driver_id),
            });
        }

        res.json({ success: true, bus: result.rows[0] });
    } catch (err) {
        console.error('❌ PUT /buses/:id/assign-driver', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// 🆕 DELETE /api/buses/:id - Delete a bus (Admin only)
// Unassigns students + stops + driver, then deletes the bus row
// ============================================================
router.delete('/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Verify the bus exists
        const busCheck = await client.query(
            `SELECT id, bus_number FROM buses WHERE id = $1`,
            [id]
        );
        if (busCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Bus not found' });
        }

        // 2. Unassign students from this bus
        await client.query(
            `UPDATE students SET bus_id = NULL WHERE bus_id = $1`,
            [id]
        );

        // 3. Unassign stops from this bus
        await client.query(
            `UPDATE stops SET bus_id = NULL WHERE bus_id = $1`,
            [id]
        );

        // 4. Unassign the driver (explicit, though deleting the bus row also does it)
        await client.query(
            `UPDATE buses SET driver_id = NULL WHERE id = $1`,
            [id]
        );

        // 5. Delete the bus row
        await client.query(`DELETE FROM buses WHERE id = $1`, [id]);

        await client.query('COMMIT');

        // Notify sockets
        const io = req.app.get('io');
        if (io) {
            io.to('admin').emit('bus-deleted', { id: Number(id) });
        }

        res.json({ success: true, message: 'Bus deleted', id: Number(id) });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ DELETE /buses/:id', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        client.release();
    }
});

// ============================================================
// POST /api/buses/:id/location - Update bus location (Driver)
// Broadcasts to: bus room (parents + driver), police, admin
// ============================================================
router.post('/:id/location', verifyToken, checkRole(['driver']), async (req, res) => {
    const { id } = req.params;
    const { latitude, longitude, speed } = req.body;

    console.log(`📍 POST /buses/${id}/location from driver ${req.user.id}:`, {
        latitude, longitude, speed
    });

    try {
        // 1. Verify driver is assigned to this bus
        const check = await pool.query(
            'SELECT id FROM buses WHERE id = $1 AND driver_id = $2',
            [id, req.user.id]
        );

        if (check.rows.length === 0) {
            console.warn(`⚠️  Driver ${req.user.id} tried to update bus ${id} (not assigned)`);
            return res.status(404).json({ message: 'Bus not found or not assigned to you' });
        }

        // 2. Save to database
        await pool.query(
            `UPDATE buses 
             SET current_lat = $1, 
                 current_lng = $2, 
                 last_location_update = NOW()
             WHERE id = $3`,
            [latitude, longitude, id]
        );

        // 3. Broadcast via Socket.io
        const io = req.app.get('io');
        if (io) {
            const payload = {
                bus_id: parseInt(id),
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                speed: parseFloat(speed) || 0,
                timestamp: new Date().toISOString(),
            };

            io.to(`bus-${id}`).emit('bus-location-updated', payload);
            console.log(`📡 Broadcasted to bus-${id}:`, payload);

            io.to('police').emit('bus-location-updated', payload);
            io.to('admin').emit('bus-location-updated', payload);

            const roomsInBus = Array.from(io.sockets.adapter.rooms.get(`bus-${id}`) || []);
            console.log(`📊 Room bus-${id} has ${roomsInBus.length} clients:`, roomsInBus);
        } else {
            console.warn('⚠️  No io instance available');
        }

        res.json({
            success: true,
            message: 'Location updated',
            busId: id,
            location: { latitude, longitude },
        });
    } catch (error) {
        console.error('❌ Error updating location:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;