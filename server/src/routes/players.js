// ============================================================
// routes/players.js — Player profile
// ============================================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const userService = require('../services/userService');

// ── GET /api/v1/players/me/default ──
router.get('/me/default', requireAuth, async (req, res) => {
  try {
    const player = await userService.getDefaultPlayer(req.userId);
    if (!player) {
      return res.status(404).json({ error: 'Default player not found' });
    }
    res.json({ player });
  } catch (err) {
    console.error('[players/get]', err);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// ── PATCH /api/v1/players/me/default ──
router.patch('/me/default', requireAuth, async (req, res) => {
  try {
    const { displayName, handicap } = req.body || {};

    if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length === 0)) {
      return res.status(400).json({ error: 'Display name cannot be empty' });
    }
    if (handicap !== undefined && handicap !== null) {
      const h = Number(handicap);
      if (isNaN(h) || h < -10 || h > 54) {
        return res.status(400).json({ error: 'Handicap must be between -10 and 54' });
      }
    }

    const player = await userService.updateDefaultPlayer(req.userId, { displayName, handicap });
    if (!player) {
      return res.status(404).json({ error: 'Default player not found' });
    }
    res.json({ player });
  } catch (err) {
    console.error('[players/patch]', err);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

module.exports = router;
