const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, checkRole } = require('../middleware/auth');
const { notifyParentsOfBus } = require('../utils/notifyParents');

// ============================================================
// POST /api/trips - Start a new trip
// ============================================================
router.post('/', verifyToken, async (req, res) => {
    const { bus_id } = req.body;
    const driver_id = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            `SELECT id FROM trips WHERE driver_id = $1 AND status = 'in_progress'`,
            [driver_id]
        );
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'You already have an active trip' });
        }

        const busResult = await client.query(
            `SELECT bus_number FROM buses WHERE id = $1`,
            [bus_id]
        );
        if (busResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Bus not found' });
        }
        const busNumber = busResult.rows[0].bus_number;

        const tripResult = await client.query(
            `INSERT INTO trips (bus_id, driver_id, status, started_at)
             VALUES ($1, $2, 'in_progress', NOW())
             RETURNING *`,
            [bus_id, driver_id]
        );
        const trip = tripResult.rows[0];

        await client.query(
            `UPDATE buses SET status = 'on_route' WHERE id = $1`,
            [bus_id]
        );

        await client.query('COMMIT');

        const io = req.app.get('io');
        if (io) {
            await notifyParentsOfBus(io, bus_id, {
                type: 'trip-started',
                title: '🚌 Bus is on the way!',
                message: `Bus ${busNumber} has started the route.`,
                metadata: { trip_id: trip.id, bus_number: busNumber },
            });

            io.to(`bus-${bus_id}`).emit('trip-started', {
                trip_id: trip.id,
                bus_id: bus_id,
                bus_number: busNumber,
                driver_id: driver_id,
                started_at: trip.started_at,
                message: `🚌 Bus ${busNumber} has started the route!`,
            });

            io.to('police').emit('trip-started', {
                trip_id: trip.id,
                bus_id: bus_id,
                bus_number: busNumber,
                started_at: trip.started_at,
            });

            io.to('admin').emit('trip-started', {
                trip_id: trip.id,
                bus_id: bus_id,
                bus_number: busNumber,
            });
        }

        res.status(201).json(trip);
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (e) {}
        console.error('❌ Start trip error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
        client.release();
    }
});

