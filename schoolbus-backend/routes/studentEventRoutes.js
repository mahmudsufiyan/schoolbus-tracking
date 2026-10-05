const express = require('express');
const pool = require('../db');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

// ============================================================
// Helper — insert a parent notification using the real schema
// ============================================================
async function createParentNotification({
    parentId,
    type,
    title,
    message,
    metadata = {},
    relatedBusId = null,
    relatedStudentId = null,
}) {
    try {
        await pool.query(
            `INSERT INTO notifications
                (parent_id, type, title, message, metadata,
                 related_bus_id, related_student_id)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
            [
                parentId,
                type,
                title,
                message,
                JSON.stringify(metadata),
                relatedBusId,
                relatedStudentId,
            ]
        );
    } catch (err) {
        console.error('❌ createParentNotification:', err.message);
    }
}

// ============================================================
// Helper — fetch student + parent + stop + bus context
// ============================================================
async function fetchStudentContext(studentId) {
    const { rows } = await pool.query(
        `SELECT
            s.id            AS student_id,
            s.full_name     AS student_name,
            s.parent_id,
            s.stop_id,
            s.bus_id,
            st.stop_name,
            st.stop_order,
            b.bus_number
         FROM students s
         LEFT JOIN stops st ON st.id = s.stop_id
         LEFT JOIN buses b  ON b.id = s.bus_id
         WHERE s.id = $1`,
        [studentId]
    );
    return rows[0] || null;
}

// ============================================================
// POST /api/students/:id/pickup
// Driver marks a student as picked up (boarded the bus)
// ============================================================
router.post('/:id/pickup', verifyToken, checkRole(['driver']), async (req, res) => {
    const studentId = parseInt(req.params.id);
    const { trip_id, stop_id } = req.body || {};

    if (!studentId) return res.status(400).json({ message: 'Invalid student id' });

    try {
        const ctx = await fetchStudentContext(studentId);
        if (!ctx) return res.status(404).json({ message: 'Student not found' });

        // Prevent duplicate pickup in the same trip
        if (trip_id) {
            const dup = await pool.query(
                `SELECT id FROM student_events
                 WHERE student_id = $1 AND trip_id = $2 AND event_type = 'picked_up'
                 LIMIT 1`,
                [studentId, trip_id]
            );
            if (dup.rows.length > 0) {
                return res.status(400).json({ message: 'Student already marked as picked up this trip' });
            }
        }

        const { rows } = await pool.query(
            `INSERT INTO student_events
                (student_id, bus_id, stop_id, trip_id, event_type, marked_by)
             VALUES ($1, $2, $3, $4, 'picked_up', $5)
             RETURNING *`,
            [
                studentId,
                ctx.bus_id,
                stop_id || ctx.stop_id || null,
                trip_id || null,
                req.user.id,
            ]
        );
        const event = rows[0];

        const io = req.app.get('io');
        const timeStr = new Date(event.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });

        if (io && ctx.bus_id) {
            io.to(`bus-${ctx.bus_id}`).emit('student-picked-up', {
                student_id: ctx.student_id,
                student_name: ctx.student_name,
                stop_name: ctx.stop_name,
                trip_id,
                time: timeStr,
                event_id: event.id,
            });

            io.to('admin').emit('student-picked-up', {
                student_id: ctx.student_id,
                student_name: ctx.student_name,
                bus_id: ctx.bus_id,
                bus_number: ctx.bus_number,
                time: timeStr,
            });
        }

        if (ctx.parent_id) {
            await createParentNotification({
                parentId: ctx.parent_id,
                type: 'student-picked-up',
                title: `✅ ${ctx.student_name} is on the bus`,
                message: `${ctx.student_name} was picked up at ${ctx.stop_name || 'the stop'} at ${timeStr}.`,
                metadata: {
                    student_id: ctx.student_id,
                    stop_name: ctx.stop_name,
                    bus_number: ctx.bus_number,
                    trip_id,
                    time: timeStr,
                },
                relatedBusId: ctx.bus_id,
                relatedStudentId: ctx.student_id,
            });
        }

        res.json({ success: true, event });
    } catch (err) {
        console.error('❌ POST /students/:id/pickup', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// POST /api/students/:id/dropoff
// Driver marks a student as dropped off
// ============================================================
router.post('/:id/dropoff', verifyToken, checkRole(['driver']), async (req, res) => {
    const studentId = parseInt(req.params.id);
    const { trip_id, stop_id } = req.body || {};

    if (!studentId) return res.status(400).json({ message: 'Invalid student id' });

    try {
        const ctx = await fetchStudentContext(studentId);
        if (!ctx) return res.status(404).json({ message: 'Student not found' });

        if (trip_id) {
            const dup = await pool.query(
                `SELECT id FROM student_events
                 WHERE student_id = $1 AND trip_id = $2 AND event_type = 'dropped_off'
                 LIMIT 1`,
                [studentId, trip_id]
            );
            if (dup.rows.length > 0) {
                return res.status(400).json({ message: 'Student already marked as dropped off this trip' });
            }
        }

        const { rows } = await pool.query(
            `INSERT INTO student_events
                (student_id, bus_id, stop_id, trip_id, event_type, marked_by)
             VALUES ($1, $2, $3, $4, 'dropped_off', $5)
             RETURNING *`,
            [
                studentId,
                ctx.bus_id,
                stop_id || ctx.stop_id || null,
                trip_id || null,
                req.user.id,
            ]
        );
        const event = rows[0];

        const io = req.app.get('io');
        const timeStr = new Date(event.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });

        if (io && ctx.bus_id) {
            io.to(`bus-${ctx.bus_id}`).emit('student-dropped-off', {
                student_id: ctx.student_id,
                student_name: ctx.student_name,
                stop_name: ctx.stop_name,
                trip_id,
                time: timeStr,
                event_id: event.id,
            });

            io.to('admin').emit('student-dropped-off', {
                student_id: ctx.student_id,
                student_name: ctx.student_name,
                bus_id: ctx.bus_id,
                bus_number: ctx.bus_number,
                time: timeStr,
                event_id: event.id,
            });
        }

        if (ctx.parent_id) {
            await createParentNotification({
                parentId: ctx.parent_id,
                type: 'student-dropped-off',
                title: `✅ ${ctx.student_name} was dropped off`,
                message: `${ctx.student_name} was dropped off at ${ctx.stop_name || 'the stop'} at ${timeStr}. Please confirm you received them.`,
                metadata: {
                    student_id: ctx.student_id,
                    stop_name: ctx.stop_name,
                    bus_number: ctx.bus_number,
                    trip_id,
                    time: timeStr,
                    event_id: event.id,
                    needs_confirmation: true,
                },
                relatedBusId: ctx.bus_id,
                relatedStudentId: ctx.student_id,
            });
        }

        res.json({ success: true, event });
    } catch (err) {
        console.error('❌ POST /students/:id/dropoff', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// POST /api/students/:id/confirm-receipt
// Parent confirms they received their child after drop-off
// ============================================================
router.post('/:id/confirm-receipt', verifyToken, checkRole(['parent']), async (req, res) => {
    const studentId = parseInt(req.params.id);
    const { event_id } = req.body || {};

    if (!studentId) return res.status(400).json({ message: 'Invalid student id' });

    try {
        const ctx = await fetchStudentContext(studentId);
        if (!ctx) return res.status(404).json({ message: 'Student not found' });

        if (ctx.parent_id !== req.user.id) {
            return res.status(403).json({ message: 'Not your child' });
        }

        let targetQuery;
        let params;

        if (event_id) {
            targetQuery = `
                UPDATE student_events
                SET parent_confirmed_at = NOW(),
                    parent_confirmed_by = $1
                WHERE id = $2
                  AND student_id = $3
                  AND event_type = 'dropped_off'
                  AND parent_confirmed_at IS NULL
                RETURNING *`;
            params = [req.user.id, event_id, studentId];
        } else {
            targetQuery = `
                UPDATE student_events
                SET parent_confirmed_at = NOW(),
                    parent_confirmed_by = $1
                WHERE id = (
                    SELECT id FROM student_events
                    WHERE student_id = $2
                      AND event_type = 'dropped_off'
                      AND parent_confirmed_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT 1
                )
                RETURNING *`;
            params = [req.user.id, studentId];
        }

        const { rows } = await pool.query(targetQuery, params);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No unconfirmed drop-off found' });
        }
        const event = rows[0];

        const io = req.app.get('io');
        const timeStr = new Date(event.parent_confirmed_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });

        if (io) {
            io.to('admin').emit('dropoff-confirmed', {
                student_id: ctx.student_id,
                student_name: ctx.student_name,
                event_id: event.id,
                confirmed_at: event.parent_confirmed_at,
                time: timeStr,
            });
            if (ctx.bus_id) {
                io.to(`bus-${ctx.bus_id}`).emit('dropoff-confirmed', {
                    student_id: ctx.student_id,
                    student_name: ctx.student_name,
                    event_id: event.id,
                    time: timeStr,
                });
            }
        }

        res.json({ success: true, event, time: timeStr });
    } catch (err) {
        console.error('❌ POST /students/:id/confirm-receipt', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// GET /api/students/:id/events?limit=20
// Parent fetches their child's pickup/dropoff history
// ============================================================
router.get('/:id/events', verifyToken, async (req, res) => {
    const studentId = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    if (!studentId) return res.status(400).json({ message: 'Invalid student id' });

    try {
        const ctx = await fetchStudentContext(studentId);
        if (!ctx) return res.status(404).json({ message: 'Student not found' });

        if (req.user.role === 'parent' && ctx.parent_id !== req.user.id) {
            return res.status(403).json({ message: 'Not your child' });
        }

        const { rows } = await pool.query(
            `SELECT
                e.*,
                st.stop_name,
                b.bus_number,
                u.full_name AS marked_by_name
             FROM student_events e
             LEFT JOIN stops st ON st.id = e.stop_id
             LEFT JOIN buses b  ON b.id = e.bus_id
             LEFT JOIN users u  ON u.id = e.marked_by
             WHERE e.student_id = $1
             ORDER BY e.created_at DESC
             LIMIT $2`,
            [studentId, limit]
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ GET /students/:id/events', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// GET /api/students/admin/unconfirmed-dropoffs
// Admin sees drop-offs where the parent has NOT confirmed
// within the grace period (default 2 minutes)
// ============================================================
router.get('/admin/unconfirmed-dropoffs', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT
                e.id              AS event_id,
                e.student_id,
                s.full_name       AS student_name,
                e.bus_id,
                b.bus_number,
                e.stop_id,
                st.stop_name,
                e.trip_id,
                e.created_at,
                EXTRACT(EPOCH FROM (NOW() - e.created_at))::int AS seconds_ago
             FROM student_events e
             LEFT JOIN students s ON s.id = e.student_id
             LEFT JOIN buses b    ON b.id = e.bus_id
             LEFT JOIN stops st   ON st.id = e.stop_id
             WHERE e.event_type = 'dropped_off'
               AND e.parent_confirmed_at IS NULL
               AND e.created_at > NOW() - INTERVAL '24 hours'
             ORDER BY e.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ GET /students/admin/unconfirmed-dropoffs', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;