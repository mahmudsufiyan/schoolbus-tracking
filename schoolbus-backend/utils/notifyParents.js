// ============================================================
// utils/notifyParents.js
// ------------------------------------------------------------
// Persists notification rows for parents and emits socket events.
//
// Two functions:
//   notifyParentsOfBus  → notifies ALL parents whose children are on a bus
//   notifyOneParent     → notifies ONE specific parent
//
// Called from:
//   - POST /api/trips            → notifyParentsOfBus('trip-started')
//   - PUT  /api/trips/:id/end    → notifyParentsOfBus('trip-ended')
//   - POST /api/students/scan    → notifyOneParent('student-scanned')
//   - POST /api/alerts           → notifyParentsOfBus('emergency')
//   - POST /api/trips/:id/notify-pickup → notifyParentsOfBus('pickup-time')
// ============================================================

const pool = require('../db');

// ------------------------------------------------------------
// Notify ALL parents whose children are on this bus
// ------------------------------------------------------------
async function notifyParentsOfBus(io, busId, { type, title, message, metadata = {} }) {
    if (!busId || !type || !title) {
        console.warn('⚠️ notifyParentsOfBus called with missing args', { busId, type, title });
        return [];
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO notifications (parent_id, type, title, message, metadata)
             SELECT DISTINCT s.parent_id, $2, $3, $4, $5::jsonb
             FROM students s
             WHERE s.bus_id = $1
               AND s.parent_id IS NOT NULL
             RETURNING id, parent_id, type, title, message, read, metadata, created_at`,
            [busId, type, title, message, JSON.stringify(metadata)]
        );

        if (io) {
            const socketPayload = {
                bus_id: Number(busId),
                type,
                title,
                message,
                metadata,
                timestamp: new Date().toISOString(),
            };
            io.to(`bus-${busId}`).emit('notification', socketPayload);
            io.to(`bus-${busId}`).emit(type, socketPayload);
        }

        console.log(
            `🔔 notifyParentsOfBus → bus ${busId} | ${type} | ${rows.length} parent(s) notified`
        );
        return rows;
    } catch (err) {
        console.error('❌ notifyParentsOfBus error:', err.message);
        console.error('   busId:', busId, '| type:', type);
        return [];
    }
}

// ------------------------------------------------------------
// Notify ONE specific parent
// ------------------------------------------------------------
async function notifyOneParent(io, parentId, busId, { type, title, message, metadata = {} }) {
    if (!parentId) {
        console.log('⚠️ notifyOneParent skipped — student has no parent assigned');
        return [];
    }
    if (!type || !title) {
        console.warn('⚠️ notifyOneParent called with missing args', { type, title });
        return [];
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO notifications (parent_id, type, title, message, metadata)
             VALUES ($1, $2, $3, $4, $5::jsonb)
             RETURNING id, parent_id, type, title, message, read, metadata, created_at`,
            [parentId, type, title, message, JSON.stringify(metadata)]
        );

        if (io && busId) {
            const socketPayload = {
                bus_id: Number(busId),
                parent_id: Number(parentId),
                type,
                title,
                message,
                metadata,
                timestamp: new Date().toISOString(),
            };
            io.to(`bus-${busId}`).emit('notification', socketPayload);
            io.to(`bus-${busId}`).emit(type, socketPayload);
        }

        console.log(`🔔 notifyOneParent → parent ${parentId} | ${type}`);
        return rows;
    } catch (err) {
        console.error('❌ notifyOneParent error:', err.message);
        return [];
    }
}

module.exports = { notifyParentsOfBus, notifyOneParent };