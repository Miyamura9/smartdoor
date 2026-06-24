require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { verifyToken } = require('./middleware/auth');
const { verifyJWT }   = require('./lib/jwt');

const app = express();
const server = http.createServer(app);

// Strip trailing slash and build allowed origins list
const rawFrontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const allowedOrigins = [
  rawFrontendUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost',
  'capacitor://localhost',
];

console.log('PORT =', process.env.PORT);
console.log('FRONTEND_URL =', rawFrontendUrl);
console.log('Allowed Origins =', allowedOrigins);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
});

// Guard Socket.IO connections with JWT
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.headers?.authorization || '').replace('Bearer ', '');
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = verifyJWT(token);
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id} (user: ${socket.user?.username})`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Make io accessible inside route handlers via req.app.get('io')
app.set('io', io);

// ── Routes ─────────────────────────────────────────────────────────────────────

// Public routes (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
app.use('/api/auth', require('./routes/auth'));

// Protected routes (JWT required)
app.use('/api/status',    verifyToken, require('./routes/status'));
app.use('/api/logs',      verifyToken, require('./routes/logs'));
app.use('/api/door',      verifyToken, require('./routes/door'));
app.use('/api/whitelist', verifyToken, require('./routes/whitelist'));

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);

  // Start MQTT client after server is up so io is already available
  require('./mqtt/client').connect(io);
});

module.exports = { app, io };
