const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const { publishCommand, TOPICS } = require('../mqtt/client');

// ── POST /api/door/unlock ──────────────────────────────────────────────────────
router.post('/unlock', async (req, res) => {
  try {
    const io = req.app.get('io');

    // 1. Publish command to the device
    publishCommand(TOPICS.CONTROL, 'UNLOCK');

    // 2. Persist door status
    const doorStatus = await prisma.doorStatus.create({
      data: { status: 'UNLOCKED', source: 'REMOTE' },
    });

    // 3. Persist access log
    const accessLog = await prisma.accessLog.create({
      data: {
        method:  'REMOTE',
        status:  'SUCCESS',
        message: 'Remote unlock via web',
      },
    });

    // 4. Emit real-time events
    io.emit('door:status', doorStatus);
    io.emit('door:log',    accessLog);

    res.json({ message: 'Door unlocked', doorStatus, accessLog });
  } catch (err) {
    console.error('[Door Route] /unlock error:', err.message);
    res.status(500).json({ error: 'Failed to unlock door' });
  }
});

// ── POST /api/door/lock ────────────────────────────────────────────────────────
router.post('/lock', async (req, res) => {
  try {
    const io = req.app.get('io');

    // 1. Publish command to the device
    publishCommand(TOPICS.CONTROL, 'LOCK');

    // 2. Persist door status
    const doorStatus = await prisma.doorStatus.create({
      data: { status: 'LOCKED', source: 'REMOTE' },
    });

    // 3. Persist access log
    const accessLog = await prisma.accessLog.create({
      data: {
        method:  'REMOTE',
        status:  'SUCCESS',
        message: 'Remote lock via web',
      },
    });

    // 4. Emit real-time events
    io.emit('door:status', doorStatus);
    io.emit('door:log',    accessLog);

    res.json({ message: 'Door locked', doorStatus, accessLog });
  } catch (err) {
    console.error('[Door Route] /lock error:', err.message);
    res.status(500).json({ error: 'Failed to lock door' });
  }
});

// ── POST /api/door/ping ────────────────────────────────────────────────────────
router.post('/ping', (_req, res) => {
  publishCommand(TOPICS.CONTROL, 'PING');
  res.json({ message: 'ping sent' });
});

module.exports = router;
