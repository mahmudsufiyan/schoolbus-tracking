const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// GET /api/chat/messages/:contactId
// Get chat history between the logged-in user and a specific contact
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

        // Mark messages from the contact as read
        await pool.query(
            `UPDATE chat_messages SET is_read = TRUE 
             WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
            [contactId, userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('❌ GET /chat/messages error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// POST /api/chat/messages
// Send a new message
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

        // Emit real-time socket event to the receiver
        const io = req.app.get('io');
        if (io) {
            io.to(`user-${receiver_id}`).emit('new-chat-message', newMessage);
            // Also emit to sender so their other tabs update
            io.to(`user-${sender_id}`).emit('new-chat-message', newMessage);
        }

        res.status(201).json(newMessage);
    } catch (err) {
        console.error('❌ POST /chat/messages error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// PUT /api/chat/messages/:contactId/read
// Mark all messages from a specific contact as read
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
        console.error('❌ PUT /chat/messages/:contactId/read error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// GET /api/chat/contacts
// Get list of contacts (Parents see Admin, Admin sees Parents)
// ============================================================
router.get('/contacts', verifyToken, async (req, res) => {
    try {
        const role = req.user.role;

        let query = '';
        if (role === 'parent') {
            // Parents talk to admins
            query = `SELECT id, full_name, email, role FROM users WHERE role = 'admin' LIMIT 1`;
        } else if (role === 'admin') {
            // Admins see all parents
            query = `SELECT id, full_name, email, role FROM users WHERE role = 'parent' ORDER BY full_name`;
        } else {
            return res.json([]); // Other roles have no chat
        }

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ GET /chat/contacts error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ============================================================
// GET /api/chat/unread
// Get count of unread messages for the logged-in user
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
        console.error('❌ GET /chat/unread error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;