// ============================================================
// GET /api/trips/active - Get active trip for current driver
// ============================================================
router.get('/active', verifyToken, async (req, res) => {
    try {
        const driver_id = req.user.id;
        const result = await pool.query(
            `SELECT t.*, b.bus_number
             FROM trips t
             JOIN buses b ON t.bus_id = b.id
             WHERE t.driver_id = $1 AND t.status = 'in_progress'
             ORDER BY t.started_at DESC LIMIT 1`,
            [driver_id]
        );
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error('Active trip error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
// ============================================================
// 🆕 GET /api/trips/my-history?limit=30
// Returns the logged-in driver's completed + in-progress trips
// ============================================================
router.get('/my-history', verifyToken, async (req, res) => {
    try {
        const driver_id = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 30, 100);

        const result = await pool.query(
            `SELECT
                t.id,
                t.bus_id,
                b.bus_number,
                t.started_at,
                t.ended_at,
                t.status,
                EXTRACT(EPOCH FROM (COALESCE(t.ended_at, NOW()) - t.started_at))::int
                    AS duration_seconds,
                (SELECT COUNT(*) FROM stop_arrivals sa
                 WHERE sa.trip_id = t.id AND sa.stage = 'arrived') AS stops_visited
             FROM trips t
             LEFT JOIN buses b ON b.id = t.bus_id
             WHERE t.driver_id = $1
             ORDER BY t.started_at DESC
             LIMIT $2`,
            [driver_id, limit]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('❌ GET /trips/my-history', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
// ============================================================
// GET /api/trips/today - Count trips started today
// ============================================================
router.get('/today', verifyToken, async (req, res) => {
    try {
        const driver_id = req.user.id;
        const result = await pool.query(
            `SELECT COUNT(*) AS count
             FROM trips
             WHERE driver_id = $1
               AND started_at >= CURRENT_DATE
               AND started_at < CURRENT_DATE + INTERVAL '1 day'`,
            [driver_id]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('Today trips error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// GET /api/trips/:id/stops — All stops for the trip's bus + stage flags
// MUST come before /:id
// ============================================================
router.get('/:id/stops', verifyToken, checkRole(['driver']), async (req, res) => {
    try {
        const { id } = req.params;
        const tripRes = await pool.query(
            `SELECT id, bus_id FROM trips WHERE id = $1`,
            [id]
        );
        if (tripRes.rows.length === 0) {
            return res.status(404).json({ message: 'Trip not found' });
        }
        const trip = tripRes.rows[0];

        const result = await pool.query(
            `SELECT 
                s.id,
                s.stop_name,
                s.stop_order,
                s.latitude,
                s.longitude,
                s.bus_id,
                MAX(CASE WHEN sa.stage = 'approaching' THEN 1 ELSE 0 END) = 1 AS approached,
                MAX(CASE WHEN sa.stage = 'arrived'     THEN 1 ELSE 0 END) = 1 AS arrived,
                MAX(sa.arrived_at) AS last_update
             FROM stops s
             LEFT JOIN stop_arrivals sa 
                 ON sa.stop_id = s.id AND sa.trip_id = $1
             WHERE s.bus_id = $2
             GROUP BY s.id, s.stop_name, s.stop_order, s.latitude, s.longitude, s.bus_id
             ORDER BY s.stop_order`,
            [id, trip.bus_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('❌ GET /trips/:id/stops', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// POST /api/trips/:id/notify-pickup
// ============================================================
router.post('/:id/notify-pickup', verifyToken, checkRole(['driver']), async (req, res) => {
    const { id } = req.params;

    try {
        const tripResult = await pool.query(
            `SELECT t.*, b.bus_number
             FROM trips t
             LEFT JOIN buses b ON b.id = t.bus_id
             WHERE t.id = $1 AND t.status = 'in_progress'`,
            [id]
        );
        if (tripResult.rows.length === 0) {
            return res.status(404).json({ message: 'Trip not found or not in progress' });
        }
        const trip = tripResult.rows[0];

        const io = req.app.get('io');
        if (!io) {
            return res.status(500).json({ message: 'Socket server unavailable' });
        }

        io.to(`bus-${trip.bus_id}`).emit('pickup-time', {
            bus_id: trip.bus_id,
            bus_number: trip.bus_number,
            trip_id: trip.id,
            message: 'Your child will arrive soon. Please come to the drop-off point.',
            timestamp: new Date().toISOString(),
        });

        await notifyParentsOfBus(io, trip.bus_id, {
            type: 'pickup-time',
            title: '🚸 Pickup Time',
            message: `Bus ${trip.bus_number} is almost at the drop-off point. Please come pick up your child.`,
            metadata: { trip_id: trip.id, bus_number: trip.bus_number },
        });

        res.json({
            success: true,
            message: 'Parents notified for pickup',
            bus_id: trip.bus_id,
            trip_id: trip.id,
        });
    } catch (err) {
        console.error('❌ POST /trips/:id/notify-pickup', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// 🆕 POST /api/trips/:id/arrive-stop
// Body: { stop_id, stage: 'approaching' | 'arrived' }
// Notifies ONLY the parents whose child is at this stop.
// ============================================================
router.post('/:id/arrive-stop', verifyToken, checkRole(['driver']), async (req, res) => {
    const tripId = req.params.id;
    const { stop_id, stage = 'arrived' } = req.body;

    if (!stop_id) {
        return res.status(400).json({ message: 'stop_id is required' });
    }
    if (!['approaching', 'arrived'].includes(stage)) {
        return res.status(400).json({ message: 'Invalid stage' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const tripRes = await client.query(
            `SELECT t.*, b.bus_number
             FROM trips t
             LEFT JOIN buses b ON b.id = t.bus_id
             WHERE t.id = $1 AND t.status = 'in_progress'`,
            [tripId]
        );
        if (tripRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Trip not found or not in progress' });
        }
        const trip = tripRes.rows[0];

        const stopRes = await client.query(
            `SELECT id, stop_name, stop_order FROM stops
             WHERE id = $1 AND bus_id = $2`,
            [stop_id, trip.bus_id]
        );
        if (stopRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Stop does not belong to this bus' });
        }
        const stop = stopRes.rows[0];

        const insertRes = await client.query(
            `INSERT INTO stop_arrivals (trip_id, stop_id, bus_id, stage)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (trip_id, stop_id, stage) DO NOTHING
             RETURNING id`,
            [tripId, stop.id, trip.bus_id, stage]
        );

        const firstTime = insertRes.rows.length > 0;
        await client.query('COMMIT');

        if (!firstTime) {
            return res.json({ success: true, already_notified: true, stop, stage });
        }

        const io = req.app.get('io');
        const { rows: students } = await pool.query(
            `SELECT s.id, s.full_name, s.parent_id
             FROM students s
             WHERE s.stop_id = $1 AND s.parent_id IS NOT NULL`,
            [stop.id]
        );

        const isApproaching = stage === 'approaching';

        if (students.length > 0) {
            const byParent = {};
            for (const s of students) {
                if (!byParent[s.parent_id]) byParent[s.parent_id] = [];
                byParent[s.parent_id].push(s.full_name);
            }

            for (const [parentId, names] of Object.entries(byParent)) {
                const title = isApproaching
                    ? `📢 Bus approaching ${stop.stop_name}`
                    : `📍 Bus arrived at ${stop.stop_name}`;
                const message = isApproaching
                    ? `Bus ${trip.bus_number} is approaching ${stop.stop_name} — about 2 minutes away. Please be ready${
                          names.length === 1 ? ` for ${names[0]}` : ` for ${names.join(', ')}`
                      }.`
                    : `Bus ${trip.bus_number} is at ${stop.stop_name}. Please come out${
                          names.length === 1 ? ` for ${names[0]}` : ` for ${names.join(', ')}`
                      }.`;

                await pool.query(
                    `INSERT INTO notifications (parent_id, type, title, message, metadata)
                     VALUES ($1, $2, $3, $4, $5::jsonb)`,
                    [
                        parentId,
                        isApproaching ? 'stop-approaching' : 'stop-arrived',
                        title,
                        message,
                        JSON.stringify({
                            trip_id: tripId,
                            stop_id: stop.id,
                            stop_name: stop.stop_name,
                            stop_order: stop.stop_order,
                            bus_number: trip.bus_number,
                            stage,
                            student_names: names,
                        }),
                    ]
                );
            }

            if (io) {
                const eventName = isApproaching ? 'stop-approaching' : 'stop-arrived';
                io.to(`bus-${trip.bus_id}`).emit(eventName, {
                    bus_id: trip.bus_id,
                    bus_number: trip.bus_number,
                    stop_id: stop.id,
                    stop_name: stop.stop_name,
                    stop_order: stop.stop_order,
                    stage,
                    parent_ids: Object.keys(byParent).map(Number),
                    students: students.map(s => ({ id: s.id, name: s.full_name })),
                    timestamp: new Date().toISOString(),
                });
            }

            console.log(
                `📍 [${stage}] Stop "${stop.stop_name}" (bus ${trip.bus_number}) → ${Object.keys(byParent).length} parent(s) notified`
            );
        } else {
            console.log(`📍 [${stage}] Stop "${stop.stop_name}" → no parents at this stop`);
        }

        res.json({ success: true, stop, stage, notified: students.length });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('❌ POST /trips/:id/arrive-stop', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
        client.release();
    }
});

// ============================================================
// PUT /api/trips/:id/end - End a trip
// ============================================================
router.put('/:id/end', verifyToken, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const tripResult = await client.query(
            `UPDATE trips SET status = 'completed', ended_at = NOW()
             WHERE id = $1 AND status = 'in_progress'
             RETURNING *`,
            [id]
        );
        if (tripResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Trip not found or already ended' });
        }
        const trip = tripResult.rows[0];

        const busResult = await client.query(
            `SELECT bus_number FROM buses WHERE id = $1`,
            [trip.bus_id]
        );
        const busNumber = busResult.rows[0]?.bus_number || 'Bus';

        await client.query(
            `UPDATE buses SET status = 'active' WHERE id = $1`,
            [trip.bus_id]
        );
        await client.query('COMMIT');

        const io = req.app.get('io');
        if (io) {
            await notifyParentsOfBus(io, trip.bus_id, {
                type: 'trip-ended',
                title: '✅ Trip Completed',
                message: `Bus ${busNumber} has arrived.`,
                metadata: { trip_id: trip.id, bus_number: busNumber },
            });

            io.to(`bus-${trip.bus_id}`).emit('trip-ended', {
                trip_id: trip.id,
                bus_id: trip.bus_id,
                bus_number: busNumber,
                ended_at: trip.ended_at,
                message: `✅ Bus ${busNumber} has arrived!`,
            });

            io.to('police').emit('trip-ended', {
                trip_id: trip.id,
                bus_id: trip.bus_id,
            });

            io.to('admin').emit('trip-ended', {
                trip_id: trip.id,
                bus_id: trip.bus_id,
            });
        }

        res.json(trip);
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (e) {}
        console.error('❌ End trip error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
        client.release();
    }
});

// ============================================================
// GET /api/trips/history?bus_id=
// MUST come before GET /:id
// ============================================================
router.get('/history', verifyToken, async (req, res) => {
    const { bus_id } = req.query;
    if (!bus_id) {
        return res.status(400).json({ message: 'bus_id is required' });
    }

    try {
        const result = await pool.query(
            `SELECT
                t.id,
                t.bus_id,
                b.bus_number,
                t.started_at,
                t.ended_at,
                t.status,
                t.distance_km
             FROM trips t
             LEFT JOIN buses b ON b.id = t.bus_id
             WHERE t.bus_id = $1
             ORDER BY t.started_at DESC
             LIMIT 100`,
            [bus_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('❌ GET /trips/history', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// GET /api/trips/:id – Trip detail
// MUST be LAST
// ============================================================
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const tripResult = await pool.query(
            `SELECT
                t.id, t.bus_id, b.bus_number,
                t.started_at, t.ended_at, t.status,
                t.distance_km
             FROM trips t
             LEFT JOIN buses b ON b.id = t.bus_id
             WHERE t.id = $1`,
            [id]
        );

        if (tripResult.rows.length === 0) {
            return res.status(404).json({ message: 'Trip not found' });
        }

        const trip = tripResult.rows[0];

        try {
            const stopsResult = await pool.query(
                `SELECT s.id, s.stop_name AS name, sa.arrived_at, sa.stage
                 FROM stop_arrivals sa
                 INNER JOIN stops s ON s.id = sa.stop_id
                 WHERE sa.trip_id = $1
                 ORDER BY sa.arrived_at ASC NULLS LAST`,
                [trip.id]
            );
            trip.stops_visited = stopsResult.rows;
        } catch {
            trip.stops_visited = [];
        }

        res.json(trip);
    } catch (err) {
        console.error('❌ GET /trips/:id', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;