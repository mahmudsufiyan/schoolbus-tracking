const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// =============================================
// REGISTER - Handles Admin & Non-Admin Users
// =============================================
router.post('/register', async (req, res) => {
    const {
        full_name,
        email,
        password,
        phone,
        role,
        address,
        date_of_birth,
        gender,
        occupation,
        emergency_contact,
        relationship_to_student,
        student_name,
        student_grade,
        student_school,
        student_id_number,
        badge_number,
        station,
        license_number,
        experience,
        profile_image
    } = req.body;

    console.log('📝 [REGISTER] Request:', { full_name, email, role });

    // ✅ Validate required fields
    if (!full_name || !email || !password || !phone) {
        return res.status(400).json({
            success: false,
            message: 'Full name, email, password, and phone are required'
        });
    }

    try {
        // 🔍 Check if user exists
        const existing = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // 🔐 Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ ADMIN: Auto-approve, no parent registration
        if (role === 'admin') {
            const result = await pool.query(
                `INSERT INTO users (
                    full_name, email, password_hash, phone, role,
                    address, date_of_birth, gender, occupation,
                    emergency_contact, relationship_to_student,
                    profile_image,
                    is_approved, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, true)
                RETURNING id, full_name, email, phone, role, created_at, is_approved`,
                [
                    full_name, email, hashedPassword, phone, role,
                    address || null, date_of_birth || null, gender || null,
                    occupation || null, emergency_contact || null,
                    relationship_to_student || null,
                    profile_image || null
                ]
            );

            const user = result.rows[0];

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            console.log('✅ [REGISTER] Admin created and approved:', user.id);

            return res.status(201).json({
                success: true,
                token,
                user,
                message: '✅ Admin account created and approved successfully!'
            });
        }

        // 📥 Non-Admin: Insert user with is_approved = false
        const result = await pool.query(
            `INSERT INTO users (
                full_name, email, password_hash, phone, role, 
                address, date_of_birth, gender, occupation, 
                emergency_contact, relationship_to_student,
                profile_image,
                -- Police & Driver fields
                badge_number,
                station,
                license_number,
                experience,
                is_approved
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, false)
             RETURNING id, full_name, email, phone, role, created_at`,
            [
                full_name, email, hashedPassword, phone, role || 'parent',
                address || null, date_of_birth || null, gender || null,
                occupation || null, emergency_contact || null,
                relationship_to_student || null,
                profile_image || null,
                badge_number || null,
                station || null,
                license_number || null,
                experience || null
            ]
        );

        const user = result.rows[0];

        // 📥 Insert into parent_registrations for admin review (only for parents)
        if (role === 'parent' || role === null) {
            await pool.query(
                `INSERT INTO parent_registrations (
                    user_id, full_name, email, phone, address,
                    date_of_birth, gender, occupation, emergency_contact,
                    relationship_to_student, student_name, student_grade,
                    student_school, student_id_number, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')`,
                [
                    user.id, full_name, email, phone, address || null,
                    date_of_birth || null, gender || null, occupation || null,
                    emergency_contact || null, relationship_to_student || null,
                    student_name || null, student_grade || null,
                    student_school || null, student_id_number || null
                ]
            );
        }

        console.log('✅ [REGISTER] User created (pending approval):', user.id);
        console.log(`📧 [NOTIFY] Admin: New registration from ${full_name} (${email})`);

        res.status(201).json({
            success: true,
            message: 'Registration successful! Your account is pending admin approval.',
            pending: true,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ [REGISTER] Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

// =============================================
// LOGIN - Admin bypasses approval check
// =============================================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query(
            `SELECT id, full_name, email, password_hash, phone, role, 
                    is_approved, is_active, created_at, profile_image
             FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        const user = result.rows[0];

        // ✅ Check password first
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // ✅ ADMIN: Bypass approval check, auto-approve if needed
        if (user.role === 'admin') {
            if (!user.is_approved || !user.is_active) {
                await pool.query(
                    `UPDATE users SET is_approved = true, is_active = true WHERE id = $1`,
                    [user.id]
                );
                user.is_approved = true;
                user.is_active = true;
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            delete user.password_hash;
            return res.json({
                success: true,
                token,
                user
            });
        }

        // ✅ NON-ADMIN: Check approval
        if (!user.is_approved) {
            const pendingReg = await pool.query(
                `SELECT id, status, created_at 
                 FROM parent_registrations 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC LIMIT 1`,
                [user.id]
            );

            const status = pendingReg.rows[0]?.status || 'pending';
            const createdAt = pendingReg.rows[0]?.created_at;

            return res.status(403).json({
                success: false,
                pending: true,
                message: status === 'pending' 
                    ? '⏳ Account pending approval. Please wait for admin approval.'
                    : '❌ Account has been rejected. Please contact admin.',
                status: status,
                submitted_at: createdAt
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Contact admin.'
            });
        }

        // Generate JWT for non-admin users
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        delete user.password_hash;

        res.json({
            success: true,
            token,
            user
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

module.exports = router;