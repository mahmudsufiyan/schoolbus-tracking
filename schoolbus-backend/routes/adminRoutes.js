const express = require('express');
const pool = require('../db');
const { verifyToken, checkRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const router = express.Router();

// =============================================
// GET PENDING PARENT REGISTRATIONS
// =============================================
router.get('/parent-registrations', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                pr.*,
                u.full_name as user_name,
                u.email as user_email,
                u.phone as user_phone
             FROM parent_registrations pr
             LEFT JOIN users u ON pr.user_id = u.id
             WHERE pr.status = 'pending'
             ORDER BY pr.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pending registrations:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET ALL PARENT REGISTRATIONS (with filters)
// =============================================
router.get('/parent-registrations/all', verifyToken, checkRole(['admin']), async (req, res) => {
    const { status, search } = req.query;

    try {
        let query = `
            SELECT 
                pr.*,
                u.full_name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                u.is_approved,
                adm.full_name as approved_by_name
            FROM parent_registrations pr
            LEFT JOIN users u ON pr.user_id = u.id
            LEFT JOIN users adm ON pr.approved_by = adm.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
            query += ` AND pr.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            query += ` AND (pr.full_name ILIKE $${paramIndex} 
                          OR pr.email ILIKE $${paramIndex}
                          OR pr.student_name ILIKE $${paramIndex}
                          OR pr.student_id_number ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY pr.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET SINGLE PARENT REGISTRATION
// =============================================
router.get('/parent-registrations/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
                pr.*,
                u.full_name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                u.address as user_address,
                u.date_of_birth as user_dob,
                u.gender as user_gender,
                u.occupation as user_occupation,
                u.emergency_contact as user_emergency,
                u.relationship_to_student,
                u.created_at as user_created_at,
                adm.full_name as approved_by_name
             FROM parent_registrations pr
             LEFT JOIN users u ON pr.user_id = u.id
             LEFT JOIN users adm ON pr.approved_by = adm.id
             WHERE pr.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// APPROVE PARENT REGISTRATION
// Links to an existing unlinked student if one matches,
// otherwise creates a new one. Never duplicates.
// =============================================
router.put('/parent-registrations/:id/approve', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    const { notes } = req.body || {};

    console.log(`📝 Approving registration ID: ${id} by admin: ${adminId}`);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const regResult = await client.query(
            `SELECT * FROM parent_registrations WHERE id = $1`,
            [id]
        );

        if (regResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Registration not found' });
        }

        const registration = regResult.rows[0];

        if (registration.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: `This registration is already ${registration.status}`
            });
        }

        // 1. Approve the user
        await client.query(
            `UPDATE users 
             SET is_approved = true, 
                 approved_by = $1, 
                 approved_at = NOW()
             WHERE id = $2`,
            [adminId, registration.user_id]
        );

        // 2. Approve the registration
        await client.query(
            `UPDATE parent_registrations 
             SET status = 'approved', 
                 admin_notes = COALESCE($1, admin_notes),
                 approved_by = $2, 
                 approved_at = NOW(),
                 updated_at = NOW()
             WHERE id = $3`,
            [notes || null, adminId, id]
        );

        // ============================================================
        // 3. Link to an existing unlinked student OR create a new one
        // ============================================================
        if (registration.student_name && String(registration.student_name).trim()) {
            const studentName   = String(registration.student_name).trim();
            const studentGrade  = registration.student_grade  ? String(registration.student_grade).trim()  : null;
            const studentSchool = registration.student_school ? String(registration.student_school).trim() : null;
            const studentIdNum  = registration.student_id_number ? String(registration.student_id_number).trim() : null;

            // ---- A. Was this parent already linked to this student? ----
            const alreadyLinked = await client.query(
                `SELECT id FROM students
                 WHERE parent_id = $1 AND LOWER(full_name) = LOWER($2)
                 LIMIT 1`,
                [registration.user_id, studentName]
            );

            if (alreadyLinked.rows.length > 0) {
                console.log(`ℹ️ Student "${studentName}" already linked to parent ${registration.user_id} — skipping`);
            } else {
                // ---- B. Look for an existing UNLINKED student to adopt ----
                let existing = { rows: [] };

                if (studentIdNum) {
                    // Priority 1: exact student_id_number match (and unlinked)
                    existing = await client.query(
                        `SELECT id, full_name FROM students
                         WHERE student_id_number = $1
                           AND parent_id IS NULL
                         LIMIT 1`,
                        [studentIdNum]
                    );
                    if (existing.rows.length > 0) {
                        console.log(`🔗 Found existing unlinked student by student_id_number "${studentIdNum}" → linking`);
                    }
                }

                if (existing.rows.length === 0) {
                    // Priority 2: name match (+ school if provided)
                    if (studentSchool) {
                        existing = await client.query(
                            `SELECT id, full_name FROM students
                             WHERE LOWER(full_name) = LOWER($1)
                               AND LOWER(COALESCE(school_name, '')) = LOWER($2)
                               AND parent_id IS NULL
                             LIMIT 1`,
                            [studentName, studentSchool]
                        );
                    } else {
                        existing = await client.query(
                            `SELECT id, full_name FROM students
                             WHERE LOWER(full_name) = LOWER($1)
                               AND parent_id IS NULL
                             LIMIT 1`,
                            [studentName]
                        );
                    }
                    if (existing.rows.length > 0) {
                        console.log(`🔗 Found existing unlinked student by name "${studentName}" → linking`);
                    }
                }

                if (existing.rows.length > 0) {
                    // ---- C. LINK existing student to this parent ----
                    const targetId = existing.rows[0].id;

                    await client.query(
                        `UPDATE students
                         SET parent_id        = $1,
                             grade            = COALESCE(grade, $2),
                             school_name      = COALESCE(school_name, $3),
                             student_id_number = COALESCE(student_id_number, $4),
                             is_active        = true,
                             updated_at       = NOW()
                         WHERE id = $5`,
                        [
                            registration.user_id,
                            studentGrade,
                            studentSchool,
                            studentIdNum,
                            targetId,
                        ]
                    );

                    console.log(`✅ Linked existing student ${targetId} ("${existing.rows[0].full_name}") to parent ${registration.user_id}`);
                } else {
                    // ---- D. No existing student → create new one (dup-safe ID) ----
                    let sid = studentIdNum;
                    if (sid) {
                        const taken = await client.query(
                            `SELECT id FROM students WHERE student_id_number = $1 LIMIT 1`,
                            [sid]
                        );
                        if (taken.rows.length > 0) {
                            console.log(`⚠️ student_id_number "${sid}" already taken — finding a free variant`);
                            let i = 2;
                            let candidate = `${sid}-${i}`;
                            while (i < 22) {
                                const check = await client.query(
                                    `SELECT 1 FROM students WHERE student_id_number = $1 LIMIT 1`,
                                    [candidate]
                                );
                                if (check.rows.length === 0) break;
                                i++;
                                candidate = `${sid}-${i}`;
                            }
                            sid = candidate;
                            console.log(`   Using "${sid}" instead`);
                        }
                    }

                    const totpSecret = 'dummy_secret_' + Date.now() + '_' +
                        Math.random().toString(36).slice(2, 10);

                    await client.query(
                        `INSERT INTO students
                            (full_name, grade, school_name, student_id_number,
                             parent_id, is_active, totp_secret)
                         VALUES ($1, $2, $3, $4, $5, true, $6)`,
                        [
                            studentName,
                            studentGrade,
                            studentSchool,
                            sid,
                            registration.user_id,
                            totpSecret,
                        ]
                    );
                    console.log(`✅ Created new student for parent ${registration.user_id}: ${studentName}${sid ? ` (ID: ${sid})` : ''}`);
                }
            }
        }

        await client.query('COMMIT');

        // 4. Notify the parent (best-effort — outside transaction)
        try {
            await pool.query(
                `INSERT INTO notifications (parent_id, type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [
                    registration.user_id,
                    'success',
                    '✅ Account Approved!',
                    'Your parent registration has been approved. You can now login.',
                ]
            );
        } catch (notifErr) {
            console.error('⚠️ Notification insert failed (approval still succeeded):', notifErr.message);
        }

        console.log(`✅ Registration ${id} approved`);
        res.json({
            success: true,
            message: 'Parent registration approved'
        });

    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('❌ Error approving parent registration:', error);
        console.error('   Message:', error.message);
        console.error('   Detail:', error.detail);
        res.status(500).json({
            message: 'Server error',
            details: error.message,
            detail: error.detail,
        });
    } finally {
        client.release();
    }
});

// =============================================
// REJECT PARENT REGISTRATION
// =============================================
router.put('/parent-registrations/:id/reject', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body || {};

    console.log(`📝 Rejecting registration ID: ${id} by admin: ${adminId}, reason: ${reason}`);

    if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const regResult = await client.query(
            `SELECT * FROM parent_registrations WHERE id = $1`,
            [id]
        );

        if (regResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Registration not found' });
        }

        const registration = regResult.rows[0];

        if (registration.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: `This registration is already ${registration.status}`
            });
        }

        await client.query(
            `UPDATE users 
             SET is_active = false, 
                 is_approved = false
             WHERE id = $1`,
            [registration.user_id]
        );

        await client.query(
            `UPDATE parent_registrations 
             SET status = 'rejected', 
                 rejected_reason = $1,
                 admin_notes = $1,
                 approved_by = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [reason, adminId, id]
        );

        await client.query('COMMIT');

        // Notify (best-effort)
        try {
            await pool.query(
                `INSERT INTO notifications (parent_id, type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [
                    registration.user_id,
                    'warning',
                    '❌ Account Rejected',
                    `Your registration has been rejected. Reason: ${reason}`,
                ]
            );
        } catch (notifErr) {
            console.error('⚠️ Notification insert failed (rejection still succeeded):', notifErr.message);
        }

        console.log(`✅ Registration ${id} rejected`);
        res.json({
            success: true,
            message: 'Parent registration rejected'
        });
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('❌ Error rejecting parent registration:', error);
        res.status(500).json({
            message: 'Server error',
            details: error.message,
            detail: error.detail,
        });
    } finally {
        client.release();
    }
});

