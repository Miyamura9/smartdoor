const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const { publishCommand, TOPICS } = require('../mqtt/client');

// ── Helper: sync whitelist to device ─────────────────────────────────────────
async function syncToDevice() {
  const rfidRecords = await prisma.whitelistRFID.findMany();
  const pinRecords  = await prisma.whitelistPin.findMany();

  const payload = {
    rfid:    rfidRecords.map((r) => r.uid),
    pins:    pinRecords.map((p) => p.pin),
    fingers: [1, 2, 3],
  };

  publishCommand(TOPICS.WHITELIST, payload);
  console.log('[Whitelist] Synced to device:', payload);
}

// ── GET /api/whitelist ────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const [rfid, pins] = await Promise.all([
      prisma.whitelistRFID.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.whitelistPin.findMany({ orderBy:  { createdAt: 'desc' } }),
    ]);

    res.json({ rfid, pins });
  } catch (err) {
    console.error('[Whitelist Route] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch whitelist' });
  }
});

// ── POST /api/whitelist/rfid ──────────────────────────────────────────────────
router.post('/rfid', async (req, res) => {
  try {
    const { uid, label = null } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const record = await prisma.whitelistRFID.create({ data: { uid, label } });
    await syncToDevice();

    res.status(201).json(record);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'UID already exists in whitelist' });
    }
    console.error('[Whitelist Route] POST /rfid error:', err.message);
    res.status(500).json({ error: 'Failed to add RFID to whitelist' });
  }
});

// ── DELETE /api/whitelist/rfid/:uid ──────────────────────────────────────────
router.delete('/rfid/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    await prisma.whitelistRFID.delete({ where: { uid } });
    await syncToDevice();

    res.json({ message: `RFID ${uid} removed from whitelist` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'UID not found in whitelist' });
    }
    console.error('[Whitelist Route] DELETE /rfid/:uid error:', err.message);
    res.status(500).json({ error: 'Failed to remove RFID from whitelist' });
  }
});

// ── POST /api/whitelist/pin ───────────────────────────────────────────────────
router.post('/pin', async (req, res) => {
  try {
    const { pin, label = null } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'pin is required' });
    }

    const record = await prisma.whitelistPin.create({ data: { pin, label } });
    await syncToDevice();

    res.status(201).json(record);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'PIN already exists in whitelist' });
    }
    console.error('[Whitelist Route] POST /pin error:', err.message);
    res.status(500).json({ error: 'Failed to add PIN to whitelist' });
  }
});

// ── DELETE /api/whitelist/pin/:pin ────────────────────────────────────────────
router.delete('/pin/:pin', async (req, res) => {
  try {
    const { pin } = req.params;

    await prisma.whitelistPin.delete({ where: { pin } });
    await syncToDevice();

    res.json({ message: `PIN ${pin} removed from whitelist` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'PIN not found in whitelist' });
    }
    console.error('[Whitelist Route] DELETE /pin/:pin error:', err.message);
    res.status(500).json({ error: 'Failed to remove PIN from whitelist' });
  }
});

// ── POST /api/whitelist/sync ──────────────────────────────────────────────────
router.post('/sync', async (_req, res) => {
  try {
    await syncToDevice();
    res.json({ message: 'synced' });
  } catch (err) {
    console.error('[Whitelist Route] POST /sync error:', err.message);
    res.status(500).json({ error: 'Failed to sync whitelist' });
  }
});

module.exports = router;
