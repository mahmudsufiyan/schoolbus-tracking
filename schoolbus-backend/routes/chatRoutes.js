
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// GET /api/chat/messages/:contactId
// Get conversation and mark selected contact's messages as read
// ============================================================
router.get('/messages/:contactId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const contactId = Number(req.params.contactId);

        if (!Number.isInteger(contactId) || contactId <= 0) {
            return res.status(400).json({ message: 'Invalid contact ID' });
        }

        const result = await pool.query(
            `SELECT c.*, u.full_name AS sender_name
             FROM chat_messages c
             JOIN users u ON c.sender_id = u.id
             WHERE (c.sender_id = $1 AND c.receiver_id = $2)
                OR (c.sender_id = $2 AND c.receiver_id = $1)
             ORDER BY c.created_at ASC`,
            [userId, contactId]
        );

        // Mark only messages from this contact as read
        await pool.query(
            `UPDATE chat_messages
             SET is_read = TRUE
             WHERE sender_id = $1
               AND receiver_id = $2
               AND is_read = FALSE`,
            [contactId, userId]
        );

        res.json(result.rows);

    } catch (err) {
        console.error('GET CHAT MESSAGES ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// POST /api/chat/messages
// Send a message
// ============================================================
router.post('/messages', verifyToken, async (req, res) => {
    try {
        const sender_id = req.user.id;
        const { receiver_id, message } = req.body;

        const receiverId = Number(receiver_id);

        if (
            !Number.isInteger(receiverId) ||
            receiverId <= 0 ||
            !message ||
            typeof message !== 'string' ||
            !message.trim()
        ) {
            return res.status(400).json({
                message: 'Receiver and message are required'
            });
        }

        const result = await pool.query(
            `INSERT INTO chat_messages
             (sender_id, receiver_id, message)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [sender_id, receiverId, message.trim()]
        );

        const newMessage = result.rows[0];

        const io = req.app.get('io');

        if (io) {
            io.to(`user-${receiverId}`).emit(
                'new-chat-message',
                newMessage
            );

            io.to(`user-${sender_id}`).emit(
                'new-chat-message',
                newMessage
            );
        }

        res.status(201).json(newMessage);

    } catch (err) {
        console.error('POST CHAT MESSAGE ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// PUT /api/chat/messages/:contactId/read
// Mark only selected parent's messages as read
// ============================================================
router.put('/messages/:contactId/read', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const contactId = Number(req.params.contactId);

        if (!Number.isInteger(contactId) || contactId <= 0) {
            return res.status(400).json({ message: 'Invalid contact ID' });
        }

        const result = await pool.query(
            `UPDATE chat_messages
             SET is_read = TRUE
             WHERE sender_id = $1
               AND receiver_id = $2
               AND is_read = FALSE`,
            [contactId, userId]
        );

        res.json({
            success: true,
            updated: result.rowCount
        });

    } catch (err) {
        console.error('MARK CHAT READ ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// GET /api/chat/contacts
// Admin: show ONLY parents who have sent messages to this admin
// Parent: keep existing admin contact
// ============================================================
router.get('/contacts', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        if (role === 'parent') {
            const result = await pool.query(
                `SELECT id, full_name, email, role
                 FROM users
                 WHERE role = 'admin'
                 LIMIT 1`
            );

            return res.json(result.rows);
        }

        if (role === 'admin') {
            const result = await pool.query(
                `SELECT
                    u.id,
                    u.full_name,
                    u.email,
                    u.role,

                    COUNT(c.id) FILTER (
                        WHERE c.receiver_id = $1
                          AND c.is_read = FALSE
                    )::INTEGER AS unread_count,

                    MAX(c.created_at) AS last_message_at,

                    (
                        ARRAY_AGG(
                            c.message ORDER BY c.created_at DESC
                        )
                    )[1] AS last_message

                 FROM users u

                 INNER JOIN chat_messages c
                    ON (
                        (c.sender_id = u.id AND c.receiver_id = $1)
                        OR
                        (c.sender_id = $1 AND c.receiver_id = u.id)
                    )

                 WHERE u.role = 'parent'

                   AND EXISTS (
                       SELECT 1
                       FROM chat_messages incoming
                       WHERE incoming.sender_id = u.id
                         AND incoming.receiver_id = $1
                   )

                 GROUP BY u.id, u.full_name, u.email, u.role

                 ORDER BY MAX(c.created_at) DESC`,
                [userId]
            );

            return res.json(result.rows);
        }

        return res.json([]);

    } catch (err) {
        console.error('GET CHAT CONTACTS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// GET /api/chat/unread
// Admin: unread count for EACH parent
// Parent: total unread count
// ============================================================
router.get('/unread', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        if (role === 'admin') {
            const result = await pool.query(
                `SELECT
                    sender_id AS parent_id,
                    COUNT(*)::INTEGER AS unread_count

                 FROM chat_messages

                 WHERE receiver_id = $1
                   AND is_read = FALSE

                 GROUP BY sender_id`,
                [userId]
            );

            const byContact = {};

            let total = 0;

            result.rows.forEach(row => {
                byContact[row.parent_id] = row.unread_count;
                total += row.unread_count;
            });

            return res.json({
                count: total,
                byContact
            });
        }

        const result = await pool.query(
            `SELECT COUNT(*)::INTEGER AS count
             FROM chat_messages
             WHERE receiver_id = $1
               AND is_read = FALSE`,
            [userId]
        );

        res.json({
            count: result.rows[0].count,
            byContact: {}
        });

    } catch (err) {
        console.error('GET CHAT UNREAD ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
