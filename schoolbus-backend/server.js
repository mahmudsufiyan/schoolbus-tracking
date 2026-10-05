const express = require('express');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
dotenv.config();

const pool = require('./db');

// ============================================================
// ROUTES
// ============================================================
const authRoutes = require('./routes/authRoutes');
const busRoutes = require('./routes/busRoutes');
const studentRoutes = require('./routes/studentRoutes');
const stopRoutes = require('./routes/stopRoutes');
const alertRoutes = require('./routes/alertRoutes');
const driverRoutes = require('./routes/driverRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tripRoutes = require('./routes/tripRoutes');
const parentRoutes = require('./routes/parentRoutes');
const locationRoutes = require('./routes/locationRoutes');
const studentEventRoutes = require('./routes/studentEventRoutes');
const aiRoutes = require('./routes/aiRoutes');

// ============================================================
// EXPRESS + HTTP + SOCKET.IO
// ============================================================
const app = express();
const server = http.createServer(app);

// ============================================================
// CORS — accepts localhost + production URL(s)
// ============================================================
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.CLIENT_URL,
    process.env.CLIENT_URL_2,
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (curl, Postman, mobile)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        // Allow any Vercel preview deploy URL
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        console.warn(`⚠️ Blocked CORS origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};

const io = socketio(server, {
    cors: corsOptions,
});

app.set('io', io);

// ============================================================
// STARTUP CLEANUP — retry on failure (Render DB may be warming up)
// ============================================================
(async () => {
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
        try {
            const { rowCount } = await pool.query(`
                UPDATE buses SET status = 'active'
                WHERE status = 'on_route'
                  AND id NOT IN (
                    SELECT DISTINCT bus_id FROM trips
                    WHERE status = 'in_progress' AND bus_id IS NOT NULL
                  )
            `);
            if (rowCount > 0) {
                console.log(`🔄 Reset ${rowCount} stale bus(es) to 'active'`);
            } else {
                console.log(`✅ Bus statuses are in sync`);
            }
            break;
        } catch (err) {
            attempts++;
            console.error(`❌ Bus reset failed (attempt ${attempts}/${maxAttempts}):`, err.message);
            if (attempts >= maxAttempts) {
                console.error('⛔ Giving up on bus reset');
                break;
            }
            await new Promise(r => setTimeout(r, 3000));
        }
    }
})();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/buses', locationRoutes);
app.use('/api/students', studentEventRoutes);
app.use('/api/ai', aiRoutes);

// ============================================================
// HEALTH CHECKS
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'SchoolBus Shield API is running',
        timestamp: new Date().toISOString(),
        websocket: 'connected',
        clients: io.engine?.clientsCount || 0,
        rooms: Array.from(io.sockets.adapter.rooms.keys()).filter(r => r.length > 0),
    });
});

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        name: 'SchoolBus Shield API',
        version: '3.1.0',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================
// 404 + ERROR HANDLERS
// ============================================================
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found', path: req.originalUrl });
});

app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// ============================================================
// SOCKET.IO AUTH MIDDLEWARE
// ============================================================
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            console.warn('⚠️  Socket connection without token');
            socket.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.role,
                    b.id AS bus_id
             FROM users u
             LEFT JOIN buses b ON b.driver_id = u.id
             WHERE u.id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return next(new Error('User not found'));
        }

        socket.user = result.rows[0];
        console.log(`🔐 Authenticated socket: ${socket.user.full_name} (${socket.user.role})${socket.user.bus_id ? ` [bus ${socket.user.bus_id}]` : ''}`);
        next();
    } catch (err) {
        console.error('❌ Socket auth failed:', err.message);
        socket.user = null;
        next();
    }
});

// ============================================================
// SOCKET.IO – Connection Handler
// ============================================================
io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`🔌 Client connected: ${socket.id} | ${user?.full_name || 'Anonymous'} | ${user?.role || 'guest'}`);

    // ============================================================
    // AUTO-JOIN ROOMS BY ROLE
    // ============================================================
    if (user) {
        try {
            if (user.role === 'admin') {
                socket.join('admin');
                console.log(`🔧 Admin ${user.full_name} → 'admin'`);
            } else if (user.role === 'police') {
                socket.join('police');
                console.log(`👮 Police ${user.full_name} → 'police'`);
            } else if (user.role === 'driver') {
                if (user.bus_id) {
                    socket.join(`bus-${user.bus_id}`);
                    console.log(`🚌 Driver ${user.full_name} → bus-${user.bus_id}`);
                } else {
                    console.log(`⚠️ Driver ${user.full_name} has no bus assigned`);
                }
            } else if (user.role === 'parent') {
                const result = await pool.query(
                    `SELECT DISTINCT bus_id FROM students 
                     WHERE parent_id = $1 AND bus_id IS NOT NULL`,
                    [user.id]
                );
                if (result.rows.length === 0) {
                    console.log(`⚠️ Parent ${user.full_name} has no children assigned`);
                } else {
                    result.rows.forEach(row => {
                        socket.join(`bus-${row.bus_id}`);
                        console.log(`👨‍👩‍👧 Parent ${user.full_name} → bus-${row.bus_id}`);
                    });
                }
            }

            socket.emit('authenticated', {
                user: { id: user.id, full_name: user.full_name, role: user.role },
                rooms: Array.from(socket.rooms).filter(r => r !== socket.id),
            });
        } catch (err) {
            console.error('❌ Error auto-joining rooms:', err);
        }
    }

    // ============================================================
    // MANUAL JOIN HANDLERS
    // ============================================================
    socket.on('join-parent-room', async (parentId) => {
        try {
            const result = await pool.query(
                `SELECT DISTINCT bus_id FROM students 
                 WHERE parent_id = $1 AND bus_id IS NOT NULL`,
                [parentId]
            );
            const rooms = [];
            result.rows.forEach(row => {
                const roomName = `bus-${row.bus_id}`;
                socket.join(roomName);
                rooms.push(roomName);
                console.log(`👨‍👩‍👧 Parent ${parentId} manually joined ${roomName}`);
            });
            socket.emit('joined-rooms', rooms);
        } catch (err) {
            console.error('❌ Error joining parent room:', err);
            socket.emit('error', { message: 'Failed to join rooms' });
        }
    });

    socket.on('join-bus-room', (busId) => {
        if (!busId) return;
        const roomName = `bus-${busId}`;
        socket.join(roomName);
        console.log(`🚌 ${user?.full_name || 'Client'} manually joined ${roomName}`);
        socket.emit('joined-bus-room', roomName);
    });

    socket.on('join-police-room', () => {
        socket.join('police');
        socket.emit('joined-police-room', true);
    });

    socket.on('join-admin-room', () => {
        socket.join('admin');
        socket.emit('joined-admin-room', true);
    });

    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`📦 ${socket.id} joined room: ${room}`);
    });

    socket.on('leave-room', (room) => {
        socket.leave(room);
        console.log(`📦 ${socket.id} left room: ${room}`);
    });

    socket.on('ping', (callback) => {
        if (typeof callback === 'function') {
            callback({ pong: true, timestamp: new Date().toISOString() });
        }
    });

    // ============================================================
    // DRIVER BUS REASSIGNMENT
    // ============================================================
    socket.on('refresh-driver-bus', async () => {
        if (socket.user?.role !== 'driver') return;
        try {
            const r = await pool.query(
                `SELECT id FROM buses WHERE driver_id = $1`,
                [socket.user.id]
            );

            for (const room of socket.rooms) {
                if (room.startsWith('bus-')) socket.leave(room);
            }

            if (r.rows[0]) {
                const busId = r.rows[0].id;
                socket.join(`bus-${busId}`);
                socket.user.bus_id = busId;
                socket.emit('driver-bus-refreshed', { bus_id: busId });
                console.log(`🔄 Driver ${socket.user.full_name} rejoined bus-${busId}`);
            } else {
                socket.user.bus_id = null;
                socket.emit('driver-bus-refreshed', { bus_id: null });
                console.log(`⚠️ Driver ${socket.user.full_name} has no bus assigned`);
            }
        } catch (err) {
            console.error('❌ refresh-driver-bus:', err);
        }
    });

    // ============================================================
    // POLICE LIVE ACTION RELAY
    // ============================================================
    socket.on('police-acknowledge', (data) => {
        if (socket.user?.role !== 'police' && socket.user?.role !== 'admin') return;
        const payload = {
            id: data.alertId,
            alert_id: data.alertId,
            status: 'acknowledged',
            acknowledged_by: socket.user.id,
            acknowledged_by_name: socket.user.full_name,
            acknowledged_at: new Date().toISOString(),
        };
        io.to('admin').emit('alert-acknowledged', payload);
        io.to('police').emit('alert-acknowledged', payload);
        console.log(`👮✅ ${socket.user.full_name} acknowledged alert ${data.alertId}`);
    });

    socket.on('police-responding', (data) => {
        if (socket.user?.role !== 'police' && socket.user?.role !== 'admin') return;
        const payload = {
            id: data.alertId,
            alert_id: data.alertId,
            status: 'responding',
            responded_by: socket.user.id,
            responded_by_name: socket.user.full_name,
            eta_minutes: data.eta_minutes || null,
            responded_at: new Date().toISOString(),
        };
        io.to('admin').emit('alert-responding', payload);
        io.to('police').emit('alert-responding', payload);
        console.log(`👮🚔 ${socket.user.full_name} responding to alert ${data.alertId}`);
    });

    socket.on('police-resolved', (data) => {
        if (socket.user?.role !== 'police' && socket.user?.role !== 'admin') return;
        const payload = {
            id: data.alertId,
            alert_id: data.alertId,
            bus_id: data.busId,
            status: 'resolved',
            resolved_by: socket.user.id,
            resolved_by_name: socket.user.full_name,
            outcome: data.outcome || '',
            resolved_at: new Date().toISOString(),
        };
        io.to('admin').emit('alert-resolved', payload);
        io.to('police').emit('alert-resolved', payload);
        if (data.busId) io.to(`bus-${data.busId}`).emit('alert-resolved', payload);
        console.log(`👮🏁 ${socket.user.full_name} resolved alert ${data.alertId}`);
    });

    socket.on('police-status', (data) => {
        if (socket.user?.role !== 'police') return;
        io.to('admin').emit('police-status', {
            unitId: socket.user.id,
            officer_name: socket.user.full_name,
            status: data.status,
            timestamp: new Date().toISOString(),
        });
    });

    socket.on('police-location', (data) => {
        if (socket.user?.role !== 'police') return;
        io.to('admin').emit('police-location', {
            unitId: socket.user.id,
            officer_name: socket.user.full_name,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date().toISOString(),
        });
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Disconnected: ${socket.id} | ${user?.full_name || 'Anonymous'}`);
    });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Health check: /api/health`);
    console.log(`🔌 WebSocket ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
const gracefulShutdown = () => {
    console.log('🛑 Shutting down gracefully...');
    io.close(() => {
        console.log('🔌 WebSocket closed');
        server.close(() => {
            console.log('✅ Server closed');
            pool.end(() => {
                console.log('📦 Database connection closed');
                process.exit(0);
            });
        });
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);