// =============================================
// GET REGISTRATION STATISTICS
// =============================================
router.get('/parent-registrations/stats', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
                DATE_TRUNC('day', created_at) as date
             FROM parent_registrations
             GROUP BY DATE_TRUNC('day', created_at)
             ORDER BY date DESC
             LIMIT 30`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching registration stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET ALL USERS WITH APPROVAL STATUS
// =============================================
router.get('/users', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, full_name, email, phone, role, is_approved, is_active, created_at,
                    approved_by, approved_at
             FROM users 
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET ALL USERS WITH FULL DETAILS
// Prefers students row; falls back to parent_registrations
// =============================================
router.get('/users/all', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.role,
                u.profile_image,
                u.is_approved,
                u.is_active,
                u.created_at,
                u.address,
                u.date_of_birth,
                u.gender,
                u.occupation,
                u.emergency_contact,
                u.relationship_to_student,
                u.badge_number,
                u.station,
                u.license_number,
                u.experience,

                -- Student info: prefer students; fall back to parent_registrations
                COALESCE(s.full_name,         pr.student_name)         AS student_name,
                COALESCE(s.grade,             pr.student_grade)        AS student_grade,
                COALESCE(s.school_name,       pr.student_school)       AS student_school,
                COALESCE(s.student_id_number, pr.student_id_number)    AS student_id_number,

                -- For Approve/Reject buttons
                pr.id     AS registration_id,
                pr.status AS registration_status

             FROM users u
             LEFT JOIN students s 
                ON u.id = s.parent_id
             LEFT JOIN LATERAL (
                SELECT id, student_name, student_grade, student_school,
                       student_id_number, status
                FROM parent_registrations
                WHERE user_id = u.id
                ORDER BY 
                    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
                    created_at DESC
                LIMIT 1
             ) pr ON true
             ORDER BY u.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET PENDING USERS (with student fallback from parent_registrations)
// =============================================
router.get('/users/pending', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.role,
                u.created_at,
                u.address,
                u.date_of_birth,
                u.gender,
                u.occupation,
                u.emergency_contact,
                u.relationship_to_student,
                u.badge_number,
                u.station,

                COALESCE(s.full_name,         pr.student_name)      AS student_name,
                COALESCE(s.grade,             pr.student_grade)     AS student_grade,
                COALESCE(s.school_name,       pr.student_school)    AS student_school,
                COALESCE(s.student_id_number, pr.student_id_number) AS student_id_number,

                pr.id     AS registration_id,
                pr.status AS registration_status

             FROM users u
             LEFT JOIN students s 
                ON u.id = s.parent_id
             LEFT JOIN LATERAL (
                SELECT id, student_name, student_grade, student_school,
                       student_id_number, status
                FROM parent_registrations
                WHERE user_id = u.id
                ORDER BY 
                    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
                    created_at DESC
                LIMIT 1
             ) pr ON true
             WHERE u.is_approved = false AND u.is_active = true
             ORDER BY u.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pending users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// APPROVE USER (non-parent)
// =============================================
router.put('/users/:id/approve', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    try {
        const userCheck = await pool.query(
            'SELECT id, email, role FROM users WHERE id = $1',
            [id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const result = await pool.query(
            `UPDATE users 
             SET is_approved = true, 
                 approved_by = $1, 
                 approved_at = NOW()
             WHERE id = $2
             RETURNING id, full_name, email, role, is_approved, approved_at`,
            [adminId, id]
        );

        // Best-effort notification
        try {
            await pool.query(
                `INSERT INTO notifications (parent_id, type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [
                    id,
                    'success',
                    '✅ Account Approved!',
                    'Your account has been approved by admin. You can now login.',
                ]
            );
        } catch (notifErr) {
            console.error('⚠️ Notification insert failed (approval still succeeded):', notifErr.message);
        }

        res.json({
            success: true,
            message: 'User approved successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// REJECT USER (non-parent)
// =============================================
router.put('/users/:id/reject', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body || {};

    try {
        const userCheck = await pool.query(
            'SELECT id, email FROM users WHERE id = $1',
            [id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        await pool.query(
            `UPDATE users SET is_active = false, is_approved = false WHERE id = $1`,
            [id]
        );

        // Best-effort notification
        try {
            await pool.query(
                `INSERT INTO notifications (parent_id, type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [
                    id,
                    'warning',
                    '❌ Account Rejected',
                    `Your account has been rejected. ${reason || 'Please contact admin for more information.'}`,
                ]
            );
        } catch (notifErr) {
            console.error('⚠️ Notification insert failed (rejection still succeeded):', notifErr.message);
        }

        res.json({
            success: true,
            message: 'User rejected successfully'
        });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET STUDENTS BY GRADE WITH FAMILY INFO
// =============================================
router.get('/students/by-grade', verifyToken, checkRole(['admin']), async (req, res) => {
    const { grade, school } = req.query;

    try {
        let query = `
            SELECT 
                s.id,
                s.full_name,
                s.student_id_number,
                s.grade,
                s.section,
                s.school_name,
                s.date_of_birth,
                s.gender,
                s.is_active,
                s.created_at,
                u.id as parent_id,
                u.full_name as parent_name,
                u.email as parent_email,
                u.phone as parent_phone,
                (
                    SELECT json_agg(
                        json_build_object(
                            'name', sf.family_member_name,
                            'relationship', sf.relationship,
                            'phone', sf.phone,
                            'email', sf.email,
                            'address', sf.address,
                            'is_primary', sf.is_primary
                        )
                    )
                    FROM student_families sf
                    WHERE sf.student_id = s.id
                ) as family_members,
                b.bus_number,
                st.stop_name
            FROM students s
            LEFT JOIN users u ON s.parent_id = u.id
            LEFT JOIN buses b ON s.bus_id = b.id
            LEFT JOIN stops st ON s.stop_id = st.id
            WHERE s.is_active = true
        `;

        const params = [];
        let paramIndex = 1;

        if (grade) {
            query += ` AND s.grade = $${paramIndex}`;
            params.push(grade);
            paramIndex++;
        }

        if (school) {
            query += ` AND s.school_name = $${paramIndex}`;
            params.push(school);
            paramIndex++;
        }

        query += ` ORDER BY s.grade, s.full_name`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching students by grade:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET ALL GRADES WITH STUDENT COUNTS
// =============================================
router.get('/students/grades', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT grade, COUNT(*) as student_count
             FROM students 
             WHERE grade IS NOT NULL AND is_active = true
             GROUP BY grade
             ORDER BY grade`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET STUDENT WITH FULL FAMILY INFO
// =============================================
router.get('/students/:id/full', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
                s.*,
                u.id as parent_id,
                u.full_name as parent_name,
                u.email as parent_email,
                u.phone as parent_phone,
                b.bus_number,
                st.stop_name,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', sf.id,
                            'name', sf.family_member_name,
                            'relationship', sf.relationship,
                            'phone', sf.phone,
                            'email', sf.email,
                            'address', sf.address,
                            'is_primary', sf.is_primary
                        )
                    )
                    FROM student_families sf
                    WHERE sf.student_id = s.id
                ) as family_members
            FROM students s
            LEFT JOIN users u ON s.parent_id = u.id
            LEFT JOIN buses b ON s.bus_id = b.id
            LEFT JOIN stops st ON s.stop_id = st.id
            WHERE s.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// ADD FAMILY MEMBER TO STUDENT
// =============================================
router.post('/students/:id/family', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { name, relationship, phone, email, address, is_primary } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO student_families 
             (student_id, family_member_name, relationship, phone, email, address, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [id, name, relationship, phone, email, address, is_primary || false]
        );

        if (is_primary) {
            await pool.query(
                `UPDATE student_families 
                 SET is_primary = false 
                 WHERE student_id = $1 AND id != $2`,
                [id, result.rows[0].id]
            );
        }

        res.status(201).json({
            success: true,
            family_member: result.rows[0]
        });
    } catch (error) {
        console.error('Error adding family member:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// UPDATE STUDENT
// =============================================
router.put('/students/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { full_name, bus_id, stop_id, grade, school_name, section, student_id_number, date_of_birth, gender, is_active } = req.body;

    try {
        const result = await pool.query(
            `UPDATE students 
             SET full_name = COALESCE($1, full_name),
                 bus_id = COALESCE($2, bus_id),
                 stop_id = COALESCE($3, stop_id),
                 grade = COALESCE($4, grade),
                 school_name = COALESCE($5, school_name),
                 section = COALESCE($6, section),
                 student_id_number = COALESCE($7, student_id_number),
                 date_of_birth = COALESCE($8, date_of_birth),
                 gender = COALESCE($9, gender),
                 is_active = COALESCE($10, is_active),
                 updated_at = NOW()
             WHERE id = $11
             RETURNING *`,
            [full_name, bus_id, stop_id, grade, school_name, section, student_id_number, date_of_birth, gender, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({ success: true, student: result.rows[0] });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// GET STUDENTS WITHOUT A PARENT (for link dropdown)
// =============================================
router.get('/students/unlinked', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, full_name, grade, school_name, bus_id
             FROM students
             WHERE parent_id IS NULL
             ORDER BY full_name`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('❌ GET /admin/students/unlinked', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =============================================
// APPROVE AND LINK PARENT TO STUDENT
// =============================================
router.post('/users/:parentId/approve-and-link', verifyToken, checkRole(['admin']), async (req, res) => {
    const { parentId } = req.params;
    const { student_id } = req.body;

    if (!student_id) {
        return res.status(400).json({ message: 'student_id is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const parentRes = await client.query(
            `SELECT id, full_name, role FROM users WHERE id = $1`,
            [parentId]
        );
        if (parentRes.rows.length === 0 || parentRes.rows[0].role !== 'parent') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Invalid parent' });
        }

        const studentRes = await client.query(
            `SELECT id, full_name FROM students WHERE id = $1`,
            [student_id]
        );
        if (studentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Student not found' });
        }

        await client.query(
            `UPDATE students SET parent_id = $1 WHERE id = $2`,
            [parentId, student_id]
        );

        const updated = await client.query(
            `UPDATE users
             SET is_approved = TRUE,
                 approved_by = $1,
                 approved_at = NOW()
             WHERE id = $2
             RETURNING id, full_name, email, is_approved`,
            [req.user.id, parentId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Linked ${studentRes.rows[0].full_name} to ${parentRes.rows[0].full_name} and approved.`,
            user: updated.rows[0],
        });
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('❌ POST /admin/users/:parentId/approve-and-link', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        client.release();
    }
});

// =============================================
// IMPORT STUDENTS (BULK)
// =============================================
router.post('/import/students', verifyToken, checkRole(['admin']), async (req, res) => {
    const { students } = req.body || {};

    if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ message: 'No students to import' });
    }

    if (students.length > 500) {
        return res.status(400).json({ message: 'Maximum 500 students per import' });
    }

    let count = 0;
    const errors = [];
    const warnings = [];

    for (const s of students) {
        try {
            const fullName = String(s.full_name || '').trim().slice(0, 200);
            if (!fullName) continue;

            let busId = null;
            if (s.bus_number && String(s.bus_number).trim()) {
                const busRes = await pool.query(
                    `SELECT id FROM buses 
                     WHERE REPLACE(UPPER(bus_number), ' ', '-') 
                         = REPLACE(UPPER($1), ' ', '-')
                     LIMIT 1`,
                    [String(s.bus_number).trim()]
                );
                if (busRes.rows.length > 0) busId = busRes.rows[0].id;
            }

            let parentId = null;
            const parentEmail = String(s.parent_email || '').trim().toLowerCase().slice(0, 200);
            if (parentEmail) {
                const parentRes = await pool.query(
                    `SELECT id FROM users
                     WHERE LOWER(email) = $1
                       AND role = 'parent'
                       AND is_approved = true
                       AND is_active = true
                     LIMIT 1`,
                    [parentEmail]
                );
                if (parentRes.rows.length > 0) {
                    parentId = parentRes.rows[0].id;
                } else {
                    warnings.push({
                        full_name: fullName,
                        parent_email: parentEmail,
                        warning: 'No approved & active parent with this email — imported without parent link'
                    });
                }
            }

            const studentIdNumber = s.student_id_number
                ? String(s.student_id_number).trim().slice(0, 50)
                : null;

            if (studentIdNumber) {
                const dup = await pool.query(
                    'SELECT id FROM students WHERE student_id_number = $1 LIMIT 1',
                    [studentIdNumber]
                );
                if (dup.rows.length > 0) {
                    errors.push({
                        student_id_number: studentIdNumber,
                        error: 'Duplicate student_id_number'
                    });
                    continue;
                }
            }

            const totpSecret = 'dummy_secret_' + Date.now() + '_' +
                Math.random().toString(36).slice(2, 10);

            await pool.query(
                `INSERT INTO students
                    (full_name, grade, school_name, student_id_number,
                     parent_id, bus_id, is_active, totp_secret)
                 VALUES ($1, $2, $3, $4, $5, $6, true, $7)`,
                [
                    fullName,
                    s.grade ? String(s.grade).trim().slice(0, 10) : null,
                    s.school_name ? String(s.school_name).trim().slice(0, 100) : null,
                    studentIdNumber,
                    parentId,
                    busId,
                    totpSecret,
                ]
            );
            count++;
        } catch (rowErr) {
            console.error('❌ Student import row error:', rowErr.message);
            errors.push({ row: s, error: rowErr.message });
        }
    }

    try {
        await pool.query(
            `INSERT INTO notifications (parent_id, type, title, message)
             VALUES ($1, $2, $3, $4)`,
            [
                req.user.id,
                'info',
                '📥 Student import',
                `Imported ${count}, failed ${errors.length}, unlinked ${warnings.length}`,
            ]
        );
    } catch (logErr) {
        console.error('⚠️ Failed to write audit log:', logErr.message);
    }

    console.log(`✅ Imported ${count} students, ${errors.length} failed, ${warnings.length} unlinked`);
    res.json({ success: true, count, errors, warnings });
});

// =============================================
// IMPORT DRIVERS (BULK)
// =============================================
router.post('/import/drivers', verifyToken, checkRole(['admin']), async (req, res) => {
    const { drivers } = req.body || {};

    if (!Array.isArray(drivers) || drivers.length === 0) {
        return res.status(400).json({ message: 'No drivers to import' });
    }

    let count = 0;
    const errors = [];

    for (const d of drivers) {
        try {
            if (!d.full_name || !d.email) continue;

            const existRes = await pool.query(
                'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
                [d.email]
            );
            if (existRes.rows.length > 0) {
                errors.push({ email: d.email, error: 'Email already exists' });
                continue;
            }

            const hashed = await bcrypt.hash(d.password || '123456', 10);

            await pool.query(
                `INSERT INTO users
                    (full_name, email, password_hash, phone, role,
                     license_number, experience, is_approved, is_active)
                 VALUES ($1, $2, $3, $4, 'driver', $5, $6, true, true)`,
                [
                    d.full_name,
                    d.email,
                    hashed,
                    d.phone || null,
                    d.license_number || null,
                    d.experience || null,
                ]
            );
            count++;
        } catch (rowErr) {
            console.error('❌ Driver import row error:', rowErr.message);
            errors.push({ row: d, error: rowErr.message });
        }
    }

    console.log(`✅ Imported ${count} drivers, ${errors.length} failed`);
    res.json({ success: true, count, errors });
});

// =============================================
// 🆕 GET /api/admin/reports/summary
// Query: range=today|week|month|year|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns data filtered by created_at within the range.
// =============================================
router.get('/reports/summary', verifyToken, checkRole(['admin']), async (req, res) => {
    const { range = 'week', from, to } = req.query;

    const now = new Date();
    let startDate;
    let endDate = now;

    switch (range) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        case 'custom':
            startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (to) endDate = new Date(to);
            break;
        default:
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
    }

    try {
        const params = [startDate.toISOString(), endDate.toISOString()];

        const registrationsQ = pool.query(
            `SELECT pr.*, u.full_name AS user_name, u.email AS user_email
             FROM parent_registrations pr
             LEFT JOIN users u ON u.id = pr.user_id
             WHERE pr.created_at BETWEEN $1 AND $2
             ORDER BY pr.created_at DESC`,
            params
        );

        const studentsQ = pool.query(
            `SELECT s.*, u.full_name AS parent_name, b.bus_number
             FROM students s
             LEFT JOIN users u ON u.id = s.parent_id
             LEFT JOIN buses b ON b.id = s.bus_id
             WHERE s.created_at BETWEEN $1 AND $2
             ORDER BY s.created_at DESC`,
            params
        );

        const usersQ = pool.query(
            `SELECT id, full_name, email, phone, role, is_approved, is_active, created_at
             FROM users
             WHERE created_at BETWEEN $1 AND $2
             ORDER BY created_at DESC`,
            params
        );

        // Optional tables — don't crash if a column is missing
        const busesQ = pool.query(
            `SELECT b.*, u.full_name AS driver_name
             FROM buses b
             LEFT JOIN users u ON u.id = b.driver_id
             WHERE b.created_at BETWEEN $1 AND $2
             ORDER BY b.created_at DESC`,
            params
        ).catch(() => ({ rows: [] }));

        const alertsQ = pool.query(
            `SELECT a.*, b.bus_number, u.full_name AS driver_name
             FROM emergency_alerts a
             LEFT JOIN buses b ON b.id = a.bus_id
             LEFT JOIN users u ON u.id = a.driver_id
             WHERE a.created_at BETWEEN $1 AND $2
             ORDER BY a.created_at DESC`,
            params
        ).catch(() => ({ rows: [] }));

        const [registrations, students, users, buses, alerts] = await Promise.all([
            registrationsQ,
            studentsQ,
            usersQ,
            busesQ,
            alertsQ,
        ]);

        const totalRegistrations = registrations.rows.length;
        const totalApproved = registrations.rows.filter(r => r.status === 'approved').length;
        const totalRejected = registrations.rows.filter(r => r.status === 'rejected').length;
        const totalPending = registrations.rows.filter(r => r.status === 'pending').length;

        res.json({
            range,
            from: startDate.toISOString(),
            to: endDate.toISOString(),
            counts: {
                registrations: totalRegistrations,
                approved: totalApproved,
                rejected: totalRejected,
                pending: totalPending,
                students: students.rows.length,
                buses: buses.rows.length,
                users: users.rows.length,
                alerts: alerts.rows.length,
            },
            registrations: registrations.rows,
            students: students.rows,
            buses: buses.rows,
            users: users.rows,
            alerts: alerts.rows,
        });
    } catch (err) {
        console.error('❌ GET /admin/reports/summary', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;