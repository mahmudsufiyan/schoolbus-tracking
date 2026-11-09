const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// GET /api/chat/messages/:contactId
// ============================================================
router.get('/messages/:contactId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const contactId = req.params.contactId;

        const result = await pool.query(
            `SELECT c.*, u.full_name as sender_name
             FROM chat_messages c
             JOIN users u ON c.sender_id = u.id
             WHERE (c.sender_id = $1 AND c.receiver_id = $2)
                OR (c.sender_id = $2 AND c.receiver_id = $1)
             ORDER BY c.created_at ASC`,
            [userId, contactId]
        );

        await pool.query(
            `UPDATE chat_messages SET is_read = TRUE 
             WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
            [contactId, userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('💥💥💥 [CHAT-ERROR] GET /chat/messages:', err.message);
        console.error('💥 [CHAT-ERROR] Full:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// POST /api/chat/messages
// ============================================================
router.post('/messages', verifyToken, async (req, res) => {
    try {
        const sender_id = req.user.id;
        const { receiver_id, message } = req.body;

        if (!receiver_id || !message || message.trim() === '') {
            return res.status(400).json({ message: 'Receiver and message are required' });
        }

        const result = await pool.query(
            `INSERT INTO chat_messages (sender_id, receiver_id, message)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [sender_id, receiver_id, message.trim()]
        );

        const newMessage = result.rows[0];

        const io = req.app.get('io');
        if (io) {
            io.to(`user-${receiver_id}`).emit('new-chat-message', newMessage);
            io.to(`user-${sender_id}`).emit('new-chat-message', newMessage);
        }

        res.status(201).json(newMessage);
    } catch (err) {
        console.error('💥💥💥 [CHAT-ERROR] POST /chat/messages:', err.message);
        console.error('💥 [CHAT-ERROR] Full:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// PUT /api/chat/messages/:contactId/read
// ============================================================
router.put('/messages/:contactId/read', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const contactId = req.params.contactId;

        await pool.query(
            `UPDATE chat_messages SET is_read = TRUE 
             WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
            [contactId, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('💥💥💥 [CHAT-ERROR] PUT /chat/messages/read:', err.message);
        console.error('💥 [CHAT-ERROR] Full:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// GET /api/chat/contacts
// ============================================================
router.get('/contacts', verifyToken, async (req, res) => {
    try {
        const role = req.user.role;

        let query = '';
        if (role === 'parent') {
            query = `SELECT id, full_name, email, role FROM users WHERE role = 'admin' LIMIT 1`;
        } else if (role === 'admin') {
            query = `SELECT id, full_name, email, role FROM users WHERE role = 'parent' ORDER BY full_name`;
        } else {
            return res.json([]);
        }

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('💥💥💥 [CHAT-ERROR] GET /chat/contacts:', err.message);
        console.error('💥 [CHAT-ERROR] Full:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// GET /api/chat/unread
// ============================================================
router.get('/unread', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT COUNT(*) FROM chat_messages 
             WHERE receiver_id = $1 AND is_read = FALSE`,
            [userId]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('💥💥💥 [CHAT-ERROR] GET /chat/unread:', err.message);
        console.error('💥 [CHAT-ERROR] Full:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;