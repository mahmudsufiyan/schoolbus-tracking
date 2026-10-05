const express = require('express');
const pool = require('../db');
const { verifyToken, checkRole } = require('../middleware/auth');
const {
    analyzeEmergencyAlert,
    askParentAssistant,
    checkAIHealth,
} = require('../utils/aiService');

const router = express.Router();

// ============================================================
// GET /api/ai/health — public test endpoint (no auth)
// ============================================================
router.get('/health', async (req, res) => {
    const health = await checkAIHealth();
    res.json(health);
});

// ============================================================
// POST /api/ai/analyze-alert
// ============================================================
router.post('/analyze-alert', verifyToken, checkRole(['admin', 'police']), async (req, res) => {
    const { alert_id } = req.body;
    if (!alert_id) return res.status(400).json({ message: 'alert_id required' });

    try {
        const alertRes = await pool.query(
            `SELECT a.*, b.bus_number, u.full_name AS driver_name
             FROM emergency_alerts a
             LEFT JOIN buses b ON b.id = a.bus_id
             LEFT JOIN users u ON u.id = a.driver_id
             WHERE a.id = $1`,
            [alert_id]
        );
        if (alertRes.rows.length === 0) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        const alert = alertRes.rows[0];

        const studentRes = await pool.query(
            `SELECT COUNT(*)::int AS count FROM students WHERE bus_id = $1`,
            [alert.bus_id]
        );
        const studentCount = studentRes.rows[0]?.count || 0;

        const analysis = await analyzeEmergencyAlert(alert, {
            bus_number: alert.bus_number,
            driver_name: alert.driver_name,
            student_count: studentCount,
            time: alert.created_at,
            latitude: alert.latitude,
            longitude: alert.longitude,
            message: alert.message,
        });

        await pool.query(
            `UPDATE emergency_alerts SET ai_analysis = $1::jsonb, ai_status = 'ready' WHERE id = $2`,
            [JSON.stringify(analysis), alert_id]
        );

        const io = req.app.get('io');
        if (io) {
            io.to('admin').emit('ai-analysis-ready', { alert_id, analysis });
            io.to('police').emit('ai-analysis-ready', { alert_id, analysis });
        }

        res.json({ success: true, analysis });
    } catch (err) {
        console.error('❌ POST /ai/analyze-alert', err);
        await pool.query(
            `UPDATE emergency_alerts SET ai_status = 'failed' WHERE id = $1`,
            [alert_id]
        ).catch(() => {});
        res.status(500).json({ message: err.message || 'AI analysis failed' });
    }
});

// ============================================================
// POST /api/ai/parent-chat
// ============================================================
router.post('/parent-chat', verifyToken, checkRole(['parent']), async (req, res) => {
    const { question } = req.body;
    if (!question || question.trim().length === 0) {
        return res.status(400).json({ message: 'question required' });
    }

    try {
        const parentId = req.user.id;

        const childrenRes = await pool.query(
            `SELECT s.id, s.full_name, s.grade, s.school_name, s.bus_id,
                    b.bus_number, st.stop_name
             FROM students s
             LEFT JOIN buses b ON b.id = s.bus_id
             LEFT JOIN stops st ON st.id = s.stop_id
             WHERE s.parent_id = $1`,
            [parentId]
        );

        const childBusIds = childrenRes.rows
            .map(c => c.bus_id)
            .filter(Boolean);

        let trips = [];
        if (childBusIds.length > 0) {
            const tripsRes = await pool.query(
                `SELECT t.id, t.bus_id, b.bus_number, t.status, t.started_at
                 FROM trips t
                 LEFT JOIN buses b ON b.id = t.bus_id
                 WHERE t.bus_id = ANY($1::int[]) AND t.status = 'in_progress'`,
                [childBusIds]
            );
            trips = tripsRes.rows;
        }

        const notifRes = await pool.query(
            `SELECT title, message, created_at
             FROM notifications
             WHERE parent_id = $1
             ORDER BY created_at DESC
             LIMIT 5`,
            [parentId]
        );

        const userRes = await pool.query(
            `SELECT full_name FROM users WHERE id = $1`,
            [parentId]
        );

        const answer = await askParentAssistant(question, {
            parent_name: userRes.rows[0]?.full_name || 'Parent',
            children: childrenRes.rows,
            active_trips: trips,
            notifications: notifRes.rows,
        });

        res.json({ success: true, answer });
    } catch (err) {
        console.error('❌ POST /ai/parent-chat', err);
        res.status(500).json({
            message: err.message || 'AI service unavailable',
        });
    }
});

module.exports = router;