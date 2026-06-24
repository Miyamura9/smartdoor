const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');

// ── GET /api/status/latest ────────────────────────────────────────────────────
router.get('/latest', async (_req, res) => {
  try {
    const latest = await prisma.doorStatus.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      return res.json({ status: 'UNKNOWN' });
    }

    res.json(latest);
  } catch (err) {
    console.error('[Status Route] /latest error:', err.message);
    res.status(500).json({ error: 'Failed to fetch door status' });
  }
});

module.exports = router;
