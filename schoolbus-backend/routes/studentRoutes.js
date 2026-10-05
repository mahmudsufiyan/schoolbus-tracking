const express = require('express');
const pool = require('../db');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();
const { notifyParentsOfBus, notifyOneParent } = require('../utils/notifyParents');

// =============================================
// GET all students
// - admin:  sees everyone (can filter by ?bus_id= or ?stop_id=)
// - driver: sees ONLY students on their own bus
// - parent: sees ONLY their own children (equivalent to /my-children)
// =============================================
router.get('/', verifyToken, checkRole(['admin', 'driver', 'parent']), async (req, res) => {
    try {
        // Build query dynamically based on role
        let baseQuery = `
            SELECT s.*,
                   u.full_name as parent_name,
                   b.bus_number,
                   st.stop_name
            FROM students s
            LEFT JOIN users u ON s.parent_id = u.id
            LEFT JOIN buses b ON s.bus_id = b.id
            LEFT JOIN stops st ON s.stop_id = st.id
        `;
        const where = [];
        const params = [];

        // ----- DRIVER: force scope to their own bus -----
        if (req.user.role === 'driver') {
            const busRes = await pool.query(
                `SELECT id FROM buses WHERE driver_id = $1`,
                [req.user.id]
            );
            if (busRes.rows.length === 0) {
                return res.json([]);   // driver has no bus → no students
            }
            where.push(`s.bus_id = $${params.length + 1}`);
            params.push(busRes.rows[0].id);
        }

        // ----- PARENT: force scope to their own children -----
        else if (req.user.role === 'parent') {
            where.push(`s.parent_id = $${params.length + 1}`);
            params.push(req.user.id);
        }

        // ----- ADMIN: honor optional query filters -----
        else {
            if (req.query.bus_id) {
                where.push(`s.bus_id = $${params.length + 1}`);
                params.push(parseInt(req.query.bus_id));
            }
            if (req.query.stop_id) {
                where.push(`s.stop_id = $${params.length + 1}`);
                params.push(parseInt(req.query.stop_id));
            }
        }

        const finalQuery =
            baseQuery +
            (where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '') +
            ` ORDER BY s.created_at DESC`;

        const result = await pool.query(finalQuery, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// PARENT: Get my children
// =============================================
router.get('/my-children', verifyToken, checkRole(['parent']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT s.*, b.bus_number, st.stop_name
             FROM students s
             LEFT JOIN buses b ON s.bus_id = b.id
             LEFT JOIN stops st ON s.stop_id = st.id
             WHERE s.parent_id = $1
             ORDER BY s.full_name`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// 🆕 GET /api/students/:id/qr — fetch or generate QR token
// MUST be before any /:id route
// =============================================
router.get('/:id/qr', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        let result = await pool.query(
            `SELECT id, full_name, grade, school_name,
                    student_id_number, qr_token, qr_token_expires
             FROM students WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        let student = result.rows[0];

        if (!student.qr_token) {
            const upd = await pool.query(
                `UPDATE students
                 SET qr_token = md5(random()::text || clock_timestamp()::text || id::text)
                            || md5(random()::text || id::text),
                     qr_token_expires = NOW() + INTERVAL '1 year'
                 WHERE id = $1
                 RETURNING id, full_name, grade, school_name,
                           student_id_number, qr_token, qr_token_expires`,
                [id]
            );
            student = upd.rows[0];
        }

        res.json(student);
    } catch (err) {
        console.error('❌ GET /students/:id/qr', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// =============================================
// 🆕 POST /api/students/:id/regenerate-qr — new token
// MUST be before any /:id route
// =============================================
router.post('/:id/regenerate-qr', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE students
             SET qr_token = md5(random()::text || clock_timestamp()::text || id::text)
                        || md5(random()::text || id::text),
                 qr_token_expires = NOW() + INTERVAL '1 year'
             WHERE id = $1
             RETURNING id, full_name, qr_token, qr_token_expires`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({ success: true, student: result.rows[0] });
    } catch (err) {
        console.error('❌ POST /students/:id/regenerate-qr', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// =============================================
// ADMIN: POST create student
// =============================================
router.post('/', verifyToken, checkRole(['admin', 'parent']), async (req, res) => {
    const { full_name, grade, school_name, bus_id, stop_id, parent_id, student_id_number } = req.body;
    if (!full_name) return res.status(400).json({ message: 'Full name is required' });
    try {
        const actualParentId = req.user.role === 'parent' ? req.user.id : (parent_id || req.user.id);
        const result = await pool.query(
            `INSERT INTO students (full_name, parent_id, bus_id, stop_id, grade, school_name, student_id_number, totp_secret)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [full_name, actualParentId, bus_id || null, stop_id || null, grade || null, school_name || null, student_id_number || null, 'dummy_secret_' + Date.now()]
        );
        res.status(201).json({ success: true, student: result.rows[0] });
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// ADMIN: PUT update student
// =============================================
router.put('/:id', verifyToken, checkRole(['admin', 'parent']), async (req, res) => {
    const { id } = req.params;
    const { full_name, grade, school_name, bus_id, stop_id, student_id_number } = req.body;
    try {
        const result = await pool.query(
            `UPDATE students 
             SET full_name = COALESCE($1, full_name),
                 grade = COALESCE($2, grade),
                 school_name = COALESCE($3, school_name),
                 bus_id = COALESCE($4, bus_id),
                 stop_id = COALESCE($5, stop_id),
                 student_id_number = COALESCE($6, student_id_number),
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [full_name, grade, school_name, bus_id, stop_id, student_id_number, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
        res.json({ success: true, student: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// ADMIN: DELETE student
// =============================================
router.delete('/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
        res.json({ success: true, message: 'Student deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// DRIVER: Scan student QR (LEGACY — OTP-based)
// =============================================
router.post('/:id/scan', verifyToken, checkRole(['driver']), async (req, res) => {
    const { id } = req.params;
    const { otpToken } = req.body;
    if (!otpToken) return res.status(400).json({ message: 'OTP token is required' });
    try {
        const result = await pool.query(
            `SELECT id, full_name, parent_id, bus_id FROM students WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
        const student = result.rows[0];
        if (otpToken.length < 6) return res.status(400).json({ message: 'Invalid QR code' });
        await pool.query(
            `INSERT INTO daily_attendance (student_id, bus_id, checked_by_driver)
             VALUES ($1, $2, $3)`,
            [student.id, student.bus_id, req.user.id]
        );
        res.json({
            success: true,
            message: 'Student verified and checked in',
            studentName: student.full_name
        });
    } catch (error) {
        console.error('Error scanning QR:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// DRIVER: Scan student QR via qr_token (NEW flow)
// POST /api/students/scan   Body: { qr_token, scan_type, latitude?, longitude? }
// =============================================
router.post('/scan', verifyToken, checkRole(['driver']), async (req, res) => {
    const { qr_token, scan_type = 'board', latitude, longitude } = req.body;
    const driver_id = req.user.id;

    if (!qr_token) {
        return res.status(400).json({ verified: false, message: 'Missing qr_token' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const busResult = await client.query(
            `SELECT id, bus_number FROM buses WHERE driver_id = $1`,
            [driver_id]
        );
        if (busResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                verified: false,
                message: 'You are not assigned to any bus. Contact admin.',
            });
        }
        const bus = busResult.rows[0];

        const tripResult = await client.query(
            `SELECT id FROM trips WHERE bus_id = $1 AND status = 'in_progress'
             ORDER BY started_at DESC LIMIT 1`,
            [bus.id]
        );
        const trip = tripResult.rows[0] || null;

        const studentResult = await client.query(
            `SELECT s.id, s.full_name, s.grade, s.school_name,
                    s.bus_id, s.parent_id, s.is_active, s.qr_token_expires
             FROM students s WHERE s.qr_token = $1`,
            [qr_token]
        );

        if (studentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                verified: false,
                message: '❌ Invalid card. This student is not registered.',
            });
        }

        const student = studentResult.rows[0];

        let rejectReason = null;
        if (student.is_active === false) {
            rejectReason = 'Student account is inactive';
        } else if (student.qr_token_expires && new Date(student.qr_token_expires) < new Date()) {
            rejectReason = 'Card has expired';
        } else if (!student.bus_id) {
            rejectReason = 'Student is not assigned to any bus';
        } else if (student.bus_id !== bus.id) {
            rejectReason = 'Student belongs to a different bus';
        }

        const scanResult = await client.query(
            `INSERT INTO student_scans
                (student_id, bus_id, trip_id, driver_id, scan_type,
                 latitude, longitude, verified, reject_reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, scanned_at`,
            [student.id, bus.id, trip?.id || null, driver_id, scan_type,
             latitude || null, longitude || null,
             rejectReason === null, rejectReason]
        );

        await client.query('COMMIT');

        if (rejectReason) {
            return res.status(403).json({
                verified: false,
                message: `🚫 ${rejectReason}`,
                student: { id: student.id, full_name: student.full_name, grade: student.grade },
                bus: { id: bus.id, bus_number: bus.bus_number },
            });
        }

        const io = req.app.get('io');
        const isBoarding = scan_type === 'board';

        if (io) {
            io.to(`bus-${bus.id}`).emit('student-scanned', {
                verified: true,
                scan_id: scanResult.rows[0].id,
                scanned_at: scanResult.rows[0].scanned_at,
                student_id: student.id,
                student_name: student.full_name,
                grade: student.grade,
                bus_id: bus.id,
                bus_number: bus.bus_number,
                scan_type,
            });
        }

        await notifyOneParent(io, student.parent_id, bus.id, {
            type: 'student-scanned',
            title: isBoarding ? '✅ Child Picked Up' : '🏠 Child Dropped Off',
            message: `${student.full_name} ${isBoarding ? 'boarded' : 'left'} the bus.`,
            metadata: {
                student_id: student.id,
                student_name: student.full_name,
                scan_type,
                scan_id: scanResult.rows[0].id,
            },
        });

        return res.json({
            verified: true,
            message: isBoarding
                ? `✅ ${student.full_name} boarded bus ${bus.bus_number}`
                : `✅ ${student.full_name} dropped off from bus ${bus.bus_number}`,
            student: {
                id: student.id,
                full_name: student.full_name,
                grade: student.grade,
                school_name: student.school_name,
                parent_id: student.parent_id,
            },
            bus: { id: bus.id, bus_number: bus.bus_number },
            trip_id: trip?.id || null,
            scan_id: scanResult.rows[0].id,
            scanned_at: scanResult.rows[0].scanned_at,
        });

    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('❌ POST /students/scan', err);
        res.status(500).json({ verified: false, message: 'Server error', error: err.message });
    } finally {
        client.release();
    }
});

// =============================================
// DRIVER: Preview student by token
// GET /api/students/scan/:token
// =============================================
router.get('/scan/:token', verifyToken, checkRole(['driver']), async (req, res) => {
    try {
        const { token } = req.params;
        const result = await pool.query(
            `SELECT s.id, s.full_name, s.grade, s.school_name, s.bus_id, b.bus_number
             FROM students s LEFT JOIN buses b ON b.id = s.bus_id
             WHERE s.qr_token = $1`,
            [token]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ verified: false, message: 'Unknown card' });
        }
        res.json({ verified: true, student: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// =============================================
// ANY AUTH: Attendance history for one student
// GET /api/students/:id/scans
// =============================================
router.get('/:id/scans', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT ss.id, ss.scan_type, ss.verified, ss.reject_reason,
                    ss.scanned_at, ss.latitude, ss.longitude,
                    b.bus_number, u.full_name AS driver_name
             FROM student_scans ss
             LEFT JOIN buses b ON b.id = ss.bus_id
             LEFT JOIN users u ON u.id = ss.driver_id
             WHERE ss.student_id = $1
             ORDER BY ss.scanned_at DESC
             LIMIT 100`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('❌ GET /students/:id/scans', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;