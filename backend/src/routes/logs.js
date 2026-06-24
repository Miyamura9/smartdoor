const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');

// ── GET /api/logs?limit=50 ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;

    const logs = await prisma.accessLog.findMany({
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });

    res.json(logs);
  } catch (err) {
    console.error('[Logs Route] / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch access logs' });
  }
});

module.exports = router;
